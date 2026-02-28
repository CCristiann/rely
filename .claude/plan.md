# RelyRAG — Piano di miglioramento

Analisi condotta il 24/02/2026 con 3 agenti in parallelo (frontend, backend, RAG pipeline).

---

## Stato avanzamento

| Priorità | Completati | Rimanenti |
|----------|-----------|-----------|
| P0 | ✅ 4/4 | — |
| P1 | ✅ 6/7 (⚠️ #6 già ok) | — |
| P2 | ✅ 5/9 | ❌ soft-delete, dedup |
| Strategici | — | non iniziati |

---

## 🔴 P0 — Critici

| # | Problema | File | Stato |
|---|----------|------|-------|
| 1 | **Middleware mal posizionato** — `proxy.ts` invece di `middleware.ts` | `proxy.ts` | ✅ SKIP — già corretto |
| 2 | **XSS nel renderer Markdown** — `rehypeRaw` senza sanitizzazione | `formatted-response.tsx` | ✅ Done — `rehype-sanitize` aggiunto |
| 3 | **Route inesistenti nel sidebar** — link a `/dashboard/settings` e `/dashboard/projects/[id]/settings` → 404 | `sidebar/index.tsx`, `sidebar/UserButton.tsx` | ✅ Done — link rimossi |
| 4 | **Chat rename: UI senza backend** — dialog Save che non fa nulla | `RecentChat.tsx`, `use-chats.ts` | ✅ Done — PATCH API + `useRenameChat` hook |

---

## 🟠 P1 — Importanti

| # | Problema | Stato |
|---|----------|-------|
| 5 | **Race condition streaming** — connessione cade a metà, messaggio utente senza risposta nel DB | ✅ Done — placeholder AI creato prima dello stream |
| 6 | **Cronologia chat persa al refresh** | ✅ SKIP — già implementato correttamente |
| 7 | **Nessuna paginazione messaggi** — OOM su chat lunghe | ✅ Done — last 50 messages |
| 8 | **File orfani in Supabase** — DB fail dopo upload lascia file in storage | ✅ Done — cleanup on error |
| 9 | **`req.json()` non protetto** — JSON malformato → crash in 3 route handler | ✅ Done — 400 invece di throw |
| 10 | **Upload queue persa al refresh** — stato solo in-memory | ✅ Done — auto-remove dopo 4s, DB è source of truth |
| 11 | **Document actions solo su hover** — touch device non accede al menu | ✅ Done — rimosso `opacity-0 group-hover:opacity-100` |

---

## 🟡 P2 — Qualità e Scalabilità

### RAG Pipeline

| # | Problema | Stato |
|---|----------|-------|
| 12 | **Citazioni strutturate** — prompt dice "cita i file" ma AI non ha metadati | ⏭️ SKIP — troppo architetturale |
| 13 | **Embedding non in batch** — 1 API call per chunk invece di batch 20-50 | ✅ Done — `batchEmbedContents` |
| 14 | **Nessuna deduplicazione documenti** — stesso file uploadabile N volte | ❌ Non iniziato |
| 15 | **Reranking LLM ad ogni query** — 100-500ms extra + costi API scalabili | ⏭️ SKIP — troppo architetturale |

### Infrastructure

| # | Problema | Stato |
|---|----------|-------|
| 16 | **Rate limiting in-memory** — non funziona su Vercel multi-istanza | ✅ Done — `@upstash/ratelimit` |
| 17 | **Nessuna virtualizzazione messaggi** (`@tanstack/react-virtual`) | ⏭️ SKIP — non prioritario |

### Frontend / DX

| # | Problema | Stato |
|---|----------|-------|
| 18 | **Syntax highlighting + copy button** nei blocchi codice | ✅ Done — `rehype-highlight` |
| 19 | **Typo font** — `--font-eb-gamond` → `--font-eb-garamond` | ✅ Done |
| 20 | **Bare `catch {}` blocks** che swallowano errori silenziosamente | ⏭️ SKIP |

### Schema / Dati

| # | Problema | Stato |
|---|----------|-------|
| 23 | **Soft-delete documenti** — hard delete perde i chunk, nessun audit trail | ⚠️ PARZIALE — `deletedAt DateTime?` aggiunto allo schema, **ma non applicato in app code** |
| 24 | **`errorMessage` su Document** — nessun campo per salvare il messaggio di errore Inngest | ✅ Done — campo aggiunto allo schema |

---

## ❌ Soft-delete — da completare

Il campo `deletedAt DateTime?` è già nello schema (`prisma/schema.prisma:127`). Manca:

1. **`GET /api/projects/[id]/documents`** — aggiungere `where: { deletedAt: null }` al findMany
2. **`DELETE /api/projects/[id]/documents`** — sostituire `delete` con `update { deletedAt: new Date() }`
3. **`lib/rag/query.ts`** — nella raw SQL query RRF, aggiungere join/filter per escludere chunk di documenti con `deletedAt IS NOT NULL`

---

## 🔵 Strategici (roadmap)

Feature completamente mancanti:
- **"Vedi fonti" cliccabili** — mostrare i chunk usati nella risposta
- **Regenerate response**
- **Feedback 👍/👎** per le risposte
- **Connettori Notion/Google Drive** (schema `DataSourceType` già pronto)
- **Cost tracking per utente**
- **Export chat**
- **Supporto PPTX/TXT/Markdown** (aggiungere extractor in `lib/connectors/extractors/`)

---

> Tutto il lavoro P0+P1+P2 è sul branch `main`, non committato.
