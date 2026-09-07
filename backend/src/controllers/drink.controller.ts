import { Request, Response } from 'express';
import { getCafeById } from '../services/cafe.service';
import {
  createDrink,
  deactivateDrink,
  getDrinkById,
  getDrinksByCafe,
  updateDrink,
} from '../services/drink.service';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { isNonEmptyString, isValidPrice } from '../utils/validators';

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
}

function validateCreateDrinkInput(body: Record<string, unknown>) {
  if (!isNonEmptyString(body.name)) {
    throw new AppError(400, 'name is required.', 'INVALID_NAME');
  }
  if (!isValidPrice(body.price)) {
    throw new AppError(400, 'price must be a number that is not negative.', 'INVALID_PRICE');
  }
  if (!isOptionalString(body.description)) {
    throw new AppError(400, 'description must be a string.', 'INVALID_DESCRIPTION');
  }
  if (!isOptionalString(body.image_url)) {
    throw new AppError(400, 'image_url must be a string.', 'INVALID_IMAGE_URL');
  }
}

function validateUpdateDrinkInput(body: Record<string, unknown>) {
  if (body.name !== undefined && !isNonEmptyString(body.name)) {
    throw new AppError(400, 'name cannot be empty.', 'INVALID_NAME');
  }
  if (body.price !== undefined && !isValidPrice(body.price)) {
    throw new AppError(400, 'price must be a number that is not negative.', 'INVALID_PRICE');
  }
  if (!isOptionalString(body.description)) {
    throw new AppError(400, 'description must be a string.', 'INVALID_DESCRIPTION');
  }
  if (!isOptionalString(body.image_url)) {
    throw new AppError(400, 'image_url must be a string.', 'INVALID_IMAGE_URL');
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    throw new AppError(400, 'is_active must be a boolean.', 'INVALID_IS_ACTIVE');
  }
}

// A deactivated cafe is treated the same as a non-existent one for these
// public, cafe-scoped drink routes - consistent with GET /api/cafes/:id.
async function requireActiveCafe(cafeId: string) {
  const cafe = await getCafeById(cafeId);
  if (!cafe || !cafe.is_active) {
    throw new AppError(404, 'Cafe not found.', 'CAFE_NOT_FOUND');
  }
  return cafe;
}

export const listDrinksForCafe = asyncHandler(async (req: Request, res: Response) => {
  await requireActiveCafe(req.params.cafeId);
  const drinks = await getDrinksByCafe(req.params.cafeId);
  res.status(200).json({ drinks });
});

export const getDrink = asyncHandler(async (req: Request, res: Response) => {
  const drink = await getDrinkById(req.params.id);
  if (!drink || !drink.is_active) {
    throw new AppError(404, 'Drink not found.', 'DRINK_NOT_FOUND');
  }
  res.status(200).json({ drink });
});

export const createDrinkHandler = asyncHandler(async (req: Request, res: Response) => {
  // Cafe must exist before the drink body is even worth validating.
  const cafe = await getCafeById(req.params.cafeId);
  if (!cafe) {
    throw new AppError(404, 'Cafe not found.', 'CAFE_NOT_FOUND');
  }

  const body = req.body ?? {};
  validateCreateDrinkInput(body);

  const drink = await createDrink({
    cafe_id: cafe.id,
    name: (body.name as string).trim(),
    description: body.description ?? null,
    price: body.price,
    image_url: body.image_url ?? null,
  });

  res.status(201).json({ drink });
});

export const updateDrinkHandler = asyncHandler(async (req: Request, res: Response) => {
  const existing = await getDrinkById(req.params.id);
  if (!existing) {
    throw new AppError(404, 'Drink not found.', 'DRINK_NOT_FOUND');
  }

  const body = req.body ?? {};
  validateUpdateDrinkInput(body);

  const drink = await updateDrink(req.params.id, {
    name: body.name !== undefined ? (body.name as string).trim() : undefined,
    description: body.description !== undefined ? body.description : undefined,
    price: body.price !== undefined ? body.price : undefined,
    image_url: body.image_url !== undefined ? body.image_url : undefined,
    is_active: body.is_active !== undefined ? body.is_active : undefined,
  });

  res.status(200).json({ drink });
});

// DELETE /api/drinks/:id - soft delete only, same reasoning as cafes.
export const deactivateDrinkHandler = asyncHandler(async (req: Request, res: Response) => {
  const existing = await getDrinkById(req.params.id);
  if (!existing) {
    throw new AppError(404, 'Drink not found.', 'DRINK_NOT_FOUND');
  }

  const drink = await deactivateDrink(req.params.id);
  res.status(200).json({ drink });
});
