import { prisma } from '../config/prisma';
import { Prisma, Payout, RedemptionStatus } from '@prisma/client';
import { AppError } from '../utils/AppError';

// One credit is worth one dollar at any partner cafe (PRD section 7.1) -
// the fixed conversion used everywhere member-facing dollar value is shown.
const CREDIT_DOLLAR_VALUE = 1;

export interface DashboardSummary {
  totalMembers: number;
  activeCafes: number;
  redemptionsThisMonth: number;
  creditsRedeemedThisMonth: number;
  totalOwedToCafesThisMonth: number;
  totalMarginThisMonth: number;
}

// All figures are "this calendar month" snapshots (PRD section 9.1) - not a
// running accounts-payable balance. Reads only; nothing here moves credits
// or money. The payout sum is a per-row product (credit_price * payout_rate)
// that Prisma's aggregate API can't express, so it stays a raw query, same
// as the original.
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [totalMembers, activeCafes, monthly] = await Promise.all([
    prisma.user.count({ where: { role: 'MEMBER' } }),
    prisma.cafe.count({ where: { is_active: true } }),
    prisma.$queryRaw<{ redemptions: bigint; credits: bigint; payout: Prisma.Decimal }[]>`
      SELECT
        count(*) AS redemptions,
        COALESCE(sum(credit_price), 0) AS credits,
        COALESCE(sum(credit_price * COALESCE(payout_rate, 0)), 0) AS payout
      FROM redemptions
      WHERE status = 'REDEEMED' AND redeemed_at >= date_trunc('month', now())
    `,
  ]);

  const redemptionsThisMonth = Number(monthly[0].redemptions);
  const creditsRedeemedThisMonth = Number(monthly[0].credits);
  const totalOwedToCafesThisMonth = Number(monthly[0].payout);
  const totalMemberValueThisMonth = creditsRedeemedThisMonth * CREDIT_DOLLAR_VALUE;

  return {
    totalMembers,
    activeCafes,
    redemptionsThisMonth,
    creditsRedeemedThisMonth,
    totalOwedToCafesThisMonth,
    totalMarginThisMonth: totalMemberValueThisMonth - totalOwedToCafesThisMonth,
  };
}

export interface RedemptionLogEntry {
  id: string;
  redeemed_at: Date | null;
  member_name: string;
  cafe_id: string;
  cafe_name: string;
  drink_name: string;
  credit_price: number;
  member_value_usd: number;
  payout_rate: number | null;
  cafe_payout_usd: number;
  margin_usd: number;
  status: 'REDEEMED' | 'VOID';
  void_reason: string | null;
  voided_at: Date | null;
}

