import React, { useState } from 'react';
import { Cafe, Drink } from '../../types';
import { DiscoverScreen } from './DiscoverScreen';
import { CafeDetailScreen } from './CafeDetailScreen';
import { ProfileScreen } from './ProfileScreen';
import { StripeCheckoutModal } from './StripeCheckoutModal';
import { RedemptionModal } from './RedemptionModal';
import { RatingModal } from './RatingModal';
import { AuthModal } from './AuthModal';
import { store } from '../../services/store';
import { 
  Compass, 
  Coffee, 
  User, 
  Wifi, 
  Battery, 
  Smartphone, 
  Sparkles,
  QrCode
} from 'lucide-react';

export const MobileAppContainer: React.FC = () => {
  const [deviceOS, setDeviceOS] = useState<'iphone' | 'android'>('iphone');
  const [activeTab, setActiveTab] = useState<'discover' | 'cafe_detail' | 'profile'>('discover');
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [selectedDrinkForRedeem, setSelectedDrinkForRedeem] = useState<Drink | undefined>(undefined);
  const [selectedDrinkForRating, setSelectedDrinkForRating] = useState<Drink | undefined>(undefined);

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const member = store.getMember();

  const handleSelectCafe = (cafe: Cafe) => {
    setSelectedCafe(cafe);
    setActiveTab('cafe_detail');
  };

  const handleSelectDrinkFromDiscover = (drink: Drink, cafe: Cafe) => {
    setSelectedCafe(cafe);
    setSelectedDrinkForRedeem(drink);
    setActiveTab('cafe_detail');
  };

  const handleOpenRedeem = (drink?: Drink) => {
    if (drink) setSelectedDrinkForRedeem(drink);
    setIsRedeemOpen(true);
  };

  const handleOpenRating = (drink: Drink) => {
    setSelectedDrinkForRating(drink);
    setIsRatingOpen(true);
  };

  return (
    <div className="flex flex-col items-center justify-center py-4 px-2 bg-slate-950 min-h-[calc(100vh-60px)]">
      {/* Device Frame OS Selector Switcher Header */}
      <div className="mb-4 flex items-center space-x-3 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-lg text-xs">
        <span className="text-slate-400 font-bold px-2 flex items-center space-x-1">
          <Smartphone className="w-4 h-4 text-amber-400" />
          <span>Device Simulation:</span>
        </span>
        <button
          onClick={() => setDeviceOS('iphone')}
          className={`px-3 py-1 rounded-xl font-extrabold transition-all ${
            deviceOS === 'iphone'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
           iPhone (iOS)
        </button>
        <button
          onClick={() => setDeviceOS('android')}
          className={`px-3 py-1 rounded-xl font-extrabold transition-all ${
            deviceOS === 'android'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🤖 Android (Pixel/Samsung)
        </button>
      </div>

      {/* Mobile Device Frame Container */}
      <div
        className={`w-full max-w-[390px] h-[812px] bg-slate-950 rounded-[48px] border-[8px] ${
          deviceOS === 'iphone' ? 'border-slate-800 shadow-amber-500/10' : 'border-emerald-950 shadow-emerald-500/10'
        } shadow-2xl relative overflow-hidden flex flex-col`}
      >
        {/* Device Status Bar */}
        <div className="bg-slate-950 text-slate-200 text-xs px-6 pt-3 pb-1 flex justify-between items-center z-30 select-none">
          <span className="font-semibold text-[13px]">9:41</span>

          {/* iPhone Dynamic Island vs Android Camera Hole */}
          {deviceOS === 'iphone' ? (
            <div className="w-24 h-5 bg-black rounded-full mx-auto shadow-inner"></div>
          ) : (
            <div className="w-4 h-4 bg-black rounded-full mx-auto border border-slate-800"></div>
          )}

          <div className="flex items-center space-x-1.5 text-slate-400">
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Member Subscription Status Bar */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-300 z-20">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-slate-200">{member.name}</span>
          </div>

          <button
            onClick={() => (member.accountState === 'visitor' ? setIsCheckoutOpen(true) : setActiveTab('profile'))}
            className="flex items-center space-x-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-0.5 rounded-full text-[10px] font-black"
          >
            <Sparkles className="w-3 h-3" />
            <span>{member.accountState === 'member' ? `${member.credits} Credits` : 'Visitor (Subscribe)'}</span>
          </button>
        </div>

        {/* Scrollable Mobile Viewport Body */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 scrollbar-thin scrollbar-thumb-slate-800">
          {activeTab === 'discover' && (
            <DiscoverScreen
              onSelectCafe={handleSelectCafe}
              onSelectDrink={handleSelectDrinkFromDiscover}
            />
          )}

          {activeTab === 'cafe_detail' && selectedCafe && (
            <CafeDetailScreen
              cafe={selectedCafe}
              onBack={() => setActiveTab('discover')}
              onRedeemDrink={handleOpenRedeem}
              onRateDrink={handleOpenRating}
              onOpenCheckout={() => setIsCheckoutOpen(true)}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileScreen
              onOpenCheckout={() => setIsCheckoutOpen(true)}
              onOpenAuth={() => setIsAuthOpen(true)}
            />
          )}
        </div>

        {/* Native Mobile Bottom Navigation Bar */}
        <nav className="bg-slate-950/95 border-t border-slate-800 py-2.5 px-6 flex justify-around items-center z-30 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex flex-col items-center space-y-1 transition-all ${
              activeTab === 'discover' ? 'text-amber-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[10px] font-bold">Discover</span>
          </button>

          <button
            onClick={() => {
              if (selectedCafe) setActiveTab('cafe_detail');
              else setActiveTab('discover');
            }}
            className={`flex flex-col items-center space-y-1 transition-all ${
              activeTab === 'cafe_detail' ? 'text-amber-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Coffee className="w-5 h-5" />
            <span className="text-[10px] font-bold">Cafe</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center space-y-1 transition-all ${
              activeTab === 'profile' ? 'text-amber-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold">Diary & Pass</span>
          </button>
        </nav>

        {/* Android Gesture Bar */}
        {deviceOS === 'android' && (
          <div className="bg-slate-950 py-1.5 flex justify-center items-center">
            <div className="w-28 h-1 bg-slate-700 rounded-full"></div>
          </div>
        )}
      </div>

      {/* Modals */}
      <StripeCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={() => {
          setIsCheckoutOpen(false);
          setActiveTab('discover');
        }}
      />

      {selectedCafe && (
        <RedemptionModal
          isOpen={isRedeemOpen}
          onClose={() => setIsRedeemOpen(false)}
          cafe={selectedCafe}
          selectedDrink={selectedDrinkForRedeem}
          onOpenRating={handleOpenRating}
        />
      )}

      <RatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        drink={selectedDrinkForRating}
      />

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
};
