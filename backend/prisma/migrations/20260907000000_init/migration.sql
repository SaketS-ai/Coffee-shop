-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- gen_random_uuid() for every table's id default below
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('MEMBER', 'BARISTA', 'ADMIN');

-- CreateEnum
CREATE TYPE "credit_ledger_type" AS ENUM ('SUBSCRIPTION', 'REDEMPTION', 'VOID', 'RESET');

-- CreateEnum
CREATE TYPE "redemption_status" AS ENUM ('PENDING', 'REDEEMED', 'EXPIRED', 'VOID');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "role" "user_role" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(50) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "image_url" TEXT,
    "description" TEXT,
    "payout_rate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cafes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drinks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cafe_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "credit_price" INTEGER NOT NULL DEFAULT 4,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drinks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMPTZ(6),
    "current_cycle_start" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMPTZ(6),
    "credits" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_ledger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "credit_ledger_type" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reference_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "cafe_id" UUID NOT NULL,
    "drink_id" UUID NOT NULL,
    "credit_price" INTEGER NOT NULL,
    "token" VARCHAR(128) NOT NULL,
    "backup_code" VARCHAR(6) NOT NULL,
    "status" "redemption_status" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "redeemed_at" TIMESTAMPTZ(6),
    "redeemed_by_user_id" UUID,
    "payout_rate" DECIMAL(10,2),
    "voided_at" TIMESTAMPTZ(6),
    "voided_by_user_id" UUID,
    "void_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "redemption_id" UUID NOT NULL,
    "drink_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cafe_id" UUID NOT NULL,
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reference" VARCHAR(255),
    "recorded_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "drinks_cafe_id_idx" ON "drinks"("cafe_id");

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- CreateIndex
CREATE INDEX "credit_ledger_user_id_idx" ON "credit_ledger"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "redemptions_token_key" ON "redemptions"("token");

-- CreateIndex
CREATE INDEX "redemptions_user_id_idx" ON "redemptions"("user_id");

-- CreateIndex
CREATE INDEX "redemptions_token_idx" ON "redemptions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_redemption_id_key" ON "reviews"("redemption_id");

-- CreateIndex
CREATE INDEX "reviews_user_id_idx" ON "reviews"("user_id");

-- CreateIndex
CREATE INDEX "payouts_cafe_id_idx" ON "payouts"("cafe_id");

-- AddForeignKey
ALTER TABLE "drinks" ADD CONSTRAINT "drinks_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "cafes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "cafes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_redeemed_by_user_id_fkey" FOREIGN KEY ("redeemed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_voided_by_user_id_fkey" FOREIGN KEY ("voided_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "redemptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "cafes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-appended below: Prisma's schema DSL cannot express CHECK constraints
-- or partial (filtered) unique indexes, so `prisma migrate diff` never
-- generates them. These carry over the original hand-written migrations
-- 004, 006, 007, 008, 010 exactly, and are required for a fresh install to
-- match the concurrency/data-integrity guarantees this app relies on.

-- CheckConstraint (migration 004)
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_status_check"
  CHECK (status IN ('ACTIVE', 'CANCELED', 'EXPIRED', 'PAYMENT_FAILED'));

-- CheckConstraint (migration 007)
ALTER TABLE "drinks" ADD CONSTRAINT "drinks_credit_price_positive" CHECK (credit_price > 0);

-- CheckConstraint (review rating range)
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_check" CHECK (rating BETWEEN 1 AND 5);

-- CheckConstraint (migration 013)
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_amount_check" CHECK (amount >= 0);

-- At most one ACTIVE membership per user (migration 006) - the real safety
-- net against duplicate credit grants under concurrent activation requests.
CREATE UNIQUE INDEX "idx_memberships_one_active_per_user"
  ON "memberships" ("user_id")
  WHERE status = 'ACTIVE';

-- At most one PENDING redemption per user at a time (migration 008).
CREATE UNIQUE INDEX "idx_redemptions_one_pending_per_user"
  ON "redemptions" ("user_id")
  WHERE status = 'PENDING';

-- A barista-entered backup code is unambiguous among currently redeemable
-- codes (migration 008).
CREATE UNIQUE INDEX "idx_redemptions_one_pending_backup_code"
  ON "redemptions" ("backup_code")
  WHERE status = 'PENDING';

