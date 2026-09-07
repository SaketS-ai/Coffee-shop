import { prisma } from '../config/prisma';
import { Prisma, Membership } from '@prisma/client';

export const MONTHLY_PLAN_PRICE_USD = 24.99;
export const MONTHLY_CREDIT_ALLOWANCE = 30;
export const MEMBERSHIP_PERIOD_DAYS = 30;

// Safety bound on how many missed cycles a single catch-up call will apply
// at once (e.g. a dev database left idle for a long time). One real month
// per iteration, so 24 covers two years of neglect in one call - a future
// scheduler running at least monthly would never realistically need more
// than 1.
const MAX_CYCLE_CATCHUP_ITERATIONS = 24;

// A Prisma unique-constraint violation (see migration 006). Not exported -
// callers only need to know "was this a duplicate-activation race", not the
// raw code.
function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

// The most recent membership row for a user, regardless of status - used to
// display real history (e.g. "your last membership expired"), not just
// whether one happens to be active right now.
export async function getLatestMembership(userId: string): Promise<Membership | null> {
  return prisma.membership.findFirst({ where: { user_id: userId }, orderBy: { created_at: 'desc' } });
}

async function findActiveMembership(tx: Prisma.TransactionClient, userId: string): Promise<Membership | null> {
  return tx.membership.findFirst({
    where: {
      user_id: userId,
      status: 'ACTIVE',
      OR: [{ end_date: null }, { end_date: { gt: new Date() } }],
    },
    orderBy: { created_at: 'desc' },
  });
}

export interface ActivationResult {
  membership: Membership;
  created: boolean; // false = idempotent no-op, an active membership already existed
}

/**
 * Development-only activation (see membership.controller.ts for the
 * production gate). Atomic: membership row + ledger entry are created in one
 * transaction, and idempotent for the current period - calling this twice
 * while a membership is still active returns the existing one instead of
 * granting a second +30. Relies on the partial unique index from migration
 * 006 (one ACTIVE membership per user) as the real concurrency safety net,
 * not this pre-check alone.
 */
export async function activateDevMembership(userId: string): Promise<ActivationResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await findActiveMembership(tx, userId);
      if (existing) {
        return { membership: existing, created: false };
      }

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + MEMBERSHIP_PERIOD_DAYS * 24 * 60 * 60 * 1000);

      const membership = await tx.membership.create({
        data: {
          user_id: userId,
          status: 'ACTIVE',
          start_date: startDate,
          end_date: endDate,
          current_cycle_start: startDate,
          credits: MONTHLY_CREDIT_ALLOWANCE,
        },
      });

      await tx.creditLedger.create({
        data: {
          user_id: userId,
          type: 'SUBSCRIPTION',
          amount: MONTHLY_CREDIT_ALLOWANCE,
          balance_after: MONTHLY_CREDIT_ALLOWANCE,
          reference_id: membership.id,
        },
      });

      return { membership, created: true };
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Lost the race to a concurrent activation request - not our error to
      // raise, just report the membership that won.
      const fallback = await getLatestMembership(userId);
      if (fallback) return { membership: fallback, created: false };
    }
    throw err;
  }
}

/**
 * Cancellation is immediate: status flips to CANCELED and cancelled_at is
 * stamped right away. Chosen over "let the paid cycle run out" because
 * redemption.service.ts's active-membership checks already gate strictly on
 * status = 'ACTIVE' - anything else would have required touching that
 * Phase 6 logic, which this phase avoids unless unavoidable. History (the
 * membership row itself, its ledger entries, and any redemptions) is never
 * deleted - only the status/timestamp change.
 */
export async function cancelMembership(userId: string): Promise<Membership | null> {
  const result = await prisma.membership.updateMany({
    where: { user_id: userId, status: 'ACTIVE' },
    data: { status: 'CANCELED', cancelled_at: new Date() },
  });
  if (result.count === 0) return null;
  return prisma.membership.findFirst({ where: { user_id: userId, status: 'CANCELED' }, orderBy: { updated_at: 'desc' } });
}

export interface CycleProcessResult {
  membershipId: string;
  processed: boolean; // false = not eligible (not ACTIVE, or current cycle hasn't ended yet)
  voidedAmount: number; // unused credits expired from the previous cycle, 0 if there were none
  newBalance: number;
  newCycleStart: Date | null;
  newCycleEnd: Date | null;
}

