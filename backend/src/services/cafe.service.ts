import { prisma } from '../config/prisma';
import { Prisma, Cafe } from '@prisma/client';

export interface ListCafesParams {
  search?: string;
  city?: string;
  page?: number;
  limit?: number;
}

export interface CafesPage {
  cafes: Cafe[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Public discovery listing: always is_active = true, optionally narrowed by
// a free-text search (name/address/city) and/or an exact city filter, with
// simple offset pagination.
export async function getAllCafes(params: ListCafesParams = {}): Promise<CafesPage> {
  const page = params.page && params.page > 0 ? Math.floor(params.page) : 1;
  const limit = params.limit && params.limit > 0 ? Math.min(Math.floor(params.limit), MAX_LIMIT) : DEFAULT_LIMIT;

  const where: Prisma.CafeWhereInput = { is_active: true };
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { address: { contains: params.search, mode: 'insensitive' } },
      { city: { contains: params.search, mode: 'insensitive' } },
    ];
  }
  if (params.city) {
    where.city = { equals: params.city, mode: 'insensitive' };
  }

  const [total, cafes] = await Promise.all([
    prisma.cafe.count({ where }),
    prisma.cafe.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    cafes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

// Returns the row regardless of is_active - callers decide whether an
// inactive cafe should be treated as "not found" for their use case.
export async function getCafeById(id: string): Promise<Cafe | null> {
  return prisma.cafe.findUnique({ where: { id } });
}

export interface CreateCafeInput {
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  description: string | null;
  payout_rate?: number;
}

export async function createCafe(input: CreateCafeInput): Promise<Cafe> {
  return prisma.cafe.create({
    data: {
      name: input.name,
      address: input.address,
      city: input.city,
      state: input.state,
      latitude: input.latitude,
      longitude: input.longitude,
      image_url: input.image_url,
      description: input.description,
      payout_rate: input.payout_rate ?? 0,
    },
  });
}

export interface UpdateCafeInput {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  latitude?: number | null;
  longitude?: number | null;
  image_url?: string | null;
  description?: string | null;
  payout_rate?: number;
  is_active?: boolean;
}

// Only fields actually supplied are included in the update - Prisma builds
// the SQL from the resulting object, so there's no hand-written column
// whitelist to maintain (unlike the raw-SQL version this replaces).
export async function updateCafe(id: string, input: UpdateCafeInput): Promise<Cafe | null> {
  const data: Prisma.CafeUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.address !== undefined) data.address = input.address;
  if (input.city !== undefined) data.city = input.city;
  if (input.state !== undefined) data.state = input.state;
  if (input.latitude !== undefined) data.latitude = input.latitude;
  if (input.longitude !== undefined) data.longitude = input.longitude;
  if (input.image_url !== undefined) data.image_url = input.image_url;
  if (input.description !== undefined) data.description = input.description;
  if (input.payout_rate !== undefined) data.payout_rate = input.payout_rate;
  if (input.is_active !== undefined) data.is_active = input.is_active;

  if (Object.keys(data).length === 0) {
    return getCafeById(id);
  }

  return prisma.cafe.update({ where: { id }, data });
}

// Soft delete: cafes may have drinks (and later, ratings/redemptions/payout
// history) that must not be orphaned or destroyed. See Phase 3 report for
// the full reasoning.
export async function deactivateCafe(id: string): Promise<Cafe | null> {
  return prisma.cafe.update({ where: { id }, data: { is_active: false } });
}
