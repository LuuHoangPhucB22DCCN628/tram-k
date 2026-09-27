CREATE TYPE "HairRegistrationMode" AS ENUM ('RECEIVE', 'DONATE');
CREATE TYPE "HairRegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

CREATE TABLE "hair_registrations" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "mode" "HairRegistrationMode" NOT NULL,
    "status" "HairRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "province" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "relative_phone" TEXT,
    "relative_name" TEXT,
    "duration" TEXT,
    "hospital" TEXT,
    "diagnosis" TEXT,
    "borrow_date" DATE,
    "desired_length" TEXT,
    "transparency" TEXT,
    "donation_location" TEXT,
    "donated_length" TEXT,
    "accepted_commitments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hair_registrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "hair_registrations_reference_key" ON "hair_registrations"("reference");
CREATE INDEX "hair_registrations_mode_status_idx" ON "hair_registrations"("mode", "status");
CREATE INDEX "hair_registrations_created_at_idx" ON "hair_registrations"("created_at");
