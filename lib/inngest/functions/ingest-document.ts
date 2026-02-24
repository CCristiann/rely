import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { downloadFile, embedAndStore } from "@/lib/rag/ingest";
import { extractText } from "@/lib/connectors/extractors";

interface IngestDocumentEventData {
  documentId: string;
  fileUrl: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  dataSourceId: string | null;
}

export const ingestDocumentFn = inngest.createFunction(
  { id: "ingest-document", retries: 3 },
  { event: "document/ingest.requested" },
  async ({ event, step }) => {
    const { documentId, fileUrl, storagePath, fileName, mimeType, dataSourceId } =
      event.data as IngestDocumentEventData;

    await step.run("mark-processing", () =>
      prisma.document.update({
        where: { id: documentId },
        data: { status: "PROCESSING" },
      })
    );

    let text: string;
    try {
      text = await step.run("download-and-extract", async () => {
        const buffer = await downloadFile(storagePath);
        return extractText(buffer, mimeType, fileName);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "ERROR" },
      });
      throw err;
    }

    let chunkCount: number;
    try {
      chunkCount = await step.run("embed-and-store", () =>
        embedAndStore({ documentId, text, fileName })
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "ERROR" },
      });
      throw err;
    }

    await step.run("mark-ready", () =>
      Promise.all([
        prisma.document.update({
          where: { id: documentId },
          data: { status: "READY" },
        }),
        dataSourceId
          ? prisma.dataSource.update({
            where: { id: dataSourceId },
            data: { status: "READY", lastSyncedAt: new Date() },
          })
          : Promise.resolve(),
      ])
    );

    return { documentId, chunkCount };
  }
);
