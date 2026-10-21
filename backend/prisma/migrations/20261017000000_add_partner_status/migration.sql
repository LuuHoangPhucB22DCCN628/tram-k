CREATE TYPE "PartnerStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

ALTER TABLE "partner_memberships"
ADD COLUMN "status" "PartnerStatus" NOT NULL DEFAULT 'ACTIVE';
