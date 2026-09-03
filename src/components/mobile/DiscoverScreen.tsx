import React, { useState } from 'react';
import { store } from '../../services/store';
import { Cafe, Drink } from '../../types';
import { 
  V60PourOverSketch, 
  CoffeeBranchSketch, 
  PortafilterSketch, 
  LatteArtSketch,
  ArtisanalStampBadge 
} from '../common/CoffeeSketches';
import { 
  Search, 
  Star, 
  Sparkles, 
  Navigation, 
  Coffee,
  Compass,
  ArrowRight,
  Flame,
  Award,
  ChevronRight
} from 'lucide-react';

interface DiscoverScreenProps {
  onSelectCafe: (cafe: Cafe) => void;
  onSelectDrink: (drink: Drink, cafe: Cafe) => void;
}

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({ onSelectCafe, onSelectDrink }) => {
  const member = store.getMember();
  const cafes = store.getCafes();
  const drinks = store.getDrinks();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('All');
  const [useDistanceSort, setUseDistanceSort] = useState<boolean>(true);

  const neighborhoods = [
    { id: 'All', label: 'All Dallas', icon: '📍' },
    { id: 'Deep Ellum', label: 'Deep Ellum', icon: '🎨' },
    { id: 'Bishop Arts', label: 'Bishop Arts', icon: '🎭' },
    { id: 'Knox-Henderson', label: 'Knox-Henderson', icon: '☕' },
    { id: 'Uptown', label: 'Uptown', icon: '🌆' },
    { id: 'Oak Lawn', label: 'Oak Lawn', icon: '🌿' },
  ];

  const featuredCafes = cafes.filter((c) => c.isFeatured);
  const signatureDrinks = drinks.filter((d) => d.isSignature && d.isActive);

  let filteredCafes = cafes.filter((cafe) => {
    const matchesSearch =
      cafe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cafe.neighborhood.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cafe.vibeTags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesNeighborhood =
      selectedNeighborhood === 'All' || cafe.neighborhood === selectedNeighborhood;

    return matchesSearch && matchesNeighborhood;
  });

  if (useDistanceSort) {
    filteredCafes = [...filteredCafes].sort((a, b) => a.distanceMiles - b.distanceMiles);
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

  return (
    <div className="space-y-8 pb-20 animate-fade-in text-[#4B2E2B]">
      {/* HERO BANNER - LIGHT CREAM & WARM CARAMEL */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#FFF8F0] via-[#F4EFE6] to-[#E8DED1] p-6 sm:p-8 border border-[#8C5A3C]/20 shadow-lg">
        {/* Background Coffee Branch Line Art */}
        <div className="absolute right-4 top-4 text-[#C08552]/15 pointer-events-none hidden sm:block">
          <CoffeeBranchSketch className="w-64 h-64" />
        </div>
        
        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#C08552]/15 border border-[#C08552]/30 text-[#8C5A3C] text-xs font-black uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-[#C08552] animate-bounce" />
              <span>Dallas's Specialty Pass</span>
            </div>
            
            <ArtisanalStampBadge className="w-10 h-10 text-[#C08552] hidden sm:block" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#4B2E2B] leading-tight">
            Taste Dallas Craft Roasters, <br />
            <span className="text-[#C08552]">
              One Handcrafted Cup at a Time.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-[#6B4E4B] font-medium leading-relaxed max-w-xl">
            Enjoy 30 drink credits every month across Dallas's curated independent cafe network. Discover micro-lots, rate signature roasts, and maintain your personal tasting diary.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-2xl border border-[#8C5A3C]/20 text-xs font-bold text-[#4B2E2B] shadow-sm">
              <V60PourOverSketch className="w-5 h-5 text-[#C08552]" />
              <span>30 Credits / Month</span>
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-2xl border border-[#8C5A3C]/20 text-xs font-bold text-[#4B2E2B] shadow-sm">
              <PortafilterSketch className="w-5 h-5 text-[#C08552]" />
              <span>1 Credit = $1.00 Value</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH & NEIGHBORHOOD FILTERS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-[#C08552]">
              Curated Dallas Network
            </span>
            <h2 className="text-xl font-black text-[#4B2E2B] flex items-center space-x-2">
              <span>Explore Partner Cafes</span>
              <Compass className="w-5 h-5 text-[#C08552]" />
            </h2>
          </div>

          <button
            onClick={() => setUseDistanceSort(!useDistanceSort)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-extrabold transition-all border shadow-sm ${
              useDistanceSort
                ? 'bg-[#C08552] text-[#FFF8F0] border-[#C08552]'
                : 'bg-white text-[#4B2E2B] border-[#8C5A3C]/20'
            }`}
          >
            <Navigation className={`w-4 h-4 ${useDistanceSort ? 'text-[#FFF8F0]' : 'text-[#C08552]'}`} />
            <span>{useDistanceSort ? 'Nearest First (GPS)' : 'Order by Saved Area'}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cafes by name, neighborhood (Deep Ellum, Bishop Arts), or vibe..."
            className="w-full bg-white border border-[#8C5A3C]/25 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-[#4B2E2B] placeholder-[#6B4E4B]/50 focus:outline-none focus:border-[#C08552] shadow-sm"
          />
          <Search className="w-5 h-5 text-[#C08552] absolute left-3.5 top-3.5" />
        </div>

        {/* Neighborhood Filter Pills */}
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {neighborhoods.map((nh) => (
            <button
              key={nh.id}
              onClick={() => setSelectedNeighborhood(nh.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                selectedNeighborhood === nh.id
                  ? 'bg-[#C08552] text-[#FFF8F0] shadow-md'
                  : 'bg-white text-[#6B4E4B] hover:text-[#4B2E2B] border border-[#8C5A3C]/20 shadow-sm'
              }`}
            >
              <span>{nh.icon}</span>
              <span>{nh.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CURATED FEATURED CAFES */}
      {!searchQuery && selectedNeighborhood === 'All' && featuredCafes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <LatteArtSketch className="w-5 h-5 text-[#C08552]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#C08552]">
              Curated Featured Cafes
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredCafes.map((cafe) => (
              <div
                key={cafe.id}
                onClick={() => onSelectCafe(cafe)}
                className="bg-white hover:border-[#C08552] rounded-3xl overflow-hidden shadow-md hover:shadow-xl cursor-pointer group transition-all duration-300 border border-[#8C5A3C]/20 flex flex-col justify-between"
              >
                <div className="h-44 relative">
                  <img
                    src={cafe.photos[0]}
                    alt={cafe.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#4B2E2B]/80 via-transparent to-transparent"></div>
                  
                  <span className="absolute top-3 right-3 bg-[#C08552] text-[#FFF8F0] text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-md">
                    ⭐ Featured
                  </span>

                  <div className="absolute bottom-3 left-4 right-4">
                    <span className="text-[10px] font-bold text-[#FFF8F0] uppercase tracking-widest bg-[#4B2E2B]/90 px-2.5 py-0.5 rounded-full border border-[#C08552]/40">
                      📍 {cafe.neighborhood} • {cafe.distanceMiles} mi
                    </span>
                    <h4 className="text-lg font-black text-[#FFF8F0] mt-1 group-hover:text-[#FFF8F0] transition-colors">
                      {cafe.name}
                    </h4>
                  </div>
                </div>

                <div className="p-4 bg-white text-xs space-y-2">
                  <p className="text-[#6B4E4B] text-[11px] truncate">{cafe.perkLine}</p>
                  <div className="flex justify-between items-center pt-1 font-semibold text-[11px]">
                    <span className="text-[#C08552] font-black">Drinks from {getLowestCreditPrice(cafe.id)} Credits</span>
                    <span className="flex items-center space-x-1 text-[#8C5A3C] group-hover:text-[#C08552] transition-colors font-bold">
                      <span>View Menu</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SIGNATURE DRINKS STRIP */}
      {!searchQuery && selectedNeighborhood === 'All' && signatureDrinks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Coffee className="w-4.5 h-4.5 text-[#C08552]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#4B2E2B]">
              Dallas Signature Drinks & Roasts
            </h3>
          </div>

          <div className="flex space-x-4 overflow-x-auto pb-3 scrollbar-none">
            {signatureDrinks.map((drink) => {
              const cafe = cafes.find((c) => c.id === drink.cafeId);
              if (!cafe) return null;
              return (
                <div
                  key={drink.id}
                  onClick={() => onSelectDrink(drink, cafe)}
                  className="w-56 flex-shrink-0 bg-white hover:border-[#C08552] rounded-3xl p-3.5 space-y-3 cursor-pointer transition-all border border-[#8C5A3C]/20 shadow-md group"
                >
                  <div className="h-32 rounded-2xl overflow-hidden relative">
                    <img
                      src={drink.imageUrl}
                      alt={drink.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 left-2 bg-[#C08552] text-[#FFF8F0] text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow">
                      Signature
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[#4B2E2B] truncate group-hover:text-[#C08552] transition-colors">
                      {drink.name}
                    </h4>
                    <p className="text-[11px] text-[#C08552] font-semibold truncate mt-0.5">
                      📍 {cafe.name}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-1 text-xs border-t border-[#8C5A3C]/15">
                    <span className="text-[#6B4E4B] text-[11px]">Retail: ${drink.retailPrice.toFixed(2)}</span>
                    <span className="font-extrabold text-[#FFF8F0] bg-[#C08552] px-2 py-0.5 rounded-lg">
                      {drink.creditPrice} Credits
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MAIN CAFE GRID */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#4B2E2B]">
            {useDistanceSort ? 'All Dallas Partner Cafes (Nearest First)' : 'Cafes by Saved Area'}
          </h3>
          <span className="text-xs font-mono text-[#6B4E4B]">
            {filteredCafes.length} Partner Cafes
          </span>
        </div>

        {filteredCafes.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center space-y-3 border border-[#8C5A3C]/20 shadow-sm">
            <Coffee className="w-12 h-12 text-[#C08552] mx-auto" />
            <h4 className="text-base font-bold text-[#4B2E2B]">No Cafes Found</h4>
            <p className="text-xs text-[#6B4E4B] max-w-sm mx-auto">
              No cafes matched "{searchQuery}". Try searching another term or clearing filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedNeighborhood('All');
              }}
              className="py-2.5 px-5 bg-[#C08552] text-[#FFF8F0] rounded-2xl text-xs font-extrabold transition-all"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCafes.map((cafe) => {
              const lowestCredits = getLowestCreditPrice(cafe.id);
              return (
                <div
                  key={cafe.id}
                  onClick={() => onSelectCafe(cafe)}
                  className="bg-white hover:border-[#C08552] rounded-3xl overflow-hidden shadow-md hover:shadow-xl cursor-pointer group transition-all duration-300 border border-[#8C5A3C]/20 flex flex-col justify-between"
                >
                  <div>
                    <div className="h-48 relative">
                      <img
                        src={cafe.photos[0]}
                        alt={cafe.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#4B2E2B]/80 via-transparent to-transparent"></div>

                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-[#8C5A3C]/20 flex items-center space-x-1 shadow-sm">
                        <Star className="w-3.5 h-3.5 text-[#C08552] fill-[#C08552]" />
                        <span className="text-xs font-black text-[#4B2E2B]">
                          {cafe.ratingCount > 0 ? cafe.rating.toFixed(1) : 'New'}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3">
                        <span className="text-[10px] font-bold text-[#FFF8F0] uppercase tracking-widest bg-[#4B2E2B]/90 px-2.5 py-0.5 rounded-full border border-[#C08552]/40">
                          📍 {cafe.neighborhood} • {cafe.distanceMiles} mi
                        </span>
                        <h4 className="text-lg font-black text-[#FFF8F0] mt-1 group-hover:text-[#FFF8F0] transition-colors">
                          {cafe.name}
                        </h4>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {cafe.vibeTags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-[#FFF8F0] text-[#4B2E2B] border border-[#8C5A3C]/20 px-2.5 py-0.5 rounded-lg font-semibold"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0 flex items-center justify-between border-t border-[#8C5A3C]/15 text-xs">
                    <span className="text-[#C08552] font-black text-xs">
                      Drinks from {lowestCredits} credits
                    </span>
                    <span className="text-[#8C5A3C] font-bold flex items-center space-x-1 group-hover:text-[#C08552] transition-colors">
                      <span>View Menu</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
