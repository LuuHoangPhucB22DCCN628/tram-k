-- CreateEnum
CREATE TYPE "AuthTokenSource" AS ENUM ('SIGNUP', 'RESEND');

-- AlterTable
ALTER TABLE "auth_tokens" ADD COLUMN     "source" "AuthTokenSource" NOT NULL DEFAULT 'SIGNUP';
