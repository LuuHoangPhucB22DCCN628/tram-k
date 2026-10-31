CREATE TYPE "DonationEntryStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

CREATE TABLE "donation_statement_imports" (
  "id" TEXT NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "file_hash" VARCHAR(64) NOT NULL,
  "account_key" VARCHAR(100) NOT NULL,
  "imported_by" TEXT NOT NULL,
  "row_count" INTEGER NOT NULL DEFAULT 0,
  "added_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "donation_statement_imports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "donation_statement_imports_created_at_idx" ON "donation_statement_imports"("created_at");

CREATE TABLE "donation_entries" (
  "id" TEXT NOT NULL,
  "import_id" TEXT NOT NULL,
  "source_key" VARCHAR(64) NOT NULL,
  "source_reference" VARCHAR(255),
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "amount_vnd" BIGINT NOT NULL,
  "description" VARCHAR(1000),
  "status" "DonationEntryStatus" NOT NULL DEFAULT 'PENDING',
  "reviewed_by" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "review_note" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "donation_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "donation_entries_source_key_key" ON "donation_entries"("source_key");
CREATE INDEX "donation_entries_status_occurred_at_idx" ON "donation_entries"("status", "occurred_at");
CREATE INDEX "donation_entries_import_id_idx" ON "donation_entries"("import_id");
ALTER TABLE "donation_entries" ADD CONSTRAINT "donation_entries_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "donation_statement_imports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
