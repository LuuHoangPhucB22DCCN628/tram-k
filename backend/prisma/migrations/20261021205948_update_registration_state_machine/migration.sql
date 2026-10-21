-- AlterEnum
BEGIN;
CREATE TYPE "SupportProgramRegistrationStatus_new" AS ENUM ('CONFIRMED', 'WAITLISTED', 'CANCELLED', 'EXPIRED', 'ATTENDED', 'NO_SHOW');

ALTER TABLE "support_program_registrations" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "support_program_registrations" 
ALTER COLUMN "status" TYPE "SupportProgramRegistrationStatus_new" 
USING (
  CASE "status"::text
    -- SRS: PENDING_CONFIRMATION không map mù, đưa vào danh sách chờ để Admin review lại capacity
    WHEN 'PENDING_CONFIRMATION' THEN 'WAITLISTED'::"SupportProgramRegistrationStatus_new"
    -- SRS: REJECTED map sang CANCELLED
    WHEN 'REJECTED' THEN 'CANCELLED'::"SupportProgramRegistrationStatus_new"
    -- SRS: COMPLETED chỉ map ATTENDED khi có bằng chứng. Map tạm sang NO_SHOW để Admin review thủ công.
    WHEN 'COMPLETED' THEN 'NO_SHOW'::"SupportProgramRegistrationStatus_new"
    ELSE "status"::text::"SupportProgramRegistrationStatus_new"
  END
);

ALTER TYPE "SupportProgramRegistrationStatus" RENAME TO "SupportProgramRegistrationStatus_old";
ALTER TYPE "SupportProgramRegistrationStatus_new" RENAME TO "SupportProgramRegistrationStatus";
DROP TYPE "SupportProgramRegistrationStatus_old";

ALTER TABLE "support_program_registrations" ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';
COMMIT;

-- AlterTable
ALTER TABLE "support_program_registrations" ADD COLUMN     "attended_at" TIMESTAMP(3),
ADD COLUMN     "cancel_reason" VARCHAR(1000),
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "confirmed_at" TIMESTAMP(3),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "waitlisted_at" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';

-- CreateTable
CREATE TABLE "registration_status_histories" (
    "id" TEXT NOT NULL,
    "registration_id" TEXT NOT NULL,
    "from_status" "SupportProgramRegistrationStatus",
    "to_status" "SupportProgramRegistrationStatus" NOT NULL,
    "reason" VARCHAR(1000),
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_status_histories_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "registration_status_histories" ADD CONSTRAINT "registration_status_histories_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "support_program_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;