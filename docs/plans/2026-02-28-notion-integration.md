# Notion Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect a Notion workspace per-project via OAuth, let users manually select pages to index, and make them available in semantic search alongside uploaded files.

**Architecture:** Token + page selection stored in `DataSource.config` JSON (no schema changes needed — `NOTION` enum and `config: Json` already exist). New Inngest function handles sync by fetching block text from Notion's API and passing it to the existing `embedAndStore()`. Two OAuth routes handle authorization. The documents page gets a "Connect Notion" button and a page-picker modal.

**Tech Stack:** `@notionhq/client`, Inngest v3, TanStack React Query v5, Next.js App Router, shadcn/ui, Tailwind CSS v4

---

## Prerequisites: Notion Integration Setup

Before writing any code, create a Notion integration:

1. Go to https://www.notion.so/my-integrations
2. Click **"New integration"**
3. Set type to **Public** (required for OAuth — internal integrations don't have `client_id`/`client_secret`)
4. Under "Redirect URIs" add: `http://localhost:3000/api/auth/notion/callback`
5. Copy the **Client ID** and **Client Secret** from the Configuration tab

Then add to `.env.local`:
```
NOTION_CLIENT_ID=your_client_id
NOTION_CLIENT_SECRET=your_client_secret
NOTION_REDIRECT_URI=http://localhost:3000/api/auth/notion/callback
SESSION_SECRET=<run: openssl rand -hex 32>
```

---

## DataSource.config shape (for reference)

Every NOTION DataSource will store this in its `config` field:

```json
{
  "accessToken": "secret_xxx",
  "workspaceId": "abc123",
  "workspaceName": "My Workspace",
  "workspaceIcon": "https://...",
  "botId": "bot_xxx",
  "selectedPageIds": ["page-id-1", "page-id-2"],
  "pageMetadata": {
    "page-id-1": { "title": "Meeting Notes", "url": "https://notion.so/..." },
    "page-id-2": { "title": "Roadmap", "url": "https://notion.so/..." }
  }
}
```

Each selected page becomes a `Document` with `mimeType: "notion/page"` and `fileUrl` = the Notion page URL.

---

### Task 1: Install dependency

**Files:**
- Modify: `package.json` (via npm)

**Step 1: Install the Notion SDK**

```bash
npm install @notionhq/client
```

Expected: `@notionhq/client` appears in `package.json` dependencies and `node_modules/@notionhq/`.

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install @notionhq/client"
```

---

### Task 2: Notion connector — client factory

**Files:**
- Create: `lib/connectors/notion/client.ts`

**Step 1: Create the file**

```typescript
import { Client } from "@notionhq/client";

export function createNotionClient(accessToken: string): Client {
  return new Client({ auth: accessToken });
}
```

**Step 2: Commit**

```bash
git add lib/connectors/notion/client.ts
git commit -m "feat: add Notion client factory"
```

---

### Task 3: Notion connector — list accessible pages

**Files:**
- Create: `lib/connectors/notion/pages.ts`

**Step 1: Create the file**

```typescript
import type { Client } from "@notionhq/client";

export interface NotionPageMeta {
  id: string;
  title: string;
  url: string;
  icon: string | null;
}

export async function listAccessiblePages(
  client: Client
): Promise<NotionPageMeta[]> {
  const pages: NotionPageMeta[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.search({
      filter: { property: "object", value: "page" },
      sort: { direction: "descending", timestamp: "last_edited_time" },
      start_cursor: cursor,
      page_size: 100,
    });

    for (const result of response.results) {
      if (result.object !== "page") continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = result as any;
      pages.push({
        id: r.id,
        title: extractTitle(r.properties),
        url: r.url ?? "",
        icon: extractIcon(r.icon),
      });
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return pages;
}

function extractTitle(properties: Record<string, unknown>): string {
  for (const prop of Object.values(properties)) {
    const p = prop as Record<string, unknown>;
    if (p.type === "title" && Array.isArray(p.title)) {
      return (p.title as Array<{ plain_text: string }>)
        .map((t) => t.plain_text)
        .join("");
    }
  }
  return "Untitled";
}

function extractIcon(icon: unknown): string | null {
  if (!icon || typeof icon !== "object") return null;
  const i = icon as Record<string, unknown>;
  if (i.type === "emoji") return i.emoji as string;
  if (i.type === "external") return (i.external as { url: string }).url;
  return null;
}
```

**Step 2: Commit**

```bash
git add lib/connectors/notion/pages.ts
git commit -m "feat: add Notion accessible pages listing"
```

---

### Task 4: Notion connector — block text extraction

**Files:**
- Create: `lib/connectors/notion/extract.ts`

**Step 1: Create the file**

The Notion content model is a tree of blocks. We walk it recursively, extract plain text from all textual block types, and concatenate. This output feeds directly into the existing `embedAndStore()`.

```typescript
import type { Client } from "@notionhq/client";
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

const TEXT_BLOCK_TYPES = new Set([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "to_do",
  "toggle",
  "quote",
  "callout",
  "code",
]);

export async function extractPageText(
  client: Client,
  pageId: string
): Promise<string> {
  const lines: string[] = [];
  await traverseBlocks(client, pageId, lines);
  return lines.join("\n\n");
}

async function traverseBlocks(
  client: Client,
  blockId: string,
  lines: string[]
): Promise<void> {
  let cursor: string | undefined;

  do {
    const response = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results) {
      if (!("type" in block)) continue;
      const b = block as BlockObjectResponse;

      if (TEXT_BLOCK_TYPES.has(b.type)) {
        const text = extractRichText(b);
        if (text.trim()) lines.push(text);
      }

      if (b.has_children) {
        await traverseBlocks(client, b.id, lines);
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);
}

function extractRichText(block: BlockObjectResponse): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content = (block as any)[block.type];
  if (!content || !Array.isArray(content.rich_text)) return "";
  return (content.rich_text as Array<{ plain_text: string }>)
    .map((t) => t.plain_text)
    .join("");
}
```

**Step 2: Commit**

```bash
git add lib/connectors/notion/extract.ts
git commit -m "feat: add Notion block-to-text extractor"
```

---

### Task 5: OAuth redirect route

**Files:**
- Create: `app/api/auth/notion/route.ts`

**Step 1: Create the route**

This route redirects the user to Notion's OAuth authorization page. The `state` parameter encodes the `projectId` and is signed with HMAC to prevent CSRF.

```typescript
import { auth } from "@/auth";
import { createHmac } from "crypto";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const secret = process.env.SESSION_SECRET!;
  const hmac = createHmac("sha256", secret).update(projectId).digest("hex");
  const state = `${projectId}.${hmac}`;

  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID!,
    redirect_uri: process.env.NOTION_REDIRECT_URI!,
    response_type: "code",
    owner: "user",
    state,
  });

  const authUrl = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
```

**Step 2: Manual verification**

With the dev server running, visit:
`http://localhost:3000/api/auth/notion?projectId=test123`

Expected: Browser redirects to `notion.com` authorization page (may show an error about the redirect URI if not configured yet — that's fine, the redirect is working).

**Step 3: Commit**

```bash
git add app/api/auth/notion/route.ts
git commit -m "feat: add Notion OAuth redirect route with HMAC state"
```

---

### Task 6: OAuth callback route

**Files:**
- Create: `app/api/auth/notion/callback/route.ts`

**Step 1: Create the route**

This receives Notion's redirect with `?code=...&state=...`, verifies the HMAC, exchanges the code for an access token, and creates (or updates) a NOTION DataSource on the project.

```typescript
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createHmac } from "crypto";
import { NextResponse } from "next/server";

function verifyState(state: string): string | null {
  const dotIndex = state.lastIndexOf(".");
  if (dotIndex === -1) return null;
  const projectId = state.slice(0, dotIndex);
  const hmac = state.slice(dotIndex + 1);
  if (!projectId || !hmac) return null;
  const expected = createHmac("sha256", process.env.SESSION_SECRET!)
    .update(projectId)
    .digest("hex");
  if (hmac !== expected) return null;
  return projectId;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    console.error("[Notion callback] OAuth error:", error);
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const projectId = verifyState(state);
  if (!projectId) {
    console.error("[Notion callback] invalid HMAC state");
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Ensure project belongs to this user
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Exchange authorization code for access token
  const credentials = Buffer.from(
    `${process.env.NOTION_CLIENT_ID!}:${process.env.NOTION_CLIENT_SECRET!}`
  ).toString("base64");

  const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.NOTION_REDIRECT_URI!,
    }),
  });

  if (!tokenRes.ok) {
    console.error("[Notion callback] token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const token = (await tokenRes.json()) as {
    access_token: string;
    workspace_id: string;
    workspace_name: string;
    workspace_icon: string | null;
    bot_id: string;
  };

  const config = {
    accessToken: token.access_token,
    workspaceId: token.workspace_id,
    workspaceName: token.workspace_name,
    workspaceIcon: token.workspace_icon ?? null,
    botId: token.bot_id,
    selectedPageIds: [] as string[],
    pageMetadata: {} as Record<string, { title: string; url: string }>,
  };

  // Upsert: if a NOTION DataSource already exists for this project, update it
  const existing = await prisma.dataSource.findFirst({
    where: { projectId, type: "NOTION" },
  });

  if (existing) {
    await prisma.dataSource.update({
      where: { id: existing.id },
      data: { config, status: "READY", name: token.workspace_name },
    });
  } else {
    await prisma.dataSource.create({
      data: {
        type: "NOTION",
        name: token.workspace_name,
        config,
        status: "READY",
        projectId,
      },
    });
  }

  // Redirect back to project with flag to open page picker
  const redirectUrl = new URL(`/dashboard/projects/${projectId}`, request.url);
  redirectUrl.searchParams.set("notionConnected", "true");
  return NextResponse.redirect(redirectUrl);
}
```

**Step 2: Commit**

```bash
git add app/api/auth/notion/callback/route.ts
git commit -m "feat: add Notion OAuth callback — token exchange and DataSource upsert"
```

---

### Task 7: Pages listing API route (GET + POST)

**Files:**
- Create: `app/api/projects/[id]/notion/pages/route.ts`

**Step 1: Create the file**

`GET` returns the list of pages accessible to the integration.
`POST` saves the user's selection and triggers the first sync.

```typescript
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";
import { createNotionClient } from "@/lib/connectors/notion/client";
import { listAccessiblePages } from "@/lib/connectors/notion/pages";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

interface NotionConfig {
  accessToken: string;
  selectedPageIds: string[];
  pageMetadata: Record<string, { title: string; url: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  const dataSource = await prisma.dataSource.findFirst({
    where: { projectId, type: "NOTION", project: { userId: session.user.id } },
  });
  if (!dataSource) {
    return NextResponse.json({ error: "Notion not connected" }, { status: 404 });
  }

  const config = dataSource.config as NotionConfig;
  const client = createNotionClient(config.accessToken);

  try {
    const pages = await listAccessiblePages(client);
    return NextResponse.json({ pages });
  } catch (err) {
    console.error("[notion/pages GET] failed:", err);
    return NextResponse.json({ error: "Failed to fetch pages" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  const body = (await request.json()) as {
    selectedPageIds: string[];
    pageMetadata: Record<string, { title: string; url: string }>;
  };

  const dataSource = await prisma.dataSource.findFirst({
    where: { projectId, type: "NOTION", project: { userId: session.user.id } },
  });
  if (!dataSource) {
    return NextResponse.json({ error: "Notion not connected" }, { status: 404 });
  }

  const currentConfig = dataSource.config as Record<string, unknown>;
  await prisma.dataSource.update({
    where: { id: dataSource.id },
    data: {
      config: {
        ...currentConfig,
        selectedPageIds: body.selectedPageIds,
        pageMetadata: body.pageMetadata,
      },
    },
  });

  // Trigger the initial sync immediately
  await inngest.send({
    name: "notion/sync.requested",
    data: { dataSourceId: dataSource.id, projectId },
  });

  return NextResponse.json({ status: "syncing" });
}
```

**Step 2: Commit**

```bash
git add app/api/projects/[id]/notion/pages/route.ts
git commit -m "feat: add Notion pages API — GET list and POST save selection"
```

---

### Task 8: Manual sync API route

**Files:**
- Create: `app/api/projects/[id]/notion/sync/route.ts`

**Step 1: Create the route**

```typescript
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  const dataSource = await prisma.dataSource.findFirst({
    where: { projectId, type: "NOTION", project: { userId: session.user.id } },
  });
  if (!dataSource) {
    return NextResponse.json({ error: "Notion not connected" }, { status: 404 });
  }

  await inngest.send({
    name: "notion/sync.requested",
    data: { dataSourceId: dataSource.id, projectId },
  });

  return NextResponse.json({ status: "syncing" });
}
```

**Step 2: Commit**

```bash
git add app/api/projects/[id]/notion/sync/route.ts
git commit -m "feat: add Notion manual sync API route"
```

---

### Task 9: Inngest sync function

**Files:**
- Create: `lib/inngest/functions/sync-notion.ts`
- Modify: `app/api/inngest/route.ts`

**Step 1: Create the function**

```typescript
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { createNotionClient } from "@/lib/connectors/notion/client";
import { extractPageText } from "@/lib/connectors/notion/extract";
import { embedAndStore } from "@/lib/rag/ingest";

interface SyncNotionEventData {
  dataSourceId: string;
  projectId: string;
}

interface NotionConfig {
  accessToken: string;
  workspaceName: string;
  selectedPageIds: string[];
  pageMetadata: Record<string, { title: string; url: string }>;
}

export const syncNotionFn = inngest.createFunction(
  { id: "sync-notion", retries: 3 },
  { event: "notion/sync.requested" },
  async ({ event, step }) => {
    const { dataSourceId, projectId } = event.data as SyncNotionEventData;

    await step.run("mark-syncing", () =>
      prisma.dataSource.update({
        where: { id: dataSourceId },
        data: { status: "SYNCING" },
      })
    );

    const dataSource = await step.run("load-config", () =>
      prisma.dataSource.findUniqueOrThrow({ where: { id: dataSourceId } })
    );

    const config = dataSource.config as NotionConfig;
    const client = createNotionClient(config.accessToken);

    let totalChunks = 0;

    for (const pageId of config.selectedPageIds) {
      const meta = config.pageMetadata[pageId] ?? { title: "Untitled", url: "" };

      const text = await step.run(`extract-page-${pageId}`, () =>
        extractPageText(client, pageId)
      );

      const chunkCount = await step.run(`embed-page-${pageId}`, async () => {
        // Find or create a Document record for this Notion page
        // We identify pages by their URL (stable per page ID)
        const existing = await prisma.document.findFirst({
          where: { dataSourceId, fileUrl: meta.url },
        });

        const doc = existing
          ? await prisma.document.update({
              where: { id: existing.id },
              data: { name: meta.title, fileSize: text.length, status: "PROCESSING" },
            })
          : await prisma.document.create({
              data: {
                name: meta.title,
                fileUrl: meta.url,
                mimeType: "notion/page",
                fileSize: text.length,
                status: "PROCESSING",
                projectId,
                dataSourceId,
              },
            });

        // Delete stale chunks before re-embedding (clean re-sync)
        await prisma.chunk.deleteMany({ where: { documentId: doc.id } });

        if (!text.trim()) {
          await prisma.document.update({
            where: { id: doc.id },
            data: { status: "READY" },
          });
          return 0;
        }

        const count = await embedAndStore({
          documentId: doc.id,
          text,
          fileName: meta.title,
        });

        await prisma.document.update({
          where: { id: doc.id },
          data: { status: "READY" },
        });

        return count;
      });

      totalChunks += chunkCount;
    }

    await step.run("mark-ready", () =>
      prisma.dataSource.update({
        where: { id: dataSourceId },
        data: { status: "READY", lastSyncedAt: new Date() },
      })
    );

    return { dataSourceId, totalChunks };
  }
);
```

**Step 2: Register the function in `app/api/inngest/route.ts`**

Replace the contents of `app/api/inngest/route.ts` with:

```typescript
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { ingestDocumentFn } from "@/lib/inngest/functions/ingest-document";
import { syncNotionFn } from "@/lib/inngest/functions/sync-notion";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [ingestDocumentFn, syncNotionFn],
});
```

**Step 3: Commit**

```bash
git add lib/inngest/functions/sync-notion.ts app/api/inngest/route.ts
git commit -m "feat: add Notion sync Inngest function and register it"
```

---

### Task 10: React Query hooks

**Files:**
- Create: `hooks/use-notion.ts`

**Step 1: Create the hooks**

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface NotionPageMeta {
  id: string;
  title: string;
  url: string;
  icon: string | null;
}

export function useNotionPages(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["notion-pages", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/notion/pages`);
      if (!res.ok) throw new Error("Failed to fetch Notion pages");
      const data = (await res.json()) as { pages: NotionPageMeta[] };
      return data.pages;
    },
    enabled,
  });
}

export function useSaveNotionPages(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      selectedPageIds: string[];
      pageMetadata: Record<string, { title: string; url: string }>;
    }) => {
      const res = await fetch(`/api/projects/${projectId}/notion/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save page selection");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", projectId] });
    },
  });
}

