-- CreateEnum
CREATE TYPE "SupportPointStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED', 'HIDDEN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED', 'HIDDEN', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "support_points" (
    "id" TEXT NOT NULL,
    "owner_partner_id" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "operating_hours" TEXT,
    "support_type" VARCHAR(50) NOT NULL,
    "status" "SupportPointStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "owner_partner_id" TEXT NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(10000) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "conditions" TEXT,
    "registration_open_at" TIMESTAMP(3) NOT NULL,
    "registration_close_at" TIMESTAMP(3) NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "ProgramStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "hidden_reason" TEXT,
    "cancel_reason" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_status_histories" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "from_status" "ProgramStatus" NOT NULL,
    "to_status" "ProgramStatus" NOT NULL,
    "reason" TEXT,
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_points_status_published_at_idx" ON "support_points"("status", "published_at");

-- CreateIndex
CREATE INDEX "support_points_owner_partner_id_status_idx" ON "support_points"("owner_partner_id", "status");

-- CreateIndex
CREATE INDEX "programs_status_registration_open_at_idx" ON "programs"("status", "registration_open_at");

-- CreateIndex
CREATE INDEX "programs_owner_partner_id_status_idx" ON "programs"("owner_partner_id", "status");

-- CreateIndex
CREATE INDEX "program_status_histories_program_id_created_at_idx" ON "program_status_histories"("program_id", "created_at");

-- AddForeignKey
ALTER TABLE "support_program_registrations" ADD CONSTRAINT "support_program_registrations_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_points" ADD CONSTRAINT "support_points_owner_partner_id_fkey" FOREIGN KEY ("owner_partner_id") REFERENCES "partner_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_owner_partner_id_fkey" FOREIGN KEY ("owner_partner_id") REFERENCES "partner_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_status_histories" ADD CONSTRAINT "program_status_histories_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
