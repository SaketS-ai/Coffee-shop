import { prisma } from '../config/prisma';
import { Prisma, Drink } from '@prisma/client';

export async function getDrinksByCafe(cafeId: string): Promise<Drink[]> {
  return prisma.drink.findMany({
    where: { cafe_id: cafeId, is_active: true },
    orderBy: { created_at: 'asc' },
  });
}

export interface DrinkWithCafe extends Drink {
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
  return { ...rest, cafe_name: cafe.name };
}

export interface CreateDrinkInput {
  cafe_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

export async function createDrink(input: CreateDrinkInput): Promise<Drink> {
  return prisma.drink.create({
    data: {
      cafe_id: input.cafe_id,
      name: input.name,
      description: input.description,
      price: input.price,
      image_url: input.image_url,
    },
  });
}

export interface UpdateDrinkInput {
  name?: string;
  description?: string | null;
  price?: number;
  image_url?: string | null;
  is_active?: boolean;
}

export async function updateDrink(id: string, input: UpdateDrinkInput): Promise<Drink | null> {
  const data: Prisma.DrinkUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.price !== undefined) data.price = input.price;
  if (input.image_url !== undefined) data.image_url = input.image_url;
  if (input.is_active !== undefined) data.is_active = input.is_active;

  if (Object.keys(data).length === 0) {
    return prisma.drink.findUnique({ where: { id } });
  }

  return prisma.drink.update({ where: { id }, data });
}

export async function deactivateDrink(id: string): Promise<Drink | null> {
  return prisma.drink.update({ where: { id }, data: { is_active: false } });
}
