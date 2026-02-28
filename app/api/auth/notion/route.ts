import { auth } from "@/auth";
import { createHmac } from "crypto";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")


    if (!projectId) {
        return NextResponse.json({ error: "Missing projectId" }, { status: 400 })
    }

    const secret = process.env.SESSION_SECRET
    if (!secret) {
        return NextResponse.json({ error: "Missing SESSION_SECRET" }, { status: 500 })
    }

    const hmac = createHmac("sha256", secret).update(projectId).digest("hex")
    const state = `${projectId}.${hmac}`

    const params = new URLSearchParams({
        client_id: process.env.NOTION_CLIENT_ID!,
        redirect_uri: process.env.NOTION_REDIRECT_URI!,
        response_type: "code",
        owner: "user",
        state
    })

    const authUrl = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`
    return NextResponse.redirect(authUrl)
}