CREATE TYPE "SupportProgramRegistrationStatus" AS ENUM (
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'REJECTED',
  'COMPLETED'
);

CREATE TABLE "support_program_registrations" (
  "id" TEXT NOT NULL,
  "program_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "applicant_name" VARCHAR(160) NOT NULL,
  "applicant_email" VARCHAR(255) NOT NULL,
  "status" "SupportProgramRegistrationStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
  "decision_reason" VARCHAR(1000),
  "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_program_registrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "support_program_registrations_program_id_user_id_key"
  ON "support_program_registrations"("program_id", "user_id");
CREATE INDEX "support_program_registrations_program_id_status_registered_at_idx"
  ON "support_program_registrations"("program_id", "status", "registered_at");
CREATE INDEX "support_program_registrations_user_id_registered_at_idx"
  ON "support_program_registrations"("user_id", "registered_at");

ALTER TABLE "support_program_registrations"
  ADD CONSTRAINT "support_program_registrations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
