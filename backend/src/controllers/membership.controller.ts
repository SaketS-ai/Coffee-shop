import { Request, Response } from 'express';
import { env } from '../config/env';
import { Membership } from '@prisma/client';
import {
  activateDevMembership,
  cancelMembership,
  ensureCycleUpToDate,
  getLatestMembership,
  MONTHLY_CREDIT_ALLOWANCE,
  MONTHLY_PLAN_PRICE_USD,
  processMembershipCycles,
} from '../services/membership.service';
import { getCreditHistory, getCurrentBalance } from '../services/credit.service';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

type MembershipResponseStatus = Membership['status'] | 'INACTIVE';

// Read-time correction: nothing proactively flips a row from ACTIVE to
// EXPIRED the instant its cycle ends (ensureCycleUpToDate, called by both
// handlers below, is what actually renews it) - this only reports EXPIRED
// for the narrow moment before that renewal has run. A CANCELED membership
// is reported as-is even past its end_date - canceling is immediate and
// terminal (see membership.service.ts's cancelMembership), so there's no
// separate "canceled and now also expired" state worth distinguishing.
function effectiveStatus(membership: Membership | null): MembershipResponseStatus {
  if (!membership) return 'INACTIVE';
  if (membership.status === 'ACTIVE' && membership.end_date && new Date(membership.end_date) <= new Date()) {
    return 'EXPIRED';
  }
  return membership.status;
}

function toMembershipResponse(membership: Membership | null) {
  return {
    status: effectiveStatus(membership),
    plan_price: MONTHLY_PLAN_PRICE_USD,
    monthly_credit_allowance: MONTHLY_CREDIT_ALLOWANCE,
    start_date: membership?.start_date ?? null,
    end_date: membership?.end_date ?? null,
    cycle_start: membership?.current_cycle_start ?? null,
    cancelled_at: membership?.cancelled_at ?? null,
    credits: membership?.credits ?? 0,
  };
}

export const getMembership = asyncHandler(async (req: Request, res: Response) => {
  await ensureCycleUpToDate(req.user!.sub);
  const membership = await getLatestMembership(req.user!.sub);
  res.status(200).json({ membership: toMembershipResponse(membership) });
});

export const getCredits = asyncHandler(async (req: Request, res: Response) => {
  await ensureCycleUpToDate(req.user!.sub);
  const [balance, membership] = await Promise.all([
    getCurrentBalance(req.user!.sub),
    getLatestMembership(req.user!.sub),
  ]);
  res.status(200).json({ balance, status: effectiveStatus(membership) });
});

export const getCreditsHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await getCreditHistory(req.user!.sub);
  res.status(200).json({ history });
});

// Development-only: stands in for a future Stripe checkout-success webhook.
// Returns a plain 404 (rather than 403) when NODE_ENV=production, so the
// route's existence isn't even revealed in that environment.
export const activateDevMembershipHandler = asyncHandler(async (req: Request, res: Response) => {
  if (env.nodeEnv === 'production') {
    throw new AppError(404, 'Not found.', 'NOT_FOUND');
  }

  const { membership, created } = await activateDevMembership(req.user!.sub);
  res.status(created ? 201 : 200).json({ membership: toMembershipResponse(membership), created });
});

// Immediate cancellation of the caller's own active membership (see
// membership.service.ts's cancelMembership for the chosen behavior).
export const cancelMembershipHandler = asyncHandler(async (req: Request, res: Response) => {
  const membership = await cancelMembership(req.user!.sub);
  if (!membership) {
    throw new AppError(404, 'No active membership to cancel.', 'NO_ACTIVE_MEMBERSHIP');
  }
  res.status(200).json({ membership: toMembershipResponse(membership) });
});

// Admin/dev-only: manually triggers the same processMembershipCycles() a
// future scheduled job would call - not a second reset implementation, just
// an early way to invoke the one that exists. Same production gate as
// activateDevMembershipHandler above; ADMIN-only is enforced by
// requireRole at the route level.
export const processMembershipCyclesHandler = asyncHandler(async (req: Request, res: Response) => {
  if (env.nodeEnv === 'production') {
    throw new AppError(404, 'Not found.', 'NOT_FOUND');
  }

  const summary = await processMembershipCycles();
  res.status(200).json({ summary });
});
