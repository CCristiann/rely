import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createHmac } from "crypto";
import { NextResponse } from "next/server";

function verifyState(state: string): string | null {
    const dotIndex = state.lastIndexOf(".");
    if (dotIndex === -1) return null;
    const projectId = state.slice(0, dotIndex);
    const hmac = state.slice(dotIndex + 1);
    if (!projectId || !hmac) return null;
    const expected = createHmac("sha256", process.env.SESSION_SECRET!)
        .update(projectId)
        .digest("hex");
    if (hmac !== expected) return null;
    return projectId;
}

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error || !code || !state) {
        console.error("[Notion callback] OAuth error:", error);
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    const projectId = verifyState(state);
    if (!projectId) {
        console.error("[Notion callback] invalid HMAC state");
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Ensure project belongs to this user
    const project = await prisma.project.findFirst({
        where: { id: projectId, userId: session.user.id },
    });
    if (!project) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Exchange authorization code for access token
    const credentials = Buffer.from(
        `${process.env.NOTION_CLIENT_ID!}:${process.env.NOTION_CLIENT_SECRET!}`
    ).toString("base64");

    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            grant_type: "authorization_code",
            code,
            redirect_uri: process.env.NOTION_REDIRECT_URI!,
        }),
    });

    if (!tokenRes.ok) {
        console.error("[Notion callback] token exchange failed:", await tokenRes.text());
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    const token = (await tokenRes.json()) as {
        access_token: string;
        workspace_id: string;
        workspace_name: string;
        workspace_icon: string | null;
        bot_id: string;
    };

    const config = {
        accessToken: token.access_token,
        workspaceId: token.workspace_id,
        workspaceName: token.workspace_name,
        workspaceIcon: token.workspace_icon ?? null,
        botId: token.bot_id,
        selectedPageIds: [] as string[],
        pageMetadata: {} as Record<string, { title: string; url: string }>,
    };

    // Upsert: if a NOTION DataSource already exists for this project, update it
    const existing = await prisma.dataSource.findFirst({
        where: { projectId, type: "NOTION" },
    });

    if (existing) {
        await prisma.dataSource.update({
            where: { id: existing.id },
            data: { config, status: "READY", name: token.workspace_name },
        });
    } else {
        await prisma.dataSource.create({
            data: {
                type: "NOTION",
                name: token.workspace_name,
                config,
                status: "READY",
                projectId,
            },
        });
    }

    // Redirect back to project with flag to open page picker
    const redirectUrl = new URL(`/dashboard/projects/${projectId}`, request.url);
    redirectUrl.searchParams.set("notionConnected", "true");
    return NextResponse.redirect(redirectUrl);
}