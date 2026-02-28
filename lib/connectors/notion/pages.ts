import { Client } from "@notionhq/client";

export interface NotionPageMeta {
    id: string
    title: string
    url: string
    icon: string | null
}

export async function listAccessiblePages(
    client: Client
): Promise<NotionPageMeta[]> {
    const pages: NotionPageMeta[] = []
    let cursor: string | undefined

    do {
        const res = await client.search({
            filter: { property: "object", value: "page" },
            sort: { direction: "descending", timestamp: "last_edited_time" },
            start_cursor: cursor,
            page_size: 100,
        })

        for (const result of res.results) {
            if (result.object !== "page") continue

            const r = result as any
            pages.push({
                id: r.id,
                title: extractTitle(r.properties),
                url: r.url ?? "",
                icon: extractIcon(r.icon),
            })

            cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
        }
    } while (cursor)

    return pages

}

function extractTitle(properties: Record<string, unknown>): string {
    for (const prop of Object.values(properties)) {
        const p = prop as Record<string, unknown>
        if (p.type === "title" && Array.isArray(p.title)) {
            return (p.title as Array<{ plain_text: string }>)
                .map((t) => t.plain_text)
                .join("")
        }
    }
    return "Untitled"
}

function extractIcon(icon: unknown): string | null {
    if (!icon || typeof icon !== "object") return null
    const i = icon as Record<string, unknown>
    if (i.type === "emoji") return i.emoji as string
    if (i.type === "external") return (i.external as { url: string }).url
    return null
}