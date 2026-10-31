ALTER TYPE "NotificationKind" ADD VALUE 'HAIR_REGISTRATION_SENT';
ALTER TYPE "NotificationKind" ADD VALUE 'HAIR_REGISTRATION_APPROVED';
ALTER TYPE "NotificationKind" ADD VALUE 'HAIR_REGISTRATION_REJECTED';
ALTER TYPE "NotificationKind" ADD VALUE 'HAIR_REGISTRATION_COMPLETED';

ALTER TABLE "hair_registrations" ADD COLUMN "user_id" TEXT;
CREATE INDEX "hair_registrations_user_id_created_at_idx" ON "hair_registrations"("user_id", "created_at");
ALTER TABLE "hair_registrations" ADD CONSTRAINT "hair_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
