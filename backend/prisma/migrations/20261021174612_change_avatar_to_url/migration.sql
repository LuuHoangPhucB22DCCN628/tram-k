
-- RenameColumn
ALTER TABLE "user_profiles" RENAME COLUMN "avatar_data_url" TO "avatarUrl";

-- RenameIndex
ALTER INDEX "support_program_registrations_program_id_status_registered_at_i" RENAME TO "support_program_registrations_program_id_status_registered__idx";