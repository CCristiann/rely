export interface TextExtractor {
  readonly mimeTypes: string[];
  extract(buffer: Buffer, fileName: string): Promise<string>;
}
