import { Request, Response } from 'express';
import {
  getDashboardSummary,
  getMembersList,
  getPayoutHistory,
  getPayoutSummary,
  getRedemptionLog,
  getRedemptionsForExport,
  recordPayout,
  voidRedemption,
} from '../services/admin.service';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { isNonEmptyString, isValidPrice } from '../utils/validators';

function parsePositiveInt(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export const getDashboardHandler = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await getDashboardSummary();
  res.status(200).json({ summary });
});

function parseLogFilters(query: Request['query']) {
  const { cafe_id, start_date, end_date, page, limit } = query;
  return {
    cafeId: typeof cafe_id === 'string' && cafe_id.trim() ? cafe_id.trim() : undefined,
    startDate: parseDate(start_date),
    endDate: parseDate(end_date),
    page: parsePositiveInt(page),
    limit: parsePositiveInt(limit),
  };
}

export const getRedemptionLogHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getRedemptionLog(parseLogFilters(req.query));
  res.status(200).json(result);
});

export const exportRedemptionLogHandler = asyncHandler(async (req: Request, res: Response) => {
  const { cafeId, startDate, endDate } = parseLogFilters(req.query);
  const entries = await getRedemptionsForExport({ cafeId, startDate, endDate });

  const header =
    'Redemption ID,Timestamp,Member,Cafe,Drink,Credits,Member Value ($),Payout Rate ($/credit),Cafe Payout ($),Margin ($),Status,Void Reason\n';
  const rows = entries.map((e) =>
    [
      e.id,
      e.redeemed_at ? new Date(e.redeemed_at).toISOString() : '',
      csvEscape(e.member_name),
      csvEscape(e.cafe_name),
      csvEscape(e.drink_name),
      e.credit_price,
      e.member_value_usd.toFixed(2),
      e.payout_rate !== null ? e.payout_rate.toFixed(2) : '',
      e.cafe_payout_usd.toFixed(2),
      e.margin_usd.toFixed(2),
      e.status,
      e.void_reason ? csvEscape(e.void_reason) : '',
    ].join(',')
  );

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="redemptions.csv"');
  res.status(200).send(header + rows.join('\n'));
});

export const voidRedemptionHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (!isNonEmptyString(body.reason, 500)) {
    throw new AppError(400, 'A void reason is required.', 'INVALID_REASON');
  }

  await voidRedemption(req.params.id, req.user!.sub, body.reason);
  res.status(200).json({ success: true });
});

export const getMembersHandler = asyncHandler(async (_req: Request, res: Response) => {
  const members = await getMembersList();
  res.status(200).json({ members });
});

export const getPayoutSummaryHandler = asyncHandler(async (req: Request, res: Response) => {
  const { cafe_id, period_start, period_end } = req.query;
  const periodStart = parseDate(period_start);
  const periodEnd = parseDate(period_end);
  if (!isNonEmptyString(cafe_id) || !periodStart || !periodEnd) {
    throw new AppError(400, 'cafe_id, period_start, and period_end are required.', 'INVALID_INPUT');
  }

  const summary = await getPayoutSummary(cafe_id, periodStart, periodEnd);
  res.status(200).json({ summary });
});

export const recordPayoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const periodStart = parseDate(body.period_start);
  const periodEnd = parseDate(body.period_end);
  if (!isNonEmptyString(body.cafe_id)) {
    throw new AppError(400, 'cafe_id is required.', 'INVALID_INPUT');
  }
  if (!periodStart || !periodEnd) {
    throw new AppError(400, 'period_start and period_end must be valid dates.', 'INVALID_INPUT');
  }
  if (!isValidPrice(body.amount)) {
    throw new AppError(400, 'amount must be a number that is not negative.', 'INVALID_AMOUNT');
  }
  if (body.reference !== undefined && body.reference !== null && typeof body.reference !== 'string') {
    throw new AppError(400, 'reference must be a string.', 'INVALID_REFERENCE');
  }

  const payout = await recordPayout({
    cafeId: body.cafe_id,
    periodStart,
    periodEnd,
    amount: body.amount,
    reference: body.reference ?? null,
    recordedByUserId: req.user!.sub,
  });

  res.status(201).json({ payout });
});

export const getPayoutHistoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const { cafe_id } = req.query;
  const history = await getPayoutHistory(typeof cafe_id === 'string' && cafe_id.trim() ? cafe_id.trim() : undefined);
  res.status(200).json({ history });
});
