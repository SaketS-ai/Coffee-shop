import React, { useEffect, useState } from 'react';
import { Cafe, Drink } from '../../types';
import { api } from '../../services/api';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Star,
  Navigation,
  Sparkles,
  QrCode,
  Coffee
} from 'lucide-react';

interface CafeDetailScreenProps {
  cafe: Cafe;
  onBack: () => void;
  onRedeemDrink: (drink?: Drink) => void;
  onRateDrink: (drink: Drink) => void;
}

export const CafeDetailScreen: React.FC<CafeDetailScreenProps> = ({
  cafe,
  onBack,
  onRedeemDrink,
  onRateDrink,
}) => {
  // `cafe` prop is whatever the Discover list last showed - render it
  // immediately so there's no blank-screen flash, but also fetch the live
  // record so a cafe deactivated after the list loaded (or opened via a
  // stale reference) is caught rather than silently shown as if still active.
  const [liveCafe, setLiveCafe] = useState<Cafe | null>(null);
  const [cafeError, setCafeError] = useState<string | null>(null);
  const displayCafe = liveCafe ?? cafe;

  const [allDrinks, setAllDrinks] = useState<Drink[]>([]);
  const [isLoadingDrinks, setIsLoadingDrinks] = useState(true);
  const [drinksError, setDrinksError] = useState<string | null>(null);

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    let cancelled = false;

    async function loadCafe() {
      setCafeError(null);
      try {
        const fresh = await api.getCafeById(cafe.id);
        if (!cancelled) setLiveCafe(fresh);
      } catch (err: any) {
        if (!cancelled) setCafeError(err.message || 'This cafe is no longer available.');
      }
    }

    async function loadDrinks() {
      setIsLoadingDrinks(true);
      setDrinksError(null);
      try {
        const data = await api.getDrinksByCafe(cafe.id);
        if (!cancelled) setAllDrinks(data);
      } catch (err: any) {
        if (!cancelled) setDrinksError(err.message || 'Could not load the drink menu.');
      } finally {
        if (!cancelled) setIsLoadingDrinks(false);
      }
    }

    setLiveCafe(null);
    loadCafe();
    loadDrinks();
    return () => {
      cancelled = true;
    };
  }, [cafe.id]);

  const categories = ['All', 'espresso', 'cold_brew', 'matcha', 'latte', 'specialty'];

  const drinks = selectedCategory === 'All'
    ? allDrinks
    : allDrinks.filter((d) => d.category === selectedCategory);

  const handleDirections = () => {
    const query = encodeURIComponent(`${displayCafe.name}, ${displayCafe.address}`);
    window.open(`https://maps.google.com/?q=${query}`, '_blank');
  };

  // Phase 6: this now opens the real, JWT-backed redemption flow directly -
  // RedemptionModal owns all the gating (login required, active membership
  // required, insufficient credits) since it talks to the real backend.
  const handlePrimaryRedeemClick = () => {
    onRedeemDrink(allDrinks[0]);
  };

  if (cafeError) {
    return (
      <div className="space-y-4 pb-20 text-[#4B2E2B] animate-fade-in">
        <button
          onClick={onBack}
          aria-label="Back to Discover"
          className="bg-[#FFF8F0] hover:bg-[#F4EFE6] text-[#4B2E2B] p-2.5 rounded-2xl border border-[#8C5A3C]/20 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="bg-white rounded-3xl p-10 text-center space-y-3 border border-[#8C5A3C]/20 shadow-sm">
          <Coffee className="w-12 h-12 text-[#8C5A3C] mx-auto" />
          <h4 className="text-base font-bold text-[#4B2E2B]">Cafe Unavailable</h4>
          <p className="text-xs text-[#6B4E4B] max-w-sm mx-auto">{cafeError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 text-[#4B2E2B] animate-fade-in">
      {/* GALLERY & CAFE HERO BANNER */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-lg border border-[#8C5A3C]/20 relative">
        <button
          onClick={onBack}
          aria-label="Back to Discover"
          className="absolute top-4 left-4 z-20 bg-[#FFF8F0]/90 hover:bg-[#FFF8F0] text-[#4B2E2B] p-2.5 rounded-2xl backdrop-blur-md transition-all border border-[#8C5A3C]/30 shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Gallery Image Display */}
        <div className="h-64 sm:h-80 w-full relative overflow-hidden">
          <img
            src={displayCafe.photos[activePhotoIndex] || displayCafe.photos[0]}
            alt={displayCafe.name}
            className="w-full h-full object-cover transition-all duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#4B2E2B]/80 via-[#4B2E2B]/20 to-transparent"></div>

          {displayCafe.photos.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2 z-10">
              {displayCafe.photos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`w-3 h-3 rounded-full transition-all border ${
                    activePhotoIndex === idx
                      ? 'w-8 bg-[#8C5A3C] border-[#C08552]'
                      : 'bg-white/60 border-white/30 hover:border-white'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Cafe Information Banner */}
        <div className="p-6 space-y-4 relative bg-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-widest text-on-accent bg-accent px-2.5 py-0.5 rounded-full">
                  📍 {displayCafe.neighborhood} • {displayCafe.distanceMiles} miles
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#FFF8F0] bg-[#8C5A3C] px-2.5 py-0.5 rounded-full">
                  🟢 Open Today
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#4B2E2B]">{displayCafe.name}</h1>
            </div>

            <div className="flex items-center space-x-1.5 bg-[#FFF8F0] border border-[#8C5A3C]/20 px-3.5 py-1.5 rounded-2xl shadow-sm">
              <Star className="w-4 h-4 text-[#8C5A3C] fill-[#8C5A3C]" />
              <span className="text-sm font-black text-[#4B2E2B]">
                {displayCafe.ratingCount > 0 ? `${displayCafe.rating.toFixed(1)} (${displayCafe.ratingCount} reviews)` : 'New Cafe'}
              </span>
            </div>
          </div>

          <p className="text-xs text-[#6B4E4B] flex items-center space-x-1.5">
            <MapPin className="w-4 h-4 text-[#8C5A3C] flex-shrink-0" />
            <span>{displayCafe.address}</span>
          </p>

          <div className="bg-[#FFF8F0] rounded-2xl p-3.5 text-xs text-[#4B2E2B] font-semibold flex items-center space-x-2.5 border border-[#8C5A3C]/20">
            <Sparkles className="w-5 h-5 text-[#8C5A3C] flex-shrink-0" />
            <span>{displayCafe.perkLine}</span>
          </div>

          <div className="flex items-center space-x-3 pt-1">
            <button
              onClick={handleDirections}
              className="flex-1 py-3 px-4 bg-accent hover:bg-accent-hover text-on-accent rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md"
            >
              <Navigation className="w-4 h-4 text-[#FFF8F0]" />
              <span>Get Directions (Google Maps)</span>
            </button>
          </div>
        </div>
      </div>

      {/* OPENING HOURS */}
      <div className="bg-white rounded-3xl p-5 space-y-3 border border-[#8C5A3C]/20 shadow-sm">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#8C5A3C] flex items-center space-x-2">
          <Clock className="w-4 h-4 text-[#8C5A3C]" />
          <span>Opening Hours & Schedule</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {Object.entries(displayCafe.openingHours).map(([day, hours]) => (
            <div key={day} className="bg-[#FFF8F0] p-2.5 rounded-xl border border-[#8C5A3C]/15 flex justify-between items-center">
              <span className="text-[#6B4E4B] font-bold">{day}:</span>
              <span className="font-mono text-[#4B2E2B] text-[11px]">{hours}</span>
            </div>
          ))}
        </div>
      </div>

      {/* DRINK MENU */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#4B2E2B] flex items-center space-x-2">
            <Coffee className="w-4 h-4 text-[#8C5A3C]" />
            <span>Craft Drink Menu & Credit Pricing</span>
          </h3>
          <span className="text-xs text-[#6B4E4B] font-mono">
            {drinks.length} Menu Items
          </span>
        </div>

        {/* Category Pills */}
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold capitalize whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-accent text-on-accent shadow-md'
                  : 'bg-white text-[#6B4E4B] hover:text-[#4B2E2B] border border-[#8C5A3C]/20 shadow-sm'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Drinks Grid */}
        {isLoadingDrinks ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 bg-white rounded-3xl border border-[#8C5A3C]/20 shadow-sm animate-pulse" />
            ))}
          </div>
        ) : drinksError ? (
          <div className="bg-white rounded-3xl p-8 text-center space-y-2 border border-[#8C5A3C]/20 shadow-sm">
            <Coffee className="w-8 h-8 text-[#8C5A3C] mx-auto" />
            <p className="text-xs text-[#6B4E4B]">{drinksError}</p>
          </div>
        ) : drinks.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center space-y-2 border border-[#8C5A3C]/20 shadow-sm">
            <Coffee className="w-8 h-8 text-[#8C5A3C] mx-auto" />
            <p className="text-xs text-[#6B4E4B]">No drinks on the menu yet.</p>
          </div>
        ) : (
        <div className="space-y-3">
          {drinks.map((drink) => {
            const savingsUsd = drink.retailPrice - drink.creditPrice;
            return (
              <div
                key={drink.id}
                className="bg-white rounded-3xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-[#8C5A3C]/20 shadow-sm transition-all hover:border-[#C08552]"
              >
                <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                  <img
                    src={drink.imageUrl}
                    alt={drink.name}
                    className="w-16 h-16 rounded-2xl object-cover border border-[#8C5A3C]/20 flex-shrink-0"
                  />

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-[#4B2E2B] truncate">{drink.name}</h4>
                      {drink.isSignature && (
                        <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-full bg-accent text-on-accent">
                          Signature
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6B4E4B] line-clamp-2 leading-relaxed">
                      {drink.description}
                    </p>

                    <div className="flex items-center space-x-3 text-[11px] pt-0.5">
                      <span className="text-[#6B4E4B]">Retail: <strong className="text-[#4B2E2B]">${drink.retailPrice.toFixed(2)}</strong></span>
                      <button
                        onClick={() => onRateDrink(drink)}
                        className="text-[#8C5A3C] hover:underline flex items-center space-x-1 font-bold"
                      >
                        <Star className="w-3.5 h-3.5 fill-[#8C5A3C]" />
                        <span>Rate Drink</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#8C5A3C]/15 gap-2">
                  <div className="text-right">
                    <div className="text-base font-black text-[#8C5A3C]">
                      {drink.creditPrice} Credits
                    </div>
                    {savingsUsd > 0 && (
                      <span className="text-[10px] text-[#FFF8F0] font-bold bg-[#8C5A3C] px-2 py-0.5 rounded-full">
                        Saves ${savingsUsd.toFixed(2)} with pass
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onRedeemDrink(drink)}
                    className="py-2 px-4 bg-accent hover:bg-accent-hover text-on-accent text-xs font-black rounded-xl shadow-md transition-all"
                  >
                    Redeem Drink
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* STICKY BOTTOM COUNTER CTA BAR */}
      <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40">
        <button
          onClick={handlePrimaryRedeemClick}
          disabled={allDrinks.length === 0}
          className="w-full py-4 px-6 bg-accent hover:bg-accent-hover text-on-accent font-black rounded-2xl text-sm shadow-2xl flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
        >
          <QrCode className="w-5 h-5" />
          <span>Redeem Here at Counter</span>
        </button>
      </div>
    </div>
  );
};
