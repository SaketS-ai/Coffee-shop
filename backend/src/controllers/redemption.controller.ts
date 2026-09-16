import { Request, Response } from 'express';
import { Redemption } from '@prisma/client';
import {
  cancelPendingRedemption,
  createRedemption,
  getLatestRedemption,
  getRedeemedHistoryForUser,
  redeemCode,
} from '../services/redemption.service';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { isNonEmptyString } from '../utils/validators';

// Read-time correction, same pattern as membership.controller's
// effectiveStatus: nothing proactively flips a lapsed PENDING row to
// EXPIRED until the next create/redeem attempt touches it, so a plain GET
// reports the honest status without mutating the row.
function effectiveStatus(redemption: Redemption): Redemption['status'] {
  if (redemption.status === 'PENDING' && new Date(redemption.expires_at) <= new Date()) {
    return 'EXPIRED';
  }
  return redemption.status;
}

function toRedemptionResponse(redemption: Redemption | null) {
  if (!redemption) return null;
  return {
    id: redemption.id,
    cafe_id: redemption.cafe_id,
    drink_id: redemption.drink_id,
    credit_price: redemption.credit_price,
    token: redemption.token,
    backup_code: redemption.backup_code,
    status: effectiveStatus(redemption),
    expires_at: redemption.expires_at,
    redeemed_at: redemption.redeemed_at,
    created_at: redemption.created_at,
  };
}

// POST /api/redemptions - member creates a pending code. No credit
// deduction happens here; only the barista-side /redeem endpoint moves
// credits.
export const createRedemptionHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (!isNonEmptyString(body.cafe_id) || !isNonEmptyString(body.drink_id)) {
    throw new AppError(400, 'cafe_id and drink_id are required.', 'INVALID_INPUT');
  }

  const redemption = await createRedemption({
    userId: req.user!.sub,
    cafeId: body.cafe_id,
    drinkId: body.drink_id,
  });

  res.status(201).json({ redemption: toRedemptionResponse(redemption) });
});

// GET /api/redemptions/current - the caller's own latest redemption
// (whatever its status), or null if they've never created one.
export const getCurrentRedemptionHandler = asyncHandler(async (req: Request, res: Response) => {
  const redemption = await getLatestRedemption(req.user!.sub);
  res.status(200).json({ redemption: toRedemptionResponse(redemption) });
});

// GET /api/redemptions/history - Phase 9: the caller's own completed
// redemptions (for the Drink Diary). Read-only, scoped to the JWT's own
// user id.
export const getRedeemedHistoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const redemptions = await getRedeemedHistoryForUser(req.user!.sub);
  res.status(200).json({ redemptions });
});

// DELETE /api/redemptions/current - member-initiated cancel of their own
// pending code.
export const cancelCurrentRedemptionHandler = asyncHandler(async (req: Request, res: Response) => {
  const redemption = await cancelPendingRedemption(req.user!.sub);
  if (!redemption) {
    throw new AppError(404, 'No pending redemption to cancel.', 'NO_PENDING_REDEMPTION');
  }
  res.status(200).json({ redemption: toRedemptionResponse(redemption) });
});

// POST /api/redemptions/redeem - barista-side scan (BARISTA/ADMIN only, see
// redemption.routes.ts). The scanning user's identity comes from the JWT
// (req.user.sub), never a client-supplied id.
export const redeemHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (!isNonEmptyString(body.cafe_id)) {
    throw new AppError(400, 'cafe_id is required.', 'INVALID_INPUT');
  }
  const hasToken = isNonEmptyString(body.token, 512);
  const hasBackupCode = isNonEmptyString(body.backup_code, 6);
  if (!hasToken && !hasBackupCode) {
    throw new AppError(400, 'A token or backup_code is required.', 'MISSING_CODE');
  }

  let targetCafeId = body.cafe_id;
  if (req.scanner) {
    targetCafeId = req.scanner.cafeId;
  } else if (req.user?.role === 'BARISTA' && req.user.cafeId) {
    if (body.cafe_id && body.cafe_id !== req.user.cafeId) {
      throw new AppError(403, 'This cafe session cannot redeem for a different cafe.', 'WRONG_CAFE');
    }
    targetCafeId = req.user.cafeId;
  }

  const result = await redeemCode({
    cafeId: targetCafeId,
    token: hasToken ? body.token : undefined,
    backupCode: hasBackupCode ? body.backup_code : undefined,
    redeemedByUserId: req.user?.sub,
  });

  res.status(200).json({
    redemption: toRedemptionResponse(result.redemption),
    new_balance: result.newBalance,
  });
});
