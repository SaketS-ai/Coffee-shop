import React, { useEffect, useMemo, useState } from 'react';
import { store } from '../../services/store';
import { api, DEFAULT_CAFE_IMAGE, DEFAULT_DRINK_IMAGE, getDrinkDefaultImage } from '../../services/api';
import { Cafe, Drink } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useUserLocation } from '../../hooks/useUserLocation';
import { haversineMiles } from '../../utils/geo';
import {
  Search,
  Star,
  Navigation,
  Coffee,
  Compass,
  ArrowRight,
  Sparkles,
  MapPin,
  ChevronRight,
  Flame,
  Award,
  SlidersHorizontal,
  X
} from 'lucide-react';

interface DiscoverScreenProps {
  onSelectCafe: (cafe: Cafe) => void;
  onSelectDrink: (drink: Drink, cafe: Cafe) => void;
  isMobile?: boolean;
}

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({
  onSelectCafe,
  onSelectDrink,
  isMobile = false,
}) => {
  const member = store.getMember();
  const { user: liveUser } = useAuth();
  const { status: locationStatus, coords: userCoords } = useUserLocation();

  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('All');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [selectedVibe, setSelectedVibe] = useState<string>('All');
  const [useDistanceSort, setUseDistanceSort] = useState<boolean>(true);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load cafes
  useEffect(() => {
    let cancelled = false;

    async function loadCafes() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const { cafes: results } = await api.getCafes({
          search: debouncedSearch || undefined,
          city: selectedNeighborhood !== 'All' ? selectedNeighborhood : undefined,
        });
        if (cancelled) return;
        setCafes(results);

        if (!debouncedSearch && selectedNeighborhood === 'All') {
          const cities = Array.from(new Set(results.map((c) => c.neighborhood))).sort();
          setAvailableCities(cities);
        }
      } catch (err: any) {
        if (!cancelled) {
          const fallback = store.getCafes();
          if (fallback && fallback.length > 0) {
            setCafes(fallback);
          } else {
            setLoadError(err.message || 'Could not reach the Social Cup backend.');
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadCafes();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, selectedNeighborhood]);

  // Load featured drinks
  useEffect(() => {
    if (cafes.length === 0) return;
    let cancelled = false;

    async function loadFeaturedDrinks() {
      try {
        const topCafes = cafes.slice(0, 5);
        const drinkPromises = topCafes.map((c) => api.getDrinksByCafe(c.id).catch(() => []));
        const allFetched = await Promise.all(drinkPromises);
        if (cancelled) return;
        const flatDrinks = allFetched.flat();
        if (flatDrinks.length > 0) {
          setDrinks(flatDrinks);
        } else {
          setDrinks(store.getDrinks());
        }
      } catch {
        if (!cancelled) setDrinks(store.getDrinks());
      }
    }

    loadFeaturedDrinks();
    return () => {
      cancelled = true;
    };
  }, [cafes]);

  const neighborhoods = [
    { id: 'All', label: 'All Dallas' },
    ...availableCities.map((city) => ({ id: city, label: city })),
  ];

  const vibePills = [
    { id: 'All', label: 'All Vibes', icon: '✨' },
    { id: 'Artisanal Roasts', label: 'Artisanal Roasts', icon: '🔥' },
    { id: 'Work Friendly', label: 'Work Friendly', icon: '💻' },
    { id: 'Pour Over', label: 'Pour-Over Specialists', icon: '☕' },
    { id: 'Cold Brew', label: 'Cold Brew & Nitro', icon: '🧊' },
    { id: 'Patio', label: 'Sunlit Patio', icon: '🌿' },
  ];

  // Real distance only exists once the browser grants location and a cafe
  // has coordinates on file (0,0 is the adapter's "not set" sentinel, same
  // convention used server-side) - otherwise distanceMiles stays 0 rather
  // than showing a fabricated number.
  const cafesWithDistance = useMemo(() => {
    if (!userCoords) return cafes;
    return cafes.map((c) => {
      if (c.coordinates.lat === 0 && c.coordinates.lng === 0) return c;
      return {
        ...c,
        distanceMiles: haversineMiles(userCoords.lat, userCoords.lng, c.coordinates.lat, c.coordinates.lng),
      };
    });
  }, [cafes, userCoords]);

  const featuredCafes = cafesWithDistance.filter((c) => c.isFeatured);
  const signatureDrinks = drinks.filter((d) => d.isActive && d.isSignature).slice(0, 8);
  const nearYouCafes = userCoords
    ? [...cafesWithDistance]
        .filter((c) => c.coordinates.lat !== 0 || c.coordinates.lng !== 0)
        .sort((a, b) => a.distanceMiles - b.distanceMiles)
        .slice(0, 6)
    : [];

  let filteredCafes = cafesWithDistance;
  if (selectedVibe !== 'All') {
    filteredCafes = filteredCafes.filter((c) =>
      c.vibeTags.some((tag) => tag.toLowerCase().includes(selectedVibe.toLowerCase()))
    );
  }

  if (useDistanceSort && userCoords) {
    // Cafes with no coordinates on file sort last, not first - a 0 there
    // means "unknown", not "closest".
    filteredCafes = [...filteredCafes].sort((a, b) => {
      const aKnown = a.coordinates.lat !== 0 || a.coordinates.lng !== 0;
      const bKnown = b.coordinates.lat !== 0 || b.coordinates.lng !== 0;
      if (aKnown !== bKnown) return aKnown ? -1 : 1;
      return a.distanceMiles - b.distanceMiles;
    });
  } else {
    filteredCafes = [...filteredCafes].sort((a, b) => {
      if (a.neighborhood === member.homeNeighborhood) return -1;
      if (b.neighborhood === member.homeNeighborhood) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  const getLowestCreditPrice = (cafeId: string): number => {
    const cafeDrinks = drinks.filter((d) => d.cafeId === cafeId && d.isActive);
    if (cafeDrinks.length === 0) return 4;
    return Math.min(...cafeDrinks.map((d) => d.creditPrice));
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-20 animate-pulse">
        <div className="h-44 bg-[#3A2922]/20 rounded-3xl border border-[#DDD4C8]" />
        <div className="h-28 bg-[#FBF8F2] rounded-2xl border border-[#DDD4C8]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 bg-[#FBF8F2] rounded-3xl border border-[#DDD4C8]" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-[#FBF8F2] rounded-3xl p-10 text-center space-y-4 border border-[#DDD4C8] shadow-sm animate-fade-in my-8">
        <div className="w-14 h-14 rounded-2xl bg-[#F5F0E8] flex items-center justify-center mx-auto text-[#6B4A3A]">
          <Coffee className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h4 className="font-editorial text-xl font-bold text-[#241A16]">Unable to Connect to Network</h4>
          <p className="text-xs text-[#756B63] max-w-sm mx-auto">{loadError}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-[#241A16] hover:bg-[#3A2922] text-[#FBF8F2] text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-fade-in text-[#241A16] w-full min-w-0">
      {/* ========================================================================= */}
      {/* 1. DARK ESPRESSO HERO SECTION (Visual Rhythm: Cream page -> Dark Hero)   */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E1411] via-[#251814] to-[#2B1B16] border border-[#C58A55]/30 p-6 sm:p-8 shadow-xl text-[#F3E7D5] w-full">
        {/* Subtle decorative watermarks */}
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 pointer-events-none opacity-10">
          <div className="w-64 h-64 rounded-full border-[18px] border-[#C58A55]" />
        </div>
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#C58A55]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 w-full">
          <div className="space-y-3.5 max-w-2xl">
            {/* Top Micro-badge & Personalized Greeting */}
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#3A2720] border border-[#C58A55]/35 shadow-xs">
                <span className="flex h-2 w-2 rounded-full bg-[#C58A55] animate-pulse" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#D6A36F]">
                  Dallas Specialty Roasters Guild
                </span>
              </div>

              {liveUser && (
                <span className="text-[11px] font-medium text-[#E8D8C4] truncate">
                  Welcome, <strong className="text-white font-bold">{liveUser.name.split(' ')[0]}</strong>
                </span>
              )}
            </div>

            {/* Editorial Display Heading */}
            <div className="space-y-1.5">
              <h1 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Find your next <br />
                <span className="font-editorial-italic text-[#D6A36F] font-medium">favorite cup.</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#E8D8C4]/85 font-light leading-relaxed max-w-xl">
                30 craft drinks every billing cycle. Curated independent Dallas roasters. Discover single origins, rate seasonal cupping notes, and maintain your personal coffee diary.
              </p>
            </div>
          </div>

          {/* Credits & Membership Status Strip */}
          <div className="flex flex-row lg:flex-col items-start gap-3 flex-shrink-0">
            <div className="flex items-center space-x-2 bg-[#3A2720] px-4 py-2.5 rounded-2xl border border-[#C58A55]/40 shadow-sm caramel-glow-sm">
              <Sparkles className="w-4 h-4 text-[#D6A36F] fill-[#D6A36F]" />
              <span className="text-xs sm:text-sm font-bold text-white">
                {member.accountState === 'member' ? `${member.credits} Credits Active` : '30 Drink Credits / Mo'}
              </span>
            </div>

            <div className="flex items-center space-x-2 bg-[#3A2720]/70 px-3.5 py-2 rounded-2xl border border-white/10 text-xs text-[#E8D8C4] font-medium">
              <Award className="w-4 h-4 text-[#74A87C]" />
              <span>Verified Independent Partners</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. CREAM CAFE DISCOVERY (Visual Rhythm: Vibe Filters & Proximity Spots)    */}
      {/* ========================================================================= */}
      <section className="space-y-3 w-full">
        <div className="flex items-center justify-between px-0.5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#6B4A3A] font-bold">
              Personalized Discovery
            </span>
            <h2 className="font-editorial text-lg sm:text-xl font-bold text-[#241A16]">
              Made for Your Taste
            </h2>
          </div>
          {selectedVibe !== 'All' && (
            <button
              onClick={() => setSelectedVibe('All')}
              className="text-[11px] text-[#6B4A3A] font-bold flex items-center space-x-1 hover:underline cursor-pointer"
            >
              <span>Clear Vibe</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Horizontal Vibe Pills Strip */}
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none w-full min-w-0">
          {vibePills.map((vibe) => (
            <button
              key={vibe.id}
              onClick={() => setSelectedVibe(vibe.id === selectedVibe ? 'All' : vibe.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 flex-shrink-0 border cursor-pointer ${
                selectedVibe === vibe.id
                  ? 'bg-gradient-to-r from-[#C58A55] to-[#8C4A32] text-white border-[#C58A55] shadow-sm caramel-glow-sm'
                  : 'bg-[#FAF5EF] text-[#6F4E3D] hover:text-[#1E1411] border-[#DDD4C8]'
              }`}
            >
              <span>{vibe.icon}</span>
              <span>{vibe.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 2b. "NEAR YOU" PROXIMITY TRACK */}
      {!searchQuery && selectedNeighborhood === 'All' && nearYouCafes.length > 0 && (
        <section className="space-y-3 w-full">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#6B4A3A] font-bold">
                Neighborhood Proximity
              </span>
              <h2 className="font-editorial text-lg sm:text-xl font-bold text-[#241A16]">
                Near You in Dallas
              </h2>
            </div>
            <span className="text-xs font-medium text-[#756B63]">
              Closest Spots
            </span>
          </div>

          <div className="flex space-x-3.5 overflow-x-auto pb-2 scrollbar-none snap-x w-full min-w-0">
            {nearYouCafes.map((cafe) => (
              <div
                key={cafe.id}
                onClick={() => onSelectCafe(cafe)}
                className="w-60 flex-shrink-0 snap-start bg-[#FBF8F2] rounded-2xl p-3 border border-[#DDD4C8] shadow-2xs hover:shadow-md hover:border-[#B98252] transition-all cursor-pointer group"
              >
                <div className="h-28 rounded-xl overflow-hidden relative bg-[#F5F0E8]">
                  <img
                    src={cafe.photos[0] || DEFAULT_CAFE_IMAGE}
                    alt={cafe.name}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = DEFAULT_CAFE_IMAGE;
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute bottom-2 left-2 bg-[#241A16]/85 backdrop-blur-xs text-[#FBF8F2] text-[9px] font-bold px-2 py-0.5 rounded-md border border-[#DDD4C8]/30">
                    📍 {cafe.distanceMiles.toFixed(1)} mi
                  </span>
                </div>
                <div className="pt-2.5 space-y-1">
                  <h4 className="font-editorial text-sm font-bold text-[#241A16] truncate group-hover:text-[#6B4A3A] transition-colors">
                    {cafe.name}
                  </h4>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#756B63]">{cafe.neighborhood}</span>
                    <span className="font-bold text-[#6B4A3A]">
                      From {getLowestCreditPrice(cafe.id)} Cr
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 3. DARK FEATURED ROASTERS SPOTLIGHT (Visual Rhythm: Dark Featured Section)*/}
      {/* ========================================================================= */}
      {!searchQuery && selectedNeighborhood === 'All' && featuredCafes.length > 0 && (
        <section className="bg-[#241A16] rounded-3xl p-5 sm:p-7 text-[#FBF8F2] border border-[#3A2922] shadow-xl space-y-4 w-full min-w-0 overflow-hidden">
          <div className="flex items-end justify-between px-0.5">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#B98252] font-bold">
                Curator Spotlight
              </span>
              <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#FBF8F2] flex items-center space-x-2">
                <span>Featured Dallas Roasters</span>
                <Flame className="w-5 h-5 text-[#B98252]" />
              </h2>
            </div>
            <span className="text-xs font-semibold text-[#B98252]">
              {featuredCafes.length} Handpicked
            </span>
          </div>

          {/* Horizontal snap track inside dark section */}
          <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory w-full min-w-0">
            {featuredCafes.map((cafe) => (
              <div
                key={cafe.id}
                onClick={() => onSelectCafe(cafe)}
                className="w-[280px] sm:w-[300px] flex-shrink-0 snap-start bg-[#3A2922] rounded-3xl overflow-hidden border border-[#6B4A3A]/50 shadow-md hover:border-[#B98252] transition-all duration-300 cursor-pointer group flex flex-col justify-between"
              >
                {/* Image Container with Layered Overlay */}
                <div className="h-44 sm:h-48 relative overflow-hidden bg-[#241A16]">
                  <img
                    src={cafe.photos[0] || DEFAULT_CAFE_IMAGE}
                    alt={cafe.name}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = DEFAULT_CAFE_IMAGE;
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#241A16] via-[#241A16]/30 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="inline-flex items-center space-x-1 bg-[#B98252] text-[#FBF8F2] text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                      <Sparkles className="w-2.5 h-2.5 fill-current" />
                      <span>Featured</span>
                    </span>

                    <div className="bg-[#241A16]/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15 flex items-center space-x-1 shadow-sm">
                      {cafe.rating > 0 ? (
                        <>
                          <Star className="w-3 h-3 text-[#B98252] fill-[#B98252]" />
                          <span className="text-[11px] font-bold text-[#FBF8F2]">{cafe.rating.toFixed(1)}</span>
                        </>
                      ) : (
                        <span className="text-[11px] font-bold text-[#DDD4C8]">New</span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Text in Image */}
                  <div className="absolute bottom-3 left-3.5 right-3.5 space-y-1">
                    <div className="inline-flex items-center space-x-1 bg-[#241A16]/90 text-[#FBF8F2] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#B98252]/40">
                      <MapPin className="w-3 h-3 text-[#B98252]" />
                      <span>{cafe.neighborhood}{cafe.distanceMiles > 0 ? ` • ${cafe.distanceMiles.toFixed(1)} mi` : ''}</span>
                    </div>
                    <h3 className="font-editorial text-lg font-bold text-[#FBF8F2] truncate leading-tight">
                      {cafe.name}
                    </h3>
                  </div>
                </div>

                {/* Card Body & Action */}
                <div className="p-4 bg-[#3A2922] space-y-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-[#DDD4C8] font-normal line-clamp-1">
                    {cafe.perkLine || 'Single origin roasts, pour-overs & seasonal lattes.'}
                  </p>

                  <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#B98252]">
                      From {getLowestCreditPrice(cafe.id)} Credits
                    </span>
                    <span className="inline-flex items-center space-x-1 text-xs font-bold text-[#FBF8F2] group-hover:text-[#B98252] group-hover:translate-x-0.5 transition-all">
                      <span>Explore</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. CREAM DRINKS SHOWCASE (Visual Rhythm: Cream drinks)                     */}
      {/* ========================================================================= */}
      {signatureDrinks.length > 0 && (
        <section className="space-y-3.5 w-full">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#6B4A3A] font-bold">
                Artisanal Dallas Creations
              </span>
              <h2 className="font-editorial text-lg sm:text-xl font-bold text-[#241A16] flex items-center space-x-2">
                <span>Signature Drinks & Micro-Lots</span>
                <Award className="w-4 h-4 text-[#66705A]" />
              </h2>
            </div>
            <span className="text-xs font-semibold text-[#6B4A3A]">
              Tap to Redeem
            </span>
          </div>

          <div className="flex space-x-3.5 overflow-x-auto pb-3 scrollbar-none snap-x w-full min-w-0">
            {signatureDrinks.map((drink) => {
              const cafe = cafes.find((c) => c.id === drink.cafeId);
              if (!cafe) return null;
              return (
                <div
                  key={drink.id}
                  onClick={() => onSelectDrink(drink, cafe)}
                  className="w-48 sm:w-52 flex-shrink-0 snap-start bg-[#FBF8F2] rounded-3xl p-3 border border-[#DDD4C8] shadow-2xs hover:shadow-lg hover:border-[#B98252] transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="h-32 rounded-2xl overflow-hidden relative bg-[#F5F0E8]">
                      <img
                        src={drink.imageUrl || getDrinkDefaultImage(drink.name, drink.category)}
                        alt={drink.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getDrinkDefaultImage(drink.name, drink.category);
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-2 left-2 bg-[#66705A] text-[#FBF8F2] text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shadow-xs">
                        Signature
                      </span>
                    </div>

                    <div>
                      <h4 className="font-editorial text-sm font-bold text-[#241A16] truncate group-hover:text-[#6B4A3A] transition-colors leading-tight">
                        {drink.name}
                      </h4>
                      <p className="text-[11px] text-[#6B4A3A] font-medium truncate mt-0.5">
                        📍 {cafe.name}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 mt-2 border-t border-[#DDD4C8] flex justify-between items-center text-xs">
                    <span className="text-[#756B63] text-[11px]">
                      Retail: ${drink.retailPrice.toFixed(2)}
                    </span>
                    <span className="font-bold text-[#FBF8F2] bg-[#241A16] px-2.5 py-1 rounded-xl text-[11px] shadow-2xs">
                      {drink.creditPrice} Credits
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 5. SEARCH & PARTNER DIRECTORY (Warm Cream Page Directory)                  */}
      {/* ========================================================================= */}
      <section className="space-y-4 pt-2 w-full min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 px-0.5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#6B4A3A] font-bold">
              Directory
            </span>
            <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#241A16] flex items-center space-x-2">
              <span>All Dallas Partner Roasters</span>
              <Compass className="w-5 h-5 text-[#6B4A3A]" />
            </h2>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs font-mono text-[#756B63] bg-[#FBF8F2] px-2.5 py-1 rounded-full border border-[#DDD4C8] font-bold">
              {filteredCafes.length} Roasters
            </span>

            <button
              onClick={() => setUseDistanceSort(!useDistanceSort)}
              disabled={!userCoords}
              title={
                !userCoords
                  ? locationStatus === 'denied'
                    ? 'Location access was denied - enable it in your browser to sort by distance.'
                    : 'Waiting for location access to sort by distance.'
                  : undefined
              }
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                useDistanceSort && userCoords
                  ? 'bg-[#241A16] text-[#FBF8F2] border-[#241A16]'
                  : 'bg-[#FBF8F2] text-[#241A16] border-[#DDD4C8]'
              }`}
            >
              <Navigation className={`w-3.5 h-3.5 ${useDistanceSort && userCoords ? 'text-[#FBF8F2]' : 'text-[#6B4A3A]'}`} />
              <span>{useDistanceSort && userCoords ? 'Nearest First' : 'Area Grouped'}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roasters by name, neighborhood, or specialty..."
            className="w-full bg-[#FAF5EF] border border-[#C58A55]/30 rounded-2xl py-3 pl-10 pr-4 text-xs sm:text-sm text-[#1E1411] placeholder-[#B9A28F] focus:outline-none focus:border-[#C58A55] focus:ring-1 focus:ring-[#C58A55]/30 shadow-xs transition-colors"
          />
          <Search className="w-4 h-4 text-[#C58A55] absolute left-3.5 top-3.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3.5 text-[#B9A28F] hover:text-[#1E1411] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Neighborhood Filter Pills */}
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none w-full min-w-0">
          {neighborhoods.map((nh) => (
            <button
              key={nh.id}
              onClick={() => setSelectedNeighborhood(nh.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 flex-shrink-0 border cursor-pointer ${
                selectedNeighborhood === nh.id
                  ? 'bg-gradient-to-r from-[#C58A55] to-[#8C4A32] text-white border-[#C58A55] shadow-xs caramel-glow-sm'
                  : 'bg-[#FAF5EF] text-[#6F4E3D] hover:text-[#1E1411] border-[#DDD4C8] shadow-2xs'
              }`}
            >
              <span>📍</span>
              <span>{nh.label}</span>
            </button>
          ))}
        </div>

        {/* Filtered Cafe Cards Feed: Responsive Grid (1 col mobile, 2 col tablet, 3-4 col desktop) */}
        {filteredCafes.length === 0 ? (
          <div className="bg-[#FAF5EF] rounded-3xl p-10 text-center space-y-3 border border-[#DDD4C8] shadow-sm my-6 w-full">
            <Coffee className="w-10 h-10 text-[#6F4E3D] mx-auto opacity-70" />
            <h4 className="font-editorial text-base font-bold text-[#1E1411]">No Cafes Found</h4>
            <p className="text-xs text-[#B9A28F] max-w-sm mx-auto">
              {searchQuery
                ? `No partner roasters matched "${searchQuery}". Try searching another area or coffee style.`
                : 'No roasters matched this filter. Clear filters to see the full Dallas directory.'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedNeighborhood('All');
                setSelectedVibe('All');
              }}
              className="py-2.5 px-5 bg-[#251814] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5 w-full min-w-0">
            {filteredCafes.map((cafe) => {
              const lowestCredits = getLowestCreditPrice(cafe.id);
              return (
                <div
                  key={cafe.id}
                  onClick={() => onSelectCafe(cafe)}
                  className="editorial-card rounded-3xl overflow-hidden cursor-pointer group flex flex-col justify-between transition-all w-full min-w-0 shadow-sm hover:shadow-xl"
                >
                  <div className="w-full">
                    {/* Cover Image with Vignette & Badges */}
                    <div className="h-48 sm:h-52 relative overflow-hidden bg-[#251814] w-full">
                      <img
                        src={cafe.photos[0] || DEFAULT_CAFE_IMAGE}
                        alt={cafe.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_CAFE_IMAGE;
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1E1411]/90 via-[#1E1411]/25 to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                        {cafe.isFeatured ? (
                          <span className="bg-gradient-to-r from-[#C58A55] to-[#8C4A32] text-white text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full shadow-sm">
                            ⭐ Featured
                          </span>
                        ) : (
                          <span />
                        )}

                        <div className="bg-[#251814]/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-[#C58A55]/30 flex items-center space-x-1 shadow-sm">
                          {cafe.rating > 0 ? (
                            <>
                              <Star className="w-3 h-3 text-[#D6A36F] fill-[#D6A36F]" />
                              <span className="text-[11px] font-bold text-white">{cafe.rating.toFixed(1)}</span>
                            </>
                          ) : (
                            <span className="text-[11px] font-bold text-[#E8D8C4]">New</span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Overlay Info */}
                      <div className="absolute bottom-2.5 left-3.5 right-3.5 space-y-0.5">
                        <div className="inline-flex items-center space-x-1 text-[#D6A36F] text-[10px] font-bold">
                          <span>📍</span>
                          <span>{cafe.neighborhood}{cafe.distanceMiles > 0 ? ` • ${cafe.distanceMiles.toFixed(1)} mi` : ''}</span>
                        </div>
                        <h3 className="font-editorial text-lg font-bold text-white truncate drop-shadow-sm leading-snug">
                          {cafe.name}
                        </h3>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 space-y-2.5 bg-[#FAF5EF]">
                      <p className="text-xs text-[#6F4E3D] font-normal line-clamp-1">
                        {cafe.perkLine || 'Handcrafted coffee & specialty drinks in Dallas'}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {cafe.vibeTags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] bg-white text-[#6F4E3D] border border-[#DDD4C8] px-2 py-0.5 rounded-md font-bold"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="p-4 pt-2.5 bg-[#FAF5EF] border-t border-[#DDD4C8] flex items-center justify-between text-xs w-full">
                    <span className="text-[#C58A55] font-bold flex items-center space-x-1.5">
                      <span className="text-[10px] text-[#C58A55] tracking-tighter font-mono">
                        {'●'.repeat(Math.min(lowestCredits, 4))}
                      </span>
                      <span>From {lowestCredits} Credits</span>
                    </span>
                    <span className="bg-[#251814] text-white group-hover:bg-[#C58A55] font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all flex items-center space-x-1 shadow-xs">
                      <span>View Menu</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 6. ESPRESSO MEMBERSHIP SECTION (Visual Rhythm: Bottom Dark Section)       */}
      {/* ========================================================================= */}
      <section className="bg-[#241A16] text-[#FBF8F2] rounded-3xl p-6 sm:p-8 border border-[#3A2922] shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6 w-full">
        <div className="space-y-2 relative z-10 max-w-xl">
          <div className="inline-flex items-center space-x-1.5 text-[10px] font-mono text-[#B98252] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 fill-[#B98252]" />
            <span>Founding Dallas Pass</span>
          </div>
          <h3 className="font-editorial text-xl sm:text-2xl font-bold text-[#FBF8F2] leading-tight">
            One membership. 30 craft drinks.
          </h3>
          <p className="text-xs sm:text-sm text-[#DDD4C8] leading-relaxed">
            Unlock Dallas's best artisanal cafes for just $24.99/mo. Cancel anytime.
          </p>
        </div>

        <div className="relative z-10 w-full md:w-auto flex-shrink-0">
          <button
            onClick={() => cafes.length > 0 && onSelectCafe(cafes[0])}
            className="w-full md:w-auto md:px-8 py-3.5 bg-[#B98252] hover:bg-[#A85F45] text-[#FBF8F2] font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer whitespace-nowrap"
          >
            <span>Explore Partner Cafes</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
