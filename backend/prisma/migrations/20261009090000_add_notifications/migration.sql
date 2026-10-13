CREATE TYPE "NotificationKind" AS ENUM (
    'PROGRAM_REGISTRATION_SENT',
    'PROGRAM_REGISTRATION_RECEIVED',
    'PROGRAM_REGISTRATION_CONFIRMED',
    'PROGRAM_REGISTRATION_REJECTED',
    'PROGRAM_REGISTRATION_COMPLETED',
    'PROGRAM_PUBLISHED',
    'PROGRAM_REJECTED',
    'PARTNER_APPLICATION_APPROVED',
    'PARTNER_APPLICATION_REJECTED'
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "link" VARCHAR(500) NOT NULL,
    "dedupe_key" VARCHAR(255),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_recipient_id_dedupe_key_key"
ON "notifications"("recipient_id", "dedupe_key");
CREATE INDEX "notifications_recipient_id_read_at_created_at_idx"
ON "notifications"("recipient_id", "read_at", "created_at");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey"
FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
