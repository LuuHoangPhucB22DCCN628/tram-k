CREATE TYPE "ManagedResourceStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

CREATE TABLE "managed_resources" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "type" "SearchDocumentType" NOT NULL,
    "status" "ManagedResourceStatus" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "payload" JSONB NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "managed_resources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "managed_resources_type_source_id_key" ON "managed_resources"("type", "source_id");
CREATE INDEX "managed_resources_status_type_published_at_idx" ON "managed_resources"("status", "type", "published_at");
