# Notion Integration Design

**Date:** 2026-02-28
**Feature:** Connect Notion workspace and enable semantic search on Notion pages
**Status:** Approved

---

## Context

RelyRAG is a RAG-as-a-Service app. Users upload documents that are chunked, embedded, and stored as vectors, then chat with them via Gemini. The goal is to extend this pipeline to support Notion as a data source, so users can semantically search their Notion pages alongside uploaded files.

---

## Decisions

| Question | Decision |
|---|---|
| Connection scope | Per-project (each project connects its own Notion workspace) |
| Page selection | Manual — user picks pages from a list after OAuth |
| Sync strategy | Manual only — user clicks "Sync" to re-index |
| OAuth flow location | Inside the project, when adding a data source |
| Schema changes | None — `NOTION` enum already exists, `DataSource.config: Json` used for token + page selection |

---

## Architecture

### 1. Schema

No Prisma schema changes required. The existing `DataSource` model handles everything:

- `type: NOTION` — already in the `DataSourceType` enum
- `status: DataSourceStatus` — `READY | SYNCING | ERROR` already present
- `lastSyncedAt: DateTime?` — already present
- `config: Json` — stores all Notion-specific data

**`DataSource.config` shape for NOTION type:**

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
    "page-id-2": { "title": "Product Roadmap", "url": "https://notion.so/..." }
  }
}
```

Each selected Notion page becomes a `Document` record:
- `name` = page title
- `fileUrl` = Notion page URL
- `mimeType` = `"notion/page"`
- `dataSourceId` = linked to the NOTION DataSource

### 2. OAuth Flow

**New routes:**

```
app/api/auth/notion/route.ts            # GET → redirect to Notion OAuth
app/api/auth/notion/callback/route.ts   # GET → exchange code, save DataSource, redirect
app/api/projects/[id]/notion/pages/route.ts  # GET → list accessible pages
app/api/projects/[id]/notion/sync/route.ts   # POST → trigger manual sync
```

**Step-by-step flow:**

```
1. User clicks "Connetti Notion" inside a project
2. GET /api/auth/notion?projectId=xxx
   → redirect to https://api.notion.com/v1/oauth/authorize
     with: client_id, redirect_uri, response_type=code
     and:  state = `${projectId}.${hmac(projectId, SESSION_SECRET)}`
3. User authorizes on Notion → redirect to:
   GET /api/auth/notion/callback?code=yyy&state=projectId.hmac
4. Server verifies HMAC (CSRF protection), then:
   POST https://api.notion.com/v1/oauth/token
   → receives { access_token, workspace_id, workspace_name, bot_id, ... }
5. Creates DataSource{ type: NOTION, config: { accessToken, workspaceId, ... } }
6. Redirects to /dashboard/projects/[id]?notionConnected=true
7. Frontend detects ?notionConnected=true → opens page-picker modal
```

**Security:** The `state` parameter is signed with HMAC-SHA256 using a `SESSION_SECRET` env var. The callback verifies the signature before processing to prevent CSRF attacks.

**Required env vars:**
```
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
NOTION_REDIRECT_URI=http://localhost:3000/api/auth/notion/callback
SESSION_SECRET=   # for HMAC state signing
```

### 3. Content Extraction

**New module: `lib/connectors/notion/`**

```
lib/connectors/notion/
  client.ts    # createNotionClient(accessToken): Client
  extract.ts   # extractPageText(client, pageId): Promise<string>
  pages.ts     # listAccessiblePages(client): Promise<PageMeta[]>
