-- Phase 12: database-level backstop against a duplicate monthly credit
-- reset for the same membership + billing cycle.
--
-- The reset logic in membership.service.ts (processOneMembershipCycle) is
-- already safe against concurrent/duplicate execution via SELECT ... FOR
-- UPDATE row locking inside one transaction: a second concurrent or
-- sequential call re-reads the row after the first commits, sees end_date
-- has already advanced, and no-ops. That mechanism alone is sufficient for
-- every scheduler/restart/retry scenario. This migration adds a second,
-- independent layer that holds even if some future code path ever bypasses
-- that locked function and tries to insert a RESET row directly - the
-- unique index below makes a duplicate physically impossible at the
-- database level, matching the same pattern already used for "one ACTIVE
-- membership per user" and "one PENDING redemption per user" (see
-- 20260907000000_init/migration.sql).
--
-- billing_cycle_start is populated only on RESET rows (see
-- membership.service.ts), so the partial index only ever constrains those.

-- AlterTable
ALTER TABLE "credit_ledger" ADD COLUMN "billing_cycle_start" TIMESTAMPTZ(6);

-- CreateIndex
CREATE UNIQUE INDEX "idx_credit_ledger_one_reset_per_cycle"
  ON "credit_ledger" ("reference_id", "billing_cycle_start")
  WHERE type = 'RESET';
