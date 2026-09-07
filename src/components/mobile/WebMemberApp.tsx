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
import { useAuth } from '../../context/AuthContext';
import { store } from '../../services/store';
import {
  Compass,
  Coffee,
  Sparkles,
  BookOpen
} from 'lucide-react';

export const WebMemberApp: React.FC = () => {
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
    <div className="min-h-screen bg-[#FFF8F0] text-[#4B2E2B] flex flex-col">
      {/* Secondary Web Application Top Nav Bar */}
      <nav className="bg-[#FFF8F0]/90 border-b border-[#8C5A3C]/15 sticky top-14 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Navigation Links */}
          <div className="flex items-center space-x-1 sm:space-x-4">
            <button
              onClick={() => navigate('/app')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 ${
                activeTab === 'discover'
                  ? 'bg-accent text-on-accent shadow-md shadow-[#8C5A3C]/20'
                  : 'text-[#8C5A3C] hover:text-[#4B2E2B] hover:bg-[#F4EFE6]'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Explore Cafes</span>
            </button>

            {/* Only meaningful once a cafe is actually selected - clicking it
                before that had no real destination (selectedCafe was null,
                so onClick just fell back to the Discover tab you're likely
                already on). Contextual nav item, not a fixed tab bar, so
                removing it outright when unavailable reads better than a
                disabled button that does nothing. */}
            {selectedCafe && (
              <button
                onClick={() => navigate(`/app/cafes/${selectedCafe.id}`)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'cafe_detail'
                    ? 'bg-accent text-on-accent shadow-md shadow-[#8C5A3C]/20'
                    : 'text-[#8C5A3C] hover:text-[#4B2E2B] hover:bg-[#F4EFE6]'
                }`}
              >
                <Coffee className="w-4 h-4" />
                <span>{selectedCafe.name}</span>
              </button>
            )}

            <button
              onClick={() => navigate('/app/profile')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 ${
                activeTab === 'profile'
                  ? 'bg-accent text-on-accent shadow-md shadow-[#8C5A3C]/20'
                  : 'text-[#8C5A3C] hover:text-[#4B2E2B] hover:bg-[#F4EFE6]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Drink Diary & Pass</span>
            </button>
          </div>

          {/* Member Status & Subscription CTA. Signing in/out lives in the
              top panel (AppHeader) now - that's the one shared control for
              this surface, so this only needs the logged-in shortcut to
              Profile, not a second Sign In button. */}
          <div className="flex items-center space-x-3">
            {liveUser && (
              <button
                onClick={() => navigate('/app/profile')}
                className="hidden md:flex items-center space-x-2 bg-white hover:bg-[#F4EFE6] border border-[#8C5A3C]/20 px-3 py-1.5 rounded-xl text-xs font-bold text-[#4B2E2B] shadow-sm"
              >
                <img src={member.avatarUrl} alt={liveUser.name} className="w-5 h-5 rounded-full object-cover" />
                <span>{liveUser.name}</span>
              </button>
            )}

            {member.accountState === 'member' ? (
              <button
                onClick={() => navigate('/app/profile')}
                className="flex items-center space-x-1.5 bg-[#C08552]/15 border border-[#C08552]/30 text-[#8C5A3C] px-3.5 py-1.5 rounded-xl text-xs font-black"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#8C5A3C]" />
                <span>{member.credits} Credits Available</span>
              </button>
            ) : (
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="flex items-center space-x-1.5 bg-accent hover:bg-accent-hover text-on-accent px-4 py-2 rounded-xl text-xs font-black shadow-md shadow-[#8C5A3C]/20 transition-all"
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

        {activeTab === 'cafe_detail' && (
          selectedCafe ? (
            <CafeDetailScreen
              cafe={selectedCafe}
              onBack={() => navigate('/app')}
              onRedeemDrink={handleOpenRedeem}
              onRateDrink={handleOpenRating}
            />
          ) : (
            <div className="text-center py-16 text-[#6B4E4B] text-sm">
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
