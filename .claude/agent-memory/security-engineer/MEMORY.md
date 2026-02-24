# Security Engineer Memory — rely (RAG-as-a-service)

## Project Overview
- Next.js 16 app, NextAuth v5 (Google OAuth), Prisma/PostgreSQL+pgvector, Supabase Storage, Gemini AI
- Multi-tenant RAG: users upload PDF/DOCX, chat with AI over their documents
- See: security-audit-2026-02.md for full findings and remediation record

## Completed Security Audit (2026-02-22)
All items below were implemented and verified (tsc --noEmit passes).
See security-audit-2026-02.md for full details.

### CRITICAL Fixed
- proxy.ts: renamed `proxy` -> `middleware` (Next.js silently ignored old name)
- proxy.ts: matcher expanded from [/dashboard/*] to [/dashboard/*, /api/*]
- proxy.ts: /api/auth whitelist added to prevent NextAuth redirect loop

### HIGH Fixed
- next.config.ts: full security headers suite added (CSP, HSTS, X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- app/api/projects/route.ts: Zod error details no longer sent to client

### MEDIUM Fixed
- upload/route.ts: filename sanitized via path.basename + allowlist regex before
  reaching storage path and embedding title
- chat/route.ts: history items capped at 8000 chars each, max 50 items
- documents/[docId]/route.ts: deletion order reversed — storage first, DB second
  with proper error surfacing and orphan logging
- lib/rag/query.ts: chunks wrapped in <document_chunk> XML delimiters with
  explicit security boundary instructions to mitigate prompt injection

### Outstanding (require external solutions)
- Rate limiting: no per-user limits on /api/*/upload or /api/*/chat
  → Implement via Upstash Redis + @upstash/ratelimit or Vercel Edge Middleware
- $queryRawUnsafe / $executeRawUnsafe in lib/rag/*.ts use prepared statements
  with positional params ($1..$N) — safe as used, but monitor for future changes
- SUPABASE_SERVICE_ROLE_KEY used server-side only (correct); verify it never
  reaches client bundle (check `NEXT_PUBLIC_` env var discipline)
- No structured audit logging — add structured JSON logs for auth events,
  document upload, and deletion operations
- Supabase Storage bucket: confirm RLS is configured so only service-role key
  can write (public read on fileUrl is by design for download links)

## Key File Paths
- /Users/cristiancirje/Desktop/rely/proxy.ts — Next.js middleware
- /Users/cristiancirje/Desktop/rely/next.config.ts — security headers
- /Users/cristiancirje/Desktop/rely/lib/rag/query.ts — RAG + system prompt
- /Users/cristiancirje/Desktop/rely/lib/rag/ingest.ts — upload pipeline
- /Users/cristiancirje/Desktop/rely/app/api/projects/[id]/upload/route.ts
- /Users/cristiancirje/Desktop/rely/app/api/projects/[id]/chat/route.ts
- /Users/cristiancirje/Desktop/rely/app/api/projects/[id]/documents/[docId]/route.ts
