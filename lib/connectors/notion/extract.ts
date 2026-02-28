import { Client } from "@notionhq/client";
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

const TEXT_BLOCK_TYPES = new Set([
    "paragraph",
    "heading_1",
    "heading_2",
    "heading_3",
    "bulleted_list_item",
    "numbered_list_item",
    "to_do",
    "toggle",
    "quote",
    "callout",
    "code",
]);

export async function extractPageText(client: Client, pageId: string): Promise<string> {
    const lines: string[] = []
    await traverseBlocks(client, pageId, lines)
    return lines.join("\n\n")
}

async function traverseBlocks(client: Client, blockId: string, lines: string[]) {
    let cursor: string | undefined
    do {
        const res = await client.blocks.children.list({
            block_id: blockId,
            start_cursor: cursor,
            page_size: 100,
        })

        for (const block of res.results) {
            if (!("type" in block)) continue
            const b = block as any

            if (TEXT_BLOCK_TYPES.has(b.type)) {
                const text = extractRichText(b)
                if (text.trim()) lines.push(text)
            }

            if (b.has_children) {
                await traverseBlocks(client, b.id, lines)
            }
        }
        cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
    } while (cursor)
}

function extractRichText(block: BlockObjectResponse): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = (block as any)[block.type];
    if (!content || !Array.isArray(content.rich_text)) return "";
    return (content.rich_text as Array<{ plain_text: string }>)
        .map((t) => t.plain_text)
        .join("");
}