CREATE TYPE "PartnerApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "partner_applications" (
    "id" TEXT NOT NULL,
    "applicant_id" TEXT NOT NULL,
    "organization_name" TEXT NOT NULL,
    "representative_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "introduction" TEXT NOT NULL,
    "document_keys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "PartnerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "review_reason" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "partner_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "granted_by_id" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "partner_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_applications_applicant_id_key" ON "partner_applications"("applicant_id");
CREATE INDEX "partner_applications_status_created_at_idx" ON "partner_applications"("status", "created_at");
CREATE INDEX "partner_applications_reviewed_by_id_idx" ON "partner_applications"("reviewed_by_id");
CREATE UNIQUE INDEX "partner_memberships_user_id_key" ON "partner_memberships"("user_id");
CREATE UNIQUE INDEX "partner_memberships_application_id_key" ON "partner_memberships"("application_id");
CREATE INDEX "partner_memberships_granted_by_id_idx" ON "partner_memberships"("granted_by_id");

ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "partner_memberships" ADD CONSTRAINT "partner_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partner_memberships" ADD CONSTRAINT "partner_memberships_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "partner_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partner_memberships" ADD CONSTRAINT "partner_memberships_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
