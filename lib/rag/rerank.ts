import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export interface RankedChunk {
  id: string;
  content: string;
  documentTitle?: string;
}

/**
 * Re-ranks retrieved chunks by relevance to the question using a lightweight LLM.
 * Falls back to the original order if the LLM call fails.
 */
export async function rerankChunks(
  question: string,
  chunks: RankedChunk[],
  topK = 5
): Promise<RankedChunk[]> {
  if (chunks.length <= 1) return chunks.slice(0, topK);

  try {
    const chunkList = chunks
      .map((c) => `ID: ${c.id}\n${c.content.slice(0, 300)}`)
      .join("\n\n---\n\n");

    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      prompt: `You are a relevance ranker for a RAG system.
Given a question and a list of document chunks, rank the chunks by how useful they are for answering the question.

Return ONLY a JSON array of chunk IDs ordered from most to least relevant.
Example output: ["abc123", "def456", "ghi789"]

Question: ${question}

Chunks:
${chunkList}

Return only the JSON array:`,
      maxTokens: 300,
    });

    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return chunks.slice(0, topK);

    const rankedIds: string[] = JSON.parse(match[0]);
    const chunkMap = new Map(chunks.map((c) => [c.id, c]));

    const reranked = rankedIds
      .map((id) => chunkMap.get(id))
      .filter((c): c is RankedChunk => c !== undefined);

    // Append any chunks the LLM didn't mention, in original order
    const seenIds = new Set(rankedIds);
    const remainder = chunks.filter((c) => !seenIds.has(c.id));

    return [...reranked, ...remainder].slice(0, topK);
  } catch {
    // Graceful degradation: return original order
    return chunks.slice(0, topK);
  }
}
