import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Cafe, Drink } from '../../types';
import { api, MembershipInfo } from '../../services/api';
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
  Sparkles,
  LogIn,
} from 'lucide-react';

export const MobileAppContainer: React.FC = () => {
  const location = useLocation();
  const { cafeId } = useParams<{ cafeId?: string }>();
  const navigate = useNavigate();

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
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showWelcomeChoice, setShowWelcomeChoice] = useState(false);

  const member = store.getMember();
  const { user: liveUser } = useAuth();
  const [liveMembership, setLiveMembership] = useState<MembershipInfo | null>(null);

  // Fallback: Ensure a cafe is pre-loaded so counter redemption works immediately
  useEffect(() => {
    if (!selectedCafe && !cafeId) {
      api.getCafes({ limit: 1 })
        .then(({ cafes }) => {
          if (cafes.length > 0) {
            setSelectedCafe(cafes[0]);
          }
        })
        .catch(() => {});
    }
  }, [selectedCafe, cafeId]);

  useEffect(() => {
    if (!liveUser) {
      setLiveMembership(null);
      return;
    }
    const seenKey = `social_cup_welcome_seen_${liveUser.id}`;
    let cancelled = false;
    api.getMembership()
      .then((membership) => {
        if (!cancelled) {
          setLiveMembership(membership);
          if (!sessionStorage.getItem(seenKey) && membership.status === 'INACTIVE') {
            setShowWelcomeChoice(true);
          }
        }
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

  const effectiveCredits = liveMembership ? liveMembership.credits : member.credits;
  const isMemberActive = liveMembership ? liveMembership.status === 'ACTIVE' : member.accountState === 'member';

  return (
    <div className="w-full min-h-screen bg-[#FAF5EF] text-[#241A16] flex flex-col relative select-none">
      {/* Ambient background pattern visible across entire page */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-repeat opacity-[0.03]"
        style={{
          backgroundImage: "url('/doodle-pattern-alpha.png')",
          backgroundSize: '360px auto',
        }}
        aria-hidden="true"
      />

      {/* Responsive Top Header (Spans full viewport width on desktop, tablet, and mobile) */}
      <header className="sticky top-0 z-30 w-full bg-[#1E1411]/95 backdrop-blur-md border-b border-[#C58A55]/20 text-[#F3E7D5] shadow-md flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 w-full">
          {/* Brand Logo */}
          <button
            onClick={() => navigate('/app')}
            className="flex items-center space-x-2.5 hover:opacity-85 transition-opacity cursor-pointer flex-shrink-0"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C58A55] to-[#6F4E3D] flex items-center justify-center shadow-xs">
              <Coffee className="w-4.5 h-4.5 text-white stroke-[2.5]" />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="font-editorial font-bold text-base sm:text-lg tracking-wider uppercase text-white">Social Cup</span>
              <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md bg-[#C58A55]/20 text-[#D6A36F] border border-[#C58A55]/30">
                DAL
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links (hidden on mobile and tablet, visible on lg+) */}
          <nav className="hidden lg:flex items-center space-x-2 lg:space-x-3" aria-label="Desktop Primary Navigation">
            <button
              onClick={() => navigate('/app')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'discover' || activeTab === 'cafe_detail'
                  ? 'bg-[#3A2720] text-[#D6A36F] border border-[#C58A55]/40 shadow-xs'
                  : 'text-[#DDD4C8] hover:text-white hover:bg-white/5'
              }`}
            >
              <Compass className="w-4 h-4 text-[#C58A55]" />
              <span>Discover Roasters</span>
            </button>

            <button
              onClick={() => handleOpenRedeem()}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 text-[#DDD4C8] hover:text-white hover:bg-white/5 cursor-pointer"
            >
              <Coffee className="w-4 h-4 text-[#C58A55]" />
              <span>Redeem Pass</span>
            </button>

            <button
              onClick={() => navigate('/app/profile')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-[#3A2720] text-[#D6A36F] border border-[#C58A55]/40 shadow-xs'
                  : 'text-[#DDD4C8] hover:text-white hover:bg-white/5'
              }`}
            >
              <User className="w-4 h-4 text-[#C58A55]" />
              <span>Journal & Pass</span>
            </button>
          </nav>

          {/* User Controls & Credits */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <button
              onClick={() => (isMemberActive ? navigate('/app/profile') : setIsCheckoutOpen(true))}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-[#C58A55] to-[#8C4A32] hover:from-[#B37944] hover:to-[#7B3F2A] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold shadow-xs caramel-glow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 fill-white text-white" />
              <span>{isMemberActive ? `${effectiveCredits} Credits` : 'Unlock Pass'}</span>
            </button>

            {liveUser ? (
              <button
                onClick={() => navigate('/app/profile')}
                className="flex items-center space-x-1.5 bg-[#251814] border border-[#C58A55]/30 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-[#F3E7D5] hover:border-[#C58A55] transition-all active:scale-95 cursor-pointer"
                title="View Profile & Cupping Journal"
              >
                <div className="w-2 h-2 rounded-full bg-[#537A5A] animate-pulse" />
                <span className="max-w-[85px] sm:max-w-[120px] truncate">{liveUser.name}</span>
              </button>
            ) : (
              <button
                onClick={() => setIsLoginOpen(true)}
                className="flex items-center space-x-1 text-[#D6A36F] hover:text-white font-bold text-xs px-2.5 py-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Viewport (Responsive centered max-w-7xl layout) */}
      <main className="w-full flex-1 relative z-10 flex flex-col">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-7 flex-1 min-w-0 pb-24 lg:pb-12">
          {activeTab === 'discover' && (
            <DiscoverScreen
              onSelectCafe={handleSelectCafe}
              onSelectDrink={handleSelectDrinkFromDiscover}
              isMobile={false}
            />
          )}

          {activeTab === 'cafe_detail' && (
            selectedCafe ? (
              <CafeDetailScreen
                cafe={selectedCafe}
                onBack={() => navigate('/app')}
                onRedeemDrink={handleOpenRedeem}
                onRateDrink={handleOpenRating}
                isMobile={false}
              />
            ) : (
              <div className="text-center py-20 text-[#B9A28F] text-xs space-y-3">
                {cafeLoadError ? (
                  <>
                    <p className="font-bold text-[#B85D4F]">{cafeLoadError}</p>
                    <button
                      onClick={() => navigate('/app')}
                      className="px-4 py-2 bg-[#251814] text-white rounded-xl font-bold cursor-pointer"
                    >
                      Return to Discover
                    </button>
                  </>
                ) : (
                  <div className="animate-pulse space-y-3">
                    <div className="h-48 bg-[#E8D8C4]/40 rounded-2xl" />
                    <div className="h-6 w-1/2 bg-[#E8D8C4]/40 rounded-lg mx-auto" />
                  </div>
                )}
              </div>
            )
          )}

          {activeTab === 'profile' && (
            <ProfileScreen
              onOpenCheckout={() => setIsCheckoutOpen(true)}
              onOpenAuth={() => setIsLoginOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Mobile & Tablet Bottom Navigation Bar (lg:hidden) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#1E1411]/95 backdrop-blur-md border-t border-[#C58A55]/20 px-6 py-2 flex justify-around items-center shadow-2xl lg:hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        aria-label="Mobile Member Navigation"
      >
        {/* Discover Tab */}
        <button
          onClick={() => navigate('/app')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'discover'
              ? 'text-[#D6A36F] font-bold'
              : 'text-[#B98252] hover:text-[#F3E7D5]'
          }`}
        >
          <Compass className="w-5 h-5 mb-0.5 stroke-[2.2]" />
          <span className="text-[10px] font-bold tracking-tight">Discover</span>
          {activeTab === 'discover' && (
            <div className="w-4 h-1 bg-[#C58A55] rounded-full mt-0.5" />
          )}
        </button>

        {/* Digital Pass / Redeem Center Tab */}
        <button
          onClick={() => handleOpenRedeem()}
          className="flex flex-col items-center -mt-5 group cursor-pointer"
          title="Redeem Drink Credit"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#6F4E3D] via-[#8C4A32] to-[#C58A55] text-white flex items-center justify-center shadow-xl caramel-glow group-hover:scale-105 group-active:scale-95 transition-all border-2 border-[#1E1411] ring-2 ring-[#C58A55]/40">
            <Coffee className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-bold text-[#D6A36F] mt-0.5">Pass</span>
        </button>

        {/* Profile & Cupping Journal Tab */}
        <button
          onClick={() => navigate('/app/profile')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'text-[#D6A36F] font-bold'
              : 'text-[#B98252] hover:text-[#F3E7D5]'
          }`}
        >
          <User className="w-5 h-5 mb-0.5 stroke-[2.2]" />
          <span className="text-[10px] font-bold tracking-tight">Journal & Pass</span>
          {activeTab === 'profile' && (
            <div className="w-4 h-1 bg-[#C58A55] rounded-full mt-0.5" />
          )}
        </button>
      </nav>

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

      <AuthModal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} />
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
