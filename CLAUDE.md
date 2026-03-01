# RelyRAG — CLAUDE.md

RAG-as-a-Service app. Users upload documents, which are chunked, embedded, and stored as vectors. They then chat with their documents via a streaming AI interface powered by Google Gemini.

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript (strict mode) |
| Package manager | npm |
| Database | PostgreSQL + pgvector |
| ORM | Prisma 6 with PrismaPg adapter |
| Auth | NextAuth.js v5 beta — Google OAuth, PrismaAdapter |
| AI/LLM | Google Gemini via `@ai-sdk/google` — gemini-2.5-flash (streaming), gemini-2.0-flash (query rewriting), gemini-embedding-001 (embeddings, 3072 dims) |
| File storage | Supabase Storage |
| Background jobs | Inngest v3 — async document ingestion with retries |
| Data fetching | TanStack React Query v5 |
| Styling | Tailwind CSS v4, oklch color tokens, shadcn/ui (radix-nova) |
| Icons | Lucide React |

## Key Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run db:generate  # prisma generate
npm run db:push      # push schema (no migration)
npm run db:migrate   # create migration
npm run db:studio    # prisma studio
```

## Project Structure

```
app/
  (auth)/login/               # Login page (Google OAuth)
  (dashboard)/dashboard/      # Authenticated area
    layout.tsx                # Sidebar layout — fetches projects server-side
    projects/[id]/chat/[chatId]/page.tsx  # Chat page
  api/projects/[id]/
    chat/route.ts             # POST: stream RAG response
    chats/route.ts            # GET/POST chats
    documents/route.ts        # GET/DELETE documents
    upload/route.ts           # POST: ingest document

components/
  chat/                       # ChatPanel, ChatMessages, ChatMessage, ChatInput
  common/formatted-response.tsx  # Markdown + KaTeX renderer
  documents/file-type-icon.tsx   # FileTypeIcon component + getFileTypeConfig(mimeType) → {label, Icon, containerClass, iconClass, chipClass}
  sidebar/                    # Main nav sidebar
  ui/                         # shadcn primitives

hooks/
  use-chat-stream.ts          # Streams AI response, parses Vercel AI SDK format
  use-projects.ts / use-chats.ts / use-documents.ts  # React Query CRUD hooks

lib/
  prisma.ts                   # Prisma singleton
  supabase.ts                 # Supabase storage client
  rate-limit.ts               # Sliding-window in-memory rate limiter
  connectors/
    types.ts                  # TextExtractor interface
    extractors/               # pdf.ts, docx.ts, index.ts (registry + extractText)
  inngest/
    client.ts                 # Inngest singleton (id: "rely")
    functions/
      ingest-document.ts      # 4-step job: mark-processing → download-extract → embed-store → mark-ready
  rag/
    ingest.ts                 # Composable: downloadFile, chunkText, embedAndStore + legacy ingestDocument
    query.ts                  # Rewrite → retrieve (RRF) → rerank → stream
    rerank.ts                 # Re-ranking top candidates

app/api/inngest/route.ts      # Inngest serve handler (GET/POST/PUT)

middleware.ts                 # Edge middleware — redirects unauthenticated /dashboard/* to /login

