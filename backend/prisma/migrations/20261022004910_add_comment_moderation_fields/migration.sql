-- AlterTable
ALTER TABLE "community_comments" ADD COLUMN     "content_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "deleted_by_id" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- RenameIndex
ALTER INDEX "search_documents_normalized_text_trgm_idx" RENAME TO "search_documents_normalized_text_idx";