```

**Extraction logic (`extract.ts`):**

Notion content is a hierarchy of blocks. The extractor:
1. `GET /v1/blocks/{pageId}/children` (paginated via SDK)
2. For each block with `has_children: true` → recurse
3. Extract `rich_text[].plain_text` from text block types:
   `paragraph`, `heading_1`, `heading_2`, `heading_3`,
   `bulleted_list_item`, `numbered_list_item`, `to_do`,
   `toggle`, `quote`, `callout`, `code`
4. Ignore non-text blocks: `image`, `divider`, `embed`, `video`, etc.
5. Return concatenated plain text string

The extracted text is passed directly to the existing `embedAndStore()` function — no changes to the core RAG pipeline.

**npm dependency:** `@notionhq/client` (official SDK — handles pagination and rate limiting automatically)

### 4. Inngest Sync Function

**New function: `lib/inngest/functions/sync-notion.ts`**

```
Event:   "notion/sync.requested"
Payload: { dataSourceId, projectId, userId }
Retries: 3

Steps:
  1. "mark-syncing"
     → DataSource.status = SYNCING

  2. "fetch-pages" (for each selectedPageId in config)
     → extractPageText(notionClient, pageId) via lib/connectors/notion/extract.ts
     → upsert Document{ name, fileUrl, mimeType:"notion/page", status:PENDING }

  3. "embed-and-store" (for each document)
     → delete existing Chunk records for this document (clean re-index)
     → call embedAndStore() (existing function, no changes)
     → Document.status = READY

  4. "mark-ready"
     → DataSource.status = READY
     → DataSource.lastSyncedAt = now()
```

**Sync triggers:**
- Automatically after user saves page selection (first-time)
- Manually via "Sync" button → `POST /api/projects/[id]/notion/sync`

### 5. UI Changes

**A. Add Data Source section (existing project view)**

Add "Notion" option alongside the existing file upload. Clicking it initiates the OAuth flow.

**B. NOTION DataSource Card**

New card component (similar to DocumentCard) showing:
- Notion icon + workspace name
- Status badge: `SYNCING` (spinner) / `READY` (last synced time) / `ERROR`
- Collapsible list of indexed pages (title + Notion link)
- "Sync" button → triggers manual re-sync
- "Disconnect" button → deletes DataSource + all associated Documents/Chunks

**C. Page Picker Modal**

Opens after OAuth redirect (`?notionConnected=true` detected):
- Fetches `GET /api/projects/[id]/notion/pages`
- Scrollable checkbox list: page title + icon
- "Indicizza pagine selezionate" button → saves `selectedPageIds` to config + triggers sync
- Empty state: guide on how to share pages with the Notion integration

**D. No changes to RAG query pipeline**

`lib/rag/query.ts` filters chunks by `projectId` — Notion chunks are indexed identically to file chunks and appear automatically in semantic search results.

---

## File Map

| File | Action |
|---|---|
| `app/api/auth/notion/route.ts` | New — OAuth redirect |
| `app/api/auth/notion/callback/route.ts` | New — token exchange + DataSource creation |
| `app/api/projects/[id]/notion/pages/route.ts` | New — list accessible pages |
| `app/api/projects/[id]/notion/sync/route.ts` | New — trigger sync |
| `lib/connectors/notion/client.ts` | New — Notion SDK factory |
| `lib/connectors/notion/extract.ts` | New — blocks → plain text |
| `lib/connectors/notion/pages.ts` | New — list pages |
| `lib/inngest/functions/sync-notion.ts` | New — Inngest sync function |
| `lib/inngest/client.ts` | Edit — register new function |
| `components/notion/` | New — DataSource card + page picker modal |
| `hooks/use-notion.ts` | New — React Query hooks for pages + sync |
| `.env.local` | Edit — add NOTION_CLIENT_ID, NOTION_CLIENT_SECRET, NOTION_REDIRECT_URI, SESSION_SECRET |
| `package.json` | Edit — add `@notionhq/client` |

---

## What Does NOT Change

- `prisma/schema.prisma` — no modifications needed
- `lib/rag/query.ts` — semantic search works as-is
- `lib/rag/ingest.ts` → `embedAndStore()` — reused directly
- `components/chat/` — no changes
- `app/api/projects/[id]/chat/route.ts` — no changes
