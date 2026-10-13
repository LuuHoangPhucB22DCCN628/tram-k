CREATE TYPE "CommunityReactionType" AS ENUM ('LIKE', 'LOVE', 'SUPPORT');

CREATE TABLE "community_comments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_key" TEXT NOT NULL,
    "source_title" TEXT NOT NULL,
    "source_path" TEXT NOT NULL,
    "parent_id" TEXT,
    "content" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "community_reactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_key" TEXT NOT NULL,
    "type" "CommunityReactionType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "community_reactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "community_comments_user_id_idempotency_key_key"
ON "community_comments"("user_id", "idempotency_key");
CREATE INDEX "community_comments_source_key_created_at_idx"
ON "community_comments"("source_key", "created_at");
CREATE INDEX "community_comments_parent_id_idx" ON "community_comments"("parent_id");
CREATE UNIQUE INDEX "community_reactions_user_id_source_key_key"
ON "community_reactions"("user_id", "source_key");
CREATE INDEX "community_reactions_source_key_type_idx"
ON "community_reactions"("source_key", "type");

ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_parent_id_fkey"
FOREIGN KEY ("parent_id") REFERENCES "community_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "community_reactions" ADD CONSTRAINT "community_reactions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
