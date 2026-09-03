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
  MapPin, 
  Star, 
  Sparkles, 
  Navigation, 
  Coffee,
  Compass,
  ArrowRight,
  Flame,
  Award,
  ChevronRight,
  Heart
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
    <div className="space-y-8 pb-20 animate-fade-in">
      {/* ARTISANAL COFFEE HERO BANNER WITH SKETCH ART */}
      <div className="relative rounded-3xl overflow-hidden glass-panel-terracotta p-6 sm:p-8 border border-amber-600/30 shadow-2xl">
        {/* Background Coffee Branch Sketch Art */}
        <div className="absolute right-4 top-4 text-amber-200/10 pointer-events-none hidden sm:block">
          <CoffeeBranchSketch className="w-64 h-64" />
        </div>
        
        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span>Dallas's Premier Specialty Pass</span>
            </div>
            
            {/* Artisanal Stamp Seal */}
            <ArtisanalStampBadge className="w-10 h-10 text-amber-400/80 animate-spin-slow hidden sm:block" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            Taste Dallas Craft Roasters, <br />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-300 bg-clip-text text-transparent">
              One Handcrafted Cup at a Time.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-amber-100/90 font-medium leading-relaxed max-w-xl">
            Enjoy 30 drink credits every month across Dallas's curated independent cafe network. Discover micro-lots, rate signature roasts, and maintain your personal tasting diary.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center space-x-2 bg-[#1A120F]/90 px-4 py-2 rounded-2xl border border-amber-900/40 text-xs font-bold text-amber-200">
              <V60PourOverSketch className="w-5 h-5 text-amber-400" />
              <span>30 Credits / Month</span>
            </div>
            <div className="flex items-center space-x-2 bg-[#1A120F]/90 px-4 py-2 rounded-2xl border border-amber-900/40 text-xs font-bold text-amber-200">
              <PortafilterSketch className="w-5 h-5 text-amber-400" />
              <span>1 Credit = $1.00 Value</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH & NEIGHBORHOOD FILTERS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
              Curated Dallas Network
            </span>
            <h2 className="text-xl font-black text-white flex items-center space-x-2">
              <span>Explore Partner Cafes</span>
              <Compass className="w-5 h-5 text-amber-400" />
            </h2>
          </div>

          <button
            onClick={() => setUseDistanceSort(!useDistanceSort)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-extrabold transition-all border shadow-lg ${
              useDistanceSort
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-amber-500/10'
                : 'bg-[#1A120F] text-slate-400 border-amber-900/40'
            }`}
          >
            <Navigation className={`w-4 h-4 ${useDistanceSort ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>{useDistanceSort ? 'Nearest First (GPS)' : 'Order by Saved Area'}</span>
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cafes by name, neighborhood (Deep Ellum, Bishop Arts), or vibe (Remote Work)..."
            className="w-full bg-[#1A120F]/90 border border-amber-900/40 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-slate-100 placeholder-amber-200/40 focus:outline-none focus:border-amber-500/60 shadow-inner"
          />
          <Search className="w-5 h-5 text-amber-400/60 absolute left-3.5 top-3.5" />
        </div>

        {/* Neighborhood Filter Pills */}
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {neighborhoods.map((nh) => (
            <button
              key={nh.id}
              onClick={() => setSelectedNeighborhood(nh.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                selectedNeighborhood === nh.id
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-100 shadow-lg shadow-amber-900/40'
                  : 'bg-[#1A120F] text-amber-200/60 hover:text-amber-100 border border-amber-900/40'
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
            <LatteArtSketch className="w-5 h-5 text-amber-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
              Curated Featured Cafes
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredCafes.map((cafe) => (
              <div
                key={cafe.id}
                onClick={() => onSelectCafe(cafe)}
                className="glass-panel glass-panel-hover rounded-3xl overflow-hidden shadow-xl cursor-pointer group transition-all duration-300 border border-amber-900/30"
              >
                <div className="h-44 relative">
                  <img
                    src={cafe.photos[0]}
                    alt={cafe.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A120F] via-[#1A120F]/20 to-transparent"></div>
                  
                  <span className="absolute top-3 right-3 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-lg">
                    ⭐ Featured
                  </span>

                  <div className="absolute bottom-3 left-4 right-4">
                    <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest bg-[#1A120F]/90 px-2.5 py-0.5 rounded-full border border-amber-900/40">
                      📍 {cafe.neighborhood} • {cafe.distanceMiles} mi
                    </span>
                    <h4 className="text-lg font-black text-white mt-1 group-hover:text-amber-300 transition-colors">
                      {cafe.name}
                    </h4>
                  </div>
                </div>

                <div className="p-4 bg-[#1A120F]/90 text-xs space-y-2">
                  <p className="text-amber-200/70 text-[11px] truncate">{cafe.perkLine}</p>
                  <div className="flex justify-between items-center pt-1 text-slate-300 font-semibold text-[11px]">
                    <span className="text-amber-400 font-black">Drinks from {getLowestCreditPrice(cafe.id)} Credits</span>
                    <span className="flex items-center space-x-1 text-slate-400 group-hover:text-amber-400 transition-colors font-bold">
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

      {/* SIGNATURE DRINKS STRIP WITH ART WORK */}
      {!searchQuery && selectedNeighborhood === 'All' && signatureDrinks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Coffee className="w-4.5 h-4.5 text-amber-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
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
                  className="w-56 flex-shrink-0 glass-panel glass-panel-hover rounded-3xl p-3.5 space-y-3 cursor-pointer transition-all border border-amber-900/30 group"
                >
                  <div className="h-32 rounded-2xl overflow-hidden relative">
                    <img
                      src={drink.imageUrl}
                      alt={drink.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 left-2 bg-[#1A120F]/90 backdrop-blur-md border border-amber-500/40 text-amber-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                      Signature
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                      {drink.name}
                    </h4>
                    <p className="text-[11px] text-amber-400 font-semibold truncate mt-0.5">
                      📍 {cafe.name}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-1 text-xs border-t border-amber-900/30">
                    <span className="text-amber-200/60 text-[11px]">Retail: ${drink.retailPrice.toFixed(2)}</span>
                    <span className="font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
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
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
            {useDistanceSort ? 'All Dallas Partner Cafes (Nearest First)' : 'Cafes by Saved Area'}
          </h3>
          <span className="text-xs font-mono text-slate-500">
            {filteredCafes.length} Partner Cafes
          </span>
        </div>

        {filteredCafes.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center space-y-3 border border-amber-900/30">
            <Coffee className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-200">No Cafes Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No cafes matched "{searchQuery}". Try searching another term or clearing filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedNeighborhood('All');
              }}
              className="py-2.5 px-5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-2xl text-xs font-extrabold hover:bg-amber-500/25 transition-all"
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
                  className="glass-panel glass-panel-hover rounded-3xl overflow-hidden shadow-xl cursor-pointer group transition-all duration-300 border border-amber-900/30 flex flex-col justify-between"
                >
                  <div>
                    <div className="h-48 relative">
                      <img
                        src={cafe.photos[0]}
                        alt={cafe.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1A120F] via-[#1A120F]/20 to-transparent"></div>

                      <div className="absolute top-3 right-3 bg-[#1A120F]/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-amber-900/40 flex items-center space-x-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-black text-white">
                          {cafe.ratingCount > 0 ? cafe.rating.toFixed(1) : 'New'}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3">
                        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest bg-[#1A120F]/90 px-2.5 py-0.5 rounded-full border border-amber-900/40">
                          📍 {cafe.neighborhood} • {cafe.distanceMiles} mi
                        </span>
                        <h4 className="text-lg font-black text-white mt-1 group-hover:text-amber-300 transition-colors">
                          {cafe.name}
                        </h4>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {cafe.vibeTags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-[#1A120F] text-amber-200/70 border border-amber-900/40 px-2.5 py-0.5 rounded-lg font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0 flex items-center justify-between border-t border-amber-900/20 text-xs">
                    <span className="text-amber-400 font-black text-xs">
                      Drinks from {lowestCredits} credits
                    </span>
                    <span className="text-amber-200/60 font-bold flex items-center space-x-1 group-hover:text-amber-300 transition-colors">
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
