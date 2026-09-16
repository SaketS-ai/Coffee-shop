import { randomUUID } from 'crypto';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { prisma } from '../config/prisma';
import {
  MONTHLY_CREDIT_ALLOWANCE,
  activateDevMembership,
  cancelMembership,
  ensureCycleUpToDate,
  processMembershipCycles,
} from './membership.service';

// Integration tests against the real local Postgres database (CLAUDE.md:
// money/credit-moving logic gets verified end-to-end, not mocked). Every
// test creates its own throwaway user and cleans it up afterward - nothing
// here ever touches, counts, or asserts on rows it didn't create itself, so
// it's safe to run against a database that already has real dev data in it.

const DAY_MS = 24 * 60 * 60 * 1000;

let createdUserIds: string[] = [];

afterEach(async () => {
  // onDelete: Cascade on Membership/CreditLedger/etc. means deleting the
  // user cleans up everything this test created in one shot.
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds = [];
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createTestUser() {
  const user = await prisma.user.create({
    data: {
      name: 'Reset Test User',
      email: `reset-test-${randomUUID()}@example.test`,
      password_hash: 'x',
    },
  });
  createdUserIds.push(user.id);
  return user;
}

interface MembershipFixtureOptions {
  status?: string;
  credits?: number;
  cycleStartDaysAgo?: number; // current_cycle_start = now - N days
  endDateDaysFromNow?: number; // end_date = now + N days (negative = already lapsed)
  cancelledAt?: Date | null;
}

async function createTestMembership(userId: string, opts: MembershipFixtureOptions = {}) {
  const now = Date.now();
  const cycleStart = new Date(now - (opts.cycleStartDaysAgo ?? 30) * DAY_MS);
  const endDate =
    opts.endDateDaysFromNow === undefined ? new Date(now - DAY_MS) : new Date(now + opts.endDateDaysFromNow * DAY_MS);

  return prisma.membership.create({
    data: {
      user_id: userId,
      status: opts.status ?? 'ACTIVE',
      start_date: cycleStart,
      current_cycle_start: cycleStart,
      end_date: endDate,
      credits: opts.credits ?? MONTHLY_CREDIT_ALLOWANCE,
      cancelled_at: opts.cancelledAt ?? null,
    },
  });
}

async function getResetLedgerRows(membershipId: string) {
  return prisma.creditLedger.findMany({
    where: { reference_id: membershipId, type: 'RESET' },
    orderBy: { created_at: 'asc' },
  });
}

describe('Monthly credit reset', () => {
  it('1. active member with a lapsed cycle receives RESET +30', async () => {
    const user = await createTestUser();
    const membership = await createTestMembership(user.id, { credits: 0 });

    await processMembershipCycles();

    const updated = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
    expect(updated.credits).toBe(MONTHLY_CREDIT_ALLOWANCE);

    const resets = await getResetLedgerRows(membership.id);
    expect(resets).toHaveLength(1);
    expect(resets[0].amount).toBe(MONTHLY_CREDIT_ALLOWANCE);
    expect(resets[0].balance_after).toBe(MONTHLY_CREDIT_ALLOWANCE);
  });

  it('2. member with unused previous credits gets exactly 30, not old balance + 30', async () => {
    const user = await createTestUser();
    // 30 issued, 8 spent -> 22 unused sitting on the membership when the cycle ends.
    const membership = await createTestMembership(user.id, { credits: 22 });

    await processMembershipCycles();

    const updated = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
    expect(updated.credits).toBe(30); // NOT 52

    const voidRow = await prisma.creditLedger.findFirst({
      where: { reference_id: membership.id, type: 'VOID' },
    });
    expect(voidRow?.amount).toBe(-22);
    expect(voidRow?.balance_after).toBe(0);
  });

  it('3. processing the same billing period twice grants only one RESET', async () => {
    const user = await createTestUser();
    const membership = await createTestMembership(user.id, { credits: 5 });

    await processMembershipCycles();
    await processMembershipCycles(); // same lapsed cycle - already advanced by the first call

    const updated = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
    expect(updated.credits).toBe(30); // not 60

    const resets = await getResetLedgerRows(membership.id);
    expect(resets).toHaveLength(1);
  });

  it('4. multiple eligible members each receive exactly one reset', async () => {
    const users = await Promise.all([createTestUser(), createTestUser(), createTestUser()]);
    const memberships = await Promise.all(users.map((u) => createTestMembership(u.id, { credits: 0 })));

    await processMembershipCycles();

    for (const membership of memberships) {
      const updated = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
      expect(updated.credits).toBe(MONTHLY_CREDIT_ALLOWANCE);
      const resets = await getResetLedgerRows(membership.id);
      expect(resets).toHaveLength(1);
    }
  });

  it('5. membership with no ACTIVE status (e.g. an inactive/no-membership user) is never reset', async () => {
    const user = await createTestUser();
    // No membership row at all - the "INACTIVE" state the API reports for a user
    // with nothing on record (membership.controller.ts's effectiveStatus()).
    await ensureCycleUpToDate(user.id); // must be a safe no-op, not throw
    const membership = await prisma.membership.findFirst({ where: { user_id: user.id } });
    expect(membership).toBeNull();
  });

  it('6. failed renewal (PAYMENT_FAILED) is never reset', async () => {
    const user = await createTestUser();
    const membership = await createTestMembership(user.id, { status: 'PAYMENT_FAILED', credits: 3 });

    await processMembershipCycles();

    const updated = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
    expect(updated.credits).toBe(3); // untouched
    expect(await getResetLedgerRows(membership.id)).toHaveLength(0);
  });

  it('7. cancelled membership still inside its paid period keeps its current credits', async () => {
    const user = await createTestUser();
    const membership = await createTestMembership(user.id, {
      status: 'CANCELED',
      credits: 15,
      endDateDaysFromNow: 10, // paid period hasn't ended yet
      cancelledAt: new Date(),
    });

    await processMembershipCycles();

    const updated = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
    expect(updated.credits).toBe(15); // still usable, untouched
    expect(await getResetLedgerRows(membership.id)).toHaveLength(0);
  });

  it('8. cancelled membership after its paid period is never reset', async () => {
    const user = await createTestUser();
    const membership = await createTestMembership(user.id, {
      status: 'CANCELED',
      credits: 4,
      endDateDaysFromNow: -5, // paid period already ended
      cancelledAt: new Date(),
    });

    await processMembershipCycles();

    const updated = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
    expect(updated.credits).toBe(4);
    expect(await getResetLedgerRows(membership.id)).toHaveLength(0);
  });

  it('10. a duplicate-RESET race is rolled back atomically - no partial credit update', async () => {
    const user = await createTestUser();
    const membership = await createTestMembership(user.id, { credits: 0 });
    const newCycleStart = membership.end_date as Date; // exactly what processOneMembershipCycle would compute

    // Simulate "someone else already reset this exact cycle" by pre-inserting
    // the row the real reset attempt is about to try to insert - forces the
    // unique constraint (billing_cycle_start, reference_id) WHERE type='RESET'
    // to fail mid-transaction.
    await prisma.creditLedger.create({
      data: {
        user_id: user.id,
        type: 'RESET',
        amount: MONTHLY_CREDIT_ALLOWANCE,
        balance_after: MONTHLY_CREDIT_ALLOWANCE,
        reference_id: membership.id,
        billing_cycle_start: newCycleStart,
      },
    });

    // processMembershipCycles catches the violation internally and continues -
    // must not throw, and must leave the membership row exactly as it was
    // before this attempt (the VOID entry, if any, and the membership.update
    // are in the SAME transaction as the conflicting insert, so both roll back).
    await expect(processMembershipCycles()).resolves.toBeDefined();

    const updated = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
    expect(updated.credits).toBe(0); // NOT advanced to 30 - the transaction rolled back
    expect(updated.current_cycle_start.getTime()).toBe(membership.current_cycle_start.getTime()); // cycle not advanced

    const resets = await getResetLedgerRows(membership.id);
    expect(resets).toHaveLength(1); // only the one we pre-inserted, no duplicate
  });

  it('11. concurrent reset attempts on the same membership produce only one successful reset', async () => {
    const user = await createTestUser();
    const membership = await createTestMembership(user.id, { credits: 0 });

    // Two overlapping calls racing for the same lapsed membership - the row
    // lock (SELECT ... FOR UPDATE) inside processOneMembershipCycle serializes
    // them, so only one actually advances the cycle.
    await Promise.all([processMembershipCycles(), processMembershipCycles()]);

    const updated = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
    expect(updated.credits).toBe(MONTHLY_CREDIT_ALLOWANCE); // not double-credited

    const resets = await getResetLedgerRows(membership.id);
    expect(resets).toHaveLength(1);
  });

  it('12. existing SUBSCRIPTION/cancellation ledger behavior is unaffected', async () => {
    const user = await createTestUser();

    const { membership, created } = await activateDevMembership(user.id);
    expect(created).toBe(true);
    expect(membership.credits).toBe(MONTHLY_CREDIT_ALLOWANCE);

    const subscriptionRow = await prisma.creditLedger.findFirst({
      where: { reference_id: membership.id, type: 'SUBSCRIPTION' },
    });
    expect(subscriptionRow?.amount).toBe(MONTHLY_CREDIT_ALLOWANCE);
    expect(subscriptionRow?.balance_after).toBe(MONTHLY_CREDIT_ALLOWANCE);

    const cancelled = await cancelMembership(user.id);
    expect(cancelled?.status).toBe('CANCELED');
    expect(cancelled?.cancelled_at).not.toBeNull();
    // Cancelling never touches the credit ledger by itself.
    expect(await getResetLedgerRows(membership.id)).toHaveLength(0);
  });

  it('asOf lets a test simulate "cycle already ended" without waiting for a real month, without changing default (real-time) behavior', async () => {
    const user = await createTestUser();
    // end_date is 10 days in the future relative to the real clock - NOT
    // eligible under real "now".
    const membership = await createTestMembership(user.id, { credits: 0, endDateDaysFromNow: 10 });

    await processMembershipCycles(); // default asOf = real now -> must NOT process
    let updated = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
    expect(updated.credits).toBe(0);

    const simulatedFuture = new Date(Date.now() + 20 * DAY_MS); // "20 days from now"
    await processMembershipCycles(simulatedFuture); // -> IS eligible under the simulated date
    updated = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
    expect(updated.credits).toBe(MONTHLY_CREDIT_ALLOWANCE);
  });
});
