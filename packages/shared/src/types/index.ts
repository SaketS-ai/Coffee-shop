export type UserRole = 'visitor' | 'member' | 'barista' | 'admin';

export type AccountStatus = 'active' | 'inactive' | 'payment_failed';

export type CoffeeTheme = 'roast_cream' | 'botanical_sage' | 'obsidian_gold';

export interface MemberProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  accountState: 'visitor' | 'member';
  status: AccountStatus;
  credits: number;
  renewalDate: string;
  homeNeighborhood: string;
  coffeePreferences: string[]; // e.g. ['matcha', 'espresso', 'cold_brew', 'latte']
  stripeCustomerId: string;
}

export interface Cafe {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  coordinates: { lat: number; lng: number };
  distanceMiles: number;
  openingHours: { [day: string]: string };
  photos: string[];
  vibeTags: string[];
  perkLine: string;
  payoutRate: number; // in $ per credit
  isFeatured: boolean;
  scanPin: string; // default '1234'
  rating: number;
  ratingCount: number;
}

export type DrinkCategory = 'espresso' | 'matcha' | 'cold_brew' | 'latte' | 'specialty';

export interface Drink {
  id: string;
  cafeId: string;
  name: string;
  category: DrinkCategory;
  description: string;
  imageUrl: string;
  retailPrice: number;
  creditPrice: number;
  isSignature: boolean;
  isActive: boolean;
  rating: number;
  ratingCount: number;
}

export type CodeStatus = 'active' | 'redeemed' | 'expired' | 'invalidated';

export interface RedemptionCode {
  id: string;
  code: string; // 6-digit backup PIN (e.g. SC-948210)
  qrData: string;
  memberId: string;
  cafeId: string;
  drinkId: string;
  creditsCost: number;
  createdAt: string;
  expiresAt: string; // 5-minute timer
  status: CodeStatus;
}

export interface RedemptionRecord {
  id: string;
  codeId: string;
  memberId: string;
  memberName: string;
  memberPhoto: string;
  cafeId: string;
  cafeName: string;
  drinkId: string;
  drinkName: string;
  creditsDeducted: number;
  memberValueUsd: number;
  cafePayoutRate: number;
  cafePayoutUsd: number;
  platformMarginUsd: number;
  timestamp: string;
  isVoided: boolean;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: string;
}

export interface DrinkRating {
  id: string;
  memberId: string;
  memberName: string;
  drinkId: string;
  drinkName: string;
  cafeId: string;
  cafeName: string;
  stars: number;
  note?: string;
  createdAt: string;
}

export interface CafePayoutRecord {
  id: string;
  cafeId: string;
  cafeName: string;
  period: string;
  totalRedemptions: number;
  totalCredits: number;
  amountOwedUsd: number;
  status: 'unpaid' | 'paid';
  paymentDate?: string;
  paymentReference?: string;
}

export interface PlatformSettings {
  creditDollarValue: number; // $1.00
  monthlyPlanPrice: number; // $24.99
  monthlyCreditAllowance: number; // 30 credits
}

export type RedemptionErrorReason = 
  | 'EXPIRED_CODE'
  | 'ALREADY_REDEEMED'
  | 'INACTIVE_SUBSCRIPTION'
  | 'INSUFFICIENT_CREDITS'
  | 'WRONG_CAFE'
  | 'INVALID_CODE';

export interface ScanResult {
  success: boolean;
  reason?: RedemptionErrorReason;
  record?: RedemptionRecord;
  memberInfo?: {
    name: string;
    photo: string;
    drinkName: string;
    creditsDeducted: number;
  };
}
