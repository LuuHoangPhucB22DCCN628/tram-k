ALTER TYPE "AuthTokenPurpose" ADD VALUE 'EMAIL_CHANGE';

ALTER TABLE "auth_tokens"
ADD COLUMN "target_email" TEXT;

CREATE UNIQUE INDEX "auth_tokens_target_email_key"
ON "auth_tokens"("target_email");

ALTER TABLE "auth_sessions"
ADD COLUMN "auth_version" INTEGER NOT NULL DEFAULT 1;
