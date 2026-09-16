import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Cafe, Drink } from '../../types';
import { api, MembershipInfo, resolveAssetUrl } from '../../services/api';
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
  Sparkles,
  BookOpen,
  ArrowRight,
  LogIn,
  Smartphone,
} from 'lucide-react';

interface WebMemberAppProps {
  onToggleViewMode?: () => void;
}

export const WebMemberApp: React.FC<WebMemberAppProps> = ({ onToggleViewMode }) => {
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
    <div className="min-h-screen bg-[#F5F0E8] text-[#241A16] flex flex-col font-sans">
      {/* Top Editorial Nav Bar (Stationary at the top of the page) */}
      <header className="bg-[#FBF8F2]/95 border-b border-[#DDD4C8] relative z-20 backdrop-blur-md shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Navigation Links */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => navigate('/app')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'discover' || activeTab === 'cafe_detail'
                  ? 'bg-[#241A16] text-[#FBF8F2] shadow-sm'
                  : 'text-[#756B63] hover:text-[#241A16] hover:bg-[#F5F0E8]'
              }`}
            >
              <Compass className="w-4 h-4 text-[#B98252]" />
              <span>Discover Roasters</span>
            </button>

            <button
              onClick={() => navigate('/app/profile')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'profile'
                  ? 'bg-[#241A16] text-[#FBF8F2] shadow-sm'
                  : 'text-[#756B63] hover:text-[#241A16] hover:bg-[#F5F0E8]'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#B98252]" />
              <span>Coffee Journal & Pass</span>
            </button>
          </div>

          {/* Member Status, CTAs & Viewport Toggle */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            {onToggleViewMode && (
              <button
                onClick={onToggleViewMode}
                className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-[#6B4A3A] hover:text-[#241A16] bg-[#241A16]/5 hover:bg-[#241A16]/10 border border-[#DDD4C8] transition-colors"
                title="Preview Mobile Device Pass"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#B98252]" />
                <span>Mobile Preview</span>
              </button>
            )}

            {liveUser && (
              <button
                onClick={() => navigate('/app/profile')}
                className="hidden sm:flex items-center space-x-2.5 bg-[#F5F0E8] hover:bg-[#DDD4C8]/30 border border-[#DDD4C8] px-3 py-1.5 rounded-2xl text-xs font-bold text-[#241A16] transition-colors shadow-2xs"
              >
                <img
                  src={liveUser.profile_image_url ? resolveAssetUrl(liveUser.profile_image_url) : member.avatarUrl}
                  alt={liveUser.name}
                  className="w-6 h-6 rounded-full object-cover border border-[#DDD4C8]"
                />
                <span className="truncate max-w-[120px]">{liveUser.name}</span>
              </button>
            )}

            {!liveUser && (
              <button
                onClick={() => setIsLoginOpen(true)}
                className="flex items-center space-x-1.5 text-[#6B4A3A] hover:text-[#241A16] font-bold text-xs px-3 py-2"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {isMemberActive ? (
              <button
                onClick={() => navigate('/app/profile')}
                className="flex items-center space-x-2 bg-[#FBF8F2] border border-[#DDD4C8] text-[#6B4A3A] px-4 py-2 rounded-2xl text-xs font-bold shadow-2xs hover:border-[#B98252] transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#B98252]" />
                <span>{effectiveCredits} Credits Available</span>
              </button>
            ) : (
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="flex items-center space-x-2 bg-[#241A16] hover:bg-[#3A2922] text-[#FBF8F2] px-4 py-2 rounded-2xl text-xs font-bold shadow-md transition-all active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5 fill-[#B98252] text-[#B98252]" />
                <span>Join Social Cup — $24.99/mo</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1">
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
            <div className="text-center py-20 text-[#6B4E4B] text-xs space-y-3">
              {cafeLoadError ? (
                <>
                  <p className="font-bold text-red-600">{cafeLoadError}</p>
                  <button
                    onClick={() => navigate('/app')}
                    className="px-4 py-2 bg-[#8C5A3C] text-white rounded-xl font-bold inline-flex items-center space-x-1.5"
                  >
                    <span>Back to Discover</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : isLoadingCafe ? (
                <div className="space-y-3">
                  <div className="w-8 h-8 border-2 border-[#8C5A3C] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Loading artisanal cafe profile...</p>
                </div>
              ) : null}
            </div>
          )
        )}

        {activeTab === 'profile' && (
          <ProfileScreen
            onOpenCheckout={() => setIsCheckoutOpen(true)}
            onOpenAuth={() => setIsEditProfileOpen(true)}
          />
        )}
      </main>

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
