CREATE TYPE "MemberPostStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED');

ALTER TYPE "NotificationKind" ADD VALUE 'STORY_SUBMITTED';
ALTER TYPE "NotificationKind" ADD VALUE 'STORY_PUBLISHED';
ALTER TYPE "NotificationKind" ADD VALUE 'STORY_REJECTED';
ALTER TYPE "NotificationKind" ADD VALUE 'STORY_COMMENT';
ALTER TYPE "NotificationKind" ADD VALUE 'STORY_REPLY';
ALTER TYPE "NotificationKind" ADD VALUE 'STORY_REACTION';

CREATE TABLE "member_posts" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "author_name" VARCHAR(100) NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "content" TEXT NOT NULL,
  "status" "MemberPostStatus" NOT NULL DEFAULT 'DRAFT',
  "rejection_reason" VARCHAR(1000),
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "member_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "member_posts_user_id_updated_at_idx" ON "member_posts"("user_id", "updated_at");
CREATE INDEX "member_posts_status_reviewed_at_idx" ON "member_posts"("status", "reviewed_at");
ALTER TABLE "member_posts" ADD CONSTRAINT "member_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
