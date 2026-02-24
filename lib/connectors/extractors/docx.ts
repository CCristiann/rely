import type { TextExtractor } from "../types";

export const docxExtractor: TextExtractor = {
  mimeTypes: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],

  async extract(buffer: Buffer): Promise<string> {
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  },
};
