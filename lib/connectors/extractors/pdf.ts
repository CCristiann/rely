import type { TextExtractor } from "../types";

export const pdfExtractor: TextExtractor = {
  mimeTypes: ["application/pdf"],

  async extract(buffer: Buffer): Promise<string> {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text;
  },
};
