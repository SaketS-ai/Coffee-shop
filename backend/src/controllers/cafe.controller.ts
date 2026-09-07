import { Request, Response } from 'express';
import {
  createCafe,
  deactivateCafe,
  getAllCafes,
  getCafeById,
  updateCafe,
} from '../services/cafe.service';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { isNonEmptyString, isValidLatitude, isValidLongitude, isValidPrice } from '../utils/validators';

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
}

function isOptionalPrice(value: unknown): value is number | undefined {
  return value === undefined || isValidPrice(value);
}

function validateCreateCafeInput(body: Record<string, unknown>) {
  if (!isNonEmptyString(body.name)) {
    throw new AppError(400, 'name is required.', 'INVALID_NAME');
  }
  if (!isNonEmptyString(body.address)) {
    throw new AppError(400, 'address is required.', 'INVALID_ADDRESS');
  }
  if (!isNonEmptyString(body.city, 100)) {
    throw new AppError(400, 'city is required.', 'INVALID_CITY');
  }
  if (!isNonEmptyString(body.state, 50)) {
    throw new AppError(400, 'state is required.', 'INVALID_STATE');
  }
  if (!isValidLatitude(body.latitude)) {
    throw new AppError(400, 'latitude must be a number between -90 and 90.', 'INVALID_LATITUDE');
  }
  if (!isValidLongitude(body.longitude)) {
    throw new AppError(400, 'longitude must be a number between -180 and 180.', 'INVALID_LONGITUDE');
  }
  if (!isOptionalString(body.image_url)) {
    throw new AppError(400, 'image_url must be a string.', 'INVALID_IMAGE_URL');
  }
  if (!isOptionalString(body.description)) {
    throw new AppError(400, 'description must be a string.', 'INVALID_DESCRIPTION');
  }
  if (!isOptionalPrice(body.payout_rate)) {
    throw new AppError(400, 'payout_rate must be a number that is not negative.', 'INVALID_PAYOUT_RATE');
  }
}

function validateUpdateCafeInput(body: Record<string, unknown>) {
  if (body.name !== undefined && !isNonEmptyString(body.name)) {
    throw new AppError(400, 'name cannot be empty.', 'INVALID_NAME');
  }
  if (body.address !== undefined && !isNonEmptyString(body.address)) {
    throw new AppError(400, 'address cannot be empty.', 'INVALID_ADDRESS');
  }
  if (body.city !== undefined && !isNonEmptyString(body.city, 100)) {
    throw new AppError(400, 'city cannot be empty.', 'INVALID_CITY');
  }
  if (body.state !== undefined && !isNonEmptyString(body.state, 50)) {
    throw new AppError(400, 'state cannot be empty.', 'INVALID_STATE');
  }
  if (!isValidLatitude(body.latitude)) {
    throw new AppError(400, 'latitude must be a number between -90 and 90.', 'INVALID_LATITUDE');
  }
  if (!isValidLongitude(body.longitude)) {
    throw new AppError(400, 'longitude must be a number between -180 and 180.', 'INVALID_LONGITUDE');
  }
  if (!isOptionalString(body.image_url)) {
    throw new AppError(400, 'image_url must be a string.', 'INVALID_IMAGE_URL');
  }
  if (!isOptionalString(body.description)) {
    throw new AppError(400, 'description must be a string.', 'INVALID_DESCRIPTION');
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    throw new AppError(400, 'is_active must be a boolean.', 'INVALID_IS_ACTIVE');
  }
  if (!isOptionalPrice(body.payout_rate)) {
    throw new AppError(400, 'payout_rate must be a number that is not negative.', 'INVALID_PAYOUT_RATE');
  }
}

function parsePositiveInt(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export const listCafes = asyncHandler(async (req: Request, res: Response) => {
  const { search, city, page, limit } = req.query;

  const result = await getAllCafes({
    search: typeof search === 'string' && search.trim() ? search.trim() : undefined,
    city: typeof city === 'string' && city.trim() ? city.trim() : undefined,
    page: parsePositiveInt(page),
    limit: parsePositiveInt(limit),
  });

  res.status(200).json({ cafes: result.cafes, pagination: result.pagination });
});

export const getCafe = asyncHandler(async (req: Request, res: Response) => {
  const cafe = await getCafeById(req.params.id);
  if (!cafe || !cafe.is_active) {
    throw new AppError(404, 'Cafe not found.', 'CAFE_NOT_FOUND');
  }
  res.status(200).json({ cafe });
});

export const createCafeHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  validateCreateCafeInput(body);

  const cafe = await createCafe({
    name: (body.name as string).trim(),
    address: (body.address as string).trim(),
    city: (body.city as string).trim(),
    state: (body.state as string).trim(),
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
    image_url: body.image_url ?? null,
    description: body.description ?? null,
    payout_rate: body.payout_rate ?? 0,
  });

  res.status(201).json({ cafe });
});

export const updateCafeHandler = asyncHandler(async (req: Request, res: Response) => {
  const existing = await getCafeById(req.params.id);
  if (!existing) {
    throw new AppError(404, 'Cafe not found.', 'CAFE_NOT_FOUND');
  }

  const body = req.body ?? {};
  validateUpdateCafeInput(body);

  const cafe = await updateCafe(req.params.id, {
    name: body.name !== undefined ? (body.name as string).trim() : undefined,
    address: body.address !== undefined ? (body.address as string).trim() : undefined,
    city: body.city !== undefined ? (body.city as string).trim() : undefined,
    state: body.state !== undefined ? (body.state as string).trim() : undefined,
    latitude: body.latitude !== undefined ? body.latitude : undefined,
    longitude: body.longitude !== undefined ? body.longitude : undefined,
    image_url: body.image_url !== undefined ? body.image_url : undefined,
    description: body.description !== undefined ? body.description : undefined,
    payout_rate: body.payout_rate !== undefined ? body.payout_rate : undefined,
    is_active: body.is_active !== undefined ? body.is_active : undefined,
  });

  res.status(200).json({ cafe });
});

// DELETE /api/cafes/:id - soft delete only (sets is_active = false). See
// Phase 3 report for why: drinks (and later ratings/redemptions/payout
// history) reference cafes, and a hard delete would either cascade-destroy
// that history or fail on the foreign key.
export const deactivateCafeHandler = asyncHandler(async (req: Request, res: Response) => {
  const existing = await getCafeById(req.params.id);
  if (!existing) {
    throw new AppError(404, 'Cafe not found.', 'CAFE_NOT_FOUND');
  }

  const cafe = await deactivateCafe(req.params.id);
  res.status(200).json({ cafe });
});