export interface RedemptionLogFilters {
  cafeId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface RedemptionLogPage {
  entries: RedemptionLogEntry[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const DEFAULT_LOG_LIMIT = 50;
const MAX_LOG_LIMIT = 200;

interface RawLogRow {
  id: string;
  redeemed_at: Date | null;
  member_name: string;
  cafe_id: string;
  cafe_name: string;
  drink_name: string;
  credit_price: number;
  payout_rate: Prisma.Decimal | null;
  status: RedemptionStatus;
  void_reason: string | null;
  voided_at: Date | null;
}

// Only rows that were actually redeemed (whether still valid or since
// admin-voided) - a never-redeemed PENDING/EXPIRED/member-canceled row has
// no payout and isn't part of the financial audit trail. credit_price and
// payout_rate are read straight off the redemption row (both are point-in-
// time snapshots already), never recomputed from the drink/cafe's current
// values. Dynamic filters and the join/pagination shape don't map cleanly
// onto the query builder, so this stays a parameterized raw query (same
// injection-safety guarantee as the node-postgres version it replaces -
// Prisma.sql binds every value, never string-concatenates one in).
function buildRedemptionLogWhere(filters: RedemptionLogFilters): Prisma.Sql {
  const conditions: Prisma.Sql[] = [Prisma.sql`r.redeemed_at IS NOT NULL`];
  if (filters.cafeId) conditions.push(Prisma.sql`r.cafe_id = ${filters.cafeId}::uuid`);
  if (filters.startDate) conditions.push(Prisma.sql`r.redeemed_at >= ${filters.startDate}`);
  if (filters.endDate) conditions.push(Prisma.sql`r.redeemed_at <= ${filters.endDate}`);
  return Prisma.join(conditions, ' AND ');
}

export async function getRedemptionLog(filters: RedemptionLogFilters): Promise<RedemptionLogPage> {
  const page = filters.page && filters.page > 0 ? Math.floor(filters.page) : 1;
  const limit = filters.limit && filters.limit > 0 ? Math.min(Math.floor(filters.limit), MAX_LOG_LIMIT) : DEFAULT_LOG_LIMIT;
  const offset = (page - 1) * limit;
  const whereSql = buildRedemptionLogWhere(filters);

  const [countRows, rows] = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM redemptions r WHERE ${whereSql}`,
    prisma.$queryRaw<RawLogRow[]>`
      SELECT
        r.id, r.redeemed_at, u.name AS member_name, r.cafe_id, c.name AS cafe_name,
        d.name AS drink_name, r.credit_price, r.payout_rate, r.status, r.void_reason, r.voided_at
      FROM redemptions r
      JOIN users u ON u.id = r.user_id
      JOIN cafes c ON c.id = r.cafe_id
      JOIN drinks d ON d.id = r.drink_id
      WHERE ${whereSql}
      ORDER BY r.redeemed_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
  ]);

  const total = Number(countRows[0].count);

  const entries: RedemptionLogEntry[] = rows.map((row) => {
    const creditPrice = row.credit_price;
    const payoutRate = row.payout_rate !== null ? Number(row.payout_rate) : null;
    const memberValueUsd = creditPrice * CREDIT_DOLLAR_VALUE;
    const cafePayoutUsd = creditPrice * (payoutRate ?? 0);
    return {
      id: row.id,
      redeemed_at: row.redeemed_at,
      member_name: row.member_name,
      cafe_id: row.cafe_id,
      cafe_name: row.cafe_name,
      drink_name: row.drink_name,
      credit_price: creditPrice,
      member_value_usd: memberValueUsd,
      payout_rate: payoutRate,
      cafe_payout_usd: cafePayoutUsd,
      margin_usd: memberValueUsd - cafePayoutUsd,
      status: row.status as 'REDEEMED' | 'VOID',
      void_reason: row.void_reason,
      voided_at: row.voided_at,
    };
  });

  return {
    entries,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

/**
 * Voids a completed redemption: restores the member's credits (a VOID
 * credit_ledger entry, same accounting pattern as the membership cycle
 * reset's expiry - never a silent overwrite) and records who voided it and
 * why. Locks the redemption row FOR UPDATE first (raw query, same reason as
 * redemption.service.ts), so this can't race a barista voiding/redeeming
 * the same row at the same instant.
 */
export async function voidRedemption(redemptionId: string, adminUserId: string, reason: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string; user_id: string; credit_price: number; status: string }[]>`
      SELECT id, user_id, credit_price, status FROM redemptions WHERE id = ${redemptionId}::uuid FOR UPDATE
    `;
    const redemption = rows[0];
    if (!redemption) {
      throw new AppError(404, 'Redemption not found.', 'REDEMPTION_NOT_FOUND');
    }
    if (redemption.status !== 'REDEEMED') {
      throw new AppError(409, 'Only a completed redemption can be voided.', 'REDEMPTION_NOT_REDEEMED');
    }

    const membershipRows = await tx.$queryRaw<{ id: string; credits: number }[]>`
      SELECT id, credits FROM memberships WHERE user_id = ${redemption.user_id}::uuid AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1 FOR UPDATE
    `;
    const membership = membershipRows[0];

    // If the member's membership has since lapsed/canceled, the credits
    // still can't be restored to a non-existent active balance - void the
    // redemption anyway (it must stop counting as a valid, paid-for drink)
    // but skip the credit restoration in that edge case.
    if (membership) {
      const newBalance = membership.credits + redemption.credit_price;
      await tx.membership.update({ where: { id: membership.id }, data: { credits: newBalance } });
      await tx.creditLedger.create({
        data: {
          user_id: redemption.user_id,
          type: 'VOID',
          amount: redemption.credit_price,
          balance_after: newBalance,
          reference_id: redemption.id,
        },
      });
    }

    await tx.redemption.update({
      where: { id: redemption.id },
      data: { status: 'VOID', voided_at: new Date(), voided_by_user_id: adminUserId, void_reason: reason },
    });
  });
}

