import { prisma } from "@/lib/prisma"
import { inngest } from "../client"
import { createNotionClient } from "@/lib/connectors/notion/client"
import { extractPageText } from "@/lib/connectors/notion/extract"
import { embedAndStore } from "@/lib/rag/ingest"

interface SyncNotionEventData {
    dataSourceId: string
    projectId: string
}

interface NotionConfig {
    accessToken: string
    workspaceName: string
    selectedPageIds: string[]
    pageMetadata: Record<string, { title: string; url: string }>
}

export const syncNotionFn = inngest.createFunction(
    { id: "sync-notion", retries: 3 },
    { event: "notion/sync-requested" },
    async ({ event, step }) => {
        const { dataSourceId, projectId } = event.data as SyncNotionEventData

        await step.run("mark-syncing", () => {
            prisma.dataSource.update({
                where: { id: dataSourceId },
                data: { status: "SYNCING" }
            })
        })

        const dataSource = await step.run("load-config", () =>
            prisma.dataSource.findFirstOrThrow({
                where: { id: dataSourceId }
            })
        )

        const config = (dataSource.config as any) as NotionConfig
        const client = createNotionClient(config.accessToken)

        let totalChunks = 0;

        for (const pageId of config.selectedPageIds) {
            const meta = config.pageMetadata[pageId] ?? {
                title: "Untitled",
                url: ""
            }

            const text = await step.run(`extract-page-${pageId}`, () =>
                extractPageText(client, pageId)
            )

            const chunkCount = await step.run(`embed-page-${pageId}`, async () => {
                const existing = await prisma.document.findFirst({
                    where: {
                        dataSourceId,
                        fileUrl: meta.url
                    }
                })

                const doc = existing
                    ? await prisma.document.update({
                        where: { id: existing.id },
                        data: {
                            name: meta.title,
                            fileSize: text.length,
                            status: "PROCESSING"
                        }
                    })
                    : await prisma.document.create({
                        data: {
                            name: meta.title,
                            mimeType: "notion/page",
                            fileSize: text.length,
                            status: "PROCESSING",
                            dataSourceId,
                            fileUrl: meta.url,
                            projectId
                        }
                    })

                await prisma.chunk.deleteMany({
                    where: {
                        documentId: doc.id
                    }
                })

                if (!text.trim()) {
                    await prisma.document.update({
                        where: { id: doc.id },
                        data: {
                            status: "READY"
                        }
                    })

                    return 0
                }

                const count = await embedAndStore({
                    documentId: doc.id,
                    text,
                    fileName: meta.title
                })

                await prisma.document.update({
                    where: {
                        id: doc.id
                    },
                    data: {
                        status: "READY",
                    }
                })

                return count
            })

            totalChunks += chunkCount
        }

        await step.run("mark-ready", () =>
            prisma.dataSource.update({
                where: { id: dataSourceId },
                data: {
                    status: "READY",
                    lastSyncedAt: new Date()
                }
            })
        )

        return { dataSourceId, totalChunks }
    }
)