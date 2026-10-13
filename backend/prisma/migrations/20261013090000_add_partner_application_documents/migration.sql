CREATE TABLE "partner_application_documents" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "application_id" TEXT,
  "storage_key" TEXT NOT NULL,
  "original_name" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "size" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_application_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_application_documents_storage_key_key"
  ON "partner_application_documents"("storage_key");
CREATE INDEX "partner_application_documents_owner_id_created_at_idx"
  ON "partner_application_documents"("owner_id", "created_at");
CREATE INDEX "partner_application_documents_application_id_idx"
  ON "partner_application_documents"("application_id");

ALTER TABLE "partner_application_documents"
  ADD CONSTRAINT "partner_application_documents_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_application_documents"
  ADD CONSTRAINT "partner_application_documents_application_id_fkey"
  FOREIGN KEY ("application_id") REFERENCES "partner_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