prisma/schema.prisma          # User, Project, DataSource, Document (with status), Chunk, Chat, Message
types/index.ts                # Shared TypeScript interfaces
auth.ts                       # NextAuth config
```

## Architecture Notes

### RAG Pipeline
1. **Ingest (async)**: Upload route → file validation + Supabase upload + `Document{status:PENDING}` + Inngest event → returns in <100ms. Inngest job: mark PROCESSING → download + extract (via connector) → `embedAndStore` (chunk=1000/400, embed, SQL insert batches of 50) → mark READY
2. **Connectors**: `lib/connectors/extractors/` — `pdf.ts` (pdf-parse), `docx.ts` (mammoth). Adding a new format = add an extractor, zero pipeline changes
3. **Query**: rewrite question with last 4 turns → hybrid retrieval (vector `<=>` + `to_tsvector`, RRF k=60, top 10) → rerank to top 5 → streamText with Gemini
4. Chunks stored in `public` Supabase bucket at `userId/projectId/uuid-filename`
5. **DataSource**: each Project has a `DataSource{type:FILE}` that groups its uploaded documents. NOTION is implemented — see `lib/inngest/functions/sync-notion.ts` and `hooks/use-notion.ts`.

### Streaming
- API returns a Vercel AI SDK data stream
- `use-chat-stream.ts` reads `Response.body`, parses lines prefixed `0:"..."`, accumulates content
- AbortController wired to a stop button
- Server saves both messages to DB after stream completes

### Chat Layout (important)
- `SidebarProvider` in `dashboard/layout.tsx` has `className="h-svh overflow-hidden"` — this is what locks the layout to viewport height and makes the chat panel header/footer sticky
- `ChatPanel` uses flex-col with `flex-1 min-h-0` on the messages wrapper
- `ChatMessages` scroll container is `flex-1 min-h-0 overflow-y-auto overflow-x-hidden`
- Gradient fade overlays are absolutely positioned inside the messages wrapper

### Notion Integration
- Notion documents use `mimeType: "notion/page"` — check this when handling file types
- `useNotionDataSource` polls every 2s while `status === "SYNCING"` (mirrors `useDocuments` pattern)
- `useSyncNotion.onSuccess` must invalidate both `["documents"]` and `["notion-datasource"]` query keys
- OAuth entry point: `/api/auth/notion?projectId=...`

### Inngest — Critical Pattern
- API routes MUST update DB status **before** `inngest.send()`, not after. If the status update happens inside the Inngest job's first step, the client-side polling never activates (race condition: `onSuccess` refetches before the job starts).
- Upload route sets `Document{status:PENDING}` → then `inngest.send()`. Notion sync sets `DataSource{status:SYNCING}` → then `inngest.send()`. Follow this for any new Inngest integration.

### Async Ingestion (Inngest)
- Run Inngest dev server: `npx inngest-cli@latest dev` alongside `npm run dev`
- Dashboard at `http://localhost:8288` — inspect function runs, retries, step outputs
- The upload route returns `{ documentId, status: "processing" }` immediately
- `useDocuments` polls every 2s while any document has status PENDING or PROCESSING
- `DocumentCard` shows spinner for PENDING/PROCESSING, error badge for ERROR

### API Versioning
- `/api/v1/*` is a rewrite alias for `/api/*` — configured in `next.config.ts`
- Physical routes stay in `app/api/` — no duplication

### Rate Limiting
- `lib/rate-limit.ts` — sliding window, in-memory (single-instance only)
- Chat: 20 req/min per userId; Upload: 10 req/min per userId
- Returns 429 with `Retry-After` header in seconds
- For multi-instance production: replace Map with `@upstash/ratelimit` + Redis

### Auth
- Session extended with `user.id` via NextAuth session callback
- All API routes guard with `await auth()` and verify resource ownership by `userId`
- `middleware.ts` — edge-compatible cookie check for dashboard redirect only (soft protection)

### Conventions
- API errors return generic messages to client; details logged server-side
- Zod validation on both client (UX) and server (security)
- Path alias `@/*` maps to project root
- `cn()` utility (clsx + tailwind-merge) used throughout
- Raw SQL (`$queryRawUnsafe`) for vector operations only — everything else uses Prisma
- Dark mode forced via `.dark` class on `<html>`
- Navigation links styled as buttons: `<Link className={buttonVariants({...})}>` — never nest `<Link>` inside `<Button>`
- Tailwind v4: use integer opacity `bg-primary/2` not `bg-primary/[0.02]`
- `git add` paths with brackets must be quoted: `git add 'app/api/projects/[id]/route.ts'`
- `removeExtension(filename)` in `lib/utils.ts` — strips extension for display names
