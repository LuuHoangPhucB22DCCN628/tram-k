CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'MEMBERS', 'PRIVATE');

CREATE TABLE "user_profiles" (
    "user_id" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "birth_year" INTEGER,
    "bio" VARCHAR(500),
    "avatar_data_url" TEXT,
    "visibility" "ProfileVisibility" NOT NULL DEFAULT 'MEMBERS',
    "show_email" BOOLEAN NOT NULL DEFAULT false,
    "allow_comments" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "user_profiles"
ADD CONSTRAINT "user_profiles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
