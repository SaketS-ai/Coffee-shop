import { prisma } from '../config/prisma';
import { Prisma, Drink } from '@prisma/client';
import { getRatingSummaryByDrinkIds } from './review.service';

export interface DrinkWithRating extends Drink {
  rating_average: number;
  rating_count: number;
}

export async function getDrinksByCafe(cafeId: string): Promise<DrinkWithRating[]> {
  const drinks = await prisma.drink.findMany({
    where: { cafe_id: cafeId, is_active: true },
    orderBy: { created_at: 'asc' },
  });
  const ratings = await getRatingSummaryByDrinkIds(drinks.map((d) => d.id));
  return drinks.map((d) => {
    const r = ratings.get(d.id);
    return { ...d, rating_average: r?.average ?? 0, rating_count: r?.count ?? 0 };
  });
}

export interface DrinkWithCafe extends DrinkWithRating {
  cafe_name: string;
}

// Returns the row (with a minimal cafe_name for display) regardless of
// is_active - the controller decides whether an inactive drink is "not found".
export async function getDrinkById(id: string): Promise<DrinkWithCafe | null> {
  const drink = await prisma.drink.findUnique({
    where: { id },
    include: { cafe: { select: { name: true } } },
  });
  if (!drink) return null;
  const { cafe, ...rest } = drink;
  const ratings = await getRatingSummaryByDrinkIds([id]);
  const r = ratings.get(id);
  return { ...rest, cafe_name: cafe.name, rating_average: r?.average ?? 0, rating_count: r?.count ?? 0 };
}

export interface CreateDrinkInput {
  cafe_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  credit_price?: number;
  category?: string | null;
  is_signature?: boolean;
}

export async function createDrink(input: CreateDrinkInput): Promise<Drink> {
  return prisma.drink.create({
    data: {
      cafe_id: input.cafe_id,
      name: input.name,
      description: input.description,
      price: input.price,
      image_url: input.image_url,
      credit_price: input.credit_price ?? 4,
      category: input.category ?? null,
      is_signature: input.is_signature ?? false,
    },
  });
}

export interface UpdateDrinkInput {
  name?: string;
  description?: string | null;
  price?: number;
  image_url?: string | null;
  credit_price?: number;
  category?: string | null;
  is_signature?: boolean;
  is_active?: boolean;
}

export async function updateDrink(id: string, input: UpdateDrinkInput): Promise<Drink | null> {
  const data: Prisma.DrinkUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.price !== undefined) data.price = input.price;
  if (input.image_url !== undefined) data.image_url = input.image_url;
  if (input.credit_price !== undefined) data.credit_price = input.credit_price;
  if (input.category !== undefined) data.category = input.category;
  if (input.is_signature !== undefined) data.is_signature = input.is_signature;
  if (input.is_active !== undefined) data.is_active = input.is_active;

  if (Object.keys(data).length === 0) {
    return prisma.drink.findUnique({ where: { id } });
  }

  return prisma.drink.update({ where: { id }, data });
}

export async function deactivateDrink(id: string): Promise<Drink | null> {
  return prisma.drink.update({ where: { id }, data: { is_active: false } });
}
