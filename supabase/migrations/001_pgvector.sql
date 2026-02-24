-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- HNSW index for fast approximate nearest-neighbour search
-- Uses cosine distance (optimal for normalised sentence embeddings)
CREATE INDEX IF NOT EXISTS chunk_embedding_hnsw_idx
  ON "Chunk" USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
