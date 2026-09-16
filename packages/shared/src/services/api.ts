import { Cafe, Drink, DrinkCategory } from '../types';
import { store } from './store';

const getApiBaseUrl = (): string => {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured.replace(/\/+$/, '');
  if (import.meta.env.PROD) {
    console.error(
      '[CRITICAL CONFIG ERROR] VITE_API_URL is not defined in this production build. ' +
        'Set VITE_API_URL in your build environment to your API endpoint (e.g. https://api.socialcup.com/api).'
    );
    // Relative fallback prevents pointing to localhost on client machines
    return '/api';
  }
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

// Admin-uploaded photos (Phase 3 image upload) come back as a path relative
// to the backend (e.g. "/uploads/xyz.jpg"), not an absolute URL like the
// seed data's Unsplash links - this resolves either shape to something an
// <img> tag can actually load regardless of which origin the frontend runs on.
export function resolveAssetUrl(url: string): string {
  if (!url) return url;
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

const AUTH_TOKEN_KEY = 'social_cup_auth_token';

// Minimal local token storage - not a full auth context/provider, which is
// deliberately out of scope for this phase (see Phase 2 instructions).
export const authToken = {
  get: () => localStorage.getItem(AUTH_TOKEN_KEY),
  set: (token: string) => localStorage.setItem(AUTH_TOKEN_KEY, token),
  clear: () => localStorage.removeItem(AUTH_TOKEN_KEY),
};

function authHeaders(): Record<string, string> {
  const token = authToken.get();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const scannerToken = localStorage.getItem('social_cup_scanner_token');
  if (scannerToken) headers['x-scanner-token'] = scannerToken;
  return headers;
}

// Carries the server's machine-readable `reason` code alongside the human
// message, so a caller can branch on the specific failure (e.g. the barista
// scanner's EXPIRED vs ALREADY_USED vs WRONG_CAFE screens) instead of
// pattern-matching on message text.
export class ApiError extends Error {
  reason?: string;
  constructor(message: string, reason?: string) {
    super(message);
    this.reason = reason;
  }
}

// ---------------------------------------------------------------------------
// Adapters: the new backend's cafes/drinks tables (Phase 1 schema) only have
// name/address/city/state/latitude/longitude/image_url/description - none of
// the richer fields the existing UI was built around (neighborhood, vibe
// tags, featured flag, credit pricing, ratings, multiple photos, opening
// hours...). Rather than stripping the UI down to match, these adapters map
// the API's plain shape onto the existing Cafe/Drink types with honest
// defaults for what doesn't exist in the database yet. Search this file for
// "not modeled yet" to see exactly what's a placeholder and why.
// ---------------------------------------------------------------------------

interface ApiCafe {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  description: string | null;
  payout_rate: string; // Postgres NUMERIC comes back as a string
  is_active: boolean;
  neighborhood?: string | null;
  opening_hours?: Record<string, unknown> | null;
  vibe_tags?: string[];
  perk_line?: string | null;
  is_featured?: boolean;
  rating?: number;
  rating_count?: number;
}

export interface CafesPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Membership/credit shapes (Phase 5) - kept as raw snake_case fields, same
// convention as the cafe/drink responses, rather than introducing a second
// camelCase adapter layer for just these two endpoints.
export interface MembershipInfo {
  status: 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'PAYMENT_FAILED' | 'INACTIVE';
  plan_price: number;
  monthly_credit_allowance: number;
  start_date: string | null;
  end_date: string | null;
  // Phase 8: current billing cycle window (end_date already doubled as
  // "current cycle end" since Phase 5; cycle_start/cancelled_at are new).
  cycle_start: string | null;
  cancelled_at: string | null;
  credits: number;
}

export interface CreditLedgerEntryApi {
  id: string;
  user_id: string;
  type: 'SUBSCRIPTION' | 'REDEMPTION' | 'VOID' | 'RESET';
  amount: number;
  balance_after: number;
  reference_id: string | null;
  created_at: string;
}

interface ApiDrink {
  id: string;
  cafe_id: string;
  name: string;
  description: string | null;
  price: string; // Postgres NUMERIC comes back as a string to avoid float rounding
  credit_price: number;
  image_url: string | null;
  is_active: boolean;
  category?: string | null;
  is_signature?: boolean;
  rating_average?: number;
  rating_count?: number;
}

// Redemption shapes (Phase 6) - kept as raw snake_case fields, same
// convention as membership/credit ledger responses.
export interface RedemptionApi {
  id: string;
  cafe_id: string;
  drink_id: string;
  credit_price: number;
  token: string;
  backup_code: string;
  status: 'PENDING' | 'REDEEMED' | 'EXPIRED' | 'VOID';
  expires_at: string;
  redeemed_at: string | null;
  created_at: string;
}

// Redeemed-history / review shapes (Phase 9) - same raw snake_case
// convention as the rest of this file.
export interface RedeemedHistoryEntryApi {
  id: string;
  drink_id: string;
  drink_name: string;
  drink_image_url: string | null;
  cafe_id: string;
  cafe_name: string;
  redeemed_at: string | null;
}

// The plain review row as returned by create/update (no joined display
// fields - the diary list re-fetches those via ReviewApi below).
export interface ReviewRecord {
  id: string;
  user_id: string;
  redemption_id: string | null;
  drink_id: string;
  rating: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// A review joined with just enough drink/cafe/redemption info to render
// one Drink Diary entry. redemption_id/redeemed_at are null when the review
// was submitted directly against a drink (no redemption involved).
export interface ReviewApi {
  id: string;
  redemption_id: string | null;
  drink_id: string;
  drink_name: string;
  drink_image_url: string | null;
  cafe_name: string;
  rating: number;
  note: string | null;
  created_at: string;
  redeemed_at: string | null;
}

// Admin back-office shapes (Phase 10) - raw snake_case, same convention.
export interface AdminDashboardSummary {
  totalMembers: number;
  activeCafes: number;
  redemptionsThisMonth: number;
  creditsRedeemedThisMonth: number;
  totalOwedToCafesThisMonth: number;
  totalMarginThisMonth: number;
}

export interface AdminRedemptionLogEntry {
  id: string;
  redeemed_at: string | null;
  member_name: string;
  cafe_id: string;
  cafe_name: string;
  drink_name: string;
  credit_price: number;
  member_value_usd: number;
  payout_rate: number | null;
  cafe_payout_usd: number;
  margin_usd: number;
  status: 'REDEEMED' | 'VOID';
  void_reason: string | null;
  voided_at: string | null;
}

export interface AdminRedemptionLogPage {
  entries: AdminRedemptionLogEntry[];
  pagination: CafesPagination;
}

export interface AdminMemberEntry {
  id: string;
  name: string;
  email: string;
  created_at: string;
  membership_status: string | null;
  credits: number | null;
}

export interface AdminPayoutSummary {
  cafeId: string;
  periodStart: string;
  periodEnd: string;
  redemptionCount: number;
  totalCredits: number;
  amountOwed: number;
}

export interface AdminPayoutRecord {
  id: string;
  cafe_id: string;
  period_start: string;
  period_end: string;
  amount: string;
  reference: string | null;
  recorded_by_user_id: string;
  created_at: string;
}

export const DEFAULT_CAFE_IMAGE = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800';
export const DEFAULT_DRINK_IMAGE = 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=600';

export const CAFE_IMAGE_POOL = [
  'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1525610553991-2bede1a236e2?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1497636577773-f1231844b336?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800',
];

export function getCafeDefaultImage(name?: string | null): string {
  if (!name || !name.trim()) return CAFE_IMAGE_POOL[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return CAFE_IMAGE_POOL[hash % CAFE_IMAGE_POOL.length];
}

export function getDrinkDefaultImage(name?: string | null, category?: string | null): string {
  const query = `${category || ''} ${name || ''}`.toLowerCase();
  if (query.includes('mocha') || query.includes('chocolate')) {
    return 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&q=80&w=600';
  }
  if (query.includes('cold brew') || query.includes('iced') || query.includes('tonic')) {
    return 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=600';
  }
  if (query.includes('espresso') || query.includes('cortado') || query.includes('macchiato')) {
    return 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&q=80&w=600';
  }
  if (query.includes('matcha') || query.includes('tea')) {
    return 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=600';
  }
  if (query.includes('latte') || query.includes('cappuccino') || query.includes('flat white')) {
    return 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&q=80&w=600';
  }
  return DEFAULT_DRINK_IMAGE;
}

function adaptCafe(apiCafe: ApiCafe): Cafe {
  const rawUrl = apiCafe.image_url?.trim();
  const validUrl = rawUrl && rawUrl !== 'null' && rawUrl !== 'undefined'
    ? resolveAssetUrl(rawUrl)
    : getCafeDefaultImage(apiCafe.name);
  return {
    id: apiCafe.id,
    name: apiCafe.name,
    neighborhood: apiCafe.neighborhood || apiCafe.city,
    address: `${apiCafe.address}, ${apiCafe.city}, ${apiCafe.state}`,
    coordinates: { lat: apiCafe.latitude ?? 0, lng: apiCafe.longitude ?? 0 },
    distanceMiles: 0, // not modeled yet - no member location/geo-distance in this phase
    openingHours: apiCafe.opening_hours
      ? Object.fromEntries(Object.entries(apiCafe.opening_hours).map(([day, hours]) => [day, String(hours)]))
      : {},
    photos: [validUrl],
    vibeTags: apiCafe.vibe_tags || [],
    perkLine: apiCafe.perk_line || apiCafe.description || '',
    payoutRate: parseFloat(apiCafe.payout_rate),
    isFeatured: apiCafe.is_featured === true,
    scanPin: '',
    rating: apiCafe.rating || 0,
    ratingCount: apiCafe.rating_count || 0,
  };
}

function adaptDrink(apiDrink: ApiDrink): Drink {
  const price = parseFloat(apiDrink.price);
  const rawUrl = apiDrink.image_url?.trim();
  const fallback = getDrinkDefaultImage(apiDrink.name, apiDrink.category);
  const imageUrl = (rawUrl && rawUrl !== 'null' && rawUrl !== 'undefined')
    ? resolveAssetUrl(rawUrl)
    : fallback;

  return {
    id: apiDrink.id,
    cafeId: apiDrink.cafe_id,
    name: apiDrink.name,
    category: (apiDrink.category || 'specialty') as DrinkCategory, // backend category is free text (VARCHAR), not yet constrained to this union
    description: apiDrink.description || '',
    imageUrl,
    retailPrice: price,
    creditPrice: apiDrink.credit_price,
    isSignature: apiDrink.is_signature === true,
    isActive: apiDrink.is_active,
    rating: apiDrink.rating_average || 0,
    ratingCount: apiDrink.rating_count || 0,
  };
}

async function parseJsonSafely(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export const api = {
  // Register a new account (POST /api/auth/register)
  async register(name: string, email: string, password: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (data.success && data.data?.token) authToken.set(data.data.token);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Log in with email + password (POST /api/auth/login)
  async login(email: string, password: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success && data.data?.token) authToken.set(data.data.token);
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Log in as cafe staff using Cafe ID + 4-digit PIN (POST /api/auth/cafe-login)
  async cafeLogin(cafeId: string, pin: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/cafe-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cafeId, pin }),
      });
      const data = await res.json();
      if (data.success && data.data?.token) {
        authToken.set(data.data.token);
        if (data.data.scannerToken) {
          localStorage.setItem('social_cup_scanner_token', data.data.scannerToken);
        }
        if (data.data.cafe?.id) {
          localStorage.setItem('social_cup_active_cafe_id', data.data.cafe.id);
        }
      }
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // POST /api/auth/verify-email - marks the account's email verified.
  async verifyEmail(token: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // POST /api/auth/forgot-password - always returns the same generic
  // success message, whether or not the email is registered.
  async forgotPassword(email: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // POST /api/auth/reset-password
  async resetPassword(token: string, newPassword: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Fetch the currently authenticated user (GET /api/auth/me)
  async getCurrentUser() {
    const token = authToken.get();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // --- Membership & Credits (Phase 5) - all require a real JWT from api.login/register ---

  async getMembership(): Promise<MembershipInfo> {
    const res = await fetch(`${API_BASE_URL}/membership`, { headers: authHeaders() });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to load membership.');
    return data.membership as MembershipInfo;
  },

  async getCredits(): Promise<{ balance: number; status: string }> {
    const res = await fetch(`${API_BASE_URL}/credits`, { headers: authHeaders() });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to load credit balance.');
    return data;
  },

  async getCreditHistory(): Promise<CreditLedgerEntryApi[]> {
    const res = await fetch(`${API_BASE_URL}/credits/history`, { headers: authHeaders() });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to load credit history.');
    return data.history as CreditLedgerEntryApi[];
  },

  // Development-only stand-in for a future Stripe checkout-success webhook.
  // Not shown as a production payment action anywhere in the UI.
  async activateDevMembership(): Promise<{ membership: MembershipInfo; created: boolean }> {
    const res = await fetch(`${API_BASE_URL}/membership/dev/activate`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to activate membership.');
    return data;
  },

  // Phase 8: immediately cancels the caller's own active membership.
  async cancelMembership(): Promise<{ membership: MembershipInfo }> {
    const res = await fetch(`${API_BASE_URL}/membership/cancel`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to cancel membership.');
    return data;
  },

  // Check backend server health
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return await res.json();
    } catch {
      return { status: 'offline' };
    }
  },

  // --- Cafes (public reads) ---

  // Single flexible listing method backing "list", "search", and "filter by
  // city" - all three are the same endpoint with different query params,
  // so a separate method per verb would just duplicate this request logic.
  async getCafes(params?: {
    search?: string;
    city?: string;
    neighborhood?: string;
    page?: number;
    limit?: number;
  }): Promise<{ cafes: Cafe[]; pagination: CafesPagination }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.city) query.set('city', params.city);
    if (params?.neighborhood) query.set('neighborhood', params.neighborhood);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();

    try {
      const res = await fetch(`${API_BASE_URL}/cafes${qs ? `?${qs}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        return {
          cafes: (data.cafes as ApiCafe[]).map(adaptCafe),
          pagination: data.pagination as CafesPagination,
        };
      }
    } catch (err) {
      console.warn('[api.getCafes] Backend fetch failed, using local store data:', err);
    }

    // Graceful offline/local fallback
    let localCafes = store.getCafes();
    if (params?.search) {
      const s = params.search.toLowerCase();
      localCafes = localCafes.filter(
        (c) => c.name.toLowerCase().includes(s) || c.neighborhood.toLowerCase().includes(s)
      );
    }
    if (params?.city && params.city !== 'All') {
      localCafes = localCafes.filter((c) => c.neighborhood.toLowerCase() === params.city?.toLowerCase());
    }
    return {
      cafes: localCafes,
      pagination: {
        page: params?.page || 1,
        limit: params?.limit || localCafes.length,
        total: localCafes.length,
        totalPages: 1,
      },
    };
  },

  async getCafeById(id: string): Promise<Cafe> {
    try {
      const res = await fetch(`${API_BASE_URL}/cafes/${id}`);
      if (res.ok) {
        const data = await parseJsonSafely(res);
        if (data?.cafe) return adaptCafe(data.cafe as ApiCafe);
      }
    } catch (err) {
      console.warn('[api.getCafeById] Backend fetch failed, using local store:', err);
    }
    const local = store.getCafes().find((c) => c.id === id);
    if (local) return local;
    throw new Error('Cafe not found.');
  },

  // --- Drinks (public reads) ---

  async getDrinksByCafe(cafeId: string): Promise<Drink[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/cafes/${cafeId}/drinks`);
      if (res.ok) {
        const data = await res.json();
        return (data.drinks as ApiDrink[]).map(adaptDrink);
      }
    } catch (err) {
      console.warn('[api.getDrinksByCafe] Backend fetch failed, using local store:', err);
    }
    const localDrinks = store.getDrinks().filter((d) => d.cafeId === cafeId);
    return localDrinks.length > 0 ? localDrinks : store.getDrinks();
  },

  async getDrinkById(id: string): Promise<Drink> {
    try {
      const res = await fetch(`${API_BASE_URL}/drinks/${id}`);
      if (res.ok) {
        const data = await parseJsonSafely(res);
        if (data?.drink) return adaptDrink(data.drink as ApiDrink);
      }
    } catch (err) {
      console.warn('[api.getDrinkById] Backend fetch failed, using local store:', err);
    }
    const local = store.getDrinks().find((d) => d.id === id);
    if (local) return local;
    throw new Error('Drink not found.');
  },

  // --- Cafe management (ADMIN only - requires a JWT from api.login) ---

  async createCafe(input: {
    name: string;
    address: string;
    city: string;
    state: string;
    latitude?: number | null;
    longitude?: number | null;
    image_url?: string | null;
    description?: string | null;
    payout_rate?: number;
    neighborhood?: string | null;
    opening_hours?: Record<string, unknown> | null;
    vibe_tags?: string[];
    perk_line?: string | null;
    is_featured?: boolean;
  }) {
    const res = await fetch(`${API_BASE_URL}/cafes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(input),
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to create cafe.');
    return adaptCafe(data.cafe as ApiCafe);
  },

  async updateCafe(
    id: string,
    input: Partial<{
      name: string;
      address: string;
      city: string;
      state: string;
      latitude: number | null;
      longitude: number | null;
      image_url: string | null;
      description: string | null;
      payout_rate: number;
      is_active: boolean;
      neighborhood: string | null;
      opening_hours: Record<string, unknown> | null;
      vibe_tags: string[];
      perk_line: string | null;
      is_featured: boolean;
    }>
  ) {
    const res = await fetch(`${API_BASE_URL}/cafes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(input),
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to update cafe.');
    return adaptCafe(data.cafe as ApiCafe);
  },

  async deactivateCafe(id: string) {
    const res = await fetch(`${API_BASE_URL}/cafes/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to deactivate cafe.');
    return adaptCafe(data.cafe as ApiCafe);
  },

  // Uploads a cafe/drink photo to local disk storage (ADMIN only) and
  // returns the path to store as that record's image_url. See
  // resolveAssetUrl() above for how the returned path gets displayed.
  async uploadImage(file: File): Promise<{ image_url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_BASE_URL}/uploads/image`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to upload image.');
    return data as { image_url: string };
  },

  // Uploads a user's profile picture to S3 / local disk and updates user record
  async uploadAvatar(file: File): Promise<{ success: boolean; user: any; image_url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_BASE_URL}/profile/avatar`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to upload profile picture.');
    return data as { success: boolean; user: any; image_url: string };
  },

  // Updates current user's profile in backend
  async updateProfile(input: {
    name?: string;
    neighborhood?: string | null;
    coffee_preferences?: string[];
    profile_image_url?: string | null;
  }): Promise<{ user: any }> {
    const res = await fetch(`${API_BASE_URL}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(input),
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to update profile.');
    return data;
  },

  // --- Drink management (ADMIN only) ---

  async createDrink(
    cafeId: string,
    input: { name: string; description?: string | null; price: number; image_url?: string | null; credit_price?: number; category?: string | null; is_signature?: boolean }
  ) {
    const res = await fetch(`${API_BASE_URL}/cafes/${cafeId}/drinks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(input),
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to create drink.');
    return adaptDrink(data.drink as ApiDrink);
  },

  async updateDrink(
    id: string,
    input: Partial<{
      name: string;
      description: string | null;
      price: number;
      image_url: string | null;
      is_active: boolean;
      credit_price: number;
      category: string | null;
      is_signature: boolean;
    }>
  ) {
    const res = await fetch(`${API_BASE_URL}/drinks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(input),
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to update drink.');
    return adaptDrink(data.drink as ApiDrink);
  },

  async deactivateDrink(id: string) {
    const res = await fetch(`${API_BASE_URL}/drinks/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to deactivate drink.');
    return adaptDrink(data.drink as ApiDrink);
  },

  // Create real Stripe Checkout Session
  async createStripeCheckoutSession(memberId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          successUrl: `${window.location.origin}?payment=success`,
          cancelUrl: `${window.location.origin}?payment=cancel`,
        }),
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Create Stripe Customer Portal link
  async createStripePortalSession(memberId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/stripe/create-portal-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // --- Redemptions (Phase 6) - all require a real JWT from api.login/register ---

  // Member creates a pending redemption code (no credit deduction yet).
  async createRedemption(cafeId: string, drinkId: string): Promise<RedemptionApi> {
    const res = await fetch(`${API_BASE_URL}/redemptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ cafe_id: cafeId, drink_id: drinkId }),
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to generate redemption code.');
    return data.redemption as RedemptionApi;
  },

  // The caller's own latest redemption (whatever its status), or null.
  async getCurrentRedemption(): Promise<RedemptionApi | null> {
    const res = await fetch(`${API_BASE_URL}/redemptions/current`, { headers: authHeaders() });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to load current redemption.');
    return (data.redemption as RedemptionApi | null) ?? null;
  },

  async cancelCurrentRedemption(): Promise<RedemptionApi> {
    const res = await fetch(`${API_BASE_URL}/redemptions/current`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to cancel redemption.');
    return data.redemption as RedemptionApi;
  },

  // Barista-side scan (requires a BARISTA/ADMIN JWT) - not used by the
  // member-facing UI; no dedicated scanner screen until Phase 7.
  async redeemCode(
    cafeId: string,
    code: { token?: string; backup_code?: string }
  ): Promise<{ redemption: RedemptionApi; new_balance: number }> {
    const res = await fetch(`${API_BASE_URL}/redemptions/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ cafe_id: cafeId, ...code }),
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new ApiError(data?.error || 'Failed to redeem code.', data?.reason);
    return data;
  },

  // --- Drink Diary / Reviews (Phase 9) - all require a real JWT ---

  // The caller's own completed redemptions (drives "already reviewed?" vs
  // "rate this drink" in the diary - reconciled client-side against
  // getReviews() by redemption_id).
  async getRedeemedHistory(): Promise<RedeemedHistoryEntryApi[]> {
    const res = await fetch(`${API_BASE_URL}/redemptions/history`, { headers: authHeaders() });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to load redeemed drink history.');
    return data.redemptions as RedeemedHistoryEntryApi[];
  },

  async getReviews(): Promise<ReviewApi[]> {
    const res = await fetch(`${API_BASE_URL}/reviews`, { headers: authHeaders() });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to load your reviews.');
    return data.reviews as ReviewApi[];
  },

  // Either redemptionId (rating a completed redemption) or drinkId (rating a
  // drink directly, no redemption required) must be supplied.
  async createReview(input: {
    redemptionId?: string;
    drinkId?: string;
    rating: number;
    note: string | null;
  }): Promise<ReviewRecord> {
    const res = await fetch(`${API_BASE_URL}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(input),
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new ApiError(data?.error || 'Failed to submit rating.', data?.reason);
    return data.review as ReviewRecord;
  },

  async updateReview(reviewId: string, rating: number, note: string | null): Promise<ReviewRecord> {
    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ rating, note }),
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to update rating.');
    return data.review as ReviewRecord;
  },

  async deleteReview(reviewId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to delete rating.');
  },

  // --- Admin back-office (Phase 10) - all require a real ADMIN JWT ---

  async getAdminDashboard(): Promise<AdminDashboardSummary> {
    const res = await fetch(`${API_BASE_URL}/admin/dashboard`, { headers: authHeaders() });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to load dashboard.');
    return data.summary as AdminDashboardSummary;
  },

  async getAdminRedemptions(params?: {
    cafeId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
  }): Promise<AdminRedemptionLogPage> {
    const query = new URLSearchParams();
    if (params?.cafeId) query.set('cafe_id', params.cafeId);
    if (params?.startDate) query.set('start_date', params.startDate);
    if (params?.endDate) query.set('end_date', params.endDate);
    if (params?.page) query.set('page', String(params.page));
    const qs = query.toString();

    const res = await fetch(`${API_BASE_URL}/admin/redemptions${qs ? `?${qs}` : ''}`, { headers: authHeaders() });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to load redemption log.');
    return data as AdminRedemptionLogPage;
  },

  async voidRedemption(redemptionId: string, reason: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/admin/redemptions/${redemptionId}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ reason }),
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to void redemption.');
  },

  // Fetches the CSV as text (so the Authorization header can be attached -
  // a plain <a href> download can't carry auth) and hands the caller a Blob
  // URL to trigger the actual browser download from.
  async exportAdminRedemptionsCsv(params?: { cafeId?: string; startDate?: string; endDate?: string }): Promise<Blob> {
    const query = new URLSearchParams();
    if (params?.cafeId) query.set('cafe_id', params.cafeId);
    if (params?.startDate) query.set('start_date', params.startDate);
    if (params?.endDate) query.set('end_date', params.endDate);
    const qs = query.toString();

    const res = await fetch(`${API_BASE_URL}/admin/redemptions/export${qs ? `?${qs}` : ''}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to export redemptions.');
    return res.blob();
  },

  async getAdminMembers(): Promise<AdminMemberEntry[]> {
    const res = await fetch(`${API_BASE_URL}/admin/members`, { headers: authHeaders() });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to load members.');
    return data.members as AdminMemberEntry[];
  },

  async getAdminPayoutSummary(cafeId: string, periodStart: string, periodEnd: string): Promise<AdminPayoutSummary> {
    const query = new URLSearchParams({ cafe_id: cafeId, period_start: periodStart, period_end: periodEnd });
    const res = await fetch(`${API_BASE_URL}/admin/payouts/summary?${query.toString()}`, { headers: authHeaders() });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to load payout summary.');
    return data.summary as AdminPayoutSummary;
  },

  async recordAdminPayout(input: {
    cafeId: string;
    periodStart: string;
    periodEnd: string;
    amount: number;
    reference?: string | null;
  }): Promise<AdminPayoutRecord> {
    const res = await fetch(`${API_BASE_URL}/admin/payouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        cafe_id: input.cafeId,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        amount: input.amount,
        reference: input.reference ?? null,
      }),
    });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to record payout.');
    return data.payout as AdminPayoutRecord;
  },

  async getAdminPayoutHistory(cafeId?: string): Promise<AdminPayoutRecord[]> {
    const qs = cafeId ? `?cafe_id=${encodeURIComponent(cafeId)}` : '';
    const res = await fetch(`${API_BASE_URL}/admin/payouts${qs}`, { headers: authHeaders() });
    const data = await parseJsonSafely(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to load payout history.');
    return data.history as AdminPayoutRecord[];
  },
};