/**
 * Advances a membership by AT MOST one cycle. Locks the row FOR UPDATE (via
 * a raw query inside the transaction - Prisma's query builder has no way to
 * express row locking) and re-checks eligibility under that lock before
 * doing anything - this is what makes it safe to call concurrently (two
 * overlapping calls for the same membership: the second sees the first's
 * already-advanced end_date and correctly no-ops) and safe to call twice in
 * a row (same reasoning, no separate "already processed" flag needed).
 *
 * Ledger accounting for "credits do not roll over": if the membership still
 * has an unused balance from the previous cycle, a VOID entry first zeroes
 * it out (an auditable record that those credits expired, not a silent
 * overwrite), then a RESET entry grants the new cycle's +30. The resulting
 * balance is always exactly MONTHLY_CREDIT_ALLOWANCE.
 */
async function processOneMembershipCycle(membershipId: string): Promise<CycleProcessResult> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Membership[]>`SELECT * FROM memberships WHERE id = ${membershipId}::uuid FOR UPDATE`;
    const membership = rows[0];

    const notEligible =
      !membership ||
      membership.status !== 'ACTIVE' ||
      !membership.end_date ||
      new Date(membership.end_date) > new Date();

    if (notEligible) {
      return {
        membershipId,
        processed: false,
        voidedAmount: 0,
        newBalance: membership?.credits ?? 0,
        newCycleStart: membership?.current_cycle_start ?? null,
        newCycleEnd: membership?.end_date ?? null,
      };
    }

    const currentBalance = membership.credits;
    let voidedAmount = 0;

    if (currentBalance > 0) {
      voidedAmount = currentBalance;
      await tx.creditLedger.create({
        data: { user_id: membership.user_id, type: 'VOID', amount: -currentBalance, balance_after: 0, reference_id: membership.id },
      });
    }

    const newBalance = MONTHLY_CREDIT_ALLOWANCE;
    await tx.creditLedger.create({
      data: { user_id: membership.user_id, type: 'RESET', amount: MONTHLY_CREDIT_ALLOWANCE, balance_after: newBalance, reference_id: membership.id },
    });

    // New cycle begins exactly when the old one ended - no gap, no overlap.
    const newCycleStart = new Date(membership.end_date as Date);
    const newCycleEnd = new Date(newCycleStart.getTime() + MEMBERSHIP_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    await tx.membership.update({
      where: { id: membership.id },
      data: { credits: newBalance, current_cycle_start: newCycleStart, end_date: newCycleEnd },
    });

    return { membershipId, processed: true, voidedAmount, newBalance, newCycleStart, newCycleEnd };
  });
}

// Repeatedly advances one membership until it's no longer eligible (i.e.
// fully caught up), bounded so a long-idle dev database can't loop forever.
async function catchUpMembershipCycles(membershipId: string): Promise<CycleProcessResult[]> {
  const results: CycleProcessResult[] = [];
  for (let i = 0; i < MAX_CYCLE_CATCHUP_ITERATIONS; i++) {
    const result = await processOneMembershipCycle(membershipId);
    if (!result.processed) break;
    results.push(result);
  }
  return results;
}

export interface ProcessCyclesSummary {
  membershipsChecked: number;
  membershipsProcessed: number;
  totalCyclesProcessed: number;
  results: CycleProcessResult[];
}

/**
 * The one reset implementation, reused by both the admin dev-trigger
 * (membership.controller.ts) and, eventually, a real scheduled job - whoever
 * calls this does not need to know or duplicate how a cycle is processed.
 * Finds every ACTIVE membership whose current cycle has ended and catches
 * each one up completely (handles a database left unprocessed for months in
 * one call, each missed cycle still getting its own VOID+RESET ledger pair).
 */
export async function processMembershipCycles(): Promise<ProcessCyclesSummary> {
  const candidates = await prisma.membership.findMany({
    where: { status: 'ACTIVE', end_date: { not: null, lte: new Date() } },
    select: { id: true },
  });

  const allResults: CycleProcessResult[] = [];
  for (const row of candidates) {
    allResults.push(...(await catchUpMembershipCycles(row.id)));
  }

  return {
    membershipsChecked: candidates.length,
    membershipsProcessed: new Set(allResults.map((r) => r.membershipId)).size,
    totalCyclesProcessed: allResults.length,
    results: allResults,
  };
}

/**
 * Lazy per-user trigger: called from the membership/credits read endpoints
 * and from redemption.service.ts's createRedemption, so a member's cycle is
 * always fresh by the time they check it or try to redeem, without needing
 * real cron infrastructure this phase. A no-op for the common case (nothing
 * eligible), so it changes no behavior for a membership that isn't lapsed.
 */
export async function ensureCycleUpToDate(userId: string): Promise<void> {
  const membership = await prisma.membership.findFirst({
    where: { user_id: userId, status: 'ACTIVE' },
    orderBy: { created_at: 'desc' },
    select: { id: true, end_date: true },
  });
  if (!membership || !membership.end_date || new Date(membership.end_date) > new Date()) {
    return;
  }
  await catchUpMembershipCycles(membership.id);
}
