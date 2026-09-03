import React, { useState } from 'react';
import { Cafe, Drink } from '../../types';
import { store } from '../../services/store';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Star, 
  Navigation, 
  Sparkles, 
  QrCode, 
  Lock, 
  AlertCircle,
  Coffee,
  CheckCircle2,
  Tag,
  Share2
} from 'lucide-react';

interface CafeDetailScreenProps {
  cafe: Cafe;
  onBack: () => void;
  onRedeemDrink: (drink?: Drink) => void;
  onRateDrink: (drink: Drink) => void;
  onOpenCheckout: () => void;
}

export const CafeDetailScreen: React.FC<CafeDetailScreenProps> = ({
  cafe,
  onBack,
  onRedeemDrink,
  onRateDrink,
  onOpenCheckout,
}) => {
  const member = store.getMember();
  const allDrinks = store.getDrinks().filter((d) => d.cafeId === cafe.id && d.isActive);
  
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'espresso', 'cold_brew', 'matcha', 'latte', 'specialty'];

  const drinks = selectedCategory === 'All'
    ? allDrinks
    : allDrinks.filter((d) => d.category === selectedCategory);

  const handleDirections = () => {
    const query = encodeURIComponent(`${cafe.name}, ${cafe.address}`);
    window.open(`https://maps.google.com/?q=${query}`, '_blank');
  };

  const handlePrimaryRedeemClick = () => {
    if (member.accountState === 'visitor') {
      onOpenCheckout();
    } else if (member.status === 'payment_failed') {
      alert('Payment failed. Please update your card in Membership & Billing.');
    } else if (member.credits === 0) {
      alert(`No credits remaining. Next credit reset on ${member.renewalDate}.`);
    } else {
      onRedeemDrink(allDrinks[0]);
    }
  };

  return (
    <div className="space-y-6 pb-28 text-slate-100 animate-fade-in">
      {/* GALLERY & CAFE HERO BANNER */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative">
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-20 bg-slate-950/80 hover:bg-slate-950 text-white p-2.5 rounded-2xl backdrop-blur-md transition-all border border-white/10 shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Gallery Image Display */}
        <div className="h-64 sm:h-80 w-full relative overflow-hidden">
          <img
            src={cafe.photos[activePhotoIndex] || cafe.photos[0]}
            alt={cafe.name}
            className="w-full h-full object-cover transition-all duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-slate-950/30 to-transparent"></div>

          {/* Photo Navigation Thumbnails */}
          {cafe.photos.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2 z-10">
              {cafe.photos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`w-3 h-3 rounded-full transition-all border ${
                    activePhotoIndex === idx
                      ? 'w-8 bg-amber-400 border-amber-400'
                      : 'bg-slate-950/60 border-white/30 hover:border-white'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Cafe Information Banner */}
        <div className="p-6 space-y-4 relative bg-gradient-to-b from-[#0B0F17] to-slate-900/90">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  📍 {cafe.neighborhood} • {cafe.distanceMiles} miles
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  🟢 Open Today
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">{cafe.name}</h1>
            </div>

            {/* Rating Badge */}
            <div className="flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-2xl shadow-lg">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-sm font-black text-amber-400">
                {cafe.ratingCount > 0 ? `${cafe.rating.toFixed(1)} (${cafe.ratingCount} reviews)` : 'New Cafe'}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 flex items-center space-x-1.5">
            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>{cafe.address}</span>
          </p>

          {/* Member Perk Banner */}
          <div className="glass-panel-amber rounded-2xl p-3.5 text-xs text-amber-300 font-semibold flex items-center space-x-2.5">
            <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span>{cafe.perkLine}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-1">
            <button
              onClick={handleDirections}
              className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-2xl text-xs font-bold text-slate-100 flex items-center justify-center space-x-2 transition-all shadow-md"
            >
              <Navigation className="w-4 h-4 text-amber-400" />
              <span>Get Directions (Google Maps)</span>
            </button>
          </div>
        </div>
      </div>

      {/* OPENING HOURS SCHEDULE */}
      <div className="glass-panel rounded-3xl p-5 space-y-3 border border-white/10">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Opening Hours & Schedule</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {Object.entries(cafe.openingHours).map(([day, hours]) => (
            <div key={day} className="bg-slate-950/70 p-2.5 rounded-xl border border-white/5 flex justify-between items-center">
              <span className="text-slate-400 font-bold">{day}:</span>
              <span className="font-mono text-slate-200 text-[11px]">{hours}</span>
            </div>
          ))}
        </div>
      </div>

      {/* DRINK MENU & CATEGORY FILTERS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <Coffee className="w-4 h-4 text-amber-400" />
            <span>Craft Drink Menu & Credit Pricing</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">
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
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-white/10'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Drinks Grid */}
        <div className="space-y-3">
          {drinks.map((drink) => {
            const savingsUsd = drink.retailPrice - drink.creditPrice;
            return (
              <div
                key={drink.id}
                className="glass-panel glass-panel-hover rounded-3xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-white/10 transition-all"
              >
                <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                  <img
                    src={drink.imageUrl}
                    alt={drink.name}
                    className="w-16 h-16 rounded-2xl object-cover border border-white/10 flex-shrink-0"
                  />

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-white truncate">{drink.name}</h4>
                      {drink.isSignature && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Signature
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {drink.description}
                    </p>

                    <div className="flex items-center space-x-3 text-[11px] pt-0.5">
                      <span className="text-slate-400">Retail Value: <strong className="text-slate-200">${drink.retailPrice.toFixed(2)}</strong></span>
                      <button
                        onClick={() => onRateDrink(drink)}
                        className="text-amber-400 hover:underline flex items-center space-x-1 font-bold"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>Rate Drink</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Price & Redeem Button */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 gap-2">
                  <div className="text-right">
                    <div className="text-base font-black text-amber-400">
                      {drink.creditPrice} Credits
                    </div>
                    {savingsUsd > 0 && (
                      <span className="text-[10px] text-emerald-400 font-bold">
                        Saves ${savingsUsd.toFixed(2)} with pass
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (member.accountState === 'visitor') onOpenCheckout();
                      else onRedeemDrink(drink);
                    }}
                    className="py-2 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all"
                  >
                    {member.accountState === 'visitor' ? 'Subscribe' : 'Redeem Drink'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STICKY BOTTOM COUNTER CTA BAR */}
      <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40">
        <button
          onClick={handlePrimaryRedeemClick}
          disabled={member.accountState === 'member' && (member.credits === 0 || member.status === 'payment_failed')}
          className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-sm shadow-2xl amber-glow flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
        >
          {member.accountState === 'visitor' ? (
            <>
              <Sparkles className="w-5 h-5 fill-slate-950" />
              <span>Subscribe $24.99/mo to Redeem Drink</span>
            </>
          ) : member.credits === 0 ? (
            <>
              <Lock className="w-5 h-5" />
              <span>0 Credits Remaining • Resets {member.renewalDate}</span>
            </>
          ) : member.status === 'payment_failed' ? (
            <>
              <AlertCircle className="w-5 h-5" />
              <span>Payment Failed • Update Billing Card</span>
            </>
          ) : (
            <>
              <QrCode className="w-5 h-5" />
              <span>Redeem Here at Counter ({member.credits} Credits Available)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
