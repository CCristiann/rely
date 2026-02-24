import type { TextExtractor } from "../types";
import { pdfExtractor } from "./pdf";
import { docxExtractor } from "./docx";

const extractors: TextExtractor[] = [pdfExtractor, docxExtractor];

export function getExtractor(mimeType: string): TextExtractor | undefined {
  return extractors.find((e) =>
    e.mimeTypes.some((m) => mimeType.includes(m))
  );
}

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  const extractor = getExtractor(mimeType);
  if (!extractor) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
  return extractor.extract(buffer, fileName);
}
