import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { ingestDocumentFn } from "@/lib/inngest/functions/ingest-document";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [ingestDocumentFn],
});
