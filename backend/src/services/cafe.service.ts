import { prisma } from '../config/prisma';
import { Prisma, Cafe } from '@prisma/client';
import { getRatingSummaryByCafeIds, getRatingSummaryForCafe } from './review.service';

export interface CafeWithRating extends Cafe {
  rating: number;
  rating_count: number;
}

export interface ListCafesParams {
  search?: string;
  city?: string;
  neighborhood?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}

export interface CafesPage {
  cafes: CafeWithRating[];
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
  if (params.neighborhood) {
    where.neighborhood = { equals: params.neighborhood, mode: 'insensitive' };
  }
  const orderBy: Prisma.CafeOrderByWithRelationInput[] = [
    { is_featured: 'desc' },
    { created_at: 'desc' },
  ];

  const [total, cafes] = await Promise.all([
    prisma.cafe.count({ where }),
    prisma.cafe.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const ratings = await getRatingSummaryByCafeIds(cafes.map((c) => c.id));
  const cafesWithRating = cafes.map((c) => {
    const r = ratings.get(c.id);
    return { ...c, rating: r?.average ?? 0, rating_count: r?.count ?? 0 };
  });

  return {
    cafes: cafesWithRating,
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

// Same lookup, with the real rating aggregate attached - only the
// public-facing single-cafe read needs this extra query, not the internal
// existence checks (update/deactivate/requireActiveCafe) that call
// getCafeById directly and never look at rating fields.
export async function getCafeByIdWithRating(id: string): Promise<CafeWithRating | null> {
  const cafe = await getCafeById(id);
  if (!cafe) return null;
  const r = await getRatingSummaryForCafe(id);
  return { ...cafe, rating: r.average, rating_count: r.count };
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
  neighborhood?: string | null;
  opening_hours?: Prisma.InputJsonValue | null;
  vibe_tags?: string[];
  perk_line?: string | null;
  is_featured?: boolean;
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
      neighborhood: input.neighborhood ?? null,
      opening_hours: input.opening_hours ?? undefined,
      vibe_tags: input.vibe_tags ?? [],
      perk_line: input.perk_line ?? null,
      is_featured: input.is_featured ?? false,
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
  neighborhood?: string | null;
  opening_hours?: Prisma.InputJsonValue | null;
  vibe_tags?: string[];
  perk_line?: string | null;
  is_featured?: boolean;
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
  if (input.neighborhood !== undefined) data.neighborhood = input.neighborhood;
  if (input.opening_hours !== undefined) {
    data.opening_hours = input.opening_hours === null ? Prisma.JsonNull : input.opening_hours;
  }
  if (input.vibe_tags !== undefined) data.vibe_tags = input.vibe_tags;
  if (input.perk_line !== undefined) data.perk_line = input.perk_line;
  if (input.is_featured !== undefined) data.is_featured = input.is_featured;
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
