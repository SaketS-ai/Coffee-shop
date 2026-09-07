import { Router } from 'express';
import {
  createReviewHandler,
  deleteReviewHandler,
  getReviewsHandler,
  updateReviewHandler,
} from '../controllers/review.controller';
import { requireAuth } from '../middleware/auth';

export const reviewRouter = Router();

// All review routes require a logged-in user, but no particular role - any
// MEMBER, BARISTA, or ADMIN manages only their own reviews (enforced in
// review.service.ts, never trusted from the request body).
reviewRouter.post('/reviews', requireAuth, createReviewHandler);
reviewRouter.get('/reviews', requireAuth, getReviewsHandler);
reviewRouter.patch('/reviews/:id', requireAuth, updateReviewHandler);
reviewRouter.delete('/reviews/:id', requireAuth, deleteReviewHandler);
