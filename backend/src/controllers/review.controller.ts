import { Request, Response } from 'express';
import { createReview, deleteReview, getReviewsForUser, updateReview } from '../services/review.service';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { isNonEmptyString } from '../utils/validators';

const MAX_NOTE_LENGTH = 500;

function isValidRating(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

function isValidNote(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || (typeof value === 'string' && value.length <= MAX_NOTE_LENGTH);
}

// POST /api/reviews - the authenticated user reviews one of their own
// completed redemptions. Identity comes from the JWT, never a client-
// supplied user_id.
export const createReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (!isNonEmptyString(body.redemptionId)) {
    throw new AppError(400, 'redemptionId is required.', 'INVALID_INPUT');
  }
  if (!isValidRating(body.rating)) {
    throw new AppError(400, 'rating must be an integer from 1 to 5.', 'INVALID_RATING');
  }
  if (!isValidNote(body.note)) {
    throw new AppError(400, `note must be a string of ${MAX_NOTE_LENGTH} characters or fewer.`, 'INVALID_NOTE');
  }

  const review = await createReview({
    userId: req.user!.sub,
    redemptionId: body.redemptionId,
    rating: body.rating,
    note: body.note ?? null,
  });

  res.status(201).json({ review });
});

// GET /api/reviews - the caller's own Drink Diary, never another user's.
export const getReviewsHandler = asyncHandler(async (req: Request, res: Response) => {
  const reviews = await getReviewsForUser(req.user!.sub);
  res.status(200).json({ reviews });
});

// PATCH /api/reviews/:id - update rating and/or note. A review that
// doesn't exist or belongs to someone else is reported identically as 404,
// so a prober learns nothing about other users' reviews.
export const updateReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (body.rating !== undefined && !isValidRating(body.rating)) {
    throw new AppError(400, 'rating must be an integer from 1 to 5.', 'INVALID_RATING');
  }
  if (!isValidNote(body.note)) {
    throw new AppError(400, `note must be a string of ${MAX_NOTE_LENGTH} characters or fewer.`, 'INVALID_NOTE');
  }
  if (body.rating === undefined && body.note === undefined) {
    throw new AppError(400, 'Nothing to update.', 'INVALID_INPUT');
  }

  const review = await updateReview(req.params.id, req.user!.sub, {
    rating: body.rating,
    note: body.note !== undefined ? body.note : undefined,
  });
  if (!review) {
    throw new AppError(404, 'Review not found.', 'REVIEW_NOT_FOUND');
  }
  res.status(200).json({ review });
});

// DELETE /api/reviews/:id - removes only the review row. Never touches
// redemptions, memberships, or credit_ledger.
export const deleteReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await deleteReview(req.params.id, req.user!.sub);
  if (!deleted) {
    throw new AppError(404, 'Review not found.', 'REVIEW_NOT_FOUND');
  }
  res.status(200).json({ success: true });
});
