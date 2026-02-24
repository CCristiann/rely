-- ============================================================
-- RAG Improvements Migration
-- Run with: npx prisma db execute --file prisma/migrations/rag_improvements.sql
--
-- Safe to run multiple times (all statements are idempotent).
-- The application works WITHOUT this migration — indexes are
-- optional optimizations that speed up retrieval at scale.
-- ============================================================

-- 1. Add metadata columns to Chunk
ALTER TABLE "Chunk"
  ADD COLUMN IF NOT EXISTS "chunkIndex"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "documentTitle" TEXT    NOT NULL DEFAULT '';

-- 2. Functional GIN index for full-text search.
--    The query uses to_tsvector('simple', content) inline, so PostgreSQL
--    automatically uses this index when present (no extra column needed).
CREATE INDEX IF NOT EXISTS chunk_fts_idx
  ON "Chunk" USING GIN (to_tsvector('simple', content));

-- 3. HNSW index on embedding for O(log n) vector search.
--    Requires pgvector >= 0.5.0.
--    m = 16: edges per node (higher = better recall, more memory)
--    ef_construction = 64: build-time search width
CREATE INDEX IF NOT EXISTS chunk_embedding_hnsw_idx
  ON "Chunk" USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
