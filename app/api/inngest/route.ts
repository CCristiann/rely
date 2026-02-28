import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { ingestDocumentFn } from "@/lib/inngest/functions/ingest-document";
import { syncNotionFn } from "@/lib/inngest/functions/sync-notion";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [ingestDocumentFn, syncNotionFn],
});
