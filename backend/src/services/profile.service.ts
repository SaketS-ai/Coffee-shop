import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { deleteUserAccount, toSafeUser, updateUserProfile } from './user.service';

const ALLOWED_PREFERENCES = new Set(['matcha', 'espresso', 'cold brew', 'latte']);

export async function updateProfile(userId: string, input: {
  name?: unknown;
  profile_image_url?: unknown;
  neighborhood?: unknown;
  coffee_preferences?: unknown;
}) {
  if (input.name !== undefined && (typeof input.name !== 'string' || input.name.trim().length < 2)) {
    throw new AppError(400, 'A valid display name is required.', 'INVALID_NAME');
  }
  if (input.profile_image_url !== undefined && input.profile_image_url !== null && typeof input.profile_image_url !== 'string') {
    throw new AppError(400, 'profile_image_url must be a string.', 'INVALID_PROFILE_IMAGE');
  }
  if (input.neighborhood !== undefined && input.neighborhood !== null && (typeof input.neighborhood !== 'string' || input.neighborhood.length > 100)) {
    throw new AppError(400, 'neighborhood is invalid.', 'INVALID_NEIGHBORHOOD');
  }
  if (input.coffee_preferences !== undefined && (!Array.isArray(input.coffee_preferences) || input.coffee_preferences.some((item) => typeof item !== 'string' || !ALLOWED_PREFERENCES.has(item)))) {
    throw new AppError(400, 'coffee_preferences contains an unsupported value.', 'INVALID_PREFERENCES');
  }

  const user = await updateUserProfile(userId, {
    name: input.name === undefined ? undefined : (input.name as string).trim(),
    profile_image_url: input.profile_image_url as string | null | undefined,
    neighborhood: input.neighborhood as string | null | undefined,
    coffee_preferences: input.coffee_preferences as string[] | undefined,
  });
  if (!user) throw new AppError(404, 'User not found.', 'USER_NOT_FOUND');
  return toSafeUser(user);
}

export async function deleteProfile(userId: string) {
  await deleteUserAccount(userId);
}

export async function getPublicRatingSummary(drinkIds: string[]) {
  if (drinkIds.length === 0) return new Map<string, { average: number; count: number }>();
  const rows = await prisma.review.groupBy({
    by: ['drink_id'],
    where: { drink_id: { in: drinkIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return new Map(rows.map((row) => [row.drink_id, { average: Number((row._avg.rating ?? 0).toFixed(2)), count: row._count.rating }]));
}