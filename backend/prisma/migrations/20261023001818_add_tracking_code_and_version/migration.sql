/*
  Warnings:

  - A unique constraint covering the columns `[tracking_code]` on the table `partner_applications` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "partner_applications" ADD COLUMN     "tracking_code" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "organization_name" DROP NOT NULL,
ALTER COLUMN "representative_name" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateIndex
CREATE UNIQUE INDEX "partner_applications_tracking_code_key" ON "partner_applications"("tracking_code");
