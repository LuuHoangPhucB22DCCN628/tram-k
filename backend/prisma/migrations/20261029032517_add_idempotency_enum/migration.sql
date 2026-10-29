/*
  Warnings:

  - The `status` column on the `idempotency_records` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PROCESSING', 'COMPLETED');

-- AlterTable
ALTER TABLE "idempotency_records" DROP COLUMN "status",
ADD COLUMN     "status" "IdempotencyStatus" NOT NULL DEFAULT 'PROCESSING';
