import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";
import { createNotionClient } from "@/lib/connectors/notion/client";
import { listAccessiblePages } from "@/lib/connectors/notion/pages";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

interface NotionConfig {
    accessToken: string;
    selectedPageIds: string[];
    pageMetadata: Record<string, { title: string; url: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    const dataSource = await prisma.dataSource.findFirst({
        where: { projectId, type: "NOTION", project: { userId: session.user.id } },
    });
    if (!dataSource) {
        return NextResponse.json({ error: "Notion not connected" }, { status: 404 });
    }

    const config = (dataSource.config as any) as NotionConfig;
    const client = createNotionClient(config.accessToken);

    try {
        const pages = await listAccessiblePages(client);
        return NextResponse.json({ pages });
    } catch (err) {
        console.error("[notion/pages GET] failed:", err);
        return NextResponse.json({ error: "Failed to fetch pages" }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: RouteContext) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    const body = (await request.json()) as {
        selectedPageIds: string[];
        pageMetadata: Record<string, { title: string; url: string }>;
    };

    const dataSource = await prisma.dataSource.findFirst({
        where: { projectId, type: "NOTION", project: { userId: session.user.id } },
    });
    if (!dataSource) {
        return NextResponse.json({ error: "Notion not connected" }, { status: 404 });
    }

    const currentConfig = dataSource.config as Record<string, unknown>;
    await prisma.dataSource.update({
        where: { id: dataSource.id },
        data: {
            config: {
                ...currentConfig,
                selectedPageIds: body.selectedPageIds,
                pageMetadata: body.pageMetadata,
            },
        },
    });

    // Trigger the initial sync immediately
    await inngest.send({
        name: "notion/sync.requested",
        data: { dataSourceId: dataSource.id, projectId },
    });

    return NextResponse.json({ status: "syncing" });
}