export interface MemberListEntry {
  id: string;
  name: string;
  email: string;
  created_at: Date;
  membership_status: string | null;
  credits: number | null;
}

// Every registered MEMBER, joined to their latest membership (if any) -
// read-only, admin-only listing (PRD section 9.6). The "latest membership
// per user" join is a LATERAL join, which the query builder can't express,
// so this stays a raw query.
export async function getMembersList(): Promise<MemberListEntry[]> {
  return prisma.$queryRaw<MemberListEntry[]>`
    SELECT u.id, u.name, u.email, u.created_at,
           m.status AS membership_status, m.credits
    FROM users u
    LEFT JOIN LATERAL (
      SELECT status, credits FROM memberships
      WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
    ) m ON true
    WHERE u.role = 'MEMBER'
    ORDER BY u.created_at DESC
  `;
}

export interface PayoutSummary {
  cafeId: string;
  periodStart: Date;
  periodEnd: Date;
  redemptionCount: number;
  totalCredits: number;
  amountOwed: number;
}

// Owed amount for a chosen period, computed purely from that period's
// redemptions (PRD section 9.8) - not netted against payouts already
// recorded, which are their own independent historical record.
export async function getPayoutSummary(cafeId: string, periodStart: Date, periodEnd: Date): Promise<PayoutSummary> {
  const rows = await prisma.$queryRaw<{ count: bigint; credits: bigint; amount: Prisma.Decimal }[]>`
    SELECT count(*) AS count, COALESCE(sum(credit_price), 0) AS credits,
           COALESCE(sum(credit_price * COALESCE(payout_rate, 0)), 0) AS amount
    FROM redemptions
    WHERE cafe_id = ${cafeId}::uuid AND status = 'REDEEMED' AND redeemed_at >= ${periodStart} AND redeemed_at <= ${periodEnd}
  `;
  return {
    cafeId,
    periodStart,
    periodEnd,
    redemptionCount: Number(rows[0].count),
    totalCredits: Number(rows[0].credits),
    amountOwed: Number(rows[0].amount),
  };
}

export interface RecordPayoutInput {
  cafeId: string;
  periodStart: Date;
  periodEnd: Date;
  amount: number;
  reference: string | null;
  recordedByUserId: string;
}

export async function recordPayout(input: RecordPayoutInput): Promise<Payout> {
  return prisma.payout.create({
    data: {
      cafe_id: input.cafeId,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      amount: input.amount,
      reference: input.reference,
      recorded_by_user_id: input.recordedByUserId,
    },
  });
}

export async function getPayoutHistory(cafeId?: string): Promise<Payout[]> {
  return prisma.payout.findMany({
    where: cafeId ? { cafe_id: cafeId } : undefined,
    orderBy: { created_at: 'desc' },
  });
}

// Reuses the exact same log query as getRedemptionLog so the export always
// matches what the admin sees on screen, formatted as CSV instead of JSON.
// Capped at MAX_LOG_LIMIT rows per export, same as the on-screen log - fine
// at this project's current scale; a true unbounded export is unnecessary
// complexity for now.
export async function getRedemptionsForExport(filters: Omit<RedemptionLogFilters, 'page' | 'limit'>): Promise<RedemptionLogEntry[]> {
  const { entries } = await getRedemptionLog({ ...filters, page: 1, limit: MAX_LOG_LIMIT });
  return entries;
}
