import { Router } from 'express';
import {
  exportRedemptionLogHandler,
  getDashboardHandler,
  getMembersHandler,
  getPayoutHistoryHandler,
  getPayoutSummaryHandler,
  getRedemptionLogHandler,
  recordPayoutHandler,
  voidRedemptionHandler,
} from '../controllers/admin.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

export const adminRouter = Router();

// Phase 10: every route here is ADMIN-only (PRD Module 9's admin panel
// back-office - dashboard, redemption log/void, members, payouts).
adminRouter.get('/admin/dashboard', requireAuth, requireRole('ADMIN'), getDashboardHandler);
adminRouter.get('/admin/redemptions', requireAuth, requireRole('ADMIN'), getRedemptionLogHandler);
adminRouter.get('/admin/redemptions/export', requireAuth, requireRole('ADMIN'), exportRedemptionLogHandler);
adminRouter.post('/admin/redemptions/:id/void', requireAuth, requireRole('ADMIN'), voidRedemptionHandler);
adminRouter.get('/admin/members', requireAuth, requireRole('ADMIN'), getMembersHandler);
adminRouter.get('/admin/payouts/summary', requireAuth, requireRole('ADMIN'), getPayoutSummaryHandler);
adminRouter.post('/admin/payouts', requireAuth, requireRole('ADMIN'), recordPayoutHandler);
adminRouter.get('/admin/payouts', requireAuth, requireRole('ADMIN'), getPayoutHistoryHandler);
