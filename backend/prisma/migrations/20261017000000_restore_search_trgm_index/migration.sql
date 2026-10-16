-- Ensure the trigram index exists for normalized-text search.
CREATE INDEX IF NOT EXISTS "search_documents_normalized_text_trgm_idx"
ON "search_documents"
USING GIN ("normalized_text" gin_trgm_ops);