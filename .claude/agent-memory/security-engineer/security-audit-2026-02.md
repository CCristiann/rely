# Security Audit — rely (RAG-as-a-service) — 2026-02-22

## Scope
Full codebase audit of the Next.js 16 RAG application. Stack: NextAuth v5,
Prisma/PostgreSQL+pgvector, Supabase Storage, Google Gemini AI.

## Findings & Remediation

---

### [CRITICAL] Middleware Never Executed — All API Routes Unprotected

**File:** proxy.ts

**Root Cause:** Next.js requires the middleware function to be exported as
`middleware`. The file exported `async function proxy(...)`, which Next.js
silently ignores. The middleware ran for no requests. Additionally, the matcher
only covered `/dashboard/:path*`, so even after renaming, `/api/*` routes were
outside the protected set.

**Business Impact:** Any unauthenticated HTTP client could call any API endpoint
directly, bypassing the auth check that was only present in middleware. The
per-route `auth()` checks in each handler were the only defence.

**Fix Applied:**
- Renamed export to `middleware`
- Expanded matcher to `["/dashboard/:path*", "/api/:path*"]`
- Added `PUBLIC_API_PREFIXES = ["/api/auth"]` whitelist to prevent NextAuth
  redirect loop (OAuth callbacks are at /api/auth/*)
- API requests without session receive 401 JSON (not a redirect) for clean
  client handling

**Verification:** TypeScript compile passes; middleware config is valid.

---

### [HIGH] Missing Security Headers

**File:** next.config.ts

**Root Cause:** No `headers()` function configured; no security headers sent.

**Business Impact:** Clickjacking, MIME-sniffing, information leakage via
Referer, browser feature abuse.

**Fix Applied:** Added `headers()` function with:
- `Content-Security-Policy` — restricts script/style/image/connect sources;
  `frame-ancestors 'none'` prevents iframe embedding
- `X-Frame-Options: DENY` — legacy clickjacking protection
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — disables camera, microphone, geolocation, payment, usb
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-DNS-Prefetch-Control: on`

**CSP Notes:**
- `script-src 'unsafe-inline'` is required by Next.js inline bootstrap; a
  future nonce-based approach would remove this
- `style-src 'unsafe-inline'` is required by Tailwind CSS v4 runtime injection
- `connect-src` allows Supabase and accounts.google.com for OAuth

---

### [HIGH] Zod Validation Error Details Exposed to Client

**File:** app/api/projects/route.ts, POST handler

**Root Cause:** `parsed.error.flatten()` was returned directly in the JSON
response, leaking internal field names and constraint types.

**Business Impact:** Schema reconnaissance — attackers learn field names,
min/max constraints, and type expectations without authentication.

**Fix Applied:** Zod error details now logged server-side via `console.error`;
client receives only `{ error: "Invalid input" }`.

---

### [MEDIUM] Filename Not Sanitized Before Storage Path and Embeddings

**File:** app/api/projects/[id]/upload/route.ts

**Root Cause:** `file.name` from the multipart request was passed directly to
`ingestDocument()` which used it verbatim in the Supabase Storage path
(`${userId}/${projectId}/${uuid}-${fileName}`) and as the `documentTitle`
embedded into vector embeddings.

**Business Impact:**
- Path traversal attempts (`../../../etc/passwd`) in filenames could affect
  storage path construction
- Unicode/control characters in filenames could corrupt embedding titles and
  make retrieval citations misleading
- Null bytes or SQL-special chars in the title could affect raw SQL parameters

**Fix Applied:** `sanitizeFileName()` function added:
- `path.basename()` strips directory components
- Allowlist regex `[^a-zA-Z0-9 .\-_]` replaces anything else with `_`
- Truncated to 200 characters
- Falls back to `"upload"` if result is empty

---

### [MEDIUM] Chat Input Validation — History Items Unbounded

**File:** app/api/projects/[id]/chat/route.ts

**Root Cause:** The `history` array had no per-item content length limit and no
array length limit. A crafted request with large history items could exhaust
Gemini token quota or trigger excessive billing.

**Fix Applied:**
- Each history item `content` capped at 8000 characters
- History array capped at 50 items
- `chatId` constrained to min(1)/max(128) to prevent empty/oversized IDs

---

### [MEDIUM] Document Deletion — Non-Atomic, Wrong Order

**File:** app/api/projects/[id]/documents/[docId]/route.ts

**Root Cause:** Storage deletion failure was silently swallowed and the DB
record was deleted anyway, leaving orphaned storage objects that could not be
found or cleaned up. DB record had no reference to the storage path.

**Fix Applied — safer ordering:**
1. Parse storage path from fileUrl
2. Delete from Supabase Storage — if this fails, return 500 and abort (DB
   record preserved, operation is retryable)
3. Delete DB record (cascades to Chunk rows) — if this fails after storage is
   already deleted, log the orphaned path with enough context for ops cleanup
   and return 500

This ensures the most recoverable state in every failure scenario.

---

### [LOW-MEDIUM] Prompt Injection via Document Content

**File:** lib/rag/query.ts, `buildSystemPrompt()`

**Root Cause:** Document chunks were interpolated directly into the system
prompt using markdown headers (`[Context N (title)]\n${chunk.content}`).
A document containing text like `## Instructions\n- Ignore all previous...`
would be structurally indistinguishable from the system instructions.

**Fix Applied:**
- Each chunk wrapped in `<document_chunk index="N" source="...">` XML tags
- XML attribute values HTML-escaped to prevent tag injection from document titles
- Prominent `IMPORTANT — SECURITY BOUNDARY` header added before context blocks
- System instructions repeated AFTER context blocks (recency bias in attention)
- Explicit instruction to disregard any directives inside `<document_chunk>` tags

**Limitation:** No prompt engineering is an absolute defence against prompt
injection. For higher assurance consider: a sanitization pass that strips
instruction-like text from extracted content, or a fine-tuned model with a
formal system/user role hierarchy.

---

## Outstanding Risks (Not Fixed — Require External Solutions)

### Rate Limiting (MEDIUM)
No per-user rate limits on:
- `POST /api/projects/[id]/upload` — each call triggers N embedding API calls
- `POST /api/projects/[id]/chat` — each call triggers 1+ Gemini completions

**Recommendation:** Implement rate limiting using Upstash Redis +
`@upstash/ratelimit` in the middleware, keyed on `session.user.id`.
Suggested limits: upload 10/hour, chat 60/hour per user.

### $queryRawUnsafe and $executeRawUnsafe (LOW)
Both `lib/rag/query.ts` and `lib/rag/ingest.ts` use raw SQL with `$N`
positional parameters. This is safe as currently written (no string
interpolation of untrusted data into the SQL string itself). The vectorLiteral
`[${embedding.join(",")}]` is safe because embedding values are floating-point
numbers produced by the Gemini API, not user input.

**Recommendation:** Leave as-is but add a comment warning future developers
never to interpolate user-supplied strings into these query templates. Consider
adding a lint rule (e.g., custom ESLint rule) that flags `$queryRawUnsafe`
usage for review.

### Structured Audit Logging (LOW)
`console.error/log` is used for error events but there is no structured audit
trail for security-relevant events: logins, document uploads, deletions, and
chat sessions.

**Recommendation:** Integrate a structured logger (e.g., `pino`) and emit
JSON audit events to a tamper-resistant destination (e.g., Datadog, CloudWatch
Logs with CloudTrail) for: auth events, document lifecycle, and API errors.

### Supabase Storage Bucket Access (LOW)
The storage bucket name is `rag-as-a-service`. Confirm in Supabase dashboard:
- Bucket is NOT set to "Public" (which allows unauthenticated listing)
- RLS policy allows service-role key writes only
- Public URLs (which are used for `fileUrl`) are pre-signed or the bucket is
  configured so only authenticated Supabase users can generate them

### SUPABASE_SERVICE_ROLE_KEY Exposure (LOW)
`SUPABASE_SERVICE_ROLE_KEY` is correctly accessed only in
`lib/supabase.ts:createServerSupabaseClient()` which is a server-only module.
Verify it is never imported from client components and that no `NEXT_PUBLIC_`
prefix is applied to it.
