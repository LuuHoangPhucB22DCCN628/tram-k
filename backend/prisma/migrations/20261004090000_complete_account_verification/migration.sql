CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFY', 'ACTIVE', 'LOCKED', 'DISABLED');
CREATE TYPE "ConsentType" AS ENUM ('TERMS', 'PRIVACY');
CREATE TYPE "AuthTokenPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

ALTER TABLE "users"
ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFY',
ADD COLUMN "email_verified_at" TIMESTAMP(3),
ADD COLUMN "auth_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "login_blocked_until" TIMESTAMP(3),
ADD COLUMN "verification_cleanup_at" TIMESTAMP(3),
ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "deleted_by_id" TEXT;

UPDATE "users"
SET "status" = CASE WHEN "is_active" THEN 'ACTIVE'::"UserStatus" ELSE 'LOCKED'::"UserStatus" END,
    "email_verified_at" = CASE WHEN "is_active" THEN "created_at" ELSE NULL END;

ALTER TABLE "users" DROP COLUMN "is_active";

CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "withdrawn_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "purpose" "AuthTokenPurpose" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "email_hash" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "ip_hash" TEXT,
    "correlation_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "users_status_deleted_at_idx" ON "users"("status", "deleted_at");
CREATE INDEX "users_verification_cleanup_at_idx" ON "users"("verification_cleanup_at");
CREATE INDEX "users_deleted_by_id_idx" ON "users"("deleted_by_id");
CREATE UNIQUE INDEX "user_consents_user_id_type_version_key" ON "user_consents"("user_id", "type", "version");
CREATE INDEX "user_consents_user_id_type_withdrawn_at_idx" ON "user_consents"("user_id", "type", "withdrawn_at");
CREATE UNIQUE INDEX "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");
CREATE INDEX "auth_tokens_user_id_purpose_created_at_idx" ON "auth_tokens"("user_id", "purpose", "created_at");
CREATE INDEX "auth_tokens_expires_at_idx" ON "auth_tokens"("expires_at");
CREATE INDEX "auth_attempts_user_id_created_at_idx" ON "auth_attempts"("user_id", "created_at");
CREATE INDEX "auth_attempts_email_hash_created_at_idx" ON "auth_attempts"("email_hash", "created_at");
CREATE INDEX "auth_attempts_ip_hash_created_at_idx" ON "auth_attempts"("ip_hash", "created_at");
CREATE UNIQUE INDEX "outbox_events_event_id_key" ON "outbox_events"("event_id");
CREATE INDEX "outbox_events_status_available_at_idx" ON "outbox_events"("status", "available_at");
CREATE INDEX "audit_logs_entity_type_entity_id_occurred_at_idx" ON "audit_logs"("entity_type", "entity_id", "occurred_at");
CREATE INDEX "audit_logs_actor_id_occurred_at_idx" ON "audit_logs"("actor_id", "occurred_at");
CREATE INDEX "audit_logs_correlation_id_idx" ON "audit_logs"("correlation_id");

ALTER TABLE "users" ADD CONSTRAINT "users_deleted_by_id_fkey"
FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auth_attempts" ADD CONSTRAINT "auth_attempts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
