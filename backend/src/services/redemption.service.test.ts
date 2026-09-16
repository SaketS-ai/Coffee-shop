import { randomUUID } from 'crypto';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { prisma } from '../config/prisma';
import { createRedemption, expireStaleRedemptions, redeemCode } from './redemption.service';
import { voidRedemption } from './admin.service';

// Integration tests against the real local Postgres database (CLAUDE.md:
// the credit ledger and redemption flow are the PRD's own top QA priority,
// verified end-to-end rather than mocked). Every test builds its own
// throwaway user/cafe/drink/membership and cleans them up afterward.

let createdUserIds: string[] = [];
let createdCafeIds: string[] = [];

afterEach(async () => {
  // Cafes must go first: a voided redemption's voided_by_user_id references
  // the admin user with no cascade, so deleting the user while that
  // redemption row still exists (via the cafe) violates the FK. Deleting the
  // cafe cascades away its drinks/redemptions first, clearing the reference.
  if (createdCafeIds.length > 0) {
    await prisma.cafe.deleteMany({ where: { id: { in: createdCafeIds } } });
    createdCafeIds = [];
  }
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
      name: 'Redemption Test User',
      email: `redemption-test-${randomUUID()}@example.test`,
      password_hash: 'x',
      role: 'MEMBER',
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createTestMembership(userId: string, credits = 30) {
  return prisma.membership.create({
    data: {
      user_id: userId,
      status: 'ACTIVE',
      credits,
      current_cycle_start: new Date(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

async function createTestCafeAndDrink(opts: { creditPrice?: number; payoutRate?: number } = {}) {
  const cafe = await prisma.cafe.create({
    data: {
      name: 'Redemption Test Cafe',
      address: '1 Test St',
      city: 'Dallas',
      state: 'TX',
      payout_rate: opts.payoutRate ?? 2.5,
    },
  });
  createdCafeIds.push(cafe.id);
  const drink = await prisma.drink.create({
    data: {
      cafe_id: cafe.id,
      name: 'Test Drink',
      price: 5,
      credit_price: opts.creditPrice ?? 4,
    },
  });
  return { cafe, drink };
}

describe('Redemption flow', () => {
  it('1. success: creates a PENDING code, then redeeming it deducts credits, writes a REDEMPTION ledger entry, and marks REDEEMED', async () => {
    const user = await createTestUser();
    await createTestMembership(user.id, 30);
    const { cafe, drink } = await createTestCafeAndDrink({ creditPrice: 6 });

    const redemption = await createRedemption({ userId: user.id, cafeId: cafe.id, drinkId: drink.id });
    expect(redemption.status).toBe('PENDING');
    expect(redemption.credit_price).toBe(6);

    const result = await redeemCode({ cafeId: cafe.id, token: redemption.token });
    expect(result.redemption.status).toBe('REDEEMED');
    expect(result.redemption.redeemed_at).not.toBeNull();
    expect(result.newBalance).toBe(24); // 30 - 6

    const membership = await prisma.membership.findFirstOrThrow({ where: { user_id: user.id } });
    expect(membership.credits).toBe(24);

    const ledgerRow = await prisma.creditLedger.findFirst({
      where: { reference_id: redemption.id, type: 'REDEMPTION' },
    });
    expect(ledgerRow?.amount).toBe(-6);
    expect(ledgerRow?.balance_after).toBe(24);
  });

  it('2. success via the 6-digit backup code (no token needed)', async () => {
    const user = await createTestUser();
    await createTestMembership(user.id, 30);
    const { cafe, drink } = await createTestCafeAndDrink({ creditPrice: 4 });

    const redemption = await createRedemption({ userId: user.id, cafeId: cafe.id, drinkId: drink.id });
    const result = await redeemCode({ cafeId: cafe.id, backupCode: redemption.backup_code });
    expect(result.redemption.status).toBe('REDEEMED');
    expect(result.newBalance).toBe(26);
  });

  it('3. expired: a code past its 5-minute window is rejected and marked EXPIRED', async () => {
    const user = await createTestUser();
    await createTestMembership(user.id, 30);
    const { cafe, drink } = await createTestCafeAndDrink();

    const redemption = await createRedemption({ userId: user.id, cafeId: cafe.id, drinkId: drink.id });
    await prisma.redemption.update({ where: { id: redemption.id }, data: { expires_at: new Date(Date.now() - 1000) } });

    await expect(redeemCode({ cafeId: cafe.id, token: redemption.token })).rejects.toMatchObject({
      reason: 'REDEMPTION_EXPIRED',
    });

    const updated = await prisma.redemption.findUniqueOrThrow({ where: { id: redemption.id } });
    expect(updated.status).toBe('EXPIRED');

    // Membership credits must be untouched by a rejected scan.
    const membership = await prisma.membership.findFirstOrThrow({ where: { user_id: user.id } });
    expect(membership.credits).toBe(30);
  });

  it('4. replay: redeeming an already-REDEEMED code a second time is rejected, without a second deduction', async () => {
    const user = await createTestUser();
    await createTestMembership(user.id, 30);
    const { cafe, drink } = await createTestCafeAndDrink({ creditPrice: 4 });

    const redemption = await createRedemption({ userId: user.id, cafeId: cafe.id, drinkId: drink.id });
    await redeemCode({ cafeId: cafe.id, token: redemption.token });

    await expect(redeemCode({ cafeId: cafe.id, token: redemption.token })).rejects.toMatchObject({
      reason: 'REDEMPTION_REDEEMED',
    });

    const membership = await prisma.membership.findFirstOrThrow({ where: { user_id: user.id } });
    expect(membership.credits).toBe(26); // only deducted once, not twice
  });

  it('5. invalid backup code (no matching PENDING redemption) is rejected', async () => {
    const { cafe } = await createTestCafeAndDrink();
    await expect(redeemCode({ cafeId: cafe.id, backupCode: '000000' })).rejects.toMatchObject({
      reason: 'REDEMPTION_NOT_FOUND',
    });
  });

  it('6a. insufficient credits at code-generation time is rejected before a code is even created', async () => {
    const user = await createTestUser();
    await createTestMembership(user.id, 2); // less than the drink's price
    const { cafe, drink } = await createTestCafeAndDrink({ creditPrice: 4 });

    await expect(createRedemption({ userId: user.id, cafeId: cafe.id, drinkId: drink.id })).rejects.toMatchObject({
      reason: 'INSUFFICIENT_CREDITS',
    });
  });

  it('6b. insufficient credits discovered at scan time (balance dropped after the code was generated) is rejected, code stays usable', async () => {
    const user = await createTestUser();
    const membership = await createTestMembership(user.id, 10);
    const { cafe, drink } = await createTestCafeAndDrink({ creditPrice: 6 });

    const redemption = await createRedemption({ userId: user.id, cafeId: cafe.id, drinkId: drink.id });
    // Simulate the balance dropping (e.g. another redemption) between
    // generation and scan, without going through redeemCode itself.
    await prisma.membership.update({ where: { id: membership.id }, data: { credits: 2 } });

    await expect(redeemCode({ cafeId: cafe.id, token: redemption.token })).rejects.toMatchObject({
      reason: 'INSUFFICIENT_CREDITS',
    });

    const stillPending = await prisma.redemption.findUniqueOrThrow({ where: { id: redemption.id } });
    expect(stillPending.status).toBe('PENDING'); // rejected scan must not consume the code
  });

  it('7. wrong cafe: a code redeemed at a different cafe than it was issued for is rejected', async () => {
    const user = await createTestUser();
    await createTestMembership(user.id, 30);
    const { cafe, drink } = await createTestCafeAndDrink();
    const { cafe: otherCafe } = await createTestCafeAndDrink();

    const redemption = await createRedemption({ userId: user.id, cafeId: cafe.id, drinkId: drink.id });
    await expect(redeemCode({ cafeId: otherCafe.id, token: redemption.token })).rejects.toMatchObject({
      reason: 'WRONG_CAFE',
    });
  });

  it('8. duplicate pending: a member cannot generate a second code while one is still active', async () => {
    const user = await createTestUser();
    await createTestMembership(user.id, 30);
    const { cafe, drink } = await createTestCafeAndDrink();

    await createRedemption({ userId: user.id, cafeId: cafe.id, drinkId: drink.id });
    await expect(createRedemption({ userId: user.id, cafeId: cafe.id, drinkId: drink.id })).rejects.toMatchObject({
      reason: 'REDEMPTION_ALREADY_PENDING',
    });
  });

  it('8b. a stale pending code (past its window) does not block generating a fresh one', async () => {
    const user = await createTestUser();
    await createTestMembership(user.id, 30);
    const { cafe, drink } = await createTestCafeAndDrink();

    const first = await createRedemption({ userId: user.id, cafeId: cafe.id, drinkId: drink.id });
    await prisma.redemption.update({ where: { id: first.id }, data: { expires_at: new Date(Date.now() - 1000) } });

    const second = await createRedemption({ userId: user.id, cafeId: cafe.id, drinkId: drink.id });
    expect(second.id).not.toBe(first.id);
    expect(second.status).toBe('PENDING');
  });

  it('9. concurrent scans of the same code: exactly one succeeds, the other gets a definitive rejection, credits deducted only once', async () => {
    const user = await createTestUser();
    await createTestMembership(user.id, 30);
    const { cafe, drink } = await createTestCafeAndDrink({ creditPrice: 6 });

    const redemption = await createRedemption({ userId: user.id, cafeId: cafe.id, drinkId: drink.id });

    const outcomes = await Promise.allSettled([
      redeemCode({ cafeId: cafe.id, token: redemption.token }),
      redeemCode({ cafeId: cafe.id, token: redemption.token }),
    ]);

    const fulfilled = outcomes.filter((o) => o.status === 'fulfilled');
    const rejected = outcomes.filter((o) => o.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({ reason: 'REDEMPTION_REDEEMED' });

    const membership = await prisma.membership.findFirstOrThrow({ where: { user_id: user.id } });
    expect(membership.credits).toBe(24); // 30 - 6, deducted exactly once despite the race

    const ledgerRows = await prisma.creditLedger.findMany({
      where: { reference_id: redemption.id, type: 'REDEMPTION' },
    });
    expect(ledgerRows).toHaveLength(1);
  });

  it('10. payout rate is snapshotted at scan time, not generation time, and stays fixed after a later rate change', async () => {
    const user = await createTestUser();
    await createTestMembership(user.id, 30);
    const { cafe, drink } = await createTestCafeAndDrink({ payoutRate: 2.0 });

    const redemption = await createRedemption({ userId: user.id, cafeId: cafe.id, drinkId: drink.id });
    // Rate changes between generation and the actual counter scan.
    await prisma.cafe.update({ where: { id: cafe.id }, data: { payout_rate: 3.5 } });

    const result = await redeemCode({ cafeId: cafe.id, token: redemption.token });
    expect(Number(result.redemption.payout_rate)).toBe(3.5); // rate at scan time, not 2.0

    // A later admin change must not rewrite this already-completed statement.
    await prisma.cafe.update({ where: { id: cafe.id }, data: { payout_rate: 9.9 } });
    const reloaded = await prisma.redemption.findUniqueOrThrow({ where: { id: redemption.id } });
    expect(Number(reloaded.payout_rate)).toBe(3.5);
  });

  it('11. expireStaleRedemptions sweeps PENDING codes past their window without touching others', async () => {
    const user = await createTestUser();
    await createTestMembership(user.id, 30);
    const { cafe, drink } = await createTestCafeAndDrink();

    const stale = await createRedemption({ userId: user.id, cafeId: cafe.id, drinkId: drink.id });
    await prisma.redemption.update({ where: { id: stale.id }, data: { expires_at: new Date(Date.now() - 1000) } });

    const count = await expireStaleRedemptions();
    expect(count).toBeGreaterThanOrEqual(1);

    const updated = await prisma.redemption.findUniqueOrThrow({ where: { id: stale.id } });
    expect(updated.status).toBe('EXPIRED');
  });

  it('12. void/refund: voiding a REDEEMED redemption restores credits via a VOID ledger entry and flips status to VOID', async () => {
    const admin = await prisma.user.create({
      data: { name: 'Void Test Admin', email: `void-admin-${randomUUID()}@example.test`, password_hash: 'x', role: 'ADMIN' },
    });
    createdUserIds.push(admin.id);

    const user = await createTestUser();
    await createTestMembership(user.id, 30);
    const { cafe, drink } = await createTestCafeAndDrink({ creditPrice: 6 });

    const redemption = await createRedemption({ userId: user.id, cafeId: cafe.id, drinkId: drink.id });
    await redeemCode({ cafeId: cafe.id, token: redemption.token });

    let membership = await prisma.membership.findFirstOrThrow({ where: { user_id: user.id } });
    expect(membership.credits).toBe(24);

    await voidRedemption(redemption.id, admin.id, 'Customer complaint - wrong drink poured');

    const voided = await prisma.redemption.findUniqueOrThrow({ where: { id: redemption.id } });
    expect(voided.status).toBe('VOID');
    expect(voided.voided_by_user_id).toBe(admin.id);
    expect(voided.void_reason).toBe('Customer complaint - wrong drink poured');

    membership = await prisma.membership.findFirstOrThrow({ where: { user_id: user.id } });
    expect(membership.credits).toBe(30); // fully restored

    const voidRow = await prisma.creditLedger.findFirst({ where: { reference_id: redemption.id, type: 'VOID' } });
    expect(voidRow?.amount).toBe(6);
    expect(voidRow?.balance_after).toBe(30);
  });

  it('12b. voiding a redemption that is not REDEEMED (e.g. still PENDING) is rejected', async () => {
    const admin = await prisma.user.create({
      data: { name: 'Void Test Admin 2', email: `void-admin2-${randomUUID()}@example.test`, password_hash: 'x', role: 'ADMIN' },
    });
    createdUserIds.push(admin.id);

    const user = await createTestUser();
    await createTestMembership(user.id, 30);
    const { cafe, drink } = await createTestCafeAndDrink();
    const redemption = await createRedemption({ userId: user.id, cafeId: cafe.id, drinkId: drink.id });

    await expect(voidRedemption(redemption.id, admin.id, 'test')).rejects.toMatchObject({
      reason: 'REDEMPTION_NOT_REDEEMED',
    });
  });

  it('13. missing code input (neither token nor backup_code) is rejected', async () => {
    const { cafe } = await createTestCafeAndDrink();
    await expect(redeemCode({ cafeId: cafe.id })).rejects.toMatchObject({ reason: 'MISSING_CODE' });
  });
});
