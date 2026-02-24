import { GoogleGenerativeAI } from "@google/generative-ai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient, STORAGE_BUCKET } from "@/lib/supabase";
import { extractText } from "@/lib/connectors/extractors";
import { randomUUID, createHash } from "crypto";

/**
 * Deterministic chunk ID derived from documentId + chunkIndex.
 * Inngest retries produce the same IDs, so ON CONFLICT DO NOTHING
 * prevents duplicate chunks from accumulating.
 */
function chunkId(documentId: string, chunkIndex: number): string {
  const hex = createHash("sha256")
    .update(`${documentId}:${chunkIndex}`)
    .digest("hex");
  // Format as UUID v4-like to stay consistent with existing IDs
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 400,
});

// ── Composable pipeline steps ──────────────────────────────────

/** Download a file from Supabase Storage and return its buffer. */
export async function downloadFile(storagePath: string): Promise<Buffer> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(storagePath);

  if (error) {
    throw new Error(`Failed to download file from Supabase: ${error.message}`);
  }
  return Buffer.from(await data.arrayBuffer());
}

/** Split text into chunks using the shared splitter. */
export async function chunkText(
  text: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _fileName: string
): Promise<string[]> {
  return splitter.splitText(text);
}

/**
 * Chunk, embed, and persist a document's text.
 * Atomic in the sense that each SQL insert is independent — a retry
 * from an Inngest step will re-run from the beginning of this function,
 * which is safe because duplicate chunk IDs will simply fail to insert.
 */
export async function embedAndStore(params: {
  documentId: string;
  text: string;
  fileName: string;
}): Promise<number> {
  const { documentId, text, fileName } = params;

  const cleanText = text.replace(/\x00/g, "");
  if (!cleanText.trim()) {
    throw new Error("No text content could be extracted from the document.");
  }

  const chunks = await splitter.splitText(cleanText);
  if (chunks.length === 0) {
    throw new Error("Document produced no chunks after splitting.");
  }

  const BATCH_SIZE = 50;
  let chunkCount = 0;
  let globalChunkIndex = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const embeddings = await embedBatch(batch, fileName);

    for (let j = 0; j < batch.length; j++) {
      const content = batch[j];
      const embedding = embeddings[j];
      const vectorLiteral = `[${embedding.join(",")}]`;
      const currentChunkIndex = globalChunkIndex++;
      const id = chunkId(documentId, currentChunkIndex);

      await prisma.$executeRawUnsafe(
        `INSERT INTO "Chunk" (id, content, embedding, "documentId", "chunkIndex", "documentTitle", "createdAt")
         VALUES ($1, $2, $3::vector(3072), $4, $5, $6, NOW())
         ON CONFLICT (id) DO NOTHING`,
        id,
        content,
        vectorLiteral,
        documentId,
        currentChunkIndex,
        fileName
      );

      chunkCount++;
    }
  }

  return chunkCount;
}

// ── Internal helpers ───────────────────────────────────────────

async function embedBatch(
  chunks: string[],
  documentTitle: string
): Promise<number[][]> {
  // Single HTTP round-trip for the entire batch via batchEmbedContents.
  // This replaces N sequential embedContent calls with one batched request.
  const response = await embeddingModel.batchEmbedContents({
    requests: chunks.map((chunk) => ({
      content: {
        parts: [{ text: `Source: ${documentTitle}\n\n${chunk}` }],
        role: "user" as const,
      },
    })),
  });
  return response.embeddings.map((e) => e.values);
}

// ── Legacy sync pipeline (for local testing only) ──────────────

export async function ingestDocument(params: {
  file: Buffer;
  fileName: string;
  mimeType: string;
  projectId: string;
  userId: string;
}): Promise<{ documentId: string; chunkCount: number }> {
  const { file, fileName, mimeType, projectId, userId } = params;

  const supabase = createServerSupabaseClient();
  const storagePath = `${userId}/${projectId}/${randomUUID()}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, { contentType: mimeType, upsert: false });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  const fileUrl = urlData.publicUrl;

  const document = await prisma.document.create({
    data: {
      name: fileName,
      fileUrl,
      fileSize: file.byteLength,
      mimeType,
      projectId,
      status: "PENDING",
    },
  });

  let rawText = await extractText(file, mimeType, fileName);
  rawText = rawText.replace(/\x00/g, "");

  if (!rawText.trim()) {
    await prisma.document.update({
      where: { id: document.id },
      data: { status: "ERROR" },
    });
    throw new Error("No text content could be extracted from the document.");
  }

  const chunkCount = await embedAndStore({
    documentId: document.id,
    text: rawText,
    fileName,
  });

  await prisma.document.update({
    where: { id: document.id },
    data: { status: "READY" },
  });

  return { documentId: document.id, chunkCount };
}