export function useSyncNotion(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/notion/sync`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to trigger sync");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", projectId] });
    },
  });
}
```

**Step 2: Commit**

```bash
git add hooks/use-notion.ts
git commit -m "feat: add React Query hooks for Notion pages and sync"
```

---

### Task 11: UI — NotionPagePicker modal

**Files:**
- Create: `components/notion/notion-page-picker.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import {
  useNotionPages,
  useSaveNotionPages,
  type NotionPageMeta,
} from "@/hooks/use-notion";

interface NotionPagePickerProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotionPagePicker({
  projectId,
  open,
  onOpenChange,
}: NotionPagePickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: pages, isLoading, error } = useNotionPages(projectId, open);
  const { mutate: savePages, isPending } = useSaveNotionPages(projectId);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSave() {
    if (!pages) return;
    const selectedPageIds = [...selected];
    const pageMetadata = Object.fromEntries(
      pages
        .filter((p) => selected.has(p.id))
        .map((p) => [p.id, { title: p.title, url: p.url }])
    );
    savePages(
      { selectedPageIds, pageMetadata },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Notion pages to index</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <p className="py-4 text-sm text-destructive">
            Failed to load pages. Make sure you shared pages with your Notion
            integration.
          </p>
        )}

        {pages && pages.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">
            No pages found. Share some pages with your Notion integration first,
            then try again.
          </p>
        )}

        {pages && pages.length > 0 && (
          <ScrollArea className="h-64 pr-4">
            <div className="space-y-1">
              {pages.map((page: NotionPageMeta) => (
                <label
                  key={page.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selected.has(page.id)}
                    onCheckedChange={() => toggle(page.id)}
                  />
                  <span className="truncate text-sm">
                    {page.icon && (
                      <span className="mr-1">{page.icon}</span>
                    )}
                    {page.title || "Untitled"}
                  </span>
                </label>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={selected.size === 0 || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Index{" "}
            {selected.size > 0
              ? `${selected.size} page${selected.size > 1 ? "s" : ""}`
              : "pages"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add components/notion/notion-page-picker.tsx
git commit -m "feat: add NotionPagePicker modal"
```

---

### Task 12: UI — NotionDataSourceCard

**Files:**
- Create: `components/notion/notion-datasource-card.tsx`

**Step 1: Create the component**

```tsx
"use client";

import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSyncNotion } from "@/hooks/use-notion";
import { cn } from "@/lib/utils";

interface NotionDataSourceCardProps {
  projectId: string;
  workspaceName: string;
  status: "READY" | "SYNCING" | "ERROR";
  lastSyncedAt: Date | null;
  pageCount: number;
}

export function NotionDataSourceCard({
  projectId,
  workspaceName,
  status,
  lastSyncedAt,
  pageCount,
}: NotionDataSourceCardProps) {
  const { mutate: sync, isPending } = useSyncNotion(projectId);
  const isBusy = isPending || status === "SYNCING";

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Notion "N" logo */}
          <div className="flex h-8 w-8 items-center justify-center rounded bg-white text-sm font-bold text-black">
            N
          </div>
          <div>
            <p className="text-sm font-medium">{workspaceName}</p>
            <p className="text-xs text-muted-foreground">
              {pageCount} page{pageCount !== 1 ? "s" : ""} indexed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === "SYNCING" && (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Syncing
            </Badge>
          )}
          {status === "READY" && (
            <Badge
              variant="outline"
              className="gap-1 border-emerald-500/30 text-emerald-500"
            >
              <CheckCircle2 className="h-3 w-3" />
              Ready
            </Badge>
          )}
          {status === "ERROR" && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Error
            </Badge>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => sync()}
            disabled={isBusy}
            title="Re-sync Notion pages"
          >
            <RefreshCw
              className={cn("h-4 w-4", isBusy && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {lastSyncedAt && (
        <p className="text-xs text-muted-foreground">
          Last synced: {new Date(lastSyncedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/notion/notion-datasource-card.tsx
git commit -m "feat: add NotionDataSourceCard component"
```

---

### Task 13: Wire into the documents page

**Files:**
- Modify: `app/(dashboard)/dashboard/projects/[id]/documents/page.tsx`

**Step 1: Add a hook to fetch the NOTION DataSource**

First add a `useNotionDataSource` query to `hooks/use-notion.ts`:

```typescript
// Add to the bottom of hooks/use-notion.ts

export interface NotionDataSource {
  id: string;
  workspaceName: string;
  status: "READY" | "SYNCING" | "ERROR";
  lastSyncedAt: string | null;
  pageCount: number;
}

export function useNotionDataSource(projectId: string) {
  return useQuery({
    queryKey: ["notion-datasource", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/notion/datasource`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch Notion data source");
      return res.json() as Promise<NotionDataSource>;
    },
  });
}
```

**Step 2: Create the datasource status route**

Create `app/api/projects/[id]/notion/datasource/route.ts`:

```typescript
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface NotionConfig {
  workspaceName: string;
  selectedPageIds: string[];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  const dataSource = await prisma.dataSource.findFirst({
    where: { projectId, type: "NOTION", project: { userId: session.user.id } },
    include: { _count: { select: { documents: true } } },
  });

  if (!dataSource) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const config = dataSource.config as NotionConfig;

  return NextResponse.json({
    id: dataSource.id,
    workspaceName: config.workspaceName,
    status: dataSource.status,
    lastSyncedAt: dataSource.lastSyncedAt?.toISOString() ?? null,
    pageCount: config.selectedPageIds?.length ?? 0,
  });
}
```

**Step 3: Update the documents page**

Replace `app/(dashboard)/dashboard/projects/[id]/documents/page.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { DocumentTable } from "@/components/documents/document-table";
import { UploadZone } from "@/components/documents/upload-zone";
import { NotionPagePicker } from "@/components/notion/notion-page-picker";
import { NotionDataSourceCard } from "@/components/notion/notion-datasource-card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useDeleteDocument, useDocuments } from "@/hooks/use-documents";
import { useNotionDataSource } from "@/hooks/use-notion";
import { useQueryClient } from "@tanstack/react-query";
import { getActiveProjectIdFromPath } from "@/lib/utils";

