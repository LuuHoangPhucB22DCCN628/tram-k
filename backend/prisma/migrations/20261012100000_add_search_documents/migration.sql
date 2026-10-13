CREATE TYPE "SearchDocumentType" AS ENUM (
  'GUIDE',
  'CANCER_TYPE',
  'STORY',
  'PODCAST',
  'SUPPORT_PROGRAM'
);

CREATE TABLE "search_documents" (
  "id" TEXT NOT NULL,
  "source_id" TEXT NOT NULL,
  "type" "SearchDocumentType" NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "description" VARCHAR(1000) NOT NULL,
  "eyebrow" VARCHAR(80) NOT NULL,
  "metadata" VARCHAR(255) NOT NULL,
  "image_url" VARCHAR(500),
  "image_alt" VARCHAR(255),
  "link" VARCHAR(500) NOT NULL,
  "query_params" JSONB,
  "normalized_title" TEXT NOT NULL,
  "normalized_text" TEXT NOT NULL,
  "published_at" TIMESTAMP(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "search_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "search_documents_type_source_id_key"
  ON "search_documents"("type", "source_id");
CREATE INDEX "search_documents_active_type_published_at_idx"
  ON "search_documents"("active", "type", "published_at");

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "search_documents_normalized_text_trgm_idx"
  ON "search_documents" USING GIN ("normalized_text" gin_trgm_ops);
