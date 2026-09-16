-- Adds the columns/table backing: cafe scanner PIN + trusted-device auth
-- (Module 8.4), member profile fields (Module 2.3), cafe discovery fields
-- (neighborhood/opening hours/vibe tags/perk line/featured - Module 3.2,
-- 9.3), drink category/signature flag (Module 9.4), and one-rating-per-
-- drink (Module 5.1).
--
-- Written by hand rather than via `prisma migrate dev` because this
-- database's migration history had already drifted from a separate,
-- earlier `20260903181652_init` migration not present in this repo
-- (see the placeholder migration of that name added alongside this one).
-- This script is intentionally additive only - it does not touch the
-- orphaned PascalCase tables/enums (Cafe, Drink, DrinkRating,
-- RedemptionCode, RedemptionRecord, CafePayoutRecord, PlatformSettings,
-- User, schema_migrations, AccountState, AccountStatus, CodeStatus,
-- DrinkCategory) still sitting in the database from that earlier
-- migration - they're unused by the current schema (nothing maps to
-- them) but dropping them wasn't part of the ask, so they're left alone.

-- AlterTable
ALTER TABLE "cafes"
  ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "neighborhood" VARCHAR(100),
  ADD COLUMN "opening_hours" JSONB,
  ADD COLUMN "perk_line" TEXT,
  ADD COLUMN "scan_pin_hash" TEXT,
  ADD COLUMN "scan_pin_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "vibe_tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "drinks"
  ADD COLUMN "category" VARCHAR(100),
  ADD COLUMN "is_signature" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "reviews" ALTER COLUMN "redemption_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "coffee_preferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "neighborhood" VARCHAR(100),
  ADD COLUMN "password_reset_expires_at" TIMESTAMPTZ(6),
  ADD COLUMN "password_reset_token" TEXT,
  ADD COLUMN "profile_image_url" TEXT,
  ADD COLUMN "verification_expires_at" TIMESTAMPTZ(6),
  ADD COLUMN "verification_token" TEXT;

-- CreateTable
CREATE TABLE "cafe_devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cafe_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "label" VARCHAR(255),
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cafe_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cafe_devices_token_hash_key" ON "cafe_devices"("token_hash");

-- CreateIndex
CREATE INDEX "cafe_devices_cafe_id_idx" ON "cafe_devices"("cafe_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_user_id_drink_id_key" ON "reviews"("user_id", "drink_id");

-- AddForeignKey
ALTER TABLE "cafe_devices" ADD CONSTRAINT "cafe_devices_cafe_id_fkey"
  FOREIGN KEY ("cafe_id") REFERENCES "cafes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
