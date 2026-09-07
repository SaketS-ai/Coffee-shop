import React, { useEffect, useState } from 'react';
import { store } from '../../services/store';
import {
  api,
  MembershipInfo,
  CreditLedgerEntryApi,
  RedeemedHistoryEntryApi,
  ReviewApi,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { AuthGate } from '../common/AuthGate';
import { DrinkDiaryEntry } from './DrinkDiaryEntry';
import {
  CreditCard,
  Sparkles,
  Star,
  BookOpen,
  Settings,
  Trash2,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Award,
  Zap,
  History,
  Coffee
} from 'lucide-react';

interface ProfileScreenProps {
  onOpenCheckout: () => void;
  onOpenAuth: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onOpenCheckout, onOpenAuth }) => {
  const member = store.getMember();
  const ratings = store.getRatings().filter((r) => r.memberId === member.id);
  const sortedRatings = [...ratings].sort((a, b) => b.stars - a.stars);

  const [activeTab, setActiveTab] = useState<'diary' | 'membership' | 'credits' | 'diary_live'>('diary');
  const [showCancelNotice, setShowCancelNotice] = useState(false);

  // --- Phase 5: real membership/credits from the Postgres-backed API, behind
  // the shared AuthContext session (same login as Barista/Admin/Redemption).
  // Deliberately separate from the mock Stripe-flavored "Membership & Billing"
  // tab above, which stays untouched until Stripe is actually integrated. ---
  const { user: liveUser } = useAuth();

  const [liveMembership, setLiveMembership] = useState<MembershipInfo | null>(null);
  const [creditHistory, setCreditHistory] = useState<CreditLedgerEntryApi[]>([]);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [activateMessage, setActivateMessage] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  // --- Phase 9: real Drink Diary, reusing the same liveUser session as the
  // Credits (Live) tab above - no separate login gate needed. ---
  const [redeemedHistory, setRedeemedHistory] = useState<RedeemedHistoryEntryApi[]>([]);
  const [myReviews, setMyReviews] = useState<ReviewApi[]>([]);
  const [isLoadingDiary, setIsLoadingDiary] = useState(false);
  const [diaryError, setDiaryError] = useState<string | null>(null);

  const loadDiaryData = async () => {
    setIsLoadingDiary(true);
    setDiaryError(null);
    try {
      const [history, reviews] = await Promise.all([api.getRedeemedHistory(), api.getReviews()]);
      setRedeemedHistory(history);
      setMyReviews(reviews);
    } catch (err: any) {
      setDiaryError(err.message || 'Could not load your drink diary.');
    } finally {
      setIsLoadingDiary(false);
    }
  };

  const loadMembershipData = async () => {
    setIsLoadingCredits(true);
    setCreditsError(null);
    try {
      const [membership, history] = await Promise.all([
        api.getMembership(),
        api.getCreditHistory(),
      ]);
      setLiveMembership(membership);
      setCreditHistory(history);
    } catch (err: any) {
      setCreditsError(err.message || 'Could not load membership data.');
    } finally {
      setIsLoadingCredits(false);
    }
  };

  useEffect(() => {
    if (liveUser) {
      loadMembershipData();
      loadDiaryData();
    } else {
      setLiveMembership(null);
      setCreditHistory([]);
      setRedeemedHistory([]);
      setMyReviews([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveUser]);

  const handleSubmitReview = async (redemptionId: string, rating: number, note: string) => {
    await api.createReview(redemptionId, rating, note.trim() || null);
    await loadDiaryData();
  };

  const handleUpdateReview = async (reviewId: string, rating: number, note: string) => {
    await api.updateReview(reviewId, rating, note.trim() || null);
    await loadDiaryData();
  };

  const handleDeleteReview = async (reviewId: string) => {
    await api.deleteReview(reviewId);
    await loadDiaryData();
  };

  const handleActivateTestMembership = async () => {
    setIsActivating(true);
    setActivateMessage(null);
    try {
      const { created } = await api.activateDevMembership();
      setActivateMessage(
        created
          ? 'Test membership activated - 30 credits granted.'
          : 'Membership already active for this period - no new credits granted.'
      );
      await loadMembershipData();
    } catch (err: any) {
      setActivateMessage(err.message || 'Failed to activate.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleCancelLiveMembership = async () => {
    if (!window.confirm('Cancel your Social Cup membership? This takes effect immediately - you will lose redemption access right away.')) {
      return;
    }
    setIsCanceling(true);
    setCancelMessage(null);
    try {
      await api.cancelMembership();
      setCancelMessage('Membership canceled.');
      await loadMembershipData();
    } catch (err: any) {
      setCancelMessage(err.message || 'Failed to cancel.');
    } finally {
      setIsCanceling(false);
    }
  };

  const formatMembershipDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleCancelSubscription = () => {
    store.setAccountState('visitor');
    setShowCancelNotice(true);
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your Social Cup account? This will cancel your subscription immediately.')) {
      store.setAccountState('visitor');
      store.updateMemberProfile({ name: 'Guest User', email: 'guest@example.com' });
    }
  };

  return (
    <div className="space-y-4 pb-20 text-[#4B2E2B]">
      {/* Profile Header Card */}
      <div className="bg-white border border-[#8C5A3C]/20 rounded-3xl p-5 shadow-md relative overflow-hidden">
        <div className="flex items-center space-x-4">
          <img
            src={member.avatarUrl}
            alt={member.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-[#C08552] shadow-sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-[#4B2E2B] truncate">{member.name}</h2>
              <button
                onClick={onOpenAuth}
                className="text-[#8C5A3C] hover:text-[#4B2E2B] p-1.5"
                title="Edit Profile"
                aria-label="Edit profile"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#6B4E4B] truncate">{member.email}</p>
            
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFF8F0] text-[#4B2E2B] border border-[#8C5A3C]/20">
                📍 {member.homeNeighborhood}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  member.accountState === 'member'
                    ? 'bg-accent text-on-accent'
                    : 'bg-[#E8DED1] text-[#6B4E4B]'
                }`}
              >
                {member.accountState === 'member' ? 'Subscriber' : 'Visitor (Unsubscribed)'}
              </span>
            </div>
          </div>
        </div>

        {/* Subscription & Credit Ledger Banner */}
        <div className="mt-4 pt-4 border-t border-[#8C5A3C]/15 grid grid-cols-2 gap-3">
          <div className="bg-[#FFF8F0] p-3 rounded-2xl border border-[#8C5A3C]/20">
            <span className="text-[10px] text-[#6B4E4B] font-bold uppercase tracking-wider">
              Drink Credits
            </span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-2xl font-black text-[#8C5A3C]">{member.credits}</span>
              <span className="text-xs text-[#6B4E4B]">/ 30 available</span>
            </div>
          </div>

          <div className="bg-[#FFF8F0] p-3 rounded-2xl border border-[#8C5A3C]/20 flex flex-col justify-between">
            <span className="text-[10px] text-[#6B4E4B] font-bold uppercase tracking-wider">
              Renewal Date
            </span>
            <span className="text-xs font-bold text-[#4B2E2B]">
              {member.accountState === 'member' ? member.renewalDate : 'Not Subscribed'}
            </span>
          </div>
        </div>

        {member.accountState === 'visitor' && (
          <button
            onClick={onOpenCheckout}
            className="mt-4 w-full py-3 px-4 bg-accent hover:bg-accent-hover text-on-accent font-black rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4 fill-[#FFF8F0]" />
            <span>Unlock 30 Drink Credits ($24.99/mo)</span>
          </button>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="flex bg-white p-1 rounded-2xl border border-[#8C5A3C]/20 shadow-sm">
        <button
          onClick={() => setActiveTab('diary')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'diary'
              ? 'bg-accent text-on-accent shadow-sm'
              : 'text-[#6B4E4B] hover:text-[#4B2E2B]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Drink Diary ({ratings.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('membership')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'membership'
              ? 'bg-accent text-on-accent shadow-sm'
              : 'text-[#6B4E4B] hover:text-[#4B2E2B]'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Membership & Billing</span>
        </button>
        <button
          onClick={() => setActiveTab('credits')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'credits'
              ? 'bg-accent text-on-accent shadow-sm'
              : 'text-[#6B4E4B] hover:text-[#4B2E2B]'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Credits (Live)</span>
        </button>
        <button
          onClick={() => setActiveTab('diary_live')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'diary_live'
              ? 'bg-accent text-on-accent shadow-sm'
              : 'text-[#6B4E4B] hover:text-[#4B2E2B]'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>Diary (Live)</span>
        </button>
      </div>

      {/* DRINK DIARY VIEW */}
      {activeTab === 'diary' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#4B2E2B]">
              Personal Drink Diary (Highest Rated First)
            </h3>
            <span className="text-[10px] text-[#6B4E4B] font-mono">
              {sortedRatings.length} Drinks Rated
            </span>
          </div>

          {sortedRatings.length === 0 ? (
            <div className="bg-white border border-[#8C5A3C]/20 rounded-2xl p-8 text-center space-y-2 shadow-sm">
              <Award className="w-10 h-10 text-[#8C5A3C] mx-auto" />
              <h4 className="text-sm font-bold text-[#4B2E2B]">No Drinks Rated Yet</h4>
              <p className="text-xs text-[#6B4E4B] max-w-xs mx-auto">
                Visit any partner cafe in Dallas, redeem a drink, and share your review note!
              </p>
            </div>
          ) : (
            sortedRatings.map((rating) => (
              <div
                key={rating.id}
                className="bg-white border border-[#8C5A3C]/20 rounded-2xl p-4 space-y-2 hover:border-[#C08552] transition-colors shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-black text-[#4B2E2B]">{rating.drinkName}</h4>
                    <span className="text-xs text-[#8C5A3C] font-semibold">
                      📍 {rating.cafeName}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 bg-[#FFF8F0] border border-[#8C5A3C]/20 px-2 py-1 rounded-lg">
                    <Star className="w-3.5 h-3.5 text-[#8C5A3C] fill-[#8C5A3C]" />
                    <span className="text-xs font-black text-[#4B2E2B]">{rating.stars}.0</span>
                  </div>
                </div>

                {rating.note && (
                  <p className="text-xs text-[#6B4E4B] bg-[#FFF8F0] p-2.5 rounded-xl border border-[#8C5A3C]/15 italic">
                    "{rating.note}"
                  </p>
                )}

                <div className="text-[10px] text-[#6B4E4B] font-mono text-right pt-1">
                  Rated on {new Date(rating.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MEMBERSHIP & BILLING VIEW */}
      {activeTab === 'membership' && (
        <div className="space-y-4 text-xs">
          <div className="bg-white border border-[#8C5A3C]/20 rounded-2xl p-4 space-y-3 shadow-sm">
            <h4 className="font-bold text-[#4B2E2B] uppercase tracking-wider text-[11px]">
              Stripe Customer & Card Management
            </h4>
            <div className="p-3 bg-[#FFF8F0] rounded-xl border border-[#8C5A3C]/20 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-[#8C5A3C]" />
                <span className="text-[#4B2E2B]">Visa ending in 4242</span>
              </div>
              <button 
                onClick={() => alert('Opening Stripe Payment Update Page...')}
                className="text-[#8C5A3C] font-bold hover:underline flex items-center space-x-1"
              >
                <span>Update Card</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[11px] text-[#6B4E4B]">
              Receipts and monthly renewal notices are automatically sent to {member.email} by Stripe.
            </p>
          </div>

          <div className="bg-white border border-[#8C5A3C]/20 rounded-2xl p-4 space-y-3 shadow-sm">
            <h4 className="font-bold text-[#4B2E2B] uppercase tracking-wider text-[11px]">
              Subscription Controls
            </h4>

            {member.accountState === 'member' ? (
              <button
                onClick={handleCancelSubscription}
                className="w-full py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold transition-colors text-left flex items-center justify-between"
              >
                <span>Cancel Membership Subscription</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onOpenCheckout}
                className="w-full py-2.5 px-3 bg-accent text-on-accent rounded-xl font-bold transition-colors text-left flex items-center justify-between shadow-sm"
              >
                <span>Re-subscribe to Social Cup ($24.99/mo)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {showCancelNotice && (
              <div className="p-3 bg-[#FFF8F0] border border-[#C08552]/30 rounded-xl text-[#4B2E2B] text-[11px]">
                Subscription canceled. Remaining credits will stay active until the end of your billing period.
              </div>
            )}
          </div>

          <div className="bg-white border border-red-200 rounded-2xl p-4 space-y-2 shadow-sm">
            <h4 className="font-bold text-red-700 uppercase tracking-wider text-[11px] flex items-center space-x-1">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Danger Zone</span>
            </h4>
            <p className="text-[11px] text-[#6B4E4B]">
              Deleting your account cancels active subscriptions and purges saved preferences.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold transition-colors flex items-center justify-center space-x-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account & Erase Personal Data</span>
            </button>
          </div>
        </div>
      )}

      {/* CREDITS (LIVE) VIEW - Phase 5: real backend, separate from the mock Stripe tab above */}
      {activeTab === 'credits' && (
        <div className="space-y-4 text-xs">
          {!liveUser ? (
            <AuthGate
              allowedRoles={['MEMBER', 'BARISTA', 'ADMIN']}
              title="Sign In to See Your Real Membership"
              subtitle="This tab talks to the real Social Cup backend - sign in or create an account to see live membership status, credit balance, and history."
              allowRegister
            />
          ) : (
            <>
              <AuthGate allowedRoles={['MEMBER', 'BARISTA', 'ADMIN']} title="Sign In" />

              {isLoadingCredits ? (
                <div className="h-32 bg-white rounded-2xl border border-[#8C5A3C]/20 shadow-sm animate-pulse" />
              ) : creditsError ? (
                <div className="bg-white border border-[#8C5A3C]/20 rounded-2xl p-5 text-center text-[#6B4E4B] shadow-sm">
                  {creditsError}
                </div>
              ) : (
                <>
                  <div className="bg-white border border-[#8C5A3C]/20 rounded-2xl p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#4B2E2B] uppercase tracking-wider text-[11px]">
                        Membership Status
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                          liveMembership?.status === 'ACTIVE'
                            ? 'bg-accent text-on-accent'
                            : 'bg-[#E8DED1] text-[#6B4E4B]'
                        }`}
                      >
                        {liveMembership?.status ?? 'INACTIVE'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#FFF8F0] p-3 rounded-xl border border-[#8C5A3C]/20">
                        <span className="text-[10px] text-[#6B4E4B] font-bold uppercase tracking-wider">
                          Credit Balance
                        </span>
                        <div className="text-2xl font-black text-[#8C5A3C] mt-0.5">
                          {liveMembership?.credits ?? 0} Credits
                        </div>
                      </div>
                      <div className="bg-[#FFF8F0] p-3 rounded-xl border border-[#8C5A3C]/20">
                        <span className="text-[10px] text-[#6B4E4B] font-bold uppercase tracking-wider">
                          Current Cycle
                        </span>
                        <div className="text-[11px] font-bold text-[#4B2E2B] mt-1">
                          {liveMembership?.cycle_start
                            ? `${formatMembershipDate(liveMembership.cycle_start)} – ${formatMembershipDate(liveMembership.end_date)}`
                            : 'Not active'}
                        </div>
                      </div>
                    </div>

                    {liveMembership?.cancelled_at && (
                      <div className="p-2.5 bg-[#FFF8F0] border border-[#8C5A3C]/20 rounded-xl text-[11px] text-[#6B4E4B]">
                        Canceled on {formatMembershipDate(liveMembership.cancelled_at)} - redemption access ended immediately.
                      </div>
                    )}

                    {liveMembership?.status === 'ACTIVE' && (
                      <button
                        onClick={handleCancelLiveMembership}
                        disabled={isCanceling}
                        className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold text-[11px] disabled:opacity-50"
                      >
                        {isCanceling ? 'Canceling...' : 'Cancel Membership'}
                      </button>
                    )}
                    {cancelMessage && <p className="text-[11px] text-[#6B4E4B]">{cancelMessage}</p>}
                  </div>

                  {/* Dev-only activation - deliberately not styled like a payment button */}
                  <div className="bg-white border-2 border-dashed border-[#C08552]/40 rounded-2xl p-4 space-y-2">
                    <span className="block text-[11px] font-black uppercase tracking-widest text-[#8C5A3C]">
                      Local Dev Only — Not A Real Payment
                    </span>
                    <button
                      onClick={handleActivateTestMembership}
                      disabled={isActivating}
                      className="w-full py-2.5 bg-[#4B2E2B] hover:bg-[#3D2523] text-[#FFF8F0] rounded-xl font-black disabled:opacity-50"
                    >
                      {isActivating ? 'Activating...' : 'Activate Test Membership'}
                    </button>
                    {activateMessage && <p className="text-[#6B4E4B] pt-1">{activateMessage}</p>}
                  </div>

                  <div className="bg-white border border-[#8C5A3C]/20 rounded-2xl p-4 space-y-2 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <History className="w-3.5 h-3.5 text-[#8C5A3C]" />
                      <span className="font-bold text-[#4B2E2B] uppercase tracking-wider text-[11px]">
                        Credit History
                      </span>
                    </div>
                    {creditHistory.length === 0 ? (
                      <p className="text-[#6B4E4B]">No credit transactions yet.</p>
                    ) : (
                      creditHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-2.5 bg-[#FFF8F0] rounded-xl border border-[#8C5A3C]/15"
                        >
                          <div>
                            <div className="font-bold text-[#4B2E2B] capitalize">{entry.type.toLowerCase()}</div>
                            <div className="text-[10px] text-[#6B4E4B]">
                              {new Date(entry.created_at).toLocaleString()}
                            </div>
                          </div>
                          <span className={`font-black ${entry.amount >= 0 ? 'text-[#8C5A3C]' : 'text-red-600'}`}>
                            {entry.amount >= 0 ? '+' : ''}
                            {entry.amount} credits
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* DIARY (LIVE) VIEW - Phase 9: real Drink Diary tied to actual redemptions */}
      {activeTab === 'diary_live' && (
        <div className="space-y-3 text-xs">
          {!liveUser ? (
            <div className="bg-white border border-[#8C5A3C]/20 rounded-2xl p-5 text-center space-y-2 shadow-sm">
              <Coffee className="w-8 h-8 text-[#8C5A3C] mx-auto" />
              <p className="text-[#6B4E4B]">Sign in (from the Credits tab, or anywhere else in the app) to see your real Drink Diary.</p>
            </div>
          ) : isLoadingDiary ? (
            <div className="h-32 bg-white rounded-2xl border border-[#8C5A3C]/20 shadow-sm animate-pulse" />
          ) : diaryError ? (
            <div className="bg-white border border-[#8C5A3C]/20 rounded-2xl p-5 text-center text-[#6B4E4B] shadow-sm">
              {diaryError}
            </div>
          ) : redeemedHistory.length === 0 ? (
            <div className="bg-white border border-[#8C5A3C]/20 rounded-2xl p-8 text-center space-y-2 shadow-sm">
              <Award className="w-10 h-10 text-[#8C5A3C] mx-auto" />
              <h4 className="text-sm font-bold text-[#4B2E2B]">No Redeemed Drinks Yet</h4>
              <p className="text-xs text-[#6B4E4B] max-w-xs mx-auto">
                Redeem a drink at a partner cafe to start your real Drink Diary.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#4B2E2B]">
                  Real Drink Diary (From Actual Redemptions)
                </h3>
                <span className="text-[10px] text-[#6B4E4B] font-mono">
                  {redeemedHistory.length} Redeemed
                </span>
              </div>
              {redeemedHistory.map((entry) => {
                const existingReview = myReviews.find((r) => r.redemption_id === entry.id) ?? null;
                return (
                  <DrinkDiaryEntry
                    key={entry.id}
                    cafeName={entry.cafe_name}
                    drinkName={entry.drink_name}
                    drinkImageUrl={entry.drink_image_url}
                    redeemedAt={entry.redeemed_at}
                    review={
                      existingReview
                        ? { id: existingReview.id, rating: existingReview.rating, note: existingReview.note }
                        : null
                    }
                    onSubmit={(rating, note) => handleSubmitReview(entry.id, rating, note)}
                    onUpdate={handleUpdateReview}
                    onDelete={handleDeleteReview}
                  />
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};
