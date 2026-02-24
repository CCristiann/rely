# RAG Architecture — Rely

Documentazione tecnica del sistema di Retrieval-Augmented Generation (RAG) di Rely.

---

## Indice

1. [Panoramica](#panoramica)
2. [Stack tecnologico](#stack-tecnologico)
3. [Pipeline di ingestion](#pipeline-di-ingestion)
4. [Pipeline di query](#pipeline-di-query)
5. [Parametri configurabili](#parametri-configurabili)
6. [Decisioni di design](#decisioni-di-design)
7. [Migration database](#migration-database)
8. [Troubleshooting](#troubleshooting)

---

## Panoramica

Rely è un sistema RAG multi-progetto che permette di caricare documenti (PDF, DOCX), creare una knowledge base vettoriale per progetto, e interrogarla via chat con risposte generate da Gemini AI.

```
UPLOAD                          QUERY
──────                          ─────
File (PDF/DOCX)                 Domanda utente
    │                               │
    ▼                               ▼
Estrazione testo              Rewrite query (LLM)
    │                               │
    ▼                               ▼
Chunking (1000 chars)         Hybrid retrieval
    │                          ├─ Semantico (vettori)
    ▼                          └─ Keyword (full-text)
Embedding con titolo               │
(gemini-embedding-001)             ▼
    │                         Re-ranking (LLM)
    ▼                               │
Salvataggio in PostgreSQL           ▼
(pgvector + tsvector)         Build context window
                                    │
                                    ▼
                              Generazione streaming
                              (gemini-2.5-flash)
```

---

## Stack tecnologico

| Componente | Tecnologia |
|------------|------------|
| Embedding | Google `gemini-embedding-001` (3072 dim) |
| Generazione | Google `gemini-2.5-flash` |
| Query rewriting / Re-ranking | Google `gemini-2.0-flash` |
| Vector database | PostgreSQL + pgvector |
| Full-text search | PostgreSQL tsvector (indice GIN) |
| Vector index | HNSW (Hierarchical Navigable Small World) |
| ORM | Prisma |
| File storage | Supabase Storage |
| Chunking | LangChain `RecursiveCharacterTextSplitter` |

---

## Pipeline di ingestion

**File:** `lib/rag/ingest.ts`

### Flusso

```
1. Upload → Supabase Storage
2. Crea record Document in PostgreSQL
3. Estrai testo (pdf-parse / mammoth)
4. Sanificazione (strip null bytes)
5. Chunking (1000 chars, overlap 400)
6. Per ogni chunk:
   a. Prepend titolo: "Source: {fileName}\n\n{chunk}"
   b. Embedding via gemini-embedding-001
   c. INSERT in Chunk (content, embedding, chunkIndex, documentTitle)
   d. search_vector generata automaticamente da PostgreSQL
```

### Dettagli chunking

- **Dimensione chunk:** 1000 caratteri
- **Overlap:** 400 caratteri (il 40% di sovrapposizione riduce perdite di contesto ai bordi)
- **Strategia:** `RecursiveCharacterTextSplitter` prova a dividere su `\n\n`, poi `\n`, poi `. `, poi ` `
- **Prefisso embedding:** il titolo del documento viene anteposto al testo prima dell'embedding (non viene memorizzato nel DB). Questo migliora la retrieval accuracy perché il vettore cattura anche "da quale documento proviene" questa informazione.
- **Batch size:** 50 chunk per chiamata all'API di embedding (rate limit)

### Schema Chunk

```prisma
model Chunk {
  id            String   -- UUID
  content       String   -- testo del chunk (senza prefisso titolo)
  embedding     vector(3072)  -- vettore gemini-embedding-001
  documentId    String   -- FK → Document
  chunkIndex    Int      -- posizione ordinale nel documento
  documentTitle String   -- nome del file sorgente
  search_vector tsvector -- generata automaticamente (GENERATED ALWAYS STORED)
  createdAt     DateTime
}
```

---

## Pipeline di query

**File:** `lib/rag/query.ts`, `lib/rag/rerank.ts`

### Flusso

```
1. Rewrite query (se conversazione multi-turno)
2. Embedding query riscritta
3. Hybrid retrieval (top-10 candidati)
   ├─ Semantico: cosine similarity via pgvector
   │   └─ filtro: similarity > 0.45
   └─ Keyword: ts_rank via tsvector
       └─ plainto_tsquery('simple', query)
4. Reciprocal Rank Fusion (RRF) per combinare i due rank
5. Re-ranking LLM dei top-10 → top-5
6. Build system prompt con context blocks
7. streamText via gemini-2.5-flash
```

### 1. Query rewriting

Usa `gemini-2.0-flash` per riscrivere la domanda dell'utente come query standalone, risolvendo riferimenti a messaggi precedenti.

**Esempio:**
```
Storia: "Qual è il fatturato? → €5M"
Domanda: "E quello dell'anno precedente?"
→ Riscritta: "fatturato anno precedente esercizio fiscale"
```

Viene saltato se: `history.length === 0` oppure `question.length > 120`.

### 2. Hybrid Retrieval + RRF

```sql
WITH semantic AS (
  -- Top-20 per cosine similarity (threshold 0.45)
),
keyword AS (
  -- Top-20 per ts_rank full-text
)
SELECT ...,
  (1.0 / (60 + COALESCE(s.rank, 1000)) +
   1.0 / (60 + COALESCE(k.rank, 1000))) AS rrf_score
FROM semantic s
FULL OUTER JOIN keyword k ON s.id = k.id
ORDER BY rrf_score DESC
LIMIT 10
```

**Perché RRF?**
- Non richiede calibrazione dei pesi
- Robusto rispetto a scale di score diverse (cosine vs ts_rank)
- Chunk che appaiono in entrambe le liste ottengono score molto alti
- Gestisce correttamente il caso in cui la ricerca keyword non trova nulla (FULL OUTER JOIN)

### 3. Re-ranking

Usa `gemini-2.0-flash` per valutare la rilevanza effettiva di ogni chunk rispetto alla domanda. Ritorna i chunk ordinati da più a meno rilevante.

Vantaggi rispetto al solo RRF:
- Il modello capisce il significato della domanda e del chunk
- Elimina chunk che sembravano rilevanti per keyword ma non lo sono semanticamente
- Fallback silenzioso in caso di errore (mantiene ordine RRF)

### 4. Context window

Il system prompt contiene al massimo **5 chunk** con:
- Numero progressivo: `[Context 1]`, `[Context 2]`...
- Titolo sorgente: `[Context 1 (report-q3-2024.pdf)]`
- Contenuto del chunk

---

## Parametri configurabili

Tutti i parametri chiave sono in `lib/rag/query.ts` e `lib/rag/ingest.ts`:

| Parametro | Default | File | Descrizione |
|-----------|---------|------|-------------|
| `chunkSize` | 1000 | `ingest.ts` | Dimensione chunk in caratteri |
| `chunkOverlap` | 400 | `ingest.ts` | Overlap tra chunk consecutivi |
| `BATCH_SIZE` | 50 | `ingest.ts` | Chunk per batch di embedding |
| similarity threshold | 0.45 | `query.ts` | Soglia minima cosine similarity |
| topK retrieval | 10 | `query.ts` | Candidati per hybrid search |
| topK reranking | 5 | `rerank.ts` | Chunk finali nel context window |
| `maxTokens` | 4096 | `query.ts` | Token massimi per risposta |
| HNSW `m` | 16 | SQL | Connessioni per nodo HNSW |
| HNSW `ef_construction` | 64 | SQL | Qualità costruzione indice |

---

## Decisioni di design

### Perché gemini-embedding-001?
Vettori a 3072 dimensioni (vs 768 di modelli più piccoli). Alta qualità semantica per testi tecnici e specializzati. Costo: ~$0.00001 per 1K token.

### Perché HNSW invece di IVFFlat?
- HNSW non richiede training (IVFFlat richiede un passaggio di clustering preventivo)
- Migliori performance per dataset piccoli/medi (< 1M vettori)
- Recall superiore a parità di latenza

### Perché `plainto_tsquery('simple')`?
- `'simple'` config: tokenizzazione senza stemming, funziona su qualsiasi lingua
- `plainto_tsquery` è più robusto di `to_tsquery` per input arbitrari degli utenti
- Alternativa multilingua: `websearch_to_tsquery` per sintassi tipo Google

### Perché generato (`GENERATED ALWAYS AS STORED`)?
La colonna `search_vector` è una colonna generata da PostgreSQL — viene aggiornata automaticamente ogni volta che `content` cambia. Nessun rischio di disallineamento.

### Perché prefisso titolo nell'embedding?
Quando si embedded `"Source: report.pdf\n\nI ricavi del Q3 sono..."`, il vettore cattura anche il contesto del documento. Questo è particolarmente utile quando più documenti trattano lo stesso argomento — la query "ricavi nel report Q3" trova i chunk corretti anche se "Q3" non appare nel chunk stesso.

---

## Migration database

Per applicare le ottimizzazioni al database esistente:

```bash
# Esegui la migration
npx prisma db execute --file prisma/migrations/rag_improvements.sql

# Verifica gli indici
npx prisma db execute --stdin <<EOF
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'Chunk';
EOF

# Aggiorna il client Prisma per i nuovi campi
npx prisma generate
```

**Note:**
- La migration è idempotente (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`)
- I chunk esistenti avranno `chunkIndex = 0` e `documentTitle = ''`
- La colonna `search_vector` viene popolata automaticamente per tutti i chunk esistenti
- L'indice HNSW richiede pgvector ≥ 0.5.0

---

## Troubleshooting

### "ERROR: type 'vector' does not exist"
pgvector non è installato. Eseguire:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### "ERROR: column 'search_vector' of relation 'Chunk' does not exist"
La migration non è stata eseguita. Eseguire:
```bash
npx prisma db execute --file prisma/migrations/rag_improvements.sql
```

### Risposte di bassa qualità con query di follow-up
Il query rewriting è attivo solo per `history.length > 0 && question.length <= 120`. Per domande più lunghe, il sistema usa il testo originale. Verificare che `chatHistory` venga passato correttamente all'API.

### Similarity threshold troppo aggressivo (zero chunk restituiti)
Abbassare `0.45` nel file `lib/rag/query.ts`. Un valore tipico è `0.3`–`0.5` a seconda della qualità dei documenti.

### Re-ranking aggiunge latenza eccessiva
Il re-ranking fa una chiamata a `gemini-2.0-flash` (~200–500ms). Per disabilitarlo temporaneamente, in `query.ts` sostituire:
```ts
const chunks = await rerankChunks(searchQuery, candidates, 5);
```
con:
```ts
const chunks = candidates.slice(0, 5);
```

### Verifica performance indice HNSW
```sql
EXPLAIN ANALYZE
SELECT c.id, 1 - (c.embedding <=> '[...]'::vector(3072)) AS similarity
FROM "Chunk" c
ORDER BY c.embedding <=> '[...]'::vector(3072)
LIMIT 10;
```
Se il piano mostra `Index Scan using chunk_embedding_hnsw_idx`, l'indice è attivo.
