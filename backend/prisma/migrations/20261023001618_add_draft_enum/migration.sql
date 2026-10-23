-- AlterEnum
ALTER TYPE "PartnerApplicationStatus" ADD VALUE 'DRAFT';

-- AlterTable
ALTER TABLE "partner_applications" ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "introduction" DROP NOT NULL;
