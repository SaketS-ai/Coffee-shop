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
  Coffee
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
  const drinks = store.getDrinks().filter((d) => d.cafeId === cafe.id && d.isActive);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

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
      onRedeemDrink(drinks[0]);
    }
  };

  return (
    <div className="space-y-4 pb-24 text-slate-100 animate-in fade-in duration-200">
      {/* Top Navigation & Image Gallery Header */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-10 bg-slate-950/80 hover:bg-slate-950 text-slate-100 p-2.5 rounded-full backdrop-blur-md transition-colors border border-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Gallery Image Display */}
        <div className="h-56 w-full relative">
          <img
            src={cafe.photos[activePhotoIndex] || cafe.photos[0]}
            alt={cafe.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent"></div>

          {/* Photo Dots */}
          {cafe.photos.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-1.5 z-10">
              {cafe.photos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    activePhotoIndex === idx ? 'w-5 bg-amber-400' : 'w-1.5 bg-slate-400/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Cafe Title Banner */}
        <div className="p-5 bg-slate-900 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                📍 {cafe.neighborhood} • {cafe.distanceMiles} miles away
              </span>
              <h1 className="text-xl font-black text-slate-100">{cafe.name}</h1>
            </div>

            {/* Rating Badge */}
            <div className="flex items-center space-x-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-xl">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-xs font-black text-amber-400">
                {cafe.ratingCount > 0 ? `${cafe.rating.toFixed(1)} (${cafe.ratingCount})` : 'New'}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="truncate">{cafe.address}</span>
          </p>

          {/* Perk Line */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-xs text-amber-300 font-medium flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{cafe.perkLine}</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center space-x-2">
            <button
              onClick={handleDirections}
              className="flex-1 py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              <span>Get Directions</span>
            </button>
          </div>
        </div>
      </div>

      {/* Opening Hours Collapse/Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Opening Hours</span>
        </h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-300">
          {Object.entries(cafe.openingHours).map(([day, hours]) => (
            <div key={day} className="flex justify-between py-0.5 border-b border-slate-800/50">
              <span className="text-slate-400 font-medium">{day}:</span>
              <span className="font-semibold text-slate-200">{hours}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Full Drink Menu */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <Coffee className="w-3.5 h-3.5 text-amber-400" />
            <span>Drink Menu & Credit Pricing</span>
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">
            {drinks.length} Available Drinks
          </span>
        </div>

        <div className="space-y-2.5">
          {drinks.map((drink) => (
            <div
              key={drink.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between space-x-3 hover:border-slate-700 transition-colors"
            >
              <img
                src={drink.imageUrl}
                alt={drink.name}
                className="w-14 h-14 rounded-xl object-cover border border-slate-800"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h4 className="text-xs font-bold text-slate-100 truncate">{drink.name}</h4>
                  {drink.isSignature && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Signature
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                  {drink.description}
                </p>

                <div className="mt-1.5 flex items-center space-x-2 text-[10px]">
                  <span className="text-slate-400">Retail: ${drink.retailPrice.toFixed(2)}</span>
                  <span className="text-slate-600">•</span>
                  <button
                    onClick={() => onRateDrink(drink)}
                    className="text-amber-400 hover:underline flex items-center space-x-0.5"
                  >
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>Rate Drink</span>
                  </button>
                </div>
              </div>

              {/* Price & Individual Redeem CTA */}
              <div className="text-right flex flex-col items-end space-y-1.5">
                <span className="text-sm font-black text-amber-400">
                  {drink.creditPrice} Credits
                </span>
                <button
                  onClick={() => {
                    if (member.accountState === 'visitor') onOpenCheckout();
                    else onRedeemDrink(drink);
                  }}
                  className="py-1.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[11px] font-extrabold transition-all"
                >
                  {member.accountState === 'visitor' ? 'Subscribe' : 'Redeem'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed Sticky Counter CTA Bar (PRD 4.4) */}
      <div className="fixed bottom-14 left-0 right-0 max-w-sm mx-auto p-4 z-40">
        <button
          onClick={handlePrimaryRedeemClick}
          disabled={member.accountState === 'member' && (member.credits === 0 || member.status === 'payment_failed')}
          className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-sm shadow-2xl shadow-amber-500/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
        >
          {member.accountState === 'visitor' ? (
            <>
              <Sparkles className="w-5 h-5 fill-slate-950" />
              <span>Subscribe $24.99/mo to Redeem Drink</span>
            </>
          ) : member.credits === 0 ? (
            <>
              <Lock className="w-5 h-5" />
              <span>0 Credits Left • Resets {member.renewalDate}</span>
            </>
          ) : member.status === 'payment_failed' ? (
            <>
              <AlertCircle className="w-5 h-5" />
              <span>Payment Failed • Update Card</span>
            </>
          ) : (
            <>
              <QrCode className="w-5 h-5" />
              <span>Redeem Here at Counter ({member.credits} Cr Left)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
