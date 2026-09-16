import { prisma } from '../config/prisma';
import { Prisma, Review } from '@prisma/client';
import { AppError } from '../utils/AppError';

// A Prisma unique-constraint violation (same convention as
// membership/redemption services, translated from Postgres 23505).
function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export interface CreateReviewInput {
  userId: string;
  redemptionId?: string;
  drinkId?: string;
  rating: number;
  note: string | null;
}

/**
 * A visitor may review a drink directly; a redemption, when supplied, is
 * still checked for ownership and completion. The unique user/drink index
 * prevents duplicate ratings while allowing edits later.
 */
export async function createReview(input: CreateReviewInput): Promise<Review> {
  const { userId, redemptionId, drinkId, rating, note } = input;

  const redemption = redemptionId ? await prisma.redemption.findUnique({
    where: { id: redemptionId },
    select: { user_id: true, drink_id: true, status: true },
  }) : null;
  if (redemptionId && !redemption) {
    throw new AppError(404, 'Redemption not found.', 'REDEMPTION_NOT_FOUND');
  }
  if (redemption && redemption.user_id !== userId) {
    throw new AppError(403, 'This redemption does not belong to you.', 'NOT_YOUR_REDEMPTION');
  }
  if (redemption && redemption.status !== 'REDEEMED') {
    throw new AppError(403, 'Only completed redemptions can be reviewed.', 'REDEMPTION_NOT_COMPLETED');
  }

  try {
    return await prisma.review.create({
      data: { user_id: userId, redemption_id: redemptionId ?? null, drink_id: redemption?.drink_id ?? drinkId!, rating, note },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError(409, 'This redemption has already been reviewed.', 'REVIEW_ALREADY_EXISTS');
    }
    throw err;
  }
}

export interface ReviewWithDetails {
  id: string;
  redemption_id: string | null;
  drink_id: string;
  drink_name: string;
  drink_image_url: string | null;
  cafe_name: string;
  rating: number;
  note: string | null;
  created_at: Date;
  redeemed_at: Date | null;
}

// The caller's own reviews only - scoped by user_id, never a client-supplied
// filter. Joins in display-only fields (drink/cafe name, image, redemption
// date) at read time rather than storing them on the review row.
export async function getReviewsForUser(userId: string): Promise<ReviewWithDetails[]> {
  const rows = await prisma.review.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    include: {
      drink: { select: { name: true, image_url: true, cafe: { select: { name: true } } } },
      redemption: { select: { redeemed_at: true, cafe: { select: { name: true } } } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    redemption_id: row.redemption_id,
    drink_id: row.drink_id,
    drink_name: row.drink.name,
    drink_image_url: row.drink.image_url,
    cafe_name: row.redemption?.cafe.name ?? row.drink.cafe.name,
    rating: row.rating,
    note: row.note,
    created_at: row.created_at,
    redeemed_at: row.redemption?.redeemed_at ?? null,
  }));
}

export interface UpdateReviewInput {
  rating?: number;
  note?: string | null;
}

// Scoped by id AND user_id in the same query (same pattern as
// redemption.service.ts's cancelPendingRedemption) - a review that exists
// but belongs to someone else simply matches nothing, rather than needing a
// separate ownership pre-check.
export async function updateReview(id: string, userId: string, input: UpdateReviewInput): Promise<Review | null> {
  const data: Prisma.ReviewUpdateInput = {};
  if (input.rating !== undefined) data.rating = input.rating;
  if (input.note !== undefined) data.note = input.note;

  if (Object.keys(data).length === 0) {
    return prisma.review.findFirst({ where: { id, user_id: userId } });
  }

  const result = await prisma.review.updateMany({ where: { id, user_id: userId }, data });
  if (result.count === 0) return null;
  return prisma.review.findUnique({ where: { id } });
}

// Deletes only the caller's own review. Never touches redemptions,
// memberships, or credit_ledger - this is purely review data.
export async function deleteReview(id: string, userId: string): Promise<boolean> {
  const result = await prisma.review.deleteMany({ where: { id, user_id: userId } });
  return result.count > 0;
}

export interface RatingSummary {
  average: number;
  count: number;
}

const EMPTY_RATING: RatingSummary = { average: 0, count: 0 };

// Batched per-drink rating aggregate - used when rendering a cafe's menu so
// each drink card shows its own real average rather than a fabricated one.
export async function getRatingSummaryByDrinkIds(drinkIds: string[]): Promise<Map<string, RatingSummary>> {
  if (drinkIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<{ drink_id: string; average: number; count: bigint }[]>`
    SELECT drink_id, AVG(rating)::float AS average, COUNT(*)::bigint AS count
    FROM reviews
    WHERE drink_id = ANY(${drinkIds}::uuid[])
    GROUP BY drink_id
  `;
  return new Map(rows.map((row) => [row.drink_id, { average: row.average, count: Number(row.count) }]));
}

// Cafe-level rating: the average across every review of every drink at that
// cafe (reviews have no cafe_id of their own, so this joins through drinks).
export async function getRatingSummaryForCafe(cafeId: string): Promise<RatingSummary> {
  const rows = await prisma.$queryRaw<{ average: number | null; count: bigint }[]>`
    SELECT AVG(r.rating)::float AS average, COUNT(*)::bigint AS count
    FROM reviews r
    JOIN drinks d ON d.id = r.drink_id
    WHERE d.cafe_id = ${cafeId}::uuid
  `;
  const row = rows[0];
  return row ? { average: row.average ?? 0, count: Number(row.count) } : EMPTY_RATING;
}

// Same aggregate, batched for a page of cafes - used by the Discover listing.
export async function getRatingSummaryByCafeIds(cafeIds: string[]): Promise<Map<string, RatingSummary>> {
  if (cafeIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<{ cafe_id: string; average: number; count: bigint }[]>`
    SELECT d.cafe_id, AVG(r.rating)::float AS average, COUNT(*)::bigint AS count
    FROM reviews r
    JOIN drinks d ON d.id = r.drink_id
    WHERE d.cafe_id = ANY(${cafeIds}::uuid[])
    GROUP BY d.cafe_id
  `;
  return new Map(rows.map((row) => [row.cafe_id, { average: row.average, count: Number(row.count) }]));
}
