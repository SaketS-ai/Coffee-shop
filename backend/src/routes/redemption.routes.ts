import { Router } from 'express';
import {
  cancelCurrentRedemptionHandler,
  createRedemptionHandler,
  getCurrentRedemptionHandler,
  getRedeemedHistoryHandler,
  redeemHandler,
} from '../controllers/redemption.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

export const redemptionRouter = Router();

// Member-side: any authenticated user manages only their own redemption
// (identity comes from the JWT via requireAuth, never a request body field).
redemptionRouter.post('/redemptions', requireAuth, createRedemptionHandler);
redemptionRouter.get('/redemptions/current', requireAuth, getCurrentRedemptionHandler);
redemptionRouter.get('/redemptions/history', requireAuth, getRedeemedHistoryHandler);
redemptionRouter.delete('/redemptions/current', requireAuth, cancelCurrentRedemptionHandler);

// Barista-side: requires a BARISTA or ADMIN account. No dedicated scanner UI
// yet (Phase 7) - this phase only needs the endpoint itself to exist and be
// testable directly.
redemptionRouter.post('/redemptions/redeem', requireAuth, requireRole('BARISTA', 'ADMIN'), redeemHandler);
