import type { 
  MemberProfile, 
  Cafe, 
  Drink, 
  RedemptionCode, 
  RedemptionRecord, 
  DrinkRating, 
  PlatformSettings,
  ScanResult,
  CafePayoutRecord
} from '../types';
import { initialPlatformSettings, initialMember, initialCafes, initialDrinks, initialRatings, initialRedemptions } from '../data/seedData';

class Store {
  private settingsKey = 'social_cup_settings';
  private memberKey = 'social_cup_member';
  private cafesKey = 'social_cup_cafes';
  private drinksKey = 'social_cup_drinks';
  private codesKey = 'social_cup_codes';
  private redemptionsKey = 'social_cup_redemptions';
  private ratingsKey = 'social_cup_ratings';
  private payoutsKey = 'social_cup_payouts';

  private listeners: (() => void)[] = [];

  constructor() {
    this.initStorage();
  }

  private initStorage() {
    if (!localStorage.getItem(this.settingsKey)) {
      localStorage.setItem(this.settingsKey, JSON.stringify(initialPlatformSettings));
    }
    if (!localStorage.getItem(this.memberKey)) {
      localStorage.setItem(this.memberKey, JSON.stringify(initialMember));
    }
    if (!localStorage.getItem(this.cafesKey)) {
      localStorage.setItem(this.cafesKey, JSON.stringify(initialCafes));
    }
    if (!localStorage.getItem(this.drinksKey)) {
      localStorage.setItem(this.drinksKey, JSON.stringify(initialDrinks));
    }
    if (!localStorage.getItem(this.codesKey)) {
      localStorage.setItem(this.codesKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.redemptionsKey)) {
      localStorage.setItem(this.redemptionsKey, JSON.stringify(initialRedemptions));
    }
    if (!localStorage.getItem(this.ratingsKey)) {
      localStorage.setItem(this.ratingsKey, JSON.stringify(initialRatings));
    }
    if (!localStorage.getItem(this.payoutsKey)) {
      localStorage.setItem(this.payoutsKey, JSON.stringify([]));
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // --- Getters ---
  public getSettings(): PlatformSettings {
    return JSON.parse(localStorage.getItem(this.settingsKey) || JSON.stringify(initialPlatformSettings));
  }

  public getMember(): MemberProfile {
    return JSON.parse(localStorage.getItem(this.memberKey) || JSON.stringify(initialMember));
  }

  public getCafes(): Cafe[] {
    return JSON.parse(localStorage.getItem(this.cafesKey) || JSON.stringify(initialCafes));
  }

  public getDrinks(): Drink[] {
    return JSON.parse(localStorage.getItem(this.drinksKey) || JSON.stringify(initialDrinks));
  }

  public getRedemptionCodes(): RedemptionCode[] {
    return JSON.parse(localStorage.getItem(this.codesKey) || '[]');
  }

  public getRedemptions(): RedemptionRecord[] {
    return JSON.parse(localStorage.getItem(this.redemptionsKey) || JSON.stringify(initialRedemptions));
  }

  public getRatings(): DrinkRating[] {
    return JSON.parse(localStorage.getItem(this.ratingsKey) || JSON.stringify(initialRatings));
  }

  public getPayouts(): CafePayoutRecord[] {
    return JSON.parse(localStorage.getItem(this.payoutsKey) || '[]');
  }

  // --- Actions ---

  public resetToDemoData() {
    localStorage.setItem(this.settingsKey, JSON.stringify(initialPlatformSettings));
    localStorage.setItem(this.memberKey, JSON.stringify(initialMember));
    localStorage.setItem(this.cafesKey, JSON.stringify(initialCafes));
    localStorage.setItem(this.drinksKey, JSON.stringify(initialDrinks));
    localStorage.setItem(this.codesKey, JSON.stringify([]));
    localStorage.setItem(this.redemptionsKey, JSON.stringify(initialRedemptions));
    localStorage.setItem(this.ratingsKey, JSON.stringify(initialRatings));
    localStorage.setItem(this.payoutsKey, JSON.stringify([]));
    this.notify();
  }

  public setAccountState(state: 'visitor' | 'member') {
    const member = this.getMember();
    member.accountState = state;
    if (state === 'visitor') {
      member.status = 'inactive';
    } else {
      member.status = 'active';
      if (member.credits === 0) {
        member.credits = 30;
      }
    }
    localStorage.setItem(this.memberKey, JSON.stringify(member));
    this.notify();
  }

  public subscribeMember(): MemberProfile {
    const member = this.getMember();
    member.accountState = 'member';
    member.status = 'active';
    member.credits = 30;
    const renewal = new Date();
    renewal.setDate(renewal.getDate() + 30);
    member.renewalDate = renewal.toISOString().split('T')[0];
    localStorage.setItem(this.memberKey, JSON.stringify(member));
    this.notify();
    return member;
  }

  public updateMemberProfile(updates: Partial<MemberProfile>) {
    const member = { ...this.getMember(), ...updates };
    localStorage.setItem(this.memberKey, JSON.stringify(member));
    this.notify();
  }

  public generateRedemptionCode(cafeId: string, drinkId: string): RedemptionCode {
    const member = this.getMember();
    const drink = this.getDrinks().find((d) => d.id === drinkId);

    if (!drink) throw new Error('Drink not found');
    if (member.accountState !== 'member' || member.status !== 'active') {
      throw new Error('Active membership required to redeem drinks');
    }
    if (member.credits < drink.creditPrice) {
      throw new Error(`Insufficient credits. Requires ${drink.creditPrice} credits.`);
    }

    const existingCodes = this.getRedemptionCodes().map((c) => {
      if (c.memberId === member.id && c.status === 'active') {
        return { ...c, status: 'invalidated' as const };
      }
      return c;
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
    const backupCode = `SC-${randomDigits}`;

    const newCode: RedemptionCode = {
      id: `code_${Date.now()}`,
      code: backupCode,
      qrData: JSON.stringify({
        code: backupCode,
        memberId: member.id,
        cafeId,
        drinkId,
        timestamp: now.toISOString(),
      }),
      memberId: member.id,
      cafeId,
      drinkId,
      creditsCost: drink.creditPrice,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'active',
    };

    existingCodes.push(newCode);
    localStorage.setItem(this.codesKey, JSON.stringify(existingCodes));
    this.notify();
    return newCode;
  }

  public validateAndRedeemCode(cafeId: string, inputCode: string): ScanResult {
    const codes = this.getRedemptionCodes();
    const cleanCode = inputCode.trim().toUpperCase();

    const codeObj = codes.find((c) => {
      if (c.code === cleanCode) return true;
      try {
        const parsed = JSON.parse(cleanCode);
        return parsed.code === c.code || parsed.memberId === c.memberId;
      } catch {
        return false;
      }
    });

    if (!codeObj) {
      return { success: false, reason: 'INVALID_CODE' };
    }

    if (codeObj.cafeId !== cafeId) {
      return { success: false, reason: 'WRONG_CAFE' };
    }

    if (codeObj.status === 'redeemed' || codeObj.status === 'invalidated') {
      return { success: false, reason: 'ALREADY_REDEEMED' };
    }

    const now = new Date();
    const expiry = new Date(codeObj.expiresAt);
    if (now > expiry) {
      codeObj.status = 'expired';
      localStorage.setItem(this.codesKey, JSON.stringify(codes));
      this.notify();
      return { success: false, reason: 'EXPIRED_CODE' };
    }

    const member = this.getMember();
    if (member.id !== codeObj.memberId) {
      return { success: false, reason: 'INVALID_CODE' };
    }

    if (member.accountState !== 'member' || member.status !== 'active') {
      return { success: false, reason: 'INACTIVE_SUBSCRIPTION' };
    }

    if (member.credits < codeObj.creditsCost) {
      return { success: false, reason: 'INSUFFICIENT_CREDITS' };
    }

    const cafe = this.getCafes().find((c) => c.id === cafeId);
    const drink = this.getDrinks().find((d) => d.id === codeObj.drinkId);

    if (!cafe || !drink) {
      return { success: false, reason: 'INVALID_CODE' };
    }

    member.credits -= codeObj.creditsCost;
    localStorage.setItem(this.memberKey, JSON.stringify(member));

    codeObj.status = 'redeemed';
    localStorage.setItem(this.codesKey, JSON.stringify(codes));

    const cafePayoutUsd = codeObj.creditsCost * cafe.payoutRate;
    const memberValueUsd = drink.retailPrice;
    const platformMarginUsd = memberValueUsd - cafePayoutUsd;

    const newRecord: RedemptionRecord = {
      id: `rdm_${Date.now()}`,
      codeId: codeObj.id,
      memberId: member.id,
      memberName: member.name,
      memberPhoto: member.avatarUrl,
      cafeId: cafe.id,
      cafeName: cafe.name,
      drinkId: drink.id,
      drinkName: drink.name,
      creditsDeducted: codeObj.creditsCost,
      memberValueUsd,
      cafePayoutRate: cafe.payoutRate,
      cafePayoutUsd,
      platformMarginUsd,
      timestamp: now.toISOString(),
      isVoided: false,
    };

    const redemptions = this.getRedemptions();
    redemptions.unshift(newRecord);
    localStorage.setItem(this.redemptionsKey, JSON.stringify(redemptions));

    this.notify();

    return {
      success: true,
      record: newRecord,
      memberInfo: {
        name: member.name,
        photo: member.avatarUrl,
        drinkName: drink.name,
        creditsDeducted: codeObj.creditsCost,
      },
    };
  }

  public voidRedemption(redemptionId: string, voidReason: string, voidedBy: string = 'Admin') {
    const redemptions = this.getRedemptions();
    const record = redemptions.find((r) => r.id === redemptionId);

    if (!record || record.isVoided) return;

    record.isVoided = true;
    record.voidReason = voidReason;
    record.voidedBy = voidedBy;
    record.voidedAt = new Date().toISOString();

    const member = this.getMember();
    if (member.id === record.memberId) {
      member.credits += record.creditsDeducted;
      localStorage.setItem(this.memberKey, JSON.stringify(member));
    }

    localStorage.setItem(this.redemptionsKey, JSON.stringify(redemptions));
    this.notify();
  }

  public submitDrinkRating(drinkId: string, stars: number, note?: string): DrinkRating {
    const member = this.getMember();
    const drink = this.getDrinks().find((d) => d.id === drinkId);
    const cafe = this.getCafes().find((c) => c.id === drink?.cafeId);

    if (!drink || !cafe) throw new Error('Drink or cafe not found');

    const ratings = this.getRatings();
    const existingIndex = ratings.findIndex((r) => r.memberId === member.id && r.drinkId === drinkId);

    const newRating: DrinkRating = {
      id: existingIndex >= 0 ? ratings[existingIndex].id : `rtg_${Date.now()}`,
      memberId: member.id,
      memberName: member.name,
      drinkId,
      drinkName: drink.name,
      cafeId: cafe.id,
      cafeName: cafe.name,
      stars,
      note: note?.trim().slice(0, 140),
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      ratings[existingIndex] = newRating;
    } else {
      ratings.unshift(newRating);
    }

    localStorage.setItem(this.ratingsKey, JSON.stringify(ratings));

    const drinkRatings = ratings.filter((r) => r.drinkId === drinkId);
    const drinkAvg = drinkRatings.reduce((acc, r) => acc + r.stars, 0) / drinkRatings.length;
    const drinks = this.getDrinks().map((d) => {
      if (d.id === drinkId) {
        return { ...d, rating: Number(drinkAvg.toFixed(1)), ratingCount: drinkRatings.length };
      }
      return d;
    });
    localStorage.setItem(this.drinksKey, JSON.stringify(drinks));

    const cafeDrinkIds = drinks.filter((d) => d.cafeId === cafe.id).map((d) => d.id);
    const cafeRatings = ratings.filter((r) => cafeDrinkIds.includes(r.drinkId));
    const cafeAvg = cafeRatings.length > 0
      ? cafeRatings.reduce((acc, r) => acc + r.stars, 0) / cafeRatings.length
      : 0;

    const cafes = this.getCafes().map((c) => {
      if (c.id === cafe.id) {
        return { 
          ...c, 
          rating: Number(cafeAvg.toFixed(1)), 
          ratingCount: cafeRatings.length 
        };
      }
      return c;
    });
    localStorage.setItem(this.cafesKey, JSON.stringify(cafes));

    this.notify();
    return newRating;
  }

  public saveCafe(cafeData: Partial<Cafe> & { id?: string }): Cafe {
    const cafes = this.getCafes();
    let saved: Cafe;

    if (cafeData.id) {
      const idx = cafes.findIndex((c) => c.id === cafeData.id);
      saved = { ...cafes[idx], ...cafeData };
      cafes[idx] = saved;
    } else {
      saved = {
        id: `cafe_${Date.now()}`,
        name: cafeData.name || 'New Cafe',
        neighborhood: cafeData.neighborhood || 'Deep Ellum',
        address: cafeData.address || 'Dallas, TX',
        coordinates: cafeData.coordinates || { lat: 32.7767, lng: -96.7970 },
        distanceMiles: 1.0,
        openingHours: cafeData.openingHours || { Mon: '7:00 AM - 5:00 PM' },
        photos: cafeData.photos?.length ? cafeData.photos : ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800'],
        vibeTags: cafeData.vibeTags || ['Cozy', 'Wi-Fi'],
        perkLine: cafeData.perkLine || 'Special member discount',
        payoutRate: cafeData.payoutRate ?? 2.10,
        isFeatured: cafeData.isFeatured ?? false,
        scanPin: '1234',
        rating: 0,
        ratingCount: 0,
      };
      cafes.unshift(saved);
    }

    localStorage.setItem(this.cafesKey, JSON.stringify(cafes));
    this.notify();
    return saved;
  }

  public deleteCafe(cafeId: string) {
    const cafes = this.getCafes().filter((c) => c.id !== cafeId);
    localStorage.setItem(this.cafesKey, JSON.stringify(cafes));
    this.notify();
  }

  public resetCafePin(cafeId: string, newPin: string) {
    const cafes = this.getCafes().map((c) => (c.id === cafeId ? { ...c, scanPin: newPin } : c));
    localStorage.setItem(this.cafesKey, JSON.stringify(cafes));
    this.notify();
  }

  public saveDrink(drinkData: Partial<Drink> & { id?: string }): Drink {
    const drinks = this.getDrinks();
    let saved: Drink;

    if (drinkData.id) {
      const idx = drinks.findIndex((d) => d.id === drinkData.id);
      saved = { ...drinks[idx], ...drinkData };
      drinks[idx] = saved;
    } else {
      saved = {
        id: `drk_${Date.now()}`,
        cafeId: drinkData.cafeId || '',
        name: drinkData.name || 'New Drink',
        category: drinkData.category || 'espresso',
        description: drinkData.description || '',
        imageUrl: drinkData.imageUrl || 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=400',
        retailPrice: drinkData.retailPrice || 5.00,
        creditPrice: drinkData.creditPrice || 4,
        isSignature: drinkData.isSignature || false,
        isActive: drinkData.isActive ?? true,
        rating: 0,
        ratingCount: 0,
      };
      drinks.unshift(saved);
    }

    localStorage.setItem(this.drinksKey, JSON.stringify(drinks));
    this.notify();
    return saved;
  }

  public toggleDrinkActive(drinkId: string) {
    const drinks = this.getDrinks().map((d) => (d.id === drinkId ? { ...d, isActive: !d.isActive } : d));
    localStorage.setItem(this.drinksKey, JSON.stringify(drinks));
    this.notify();
  }

  public recordPayout(cafeId: string, period: string, amountUsd: number, reference: string): CafePayoutRecord {
    const payouts = this.getPayouts();
    const cafe = this.getCafes().find((c) => c.id === cafeId);
    
    const newPayout: CafePayoutRecord = {
      id: `pyt_${Date.now()}`,
      cafeId,
      cafeName: cafe?.name || 'Cafe',
      period,
      totalRedemptions: this.getRedemptions().filter((r) => r.cafeId === cafeId && !r.isVoided).length,
      totalCredits: this.getRedemptions().filter((r) => r.cafeId === cafeId && !r.isVoided).reduce((acc, r) => acc + r.creditsDeducted, 0),
      amountOwedUsd: amountUsd,
      status: 'paid',
      paymentDate: new Date().toISOString(),
      paymentReference: reference,
    };

    payouts.unshift(newPayout);
    localStorage.setItem(this.payoutsKey, JSON.stringify(payouts));
    this.notify();
    return newPayout;
  }
}

export const store = new Store();
