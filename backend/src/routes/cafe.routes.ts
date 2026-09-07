import { Router } from 'express';
import {
  createCafeHandler,
  deactivateCafeHandler,
  getCafe,
  listCafes,
  updateCafeHandler,
} from '../controllers/cafe.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

export const cafeRouter = Router();

// Public - visitors and members can browse cafes without an account.
cafeRouter.get('/cafes', listCafes);
cafeRouter.get('/cafes/:id', getCafe);

// Admin-only.
cafeRouter.post('/cafes', requireAuth, requireRole('ADMIN'), createCafeHandler);
cafeRouter.put('/cafes/:id', requireAuth, requireRole('ADMIN'), updateCafeHandler);
cafeRouter.delete('/cafes/:id', requireAuth, requireRole('ADMIN'), deactivateCafeHandler);
