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
  Sparkles, 
  BookOpen
} from 'lucide-react';

export const WebMemberApp: React.FC = () => {
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
    <div className="min-h-screen bg-[#FFF8F0] text-[#4B2E2B] flex flex-col">
      {/* Secondary Web Application Top Nav Bar */}
      <nav className="bg-[#FFF8F0]/90 border-b border-[#8C5A3C]/15 sticky top-14 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Navigation Links */}
          <div className="flex items-center space-x-1 sm:space-x-4">
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 ${
                activeTab === 'discover'
                  ? 'bg-[#C08552] text-[#FFF8F0] shadow-md shadow-[#C08552]/20'
                  : 'text-[#8C5A3C] hover:text-[#4B2E2B] hover:bg-[#F4EFE6]'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Explore Cafes</span>
            </button>

            <button
              onClick={() => {
                if (selectedCafe) setActiveTab('cafe_detail');
                else setActiveTab('discover');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 ${
                activeTab === 'cafe_detail'
                  ? 'bg-[#C08552] text-[#FFF8F0] shadow-md shadow-[#C08552]/20'
                  : 'text-[#8C5A3C] hover:text-[#4B2E2B] hover:bg-[#F4EFE6]'
              }`}
            >
              <Coffee className="w-4 h-4" />
              <span>{selectedCafe ? selectedCafe.name : 'Cafe View'}</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 ${
                activeTab === 'profile'
                  ? 'bg-[#C08552] text-[#FFF8F0] shadow-md shadow-[#C08552]/20'
                  : 'text-[#8C5A3C] hover:text-[#4B2E2B] hover:bg-[#F4EFE6]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Drink Diary & Pass</span>
            </button>
          </div>

          {/* Member Status & Subscription CTA */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsAuthOpen(true)}
              className="hidden md:flex items-center space-x-2 bg-white hover:bg-[#F4EFE6] border border-[#8C5A3C]/20 px-3 py-1.5 rounded-xl text-xs font-bold text-[#4B2E2B] shadow-sm"
            >
              <img src={member.avatarUrl} alt={member.name} className="w-5 h-5 rounded-full object-cover" />
              <span>{member.name}</span>
            </button>

            {member.accountState === 'member' ? (
              <button
                onClick={() => setActiveTab('profile')}
                className="flex items-center space-x-1.5 bg-[#C08552]/15 border border-[#C08552]/30 text-[#8C5A3C] px-3.5 py-1.5 rounded-xl text-xs font-black"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C08552]" />
                <span>{member.credits} Credits Available</span>
              </button>
            ) : (
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="flex items-center space-x-1.5 bg-[#C08552] hover:bg-[#8C5A3C] text-[#FFF8F0] px-4 py-2 rounded-xl text-xs font-black shadow-md shadow-[#C08552]/20 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 fill-[#FFF8F0]" />
                <span>Subscribe ($24.99/mo)</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Full-Bleed Light Body */}
      <div className="max-w-6xl mx-auto w-full px-4 py-6 flex-1">
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
