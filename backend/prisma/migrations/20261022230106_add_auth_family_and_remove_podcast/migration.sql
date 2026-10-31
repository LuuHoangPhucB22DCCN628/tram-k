/*
  Warnings:

  - The values [PODCAST] on the enum `SearchDocumentType` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `family_id` to the `auth_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SearchDocumentType_new" AS ENUM ('GUIDE', 'CANCER_TYPE', 'STORY', 'SUPPORT_PROGRAM');
ALTER TABLE "search_documents" ALTER COLUMN "type" TYPE "SearchDocumentType_new" USING ("type"::text::"SearchDocumentType_new");
ALTER TABLE "managed_resources" ALTER COLUMN "type" TYPE "SearchDocumentType_new" USING ("type"::text::"SearchDocumentType_new");
ALTER TYPE "SearchDocumentType" RENAME TO "SearchDocumentType_old";
ALTER TYPE "SearchDocumentType_new" RENAME TO "SearchDocumentType";
DROP TYPE "SearchDocumentType_old";
COMMIT;

-- AlterTable
ALTER TABLE "auth_sessions" ADD COLUMN     "family_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "auth_sessions_family_id_idx" ON "auth_sessions"("family_id");
