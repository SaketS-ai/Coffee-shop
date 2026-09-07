import { Router } from 'express';
import {
  activateDevMembershipHandler,
  cancelMembershipHandler,
  getCredits,
  getCreditsHistory,
  getMembership,
  processMembershipCyclesHandler,
} from '../controllers/membership.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

export const membershipRouter = Router();

// All membership/credit routes require a logged-in user, but no particular
// role - a MEMBER, BARISTA, or ADMIN each see and manage only their own data.
membershipRouter.get('/membership', requireAuth, getMembership);
membershipRouter.get('/credits', requireAuth, getCredits);
membershipRouter.get('/credits/history', requireAuth, getCreditsHistory);
membershipRouter.post('/membership/dev/activate', requireAuth, activateDevMembershipHandler);
membershipRouter.post('/membership/cancel', requireAuth, cancelMembershipHandler);

// Admin/dev-only: manually run the membership cycle processor (Phase 8).
membershipRouter.post(
  '/membership/admin/process-cycles',
  requireAuth,
  requireRole('ADMIN'),
  processMembershipCyclesHandler
);
