import React, { useState } from 'react';
import { store } from '../../services/store';
import { Cafe, Drink } from '../../types';
import { 
  Search, 
  MapPin, 
  Star, 
  Sparkles, 
  Navigation, 
  SlidersHorizontal, 
  Coffee,
  Check,
  Compass
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
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const neighborhoods = ['All', 'Deep Ellum', 'Bishop Arts', 'Knox-Henderson', 'Uptown', 'Oak Lawn'];

  // Curated Featured Cafes (Module 3.1 & Module 6.1)
  const featuredCafes = cafes.filter((c) => c.isFeatured);

  // Signature Drinks Strip
  const signatureDrinks = drinks.filter((d) => d.isSignature && d.isActive);

  // Filter & Order Cafes
  let filteredCafes = cafes.filter((cafe) => {
    const matchesSearch =
      cafe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cafe.neighborhood.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cafe.vibeTags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesNeighborhood =
      selectedNeighborhood === 'All' || cafe.neighborhood === selectedNeighborhood;

    return matchesSearch && matchesNeighborhood;
  });

  // Sort cafes by distance vs neighborhood preference
  if (useDistanceSort) {
    filteredCafes = [...filteredCafes].sort((a, b) => a.distanceMiles - b.distanceMiles);
  } else {
    filteredCafes = [...filteredCafes].sort((a, b) => {
      if (a.neighborhood === member.homeNeighborhood) return -1;
      if (b.neighborhood === member.homeNeighborhood) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  // Calculate lowest credit price for a cafe
  const getLowestCreditPrice = (cafeId: string): number => {
    const cafeDrinks = drinks.filter((d) => d.cafeId === cafeId && d.isActive);
    if (cafeDrinks.length === 0) return 4;
    return Math.min(...cafeDrinks.map((d) => d.creditPrice));
  };

  return (
    <div className="space-y-5 pb-24 text-slate-100 animate-in fade-in duration-200">
      {/* Search & Location Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Dallas Partner Network
            </span>
            <h1 className="text-xl font-black tracking-tight text-slate-100 flex items-center space-x-1.5">
              <span>Discover Cafes</span>
              <Compass className="w-5 h-5 text-amber-400" />
            </h1>
          </div>

          {/* Distance Toggle Switch (PRD 3.1) */}
          <button
            onClick={() => setUseDistanceSort(!useDistanceSort)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              useDistanceSort
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <Navigation className={`w-3.5 h-3.5 ${useDistanceSort ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>{useDistanceSort ? 'Nearest First' : 'By Area'}</span>
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cafes, drinks, or vibe tags (e.g. Remote Work)..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-inner"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
        </div>

        {/* Neighborhood Pill Filter */}
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {neighborhoods.map((nh) => (
            <button
              key={nh}
              onClick={() => setSelectedNeighborhood(nh)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedNeighborhood === nh
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {nh}
            </button>
          ))}
        </div>
      </div>

      {/* CURATED FEATURED CAFES STRIP (PRD Module 3.1 & 6.1) */}
      {!searchQuery && selectedNeighborhood === 'All' && featuredCafes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-1.5 px-1">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-black uppercase tracking-wider text-amber-400">
              Curated Featured Cafes
            </h2>
          </div>

          <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-none">
            {featuredCafes.map((cafe) => (
              <div
                key={cafe.id}
                onClick={() => onSelectCafe(cafe)}
                className="w-64 flex-shrink-0 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:border-amber-500/50 cursor-pointer transition-all group"
              >
                <div className="h-32 relative">
                  <img
                    src={cafe.photos[0]}
                    alt={cafe.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                  <span className="absolute top-2.5 right-2.5 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow">
                    Featured
                  </span>
                  <div className="absolute bottom-2.5 left-3">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      📍 {cafe.neighborhood}
                    </span>
                    <h3 className="text-sm font-black text-slate-100">{cafe.name}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SIGNATURE DRINKS STRIP (PRD Module 3.1 & 6.2) */}
      {!searchQuery && selectedNeighborhood === 'All' && signatureDrinks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-1.5 px-1">
            <Coffee className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Signature Drinks of Dallas
            </h2>
          </div>

          <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-none">
            {signatureDrinks.map((drink) => {
              const cafe = cafes.find((c) => c.id === drink.cafeId);
              if (!cafe) return null;
              return (
                <div
                  key={drink.id}
                  onClick={() => onSelectDrink(drink, cafe)}
                  className="w-44 flex-shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-2.5 space-y-2 cursor-pointer hover:border-slate-700 transition-all"
                >
                  <img
                    src={drink.imageUrl}
                    alt={drink.name}
                    className="w-full h-24 rounded-xl object-cover"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 truncate">{drink.name}</h4>
                    <p className="text-[10px] text-amber-400 font-semibold truncate">
                      {cafe.name}
                    </p>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">${drink.retailPrice.toFixed(2)}</span>
                    <span className="font-extrabold text-amber-400">{drink.creditPrice} Credits</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MAIN CAFE LIST (PRD Module 3.2) */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            {useDistanceSort ? 'All Partner Cafes (Nearest First)' : 'Cafes by Area'}
          </h2>
          <span className="text-[10px] text-slate-500 font-mono">
            {filteredCafes.length} Cafes
          </span>
        </div>

        {/* EMPTY STATE */}
        {filteredCafes.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <Coffee className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">No Cafes Found</h3>
            <p className="text-xs text-slate-500">
              No cafes matched "{searchQuery}". Try clearing search or selecting another Dallas area.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedNeighborhood('All');
              }}
              className="py-2 px-4 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold"
            >
              Clear Search Filters
            </button>
          </div>
        ) : (
          filteredCafes.map((cafe) => {
            const lowestCredits = getLowestCreditPrice(cafe.id);
            return (
              <div
                key={cafe.id}
                onClick={() => onSelectCafe(cafe)}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md hover:border-slate-700 transition-all cursor-pointer group"
              >
                <div className="h-40 relative">
                  <img
                    src={cafe.photos[0]}
                    alt={cafe.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>

                  {/* Rating Badge */}
                  <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-800 flex items-center space-x-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-black text-slate-100">
                      {cafe.ratingCount > 0 ? cafe.rating.toFixed(1) : 'New'}
                    </span>
                  </div>

                  {/* Distance & Area */}
                  <div className="absolute bottom-3 left-3">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-slate-950/70 px-2 py-0.5 rounded-full border border-slate-800">
                      📍 {cafe.neighborhood} • {cafe.distanceMiles} mi
                    </span>
                    <h3 className="text-base font-black text-slate-100 mt-1">{cafe.name}</h3>
                  </div>
                </div>

                <div className="p-3.5 flex items-center justify-between bg-slate-900/90 text-xs">
                  {/* Vibe Tags */}
                  <div className="flex items-center space-x-1.5 overflow-hidden">
                    {cafe.vibeTags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-slate-950 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-lg truncate"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Lowest Credit Price */}
                  <span className="text-xs font-extrabold text-amber-400 flex-shrink-0">
                    Drinks from {lowestCredits} credits
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
