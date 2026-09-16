import crypto from 'crypto';
import { Prisma, Redemption } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ensureCycleUpToDate } from './membership.service';
import { AppError } from '../utils/AppError';

const REDEMPTION_TTL_MS = 5 * 60 * 1000; // 5 minutes - matches the existing QR countdown UI
const MAX_GENERATION_ATTEMPTS = 5;

// A Prisma unique-constraint violation (same convention as
// membership.service.ts).
function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

// Long, unguessable, URL/QR-safe. Not a JWT and carries no PII - just an
// opaque bearer token for this one redemption.
function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// crypto.randomInt (not Math.random) so the 6-digit backup code is not
// predictable.
function generateBackupCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export interface CreateRedemptionInput {
  userId: string;
  cafeId: string;
  drinkId: string;
}

/**
 * Creates a PENDING redemption code (no credit deduction - that only
 * happens in redeemCode below). Locks the member's active membership row
 * for the duration of the checks (via a raw FOR UPDATE query - Prisma's
 * query builder cannot express row locking) so a concurrent request for the
 * same user can't race past the "do they already have a pending code"
 * check; this is also what makes it safe to lazily expire a stale PENDING
 * row here before inserting a new one.
 */
export async function createRedemption(input: CreateRedemptionInput): Promise<Redemption> {
  const { userId, cafeId, drinkId } = input;

  // Phase 8: make sure a lapsed membership cycle has already been renewed
  // before checking membership/credits below - otherwise a member whose
  // monthly cycle ended since their last visit would be wrongly told their
  // membership is inactive. A no-op (single SELECT) for the common case
  // where the cycle isn't lapsed.
  await ensureCycleUpToDate(userId);

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const membershipRows = await tx.$queryRaw<{ id: string; credits: number }[]>`
          SELECT id, credits FROM memberships
          WHERE user_id = ${userId}::uuid AND status = 'ACTIVE' AND (end_date IS NULL OR end_date > now())
          ORDER BY created_at DESC LIMIT 1
          FOR UPDATE
        `;
        const membership = membershipRows[0];
        if (!membership) {
          throw new AppError(403, 'An active membership is required to redeem drinks.', 'MEMBERSHIP_INACTIVE');
        }

        const drink = await tx.drink.findUnique({ where: { id: drinkId } });
        if (!drink || !drink.is_active || drink.cafe_id !== cafeId) {
          throw new AppError(404, 'Drink not found at this cafe.', 'DRINK_NOT_FOUND');
        }

        const cafe = await tx.cafe.findUnique({ where: { id: cafeId } });
        if (!cafe || !cafe.is_active) {
          throw new AppError(404, 'Cafe not found.', 'CAFE_NOT_FOUND');
        }

        if (membership.credits < drink.credit_price) {
          throw new AppError(402, 'Insufficient credits for this drink.', 'INSUFFICIENT_CREDITS');
        }

        const pendingRows = await tx.$queryRaw<Redemption[]>`
          SELECT * FROM redemptions WHERE user_id = ${userId}::uuid AND status = 'PENDING' ORDER BY created_at DESC LIMIT 1 FOR UPDATE
        `;
        const existingPending = pendingRows[0];
        if (existingPending) {
          if (new Date(existingPending.expires_at) > new Date()) {
            throw new AppError(
              409,
              'You already have a pending redemption. Redeem or cancel it first.',
              'REDEMPTION_ALREADY_PENDING'
            );
          }
          // Stale - lazily expire it so a new one can be created.
          await tx.redemption.update({ where: { id: existingPending.id }, data: { status: 'EXPIRED' } });
        }

        const token = generateToken();
        const backupCode = generateBackupCode();
        const expiresAt = new Date(Date.now() + REDEMPTION_TTL_MS);

        return tx.redemption.create({
          data: {
            user_id: userId,
            cafe_id: cafeId,
            drink_id: drinkId,
            credit_price: drink.credit_price,
            token,
            backup_code: backupCode,
            expires_at: expiresAt,
          },
        });
      });
    } catch (err) {
      if (isUniqueViolation(err) && attempt < MAX_GENERATION_ATTEMPTS - 1) {
        continue; // token/backup_code collision - vanishingly rare, retry with a fresh one
      }
      throw err;
    }
  }

  throw new AppError(500, 'Failed to generate a redemption code. Please try again.', 'REDEMPTION_GENERATION_FAILED');
}

export interface RedeemedHistoryEntry {
  id: string;
  drink_id: string;
  drink_name: string;
  drink_image_url: string | null;
  cafe_id: string;
  cafe_name: string;
  redeemed_at: Date | null;
}