export default function DocumentsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeProjectId = getActiveProjectIdFromPath(pathname)!;

  const queryClient = useQueryClient();
  const { data: documents, isLoading } = useDocuments(activeProjectId);
  const deleteDocumentMutation = useDeleteDocument(activeProjectId);
  const { data: notionDs } = useNotionDataSource(activeProjectId);

  const [pickerOpen, setPickerOpen] = useState(false);

  // Open page picker automatically after OAuth redirect
  useEffect(() => {
    if (searchParams.get("notionConnected") === "true") {
      setPickerOpen(true);
      router.replace(`/dashboard/projects/${activeProjectId}/documents`);
    }
  }, [searchParams, router, activeProjectId]);

  async function handleDeleteDocument(id: string) {
    try {
      await deleteDocumentMutation.mutateAsync(id);
      toast({ title: "Document deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-8 p-6 overflow-y-scroll">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-4">Documents</h1>
        <UploadZone
          projectId={activeProjectId}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["documents", activeProjectId] })
          }
        />
      </div>

      {/* Notion section */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-4">Notion</h2>
        {notionDs ? (
          <>
            <NotionDataSourceCard
              projectId={activeProjectId}
              workspaceName={notionDs.workspaceName}
              status={notionDs.status as "READY" | "SYNCING" | "ERROR"}
              lastSyncedAt={notionDs.lastSyncedAt ? new Date(notionDs.lastSyncedAt) : null}
              pageCount={notionDs.pageCount}
            />
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs text-muted-foreground"
              onClick={() => setPickerOpen(true)}
            >
              Change page selection
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = `/api/auth/notion?projectId=${activeProjectId}`;
            }}
          >
            Connect Notion
          </Button>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-4">Knowledge Base</h2>
        <DocumentTable
          documents={documents || []}
          onDelete={handleDeleteDocument}
          isLoading={isLoading}
        />
      </div>

      <NotionPagePicker
        projectId={activeProjectId}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
      />
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add app/(dashboard)/dashboard/projects/[id]/documents/page.tsx
git add app/api/projects/[id]/notion/datasource/route.ts
git add hooks/use-notion.ts
git commit -m "feat: wire Notion connection into documents page"
```

---

## End-to-End Test Checklist

Run both servers:
```bash
npm run dev
npx inngest-cli@latest dev   # in a second terminal
```

Walk through the full flow:

1. Navigate to a project → Documents tab
2. Click **"Connect Notion"** → page redirects to Notion auth
3. Authorize the integration → redirected back with page picker open
4. Select 2-3 pages → click **"Index pages"**
5. Check Inngest dashboard at `http://localhost:8288` → `sync-notion` function should appear running
6. Wait for sync to complete → pages appear in the Knowledge Base table with status READY
7. Open a chat → ask a question about content from one of the Notion pages
8. Verify the answer uses content from Notion (check the streamed response)
9. Click the **Sync** (↺) button on the Notion card → a new Inngest run appears
10. Click **"Change page selection"** → picker reopens with current selection cleared

---

## Files Created Summary

| File | Purpose |
|---|---|
| `lib/connectors/notion/client.ts` | Notion SDK factory |
| `lib/connectors/notion/pages.ts` | List accessible pages |
| `lib/connectors/notion/extract.ts` | Blocks → plain text |
| `app/api/auth/notion/route.ts` | OAuth redirect |
| `app/api/auth/notion/callback/route.ts` | Token exchange + DataSource upsert |
| `app/api/projects/[id]/notion/pages/route.ts` | GET pages / POST save selection |
| `app/api/projects/[id]/notion/sync/route.ts` | POST manual sync trigger |
| `app/api/projects/[id]/notion/datasource/route.ts` | GET DataSource status |
| `lib/inngest/functions/sync-notion.ts` | Inngest sync function |
| `hooks/use-notion.ts` | React Query hooks |
| `components/notion/notion-page-picker.tsx` | Page selection modal |
| `components/notion/notion-datasource-card.tsx` | Connection status card |
| **Modified** `app/api/inngest/route.ts` | Register syncNotionFn |
| **Modified** `app/(dashboard)/dashboard/projects/[id]/documents/page.tsx` | Wire UI |
