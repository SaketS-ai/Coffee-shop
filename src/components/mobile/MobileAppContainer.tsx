import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Cafe, Drink } from '../../types';
import { api } from '../../services/api';
import { DiscoverScreen } from './DiscoverScreen';
import { CafeDetailScreen } from './CafeDetailScreen';
import { ProfileScreen } from './ProfileScreen';
import { StripeCheckoutModal } from './StripeCheckoutModal';
import { RedemptionModal } from './RedemptionModal';
import { RatingModal } from './RatingModal';
import { AuthModal } from './AuthModal';
import { WelcomeChoiceModal } from './WelcomeChoiceModal';
import { LoginScreen } from '../common/LoginScreen';
import { useAuth } from '../../context/AuthContext';
import { store } from '../../services/store';
import {
  Compass,
  Coffee,
  User,
  Wifi,
  Battery,
  Smartphone,
  Sparkles,
  LogIn
} from 'lucide-react';

export const MobileAppContainer: React.FC = () => {
  const [deviceOS, setDeviceOS] = useState<'iphone' | 'android'>('iphone');
  const location = useLocation();
  const { cafeId } = useParams<{ cafeId?: string }>();
  const navigate = useNavigate();
  // The URL is the source of truth for which screen is showing (so browser
  // Back/Forward and reload/deep-link all work) - `selectedCafe` below is
  // just a client-side cache of the cafe that :cafeId resolves to, kept in
  // sync by the fetch effect further down.
  const activeTab: 'discover' | 'cafe_detail' | 'profile' =
    location.pathname === '/app/profile' ? 'profile' : cafeId ? 'cafe_detail' : 'discover';

  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [isLoadingCafe, setIsLoadingCafe] = useState(false);
  const [cafeLoadError, setCafeLoadError] = useState<string | null>(null);
  const [selectedDrinkForRedeem, setSelectedDrinkForRedeem] = useState<Drink | undefined>(undefined);
  const [selectedDrinkForRating, setSelectedDrinkForRating] = useState<Drink | undefined>(undefined);

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showWelcomeChoice, setShowWelcomeChoice] = useState(false);

  const member = store.getMember();
  const { user: liveUser } = useAuth();

  // A freshly-logged-in member with no active membership yet gets asked once
  // per session whether to subscribe now or just look around first -
  // sessionStorage (not component state) tracks "already asked" so it
  // survives remounts and doesn't nag again on every navigation.
  useEffect(() => {
    if (!liveUser) return;
    const seenKey = `social_cup_welcome_seen_${liveUser.id}`;
    if (sessionStorage.getItem(seenKey)) return;
    let cancelled = false;
    api.getMembership()
      .then((membership) => {
        if (!cancelled && membership.status === 'INACTIVE') setShowWelcomeChoice(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [liveUser]);

  const dismissWelcomeChoice = () => {
    if (liveUser) sessionStorage.setItem(`social_cup_welcome_seen_${liveUser.id}`, '1');
    setShowWelcomeChoice(false);
  };

  // Resolves :cafeId to a real Cafe on a hard reload or deep link, where no
  // click handler has already populated `selectedCafe`. A no-op when it was
  // set optimistically by handleSelectCafe/handleSelectDrinkFromDiscover.
  useEffect(() => {
    if (!cafeId || selectedCafe?.id === cafeId) return;
    let cancelled = false;
    setIsLoadingCafe(true);
    setCafeLoadError(null);
    api.getCafeById(cafeId)
      .then((cafe) => {
        if (!cancelled) setSelectedCafe(cafe);
      })
      .catch((err: any) => {
        if (!cancelled) setCafeLoadError(err.message || 'Cafe not found.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCafe(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cafeId, selectedCafe]);

  const handleSelectCafe = (cafe: Cafe) => {
    setSelectedCafe(cafe);
    navigate(`/app/cafes/${cafe.id}`);
  };

  const handleSelectDrinkFromDiscover = (drink: Drink, cafe: Cafe) => {
    setSelectedCafe(cafe);
    setSelectedDrinkForRedeem(drink);
    navigate(`/app/cafes/${cafe.id}`);
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
    <div className="flex flex-col items-center justify-center py-6 px-2 bg-[#FFF8F0] min-h-[calc(100vh-60px)] text-[#4B2E2B]">
      {/* Device OS Selector Header */}
      <div className="mb-4 flex items-center space-x-3 bg-white p-1.5 rounded-2xl border border-[#8C5A3C]/20 shadow-sm text-xs">
        <span className="text-[#6B4E4B] font-bold px-2 flex items-center space-x-1">
          <Smartphone className="w-4 h-4 text-[#8C5A3C]" />
          <span>Device Preview:</span>
        </span>
        <button
          onClick={() => setDeviceOS('iphone')}
          className={`px-3 py-1 rounded-xl font-black transition-all ${
            deviceOS === 'iphone'
              ? 'bg-accent text-on-accent shadow'
              : 'text-[#6B4E4B] hover:text-[#4B2E2B]'
          }`}
        >
           iPhone (iOS)
        </button>
        <button
          onClick={() => setDeviceOS('android')}
          className={`px-3 py-1 rounded-xl font-black transition-all ${
            deviceOS === 'android'
              ? 'bg-[#8C5A3C] text-[#FFF8F0] shadow'
              : 'text-[#6B4E4B] hover:text-[#4B2E2B]'
          }`}
        >
          🤖 Android (Pixel)
        </button>
      </div>

      {/* Mobile Device Frame Container */}
      <div
        className={`w-full max-w-[380px] h-[780px] bg-[#FFF8F0] rounded-[44px] border-[10px] ${
          deviceOS === 'iphone' ? 'border-[#4B2E2B] shadow-xl' : 'border-[#3D2523] shadow-xl'
        } relative overflow-hidden flex flex-col`}
      >
        {/* Device Status Bar */}
        <div className="bg-[#F4EFE6] text-[#4B2E2B] text-xs px-6 pt-3 pb-1.5 flex justify-between items-center z-30 select-none border-b border-[#8C5A3C]/10">
          <span className="font-bold text-[12px]">9:41</span>

          {/* iPhone Dynamic Island vs Android Camera Hole */}
          {deviceOS === 'iphone' ? (
            <div className="w-24 h-4.5 bg-[#4B2E2B] rounded-full mx-auto shadow-inner"></div>
          ) : (
            <div className="w-3.5 h-3.5 bg-[#4B2E2B] rounded-full mx-auto"></div>
          )}

          <div className="flex items-center space-x-1.5 text-[#6B4E4B]">
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4 text-[#8C5A3C]" />
          </div>
        </div>

        {/* Member Subscription Status Bar */}
        <div className="bg-white border-b border-[#8C5A3C]/15 px-4 py-2 flex items-center justify-between text-xs text-[#4B2E2B] z-20 shadow-xs">
          {liveUser ? (
            <button
              onClick={() => navigate('/app/profile')}
              className="flex items-center space-x-2"
            >
              <div className="w-2 h-2 rounded-full bg-[#8C5A3C] animate-ping" />
              <span className="font-extrabold text-[#4B2E2B] text-xs">{liveUser.name}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsLoginOpen(true)}
              className="flex items-center space-x-1 text-[#8C5A3C] hover:text-[#4B2E2B] font-extrabold text-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          <button
            onClick={() => (member.accountState === 'visitor' ? setIsCheckoutOpen(true) : navigate('/app/profile'))}
            className="flex items-center space-x-1 bg-accent text-on-accent px-2.5 py-1 rounded-full text-[10px] font-black shadow-xs"
          >
            <Sparkles className="w-3 h-3 fill-[#FFF8F0]" />
            <span>{member.accountState === 'member' ? `${member.credits} Credits` : 'Visitor (Subscribe)'}</span>
          </button>
        </div>

        {/* Scrollable Mobile Viewport Body */}
        <div className="flex-1 overflow-y-auto px-3.5 pt-3.5 pb-4 scrollbar-thin scrollbar-thumb-[#C08552]">
          {activeTab === 'discover' && (
            <DiscoverScreen
              onSelectCafe={handleSelectCafe}
              onSelectDrink={handleSelectDrinkFromDiscover}
            />
          )}

          {activeTab === 'cafe_detail' && (
            selectedCafe ? (
              <CafeDetailScreen
                cafe={selectedCafe}
                onBack={() => navigate('/app')}
                onRedeemDrink={handleOpenRedeem}
                onRateDrink={handleOpenRating}
              />
            ) : (
              <div className="text-center py-16 text-[#6B4E4B] text-xs">
                {cafeLoadError ? (
                  <>
                    <p className="font-bold text-red-600">{cafeLoadError}</p>
                    <button onClick={() => navigate('/app')} className="mt-3 text-[#8C5A3C] hover:underline font-bold">
                      Back to Discover
                    </button>
                  </>
                ) : isLoadingCafe ? (
                  <p>Loading cafe...</p>
                ) : null}
              </div>
            )
          )}

          {activeTab === 'profile' && (
            <ProfileScreen
              onOpenCheckout={() => setIsCheckoutOpen(true)}
              onOpenAuth={() => setIsAuthOpen(true)}
            />
          )}
        </div>

        {/* Native Mobile Bottom Navigation Bar */}
        <nav className="bg-white border-t border-[#8C5A3C]/15 py-2 px-6 flex justify-around items-center z-30 shadow-md">
          <button
            onClick={() => navigate('/app')}
            className={`flex flex-col items-center space-y-0.5 transition-all ${
              activeTab === 'discover' ? 'text-[#8C5A3C] scale-105 font-black' : 'text-[#6B4E4B] hover:text-[#4B2E2B]'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[10px] font-bold">Discover</span>
          </button>

          <button
            onClick={() => selectedCafe && navigate(`/app/cafes/${selectedCafe.id}`)}
            disabled={!selectedCafe}
            aria-label={selectedCafe ? `View ${selectedCafe.name}` : 'No cafe selected yet'}
            className={`flex flex-col items-center space-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'cafe_detail' ? 'text-[#8C5A3C] scale-105 font-black' : 'text-[#6B4E4B] hover:text-[#4B2E2B]'
            }`}
          >
            <Coffee className="w-5 h-5" />
            <span className="text-[10px] font-bold">Cafe</span>
          </button>

          <button
            onClick={() => navigate('/app/profile')}
            className={`flex flex-col items-center space-y-0.5 transition-all ${
              activeTab === 'profile' ? 'text-[#8C5A3C] scale-105 font-black' : 'text-[#6B4E4B] hover:text-[#4B2E2B]'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold">Diary & Pass</span>
          </button>
        </nav>

        {/* Android Bottom Navigation Home Bar */}
        {deviceOS === 'android' && (
          <div className="bg-white py-1 flex justify-center items-center">
            <div className="w-24 h-1 bg-[#8C5A3C]/40 rounded-full"></div>
          </div>
        )}
      </div>

      {/* Modals */}
      <StripeCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={() => {
          setIsCheckoutOpen(false);
          navigate('/app');
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
      <LoginScreen isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      {liveUser && (
        <WelcomeChoiceModal
          isOpen={showWelcomeChoice}
          memberName={liveUser.name}
          onDismiss={dismissWelcomeChoice}
          onMembershipActivated={dismissWelcomeChoice}
        />
      )}
    </div>
  );
};
