ALTER TABLE "users"
  ADD COLUMN "notify_story_comments" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notify_story_replies" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notify_story_reactions" BOOLEAN NOT NULL DEFAULT true;
