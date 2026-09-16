import React, { useEffect, useState } from 'react';
import { Cafe, Drink } from '../../types';
import { store } from '../../services/store';
import { api, DEFAULT_CAFE_IMAGE, DEFAULT_DRINK_IMAGE, getDrinkDefaultImage } from '../../services/api';
import { useUserLocation } from '../../hooks/useUserLocation';
import { haversineMiles } from '../../utils/geo';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Star,
  Navigation,
  Sparkles,
  QrCode,
  Coffee,
  Award,
  ChevronRight,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface CafeDetailScreenProps {
  cafe: Cafe;
  onBack: () => void;
  onRedeemDrink: (drink?: Drink) => void;
  onRateDrink: (drink: Drink) => void;
  isMobile?: boolean;
}

export const CafeDetailScreen: React.FC<CafeDetailScreenProps> = ({
  cafe,
  onBack,
  onRedeemDrink,
  onRateDrink,
  isMobile = false,
}) => {
  const [liveCafe, setLiveCafe] = useState<Cafe | null>(null);
  const [cafeError, setCafeError] = useState<string | null>(null);
  const { coords: userCoords } = useUserLocation();
  const baseCafe = liveCafe ?? cafe;
  const displayCafe =
    userCoords && baseCafe.coordinates.lat !== 0 && baseCafe.coordinates.lng !== 0
      ? { ...baseCafe, distanceMiles: haversineMiles(userCoords.lat, userCoords.lng, baseCafe.coordinates.lat, baseCafe.coordinates.lng) }
      : baseCafe;

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
        if (!cancelled) {
          const fallback = store.getCafes().find((c) => c.id === cafe.id);
          if (fallback) {
            setLiveCafe(fallback);
          } else {
            setCafeError(err.message || 'This cafe is no longer available.');
          }
        }
      }
    }

    async function loadDrinks() {
      setIsLoadingDrinks(true);
      setDrinksError(null);
      try {
        const data = await api.getDrinksByCafe(cafe.id);
        if (!cancelled) setAllDrinks(data);
      } catch (err: any) {
        if (!cancelled) {
          const fallbackDrinks = store.getDrinks().filter((d) => d.cafeId === cafe.id);
          setAllDrinks(fallbackDrinks.length > 0 ? fallbackDrinks : store.getDrinks());
        }
      } finally {
        if (!cancelled) setIsLoadingDrinks(false);
      }
    }

    loadCafe();
    loadDrinks();
    return () => {
      cancelled = true;
    };
  }, [cafe.id]);

  const categories = [
    { id: 'All', label: 'Full Menu' },
    { id: 'espresso', label: 'Espresso' },
    { id: 'cold_brew', label: 'Cold Brew' },
    { id: 'latte', label: 'Lattes' },
    { id: 'matcha', label: 'Matcha & Tea' },
    { id: 'specialty', label: 'Signature Roasts' },
  ];

  const filteredDrinks = selectedCategory === 'All'
    ? allDrinks
    : allDrinks.filter((d) => d.category?.toLowerCase() === selectedCategory.toLowerCase());

  const signatureDrink = allDrinks.find((d) => d.isSignature) || allDrinks[0];

  const handleDirections = () => {
    const query = encodeURIComponent(`${displayCafe.name}, ${displayCafe.address}`);
    window.open(`https://maps.google.com/?q=${query}`, '_blank');
  };

  if (cafeError) {
    return (
      <div className="space-y-4 pb-20 text-[#241A16] animate-fade-in my-6">
        <button
          onClick={onBack}
          aria-label="Back to Discover"
          className="bg-[#FBF8F2] hover:bg-[#F5F0E8] text-[#241A16] p-2.5 rounded-2xl border border-[#DDD4C8] shadow-xs flex items-center space-x-1.5 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Discover</span>
        </button>
        <div className="bg-[#FBF8F2] rounded-3xl p-10 text-center space-y-3 border border-[#DDD4C8] shadow-sm">
          <Coffee className="w-12 h-12 text-[#6B4A3A] mx-auto opacity-70" />
          <h4 className="font-editorial text-xl font-bold text-[#241A16]">Cafe Unavailable</h4>
          <p className="text-xs text-[#756B63] max-w-sm mx-auto">{cafeError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 text-[#241A16] animate-fade-in max-w-6xl mx-auto w-full">
      {/* 1. CINEMATIC ROASTERY HERO */}
      <div className="relative rounded-[32px] overflow-hidden border border-[#DDD4C8] bg-[#241A16] shadow-md group w-full">
        {/* Floating Back Navigation Pill */}
        <button
          onClick={onBack}
          aria-label="Back to Discover"
          className="absolute top-4 left-4 z-20 bg-[#FBF8F2]/90 hover:bg-[#FBF8F2] text-[#241A16] px-3.5 py-2 rounded-2xl backdrop-blur-md transition-all border border-[#DDD4C8] shadow-md flex items-center space-x-1.5 text-xs font-bold active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Discover</span>
        </button>

        {/* Hero Gallery Slider */}
        <div className="h-72 sm:h-96 w-full relative overflow-hidden bg-[#241A16]">
          <img
            src={displayCafe.photos[activePhotoIndex] || DEFAULT_CAFE_IMAGE}
            alt={displayCafe.name}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_CAFE_IMAGE;
            }}
            className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-103"
          />
          {/* Rich Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#241A16] via-[#241A16]/40 to-black/35" />

          {/* Top-Right Verified Partner Badge */}
          <div className="absolute top-4 right-4 z-20 flex items-center space-x-1.5 bg-[#241A16]/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#B98252]/40 text-[10px] font-bold text-[#FBF8F2] shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-[#B98252]" />
            <span>Verified Dallas Partner</span>
          </div>

          {/* Photo Dots */}
          {displayCafe.photos.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-1.5 z-20">
              {displayCafe.photos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    activePhotoIndex === idx ? 'w-6 bg-[#B98252]' : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`View photo ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {/* Bottom Title & Overlay Metadata */}
          <div className="absolute bottom-5 left-5 right-5 space-y-2 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-[#FBF8F2] bg-[#241A16]/85 backdrop-blur-xs px-3 py-0.5 rounded-full border border-[#B98252]/40">
                <MapPin className="w-3 h-3 text-[#B98252]" />
                <span>
                  {displayCafe.neighborhood}
                  {displayCafe.distanceMiles > 0 ? ` • ${displayCafe.distanceMiles.toFixed(1)} mi away` : ''}
                </span>
              </span>

              <div className="bg-[#241A16]/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15 flex items-center space-x-1 shadow-sm">
                <Star className="w-3 h-3 text-[#B98252] fill-[#B98252]" />
                <span className="text-[11px] font-bold text-[#FBF8F2]">
                  {displayCafe.rating > 0
                    ? `${displayCafe.rating.toFixed(1)} (${displayCafe.ratingCount} review${displayCafe.ratingCount === 1 ? '' : 's'})`
                    : 'New — no reviews yet'}
                </span>
              </div>
            </div>

            <h1 className="font-editorial text-2xl sm:text-4xl font-extrabold text-[#FBF8F2] leading-tight drop-shadow-sm">
              {displayCafe.name}
            </h1>
          </div>
        </div>

        {/* Quick Details & Action Bar */}
        <div className="p-4 sm:p-5 bg-[#FBF8F2] space-y-4">
          <p className="text-xs sm:text-sm text-[#756B63] leading-relaxed font-normal">
            {displayCafe.perkLine || 'Handcrafted specialty espresso, pour-overs, and house-made syrups in a welcoming Dallas space.'}
          </p>

          {/* Vibe Tags Strip */}
          <div className="flex flex-wrap gap-1.5">
            {displayCafe.vibeTags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] bg-[#F5F0E8] text-[#6B4A3A] border border-[#DDD4C8] px-2.5 py-1 rounded-lg font-bold"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Action Row */}
          <div className="pt-3 border-t border-[#DDD4C8] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-1.5 text-[#756B63]">
              <Clock className="w-4 h-4 text-[#6B4A3A]" />
              <span className="font-medium">{displayCafe.address}</span>
            </div>

            <button
              onClick={handleDirections}
              className="flex items-center space-x-1.5 bg-[#F5F0E8] hover:bg-[#241A16] hover:text-[#FBF8F2] text-[#241A16] px-4 py-2 rounded-xl font-bold transition-all border border-[#DDD4C8] shadow-2xs active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5 text-[#B98252]" />
              <span>Get Directions</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. SIGNATURE DRINK SPOTLIGHT BANNER (Visual Rhythm: Dark section on cream page) */}
      {signatureDrink && (
        <section className={`relative overflow-hidden rounded-3xl bg-[#241A16] border border-[#3A2922] p-4.5 sm:p-6 shadow-lg text-[#FBF8F2] flex flex-col ${isMobile ? '' : 'md:flex-row md:items-center md:justify-between'} gap-4`}>
          <div className="flex items-center space-x-3.5 w-full">
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden flex-shrink-0 bg-[#3A2922] border border-[#6B4A3A]/40 shadow-sm relative">
              <img
                src={signatureDrink.imageUrl || getDrinkDefaultImage(signatureDrink.name, signatureDrink.category)}
                alt={signatureDrink.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getDrinkDefaultImage(signatureDrink.name, signatureDrink.category);
                }}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 right-1 bg-[#B98252] text-[#FBF8F2] text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md shadow-xs">
                ⭐ Top Pick
              </span>
            </div>

            <div className="space-y-1 flex-1 min-w-0">
              <div className="inline-flex items-center space-x-1 text-[9px] font-mono font-bold uppercase tracking-wider text-[#B98252]">
                <Award className="w-3 h-3" />
                <span>Featured Signature Roast</span>
              </div>
              <h3 className="font-editorial text-base sm:text-lg font-bold text-[#FBF8F2] truncate leading-tight">
                {signatureDrink.name}
              </h3>
              <p className="text-xs text-[#DDD4C8] line-clamp-1 font-normal">
                {signatureDrink.description || 'Specialty single origin preparation with velvety texture.'}
              </p>
              <div className="flex items-center space-x-2 pt-0.5 text-xs font-bold text-[#B98252]">
                <span>{signatureDrink.creditPrice} Credits</span>
                <span className="text-[#DDD4C8]/40">•</span>
                <span className="text-[#DDD4C8] font-normal">Retail ${signatureDrink.retailPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-2 ${isMobile ? 'w-full' : 'w-full md:w-auto flex-shrink-0'}`}>
            <button
              onClick={() => onRateDrink(signatureDrink)}
              aria-label={`Rate ${signatureDrink.name} without redeeming`}
              title="Rate without redeeming"
              className="p-3 bg-[#3A2922] hover:bg-[#4A362D] text-[#B98252] rounded-2xl shadow-sm transition-all active:scale-95 flex-shrink-0"
            >
              <Star className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRedeemDrink(signatureDrink)}
              className={`${isMobile ? 'flex-1' : 'w-full md:w-auto md:px-6'} py-3 bg-[#B98252] hover:bg-[#A85F45] text-[#FBF8F2] text-xs font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center space-x-2 active:scale-95`}
            >
              <QrCode className="w-4 h-4" />
              <span>Redeem This Drink</span>
            </button>
          </div>
        </section>
      )}

      {/* 3. ARTISANAL MENU DIRECTORY */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-0.5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#6B4A3A] font-bold">
              Beverage Menu
            </span>
            <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#241A16] flex items-center space-x-2">
              <span>Full Drink Menu</span>
              <Coffee className="w-5 h-5 text-[#6B4A3A]" />
            </h2>
          </div>
          <span className="text-xs font-mono text-[#756B63] font-bold bg-[#FBF8F2] px-2.5 py-1 rounded-full border border-[#DDD4C8]">
            {filteredDrinks.length} Options
          </span>
        </div>

        {/* Category Pills Strip */}
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 border cursor-pointer ${
                selectedCategory.toLowerCase() === cat.id.toLowerCase()
                  ? 'bg-gradient-to-r from-[#C58A55] to-[#8C4A32] text-white border-[#C58A55] shadow-xs caramel-glow-sm'
                  : 'bg-[#FAF5EF] text-[#6F4E3D] hover:text-[#1E1411] border-[#DDD4C8] shadow-2xs'
              }`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Drink Items Feed */}
        {isLoadingDrinks ? (
          <div className="space-y-3 py-4 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 bg-[#FAF5EF] rounded-2xl border border-[#DDD4C8]" />
            ))}
          </div>
        ) : filteredDrinks.length === 0 ? (
          <div className="bg-[#FAF5EF] rounded-3xl p-8 text-center space-y-2 border border-[#DDD4C8] shadow-sm my-4">
            <Coffee className="w-8 h-8 text-[#6F4E3D] mx-auto opacity-70" />
            <h4 className="font-editorial text-base font-bold text-[#1E1411]">No Drinks in this Category</h4>
            <p className="text-xs text-[#B9A28F]">Check out our Full Menu to explore all handcrafted options.</p>
            <button
              onClick={() => setSelectedCategory('All')}
              className="mt-2 text-xs font-bold text-[#C58A55] hover:underline cursor-pointer"
            >
              Show Full Menu
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 w-full min-w-0">
            {filteredDrinks.map((drink) => (
              <div
                key={drink.id}
                className="bg-[#FAF5EF] rounded-2xl p-3.5 border border-[#DDD4C8] shadow-2xs hover:shadow-md hover:border-[#C58A55] transition-all flex items-center justify-between gap-3 group"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#251814] flex-shrink-0 relative border border-[#DDD4C8]">
                  <img
                    src={drink.imageUrl || getDrinkDefaultImage(drink.name, drink.category)}
                    alt={drink.name}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getDrinkDefaultImage(drink.name, drink.category);
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {drink.isSignature && (
                    <span className="absolute top-1 left-1 bg-[#537A5A] text-white text-[7px] font-bold uppercase px-1 py-0.2 rounded shadow-2xs">
                      ★
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <h4 className="font-editorial text-sm font-bold text-[#1E1411] truncate group-hover:text-[#6F4E3D] transition-colors leading-tight">
                    {drink.name}
                  </h4>
                  <p className="text-[11px] text-[#756B63] line-clamp-1 font-normal">
                    {drink.description || 'Artisanal roast prepared with precision.'}
                  </p>
                  <div className="flex items-center space-x-2 text-[11px] font-semibold">
                    <span className="text-[#C58A55] font-bold flex items-center space-x-1">
                      <span className="text-[10px] text-[#C58A55] font-mono tracking-tighter">
                        {'●'.repeat(Math.min(drink.creditPrice, 4))}
                      </span>
                      <span>{drink.creditPrice} Credits</span>
                    </span>
                    <span className="text-[#DDD4C8]">•</span>
                    <span className="text-[#B9A28F]">Retail ${drink.retailPrice.toFixed(2)}</span>
                  </div>
                </div>

                {/* Rate & Redeem CTAs */}
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <button
                    onClick={() => onRateDrink(drink)}
                    aria-label={`Rate ${drink.name} without redeeming`}
                    title="Rate without redeeming"
                    className="p-2 bg-white hover:bg-[#FAF5EF] text-[#6F4E3D] rounded-xl transition-all border border-[#DDD4C8] active:scale-95 cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onRedeemDrink(drink)}
                    className="px-3.5 py-2 bg-gradient-to-r from-[#C58A55] to-[#8C4A32] hover:from-[#B37944] hover:to-[#7B3F2A] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-1.5 whitespace-nowrap active:scale-95 cursor-pointer"
                    title={`Redeem ${drink.name}`}
                  >
                    <QrCode className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Redeem</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. OPENING HOURS & ROASTERY PIN INFO */}
      <section className="bg-[#FBF8F2] rounded-3xl p-5 border border-[#DDD4C8] shadow-2xs space-y-3 w-full">
        <div className="flex items-center space-x-2 text-[#241A16]">
          <Clock className="w-4 h-4 text-[#6B4A3A]" />
          <h3 className="font-editorial text-base font-bold">Roastery Hours & Verification</h3>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-xs w-full">
          {Object.entries(displayCafe.openingHours || {}).map(([day, hours]) => (
            <div key={day} className="bg-[#F5F0E8] p-2.5 rounded-xl border border-[#DDD4C8] space-y-0.5">
              <span className="block font-bold text-[#6B4A3A] capitalize text-[10px]">{day}</span>
              <span className="block text-[#756B63] text-[11px] truncate">{hours}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