// Phase 9: the caller's own completed redemptions, with just enough
// drink/cafe display info joined in for the Drink Diary to render each
// entry (and decide, client-side, which ones already have a review) -
// review.service.ts owns review data entirely; this stays a pure,
// read-only redemption query.
export async function getRedeemedHistoryForUser(userId: string): Promise<RedeemedHistoryEntry[]> {
  const rows = await prisma.redemption.findMany({
    where: { user_id: userId, status: 'REDEEMED' },
    orderBy: { redeemed_at: 'desc' },
    include: {
      drink: { select: { name: true, image_url: true } },
      cafe: { select: { name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    drink_id: r.drink_id,
    drink_name: r.drink.name,
    drink_image_url: r.drink.image_url,
    cafe_id: r.cafe_id,
    cafe_name: r.cafe.name,
    redeemed_at: r.redeemed_at,
  }));
}

export async function getLatestRedemption(userId: string): Promise<Redemption | null> {
  return prisma.redemption.findFirst({ where: { user_id: userId }, orderBy: { created_at: 'desc' } });
}

// Module 1.2's "second scheduled job": marks PENDING codes whose 5-minute
// window has passed as EXPIRED even if nobody ever came back to scan them
// or generate a new one. createRedemption/redeemCode already expire a stale
// code lazily the moment it's next touched - this is the proactive sweep
// for ones that are simply never touched again.
export async function expireStaleRedemptions(): Promise<number> {
  const result = await prisma.redemption.updateMany({
    where: { status: 'PENDING', expires_at: { lte: new Date() } },
    data: { status: 'EXPIRED' },
  });
  return result.count;
}

export async function cancelPendingRedemption(userId: string): Promise<Redemption | null> {
  const result = await prisma.redemption.updateMany({
    where: { user_id: userId, status: 'PENDING' },
    data: { status: 'VOID' },
  });
  if (result.count === 0) return null;
  return prisma.redemption.findFirst({ where: { user_id: userId, status: 'VOID' }, orderBy: { updated_at: 'desc' } });
}

export interface RedeemInput {
  cafeId: string;
  token?: string;
  backupCode?: string;
  redeemedByUserId?: string;
}

export interface RedeemResult {
  redemption: Redemption;
  newBalance: number;
}

type RedeemOutcome = { kind: 'expired' } | { kind: 'success'; result: RedeemResult };

/**
 * The barista-side scan: the only place a redemption's credits actually
 * move. Locks the redemption row FOR UPDATE first (raw query, same reason
 * as createRedemption above), so of N concurrent scans of the same code,
 * only the first to acquire the lock sees status = PENDING and proceeds -
 * every other request blocks until that transaction commits, then re-reads
 * status = REDEEMED and correctly rejects. Also re-checks membership/credits
 * under lock, since balance can change between when the code was generated
 * and when it's scanned.
 *
 * The 'expired' outcome is deliberately not thrown from inside the
 * transaction: the original raw-SQL version committed the EXPIRED status
 * write and only then reported the error to the caller (so a later scan of
 * the same code doesn't need to re-discover it's expired), and a throw
 * inside a Prisma interactive transaction rolls the whole thing back. This
 * two-step return-then-throw preserves that "commit the expiry, still
 * report an error" behavior.
 */
export async function redeemCode(input: RedeemInput): Promise<RedeemResult> {
  const { cafeId, token, backupCode, redeemedByUserId } = input;
  if (!token && !backupCode) {
    throw new AppError(400, 'A token or backup code is required.', 'MISSING_CODE');
  }

  const outcome = await prisma.$transaction(async (tx): Promise<RedeemOutcome> => {
    const lookupRows = token
      ? await tx.$queryRaw<Redemption[]>`SELECT * FROM redemptions WHERE token = ${token} FOR UPDATE`
      : await tx.$queryRaw<Redemption[]>`SELECT * FROM redemptions WHERE backup_code = ${backupCode} AND status = 'PENDING' FOR UPDATE`;

    const redemption = lookupRows[0];
    if (!redemption) {
      throw new AppError(404, 'Invalid or unrecognized code.', 'REDEMPTION_NOT_FOUND');
    }

    if (redemption.cafe_id !== cafeId) {
      throw new AppError(403, 'This code is not valid at this cafe.', 'WRONG_CAFE');
    }

    if (redemption.status === 'PENDING' && new Date(redemption.expires_at) <= new Date()) {
      await tx.redemption.update({ where: { id: redemption.id }, data: { status: 'EXPIRED' } });
      return { kind: 'expired' };
    }

    if (redemption.status !== 'PENDING') {
      const reason = redemption.status === 'REDEEMED' ? 'This code has already been used.' : 'This code is no longer valid.';
      throw new AppError(409, reason, `REDEMPTION_${redemption.status}`);
    }

    // Phase 10: the cafe's payout rate at this exact moment, snapshotted onto
    // the redemption below so a later admin rate change never rewrites a
    // past statement (same reasoning as credit_price above).
    const cafe = await tx.cafe.findUnique({ where: { id: cafeId }, select: { payout_rate: true } });
    const payoutRate = cafe?.payout_rate ?? new Prisma.Decimal(0);

    const membershipRows = await tx.$queryRaw<{ id: string; credits: number }[]>`
      SELECT id, credits FROM memberships
      WHERE user_id = ${redemption.user_id}::uuid AND status = 'ACTIVE' AND (end_date IS NULL OR end_date > now())
      ORDER BY created_at DESC LIMIT 1
      FOR UPDATE
    `;
    const membership = membershipRows[0];
    if (!membership) {
      throw new AppError(403, 'This member no longer has an active membership.', 'MEMBERSHIP_INACTIVE');
    }

    if (membership.credits < redemption.credit_price) {
      throw new AppError(402, 'This member has insufficient credits.', 'INSUFFICIENT_CREDITS');
    }

    const newBalance = membership.credits - redemption.credit_price;

    await tx.membership.update({ where: { id: membership.id }, data: { credits: newBalance } });

    await tx.creditLedger.create({
      data: {
        user_id: redemption.user_id,
        type: 'REDEMPTION',
        amount: -redemption.credit_price,
        balance_after: newBalance,
        reference_id: redemption.id,
      },
    });

    const updated = await tx.redemption.update({
      where: { id: redemption.id },
      data: {
        status: 'REDEEMED',
        redeemed_at: new Date(),
        redeemed_by_user_id: redeemedByUserId,
        payout_rate: payoutRate,
      },
    });

    return { kind: 'success', result: { redemption: updated, newBalance } };
  });

  if (outcome.kind === 'expired') {
    throw new AppError(410, 'This code has expired.', 'REDEMPTION_EXPIRED');
  }
  return outcome.result;
}
