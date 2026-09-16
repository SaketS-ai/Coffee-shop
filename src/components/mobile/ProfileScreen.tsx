import React, { useEffect, useState } from 'react';
import { store } from '../../services/store';
import {
  api,
  resolveAssetUrl,
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
  Coffee,
  LogOut,
  RotateCcw,
  Calendar,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  Camera,
  Loader2,
  Upload,
} from 'lucide-react';

interface ProfileScreenProps {
  onOpenCheckout: () => void;
  onOpenAuth: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onOpenCheckout, onOpenAuth }) => {
  const member = store.getMember();
  const ratings = store.getRatings().filter((r) => r.memberId === member.id);
  const sortedRatings = [...ratings].sort((a, b) => b.stars - a.stars);

  const [activeTab, setActiveTab] = useState<'diary' | 'credits' | 'settings'>('diary');
  const [showCancelNotice, setShowCancelNotice] = useState(false);

  const { user: liveUser, logout, updateUser } = useAuth();

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const displayAvatar = liveUser?.profile_image_url
    ? resolveAssetUrl(liveUser.profile_image_url)
    : member.avatarUrl;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setAvatarError('Please select a JPG, PNG, WEBP, or GIF image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be 5MB or smaller.');
      return;
    }

    setAvatarError(null);
    setIsUploadingAvatar(true);

    try {
      if (liveUser) {
        const res = await api.uploadAvatar(file);
        updateUser({ profile_image_url: res.image_url });
        store.updateMemberProfile({ avatarUrl: resolveAssetUrl(res.image_url) });
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            store.updateMemberProfile({ avatarUrl: reader.result });
          }
        };
        reader.readAsDataURL(file);
      }
      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 3500);
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to upload profile picture.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [liveMembership, setLiveMembership] = useState<MembershipInfo | null>(null);
  const [creditHistory, setCreditHistory] = useState<CreditLedgerEntryApi[]>([]);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [activateMessage, setActivateMessage] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

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
    await api.createReview({ redemptionId, rating, note: note.trim() || null });
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

  // Reviews submitted directly against a drink (e.g. from the cafe page's
  // "Rate without redeeming" flow) have no redemption_id, so they never
  // match an entry in redeemedHistory - shown as their own diary section.
  const directReviews = myReviews.filter((r) => !r.redemption_id);

  const handleActivateTestMembership = async () => {
    setIsActivating(true);
    setActivateMessage(null);
    try {
      const { created } = await api.activateDevMembership();
      setActivateMessage(
        created
          ? 'Test membership activated — 30 credits granted.'
          : 'Membership already active for this period — no new credits granted.'
      );
      await loadMembershipData();
    } catch (err: any) {
      setActivateMessage(err.message || 'Failed to activate.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleCancelLiveMembership = async () => {
    if (!window.confirm('Cancel your Social Cup membership? This takes effect immediately — you will lose redemption access right away.')) {
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

  const currentCredits = liveMembership ? liveMembership.credits : member.credits;
  const isSubscriber = liveMembership ? liveMembership.status === 'ACTIVE' : member.accountState === 'member';
  const totalCreditsAllocated = 30;
  const creditsPercentage = Math.min(100, Math.max(0, (currentCredits / totalCreditsAllocated) * 100));

  // Compute cupping metrics. A logged-in user's stats always come from real
  // API data (redemptions + direct-drink reviews) - falling back to the mock
  // store here would show fabricated numbers on a real account just because
  // it happens to have no redemptions yet.
  const totalCupsTasted = liveUser ? redeemedHistory.length + directReviews.length : ratings.length;
  const uniqueCafesVisited = liveUser
    ? new Set([
        ...redeemedHistory.map((e) => e.cafe_name),
        ...directReviews.map((r) => r.cafe_name),
      ]).size
    : new Set(ratings.map((r) => r.cafeName)).size;
  const averageRating = (liveUser && myReviews.length > 0)
    ? (myReviews.reduce((acc, r) => acc + r.rating, 0) / myReviews.length).toFixed(1)
    : ratings.length > 0
    ? (ratings.reduce((acc, r) => acc + r.stars, 0) / ratings.length).toFixed(1)
    : '5.0';

  return (
    <div className="space-y-6 pb-20 text-[#241A16] max-w-5xl mx-auto w-full">
      {/* ========================================================================= */}
      {/* LUXURY DIGITAL MEMBERSHIP PASS (Visual Rhythm: Deep Espresso Section)     */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl text-[#F3E7D5] shadow-2xl border-2 border-[#C58A55]/40 bg-gradient-to-br from-[#1E1411] via-[#251814] to-[#3A2720] p-6 caramel-glow-sm">
        {/* Subtle holographic sheen animation */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent -translate-x-full animate-shimmer-pass pointer-events-none" />

        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-[#C58A55]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header: Brand Monogram & Tier Status */}
        <div className="relative z-10 flex items-center justify-between pb-5 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C58A55] to-[#6F4E3D] flex items-center justify-center shadow-md border border-[#C58A55]/40">
              <Coffee className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <div>
              <span className="font-editorial text-sm tracking-wider uppercase font-bold text-[#D6A36F] block leading-tight">
                Social Cup Pass
              </span>
              <span className="text-[9px] font-mono tracking-widest text-[#B9A28F] uppercase">
                Dallas Roasters Guild
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full border flex items-center space-x-1 ${
                isSubscriber
                  ? 'bg-[#537A5A]/30 text-[#74A87C] border-[#537A5A]/50 shadow-xs'
                  : 'bg-[#C58A55]/20 text-[#D6A36F] border-[#C58A55]/40 shadow-xs'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>{isSubscriber ? 'Active Pass' : 'Visitor Pass'}</span>
            </span>
          </div>
        </div>

        {/* Member Profile Main Block */}
        <div className="relative z-10 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative shrink-0">
              <img
                src={displayAvatar}
                alt={liveUser ? liveUser.name : member.name}
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#B98252]/60 shadow-lg ring-2 ring-black/40 cursor-pointer hover:border-[#B98252] transition-colors"
                title="Click to change profile picture"
              />

              {isUploadingAvatar ? (
                <div className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center backdrop-blur-xs">
                  <Loader2 className="w-5 h-5 text-[#B98252] animate-spin" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#B98252] hover:bg-[#A37244] border-2 border-[#241A16] flex items-center justify-center text-[#FBF8F2] shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                  title="Upload profile picture"
                  aria-label="Upload profile picture"
                >
                  <Camera className="w-3 h-3" />
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleAvatarChange}
                className="hidden"
                disabled={isUploadingAvatar}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#FBF8F2] tracking-tight truncate">
                  {liveUser ? liveUser.name : member.name}
                </h2>
                <button
                  onClick={onOpenAuth}
                  className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  title="Edit Profile"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-[#DDD4C8] font-normal truncate mt-0.5">
                {liveUser ? liveUser.email : member.email}
              </p>
              <div className="mt-1 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="text-[11px] text-[#B98252] hover:text-[#E8DCC8] underline flex items-center space-x-1 font-medium transition-colors"
                >
                  <Upload className="w-3 h-3 inline mr-1" />
                  <span>{isUploadingAvatar ? 'Uploading photo...' : 'Change profile photo'}</span>
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-[#DDD4C8] border border-white/10">
                  📍 {member.homeNeighborhood}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-[#B98252] border border-[#B98252]/30">
                  #SC-2026-{(liveUser?.id || member.id).slice(0, 6).toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
            {liveUser && (
              <button
                onClick={logout}
                className="py-1.5 px-3 bg-white/5 hover:bg-[#A3483E]/20 text-[#A3483E] hover:text-red-300 border border-white/10 rounded-xl text-[11px] font-medium flex items-center space-x-1.5 transition-all shadow-xs"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            )}
            <button
              onClick={() => {
                store.resetToDemoData();
                window.location.reload();
              }}
              className="py-1.5 px-3 bg-white/5 hover:bg-white/10 text-[#DDD4C8] hover:text-white border border-white/10 rounded-xl text-[11px] font-medium flex items-center space-x-1.5 transition-all"
              title="Reset Demo Data"
            >
              <RotateCcw className="w-3 h-3 text-[#B98252]" />
              <span>Reset Demo</span>
            </button>
          </div>
        </div>

        {avatarError && (
          <div className="relative z-10 my-3 p-3 bg-rose-950/80 border border-rose-700/80 rounded-2xl text-rose-200 text-xs flex items-center justify-between shadow-sm">
            <span>{avatarError}</span>
            <button
              onClick={() => setAvatarError(null)}
              className="text-rose-400 hover:text-white ml-2 font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}
        {avatarSuccess && (
          <div className="relative z-10 my-3 p-3 bg-emerald-950/80 border border-emerald-700/80 rounded-2xl text-emerald-200 text-xs flex items-center space-x-2 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Profile picture updated successfully!</span>
          </div>
        )}

        {/* Credit Gauge & Cycle Bar */}
        <div className="relative z-10 pt-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#DDD4C8] block">
                Credits Remaining
              </span>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="font-editorial text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-[#FBF8F2] to-[#B98252]">
                  {currentCredits}
                </span>
                <span className="text-xs font-mono text-[#DDD4C8]/70">
                  / {totalCreditsAllocated} monthly
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#DDD4C8] block">
                Billing Cycle
              </span>
              <span className="text-xs font-semibold text-white/90 flex items-center justify-end space-x-1 mt-1">
                <Clock className="w-3 h-3 text-[#B98252]" />
                <span>
                  {liveMembership?.cycle_start
                    ? `${formatMembershipDate(liveMembership.cycle_start)} – ${formatMembershipDate(liveMembership.end_date)}`
                    : member.renewalDate}
                </span>
              </span>
            </div>
          </div>

          {/* Glowing Caramel Progress Bar */}
          <div className="w-full bg-white/10 rounded-full h-2.5 p-0.5 border border-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#B98252] via-[#A85F45] to-[#B98252] shadow-sm transition-all duration-700"
              style={{ width: `${creditsPercentage}%` }}
            />
          </div>
        </div>

        {/* Visitor CTA if unsubscribed */}
        {!isSubscriber && (
          <div className="relative z-10 mt-5 pt-4 border-t border-white/10">
            <button
              onClick={onOpenCheckout}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#B98252] to-[#A85F45] hover:opacity-95 text-[#FBF8F2] font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-lg transition-all active:scale-[0.99] border border-white/20"
            >
              <Sparkles className="w-4 h-4 fill-white text-white" />
              <span>Unlock 30 Drink Credits — $24.99/mo</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. SEGMENTED TABS                                                         */}
      {/* ========================================================================= */}
      <div className="bg-[#FBF8F2] p-1.5 rounded-2xl border border-[#DDD4C8] flex space-x-1 shadow-xs">
        <button
          onClick={() => setActiveTab('diary')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'diary'
              ? 'bg-[#241A16] text-[#FBF8F2] shadow-md'
              : 'text-[#756B63] hover:text-[#241A16] hover:bg-[#F5F0E8]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Coffee Journal</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20 ml-1">
            {totalCupsTasted}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('credits')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'credits'
              ? 'bg-[#241A16] text-[#FBF8F2] shadow-md'
              : 'text-[#756B63] hover:text-[#241A16] hover:bg-[#F5F0E8]'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Credits & Pass</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'settings'
              ? 'bg-[#241A16] text-[#FBF8F2] shadow-md'
              : 'text-[#756B63] hover:text-[#241A16] hover:bg-[#F5F0E8]'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Plan & Settings</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COFFEE JOURNAL (Tasting Notes, Metrics, & Timeline)                  */}
      {/* ========================================================================= */}
      {activeTab === 'diary' && (
        <div className="space-y-4">
          {/* Cupping Metrics Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-[#FBF8F2] border border-[#DDD4C8] rounded-2xl p-3 text-center shadow-xs">
              <span className="text-[10px] font-mono uppercase text-[#756B63] tracking-wider block">
                Cups Tasted
              </span>
              <span className="font-editorial text-2xl font-bold text-[#241A16] mt-0.5 block">
                {totalCupsTasted}
              </span>
            </div>

            <div className="bg-[#FBF8F2] border border-[#DDD4C8] rounded-2xl p-3 text-center shadow-xs">
              <span className="text-[10px] font-mono uppercase text-[#756B63] tracking-wider block">
                Roasters Visited
              </span>
              <span className="font-editorial text-2xl font-bold text-[#6B4A3A] mt-0.5 block">
                {uniqueCafesVisited}
              </span>
            </div>

            <div className="bg-[#FBF8F2] border border-[#DDD4C8] rounded-2xl p-3 text-center shadow-xs">
              <span className="text-[10px] font-mono uppercase text-[#756B63] tracking-wider block">
                Avg Rating
              </span>
              <div className="flex items-center justify-center space-x-1 mt-0.5">
                <Star className="w-4 h-4 text-[#B98252] fill-[#B98252]" />
                <span className="font-editorial text-2xl font-bold text-[#241A16]">
                  {averageRating}
                </span>
              </div>
            </div>
          </div>

          {/* Live User Drink Diary */}
          {liveUser ? (
            <>
            {isLoadingDiary ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-28 bg-[#FBF8F2] rounded-2xl border border-[#DDD4C8] animate-pulse" />
                ))}
              </div>
            ) : diaryError ? (
              <div className="bg-[#FBF8F2] border border-[#A3483E]/40 rounded-2xl p-4 text-center text-xs text-[#A3483E] shadow-sm">
                {diaryError}
              </div>
            ) : redeemedHistory.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#756B63] font-bold">
                    Chronological Cupping Log ({redeemedHistory.length})
                  </h3>
                  <span className="text-[11px] text-[#6B4A3A] font-semibold">
                    Live Postgres Redemptions
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
              </div>
            ) : directReviews.length === 0 ? (
              <div className="bg-[#FBF8F2] border border-[#DDD4C8] rounded-3xl p-8 text-center space-y-3 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-[#F5F0E8] flex items-center justify-center mx-auto text-[#6B4A3A]">
                  <Coffee className="w-6 h-6 stroke-[2]" />
                </div>
                <h4 className="font-editorial text-base font-bold text-[#241A16]">
                  Your Cupping Journal is Clean
                </h4>
                <p className="text-xs text-[#756B63] max-w-sm mx-auto leading-relaxed">
                  Redeem any artisanal pour-over, cold brew, or espresso at a Dallas partner roaster to unlock your first diary entry and tasting notes.
                </p>
              </div>
            ) : null}

            {!isLoadingDiary && !diaryError && directReviews.length > 0 && (
              <div className="space-y-3 mt-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#756B63] font-bold">
                    Tasted Without Redeeming ({directReviews.length})
                  </h3>
                </div>
                {directReviews.map((entry) => (
                  <DrinkDiaryEntry
                    key={entry.id}
                    cafeName={entry.cafe_name}
                    drinkName={entry.drink_name}
                    drinkImageUrl={entry.drink_image_url}
                    redeemedAt={null}
                    review={{ id: entry.id, rating: entry.rating, note: entry.note }}
                    onSubmit={async () => {}}
                    onUpdate={handleUpdateReview}
                    onDelete={handleDeleteReview}
                  />
                ))}
              </div>
            )}
            </>
          ) : (
            /* Visitor / Mock Demo Ratings */
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#756B63] font-bold">
                  Curator Cupping Log ({sortedRatings.length})
                </h3>
                <span className="text-[11px] text-[#6B4A3A] font-semibold">
                  Dallas Connoisseur
                </span>
              </div>

              {sortedRatings.length === 0 ? (
                <div className="bg-[#FBF8F2] border border-[#DDD4C8] rounded-3xl p-8 text-center space-y-2 shadow-sm">
                  <Award className="w-10 h-10 text-[#6B4A3A] mx-auto" />
                  <h4 className="font-editorial text-sm font-bold text-[#241A16]">No Drinks Logged Yet</h4>
                  <p className="text-xs text-[#756B63]">
                    Visit partner cafes, redeem a drink, and share your cupping score!
                  </p>
                </div>
              ) : (
                sortedRatings.map((rating) => (
                  <div
                    key={rating.id}
                    className="bg-[#FBF8F2] border border-[#DDD4C8] rounded-2xl p-4 space-y-2.5 hover:border-[#B98252] transition-colors shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-editorial text-base font-bold text-[#241A16]">
                          {rating.drinkName}
                        </h4>
                        <span className="text-xs text-[#6B4A3A] font-medium flex items-center space-x-1 mt-0.5">
                          <span>📍 {rating.cafeName}</span>
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 bg-[#F5F0E8] border border-[#DDD4C8] px-2.5 py-1 rounded-xl">
                        <Star className="w-3.5 h-3.5 text-[#B98252] fill-[#B98252]" />
                        <span className="text-xs font-bold text-[#241A16]">{rating.stars}.0</span>
                      </div>
                    </div>

                    {rating.note && (
                      <p className="text-xs text-[#241A16] bg-[#F5F0E8] p-3 rounded-xl border border-[#DDD4C8] italic font-serif leading-relaxed">
                        "{rating.note}"
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-[#756B63] font-mono pt-1 border-t border-[#DDD4C8]">
                      <span>Verified Tasting</span>
                      <span>{new Date(rating.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CREDITS & PASS (Postgres Live Engine, Dev Activator, & Ledger)      */}
      {/* ========================================================================= */}
      {activeTab === 'credits' && (
        <div className="space-y-4 text-xs">
          {!liveUser ? (
            <AuthGate
              allowedRoles={['MEMBER', 'BARISTA', 'ADMIN']}
              title="Sign In to Access Real Membership Pass"
              subtitle="Connect with your Social Cup credentials to view live credit ledger, cycle dates, and real-time backend redemptions."
              allowRegister
            />
          ) : (
            <>
              {isLoadingCredits ? (
                <div className="h-40 bg-[#FBF8F2] rounded-3xl border border-[#DDD4C8] shadow-sm animate-pulse" />
              ) : creditsError ? (
                <div className="bg-[#FBF8F2] border border-[#A3483E]/40 rounded-3xl p-6 text-center text-[#A3483E] shadow-sm">
                  {creditsError}
                </div>
              ) : (
                <>
                  {/* Real Live Membership Card */}
                  <div className="bg-[#FBF8F2] border border-[#DDD4C8] rounded-3xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 text-[#6B4A3A]" />
                        <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#241A16]">
                          Live Membership Pass
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-3 py-1 rounded-full ${
                          liveMembership?.status === 'ACTIVE'
                            ? 'bg-[#4E6348]/20 text-[#4E6348] border border-[#4E6348]/40'
                            : 'bg-[#F5F0E8] text-[#756B63]'
                        }`}
                      >
                        {liveMembership?.status ?? 'INACTIVE'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#F5F0E8] p-3.5 rounded-2xl border border-[#DDD4C8]">
                        <span className="text-[10px] font-mono text-[#756B63] uppercase tracking-wider">
                          Real-time Balance
                        </span>
                        <div className="font-editorial text-2xl font-bold text-[#6B4A3A] mt-1">
                          {liveMembership?.credits ?? 0} Credits
                        </div>
                      </div>

                      <div className="bg-[#F5F0E8] p-3.5 rounded-2xl border border-[#DDD4C8]">
                        <span className="text-[10px] font-mono text-[#756B63] uppercase tracking-wider">
                          Cycle Window
                        </span>
                        <div className="text-[11px] font-bold text-[#241A16] mt-1.5 leading-snug">
                          {liveMembership?.cycle_start
                            ? `${formatMembershipDate(liveMembership.cycle_start)} – ${formatMembershipDate(liveMembership.end_date)}`
                            : 'Not active'}
                        </div>
                      </div>
                    </div>

                    {liveMembership?.cancelled_at && (
                      <div className="p-3 bg-[#A3483E]/10 border border-[#A3483E]/30 rounded-2xl text-[11px] text-[#A3483E]">
                        Canceled on {formatMembershipDate(liveMembership.cancelled_at)} — redemption access ended immediately.
                      </div>
                    )}

                    {liveMembership?.status === 'ACTIVE' && (
                      <button
                        onClick={handleCancelLiveMembership}
                        disabled={isCanceling}
                        className="w-full py-2.5 px-3 bg-[#A3483E]/10 hover:bg-[#A3483E]/20 text-[#A3483E] border border-[#A3483E]/30 rounded-xl font-bold text-xs transition-colors disabled:opacity-50"
                      >
                        {isCanceling ? 'Canceling...' : 'Cancel Real Membership'}
                      </button>
                    )}
                    {cancelMessage && <p className="text-[11px] text-[#756B63]">{cancelMessage}</p>}
                  </div>

                  {/* Dev Sandbox Quick-Credits Tool */}
                  <div className="bg-[#F5F0E8] border-2 border-dashed border-[#B98252]/50 rounded-3xl p-5 space-y-2.5">
                    <div className="flex items-center space-x-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#B98252]" />
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#6B4A3A]">
                        Developer Sandbox Tool
                      </span>
                    </div>
                    <p className="text-[11px] text-[#756B63]">
                      Instantly grant a live 30-credit test cycle directly into your Postgres database.
                    </p>
                    <button
                      onClick={handleActivateTestMembership}
                      disabled={isActivating}
                      className="w-full py-2.5 bg-[#241A16] hover:bg-[#3A2922] text-[#FBF8F2] rounded-xl font-bold transition-all disabled:opacity-50 shadow-xs flex items-center justify-center space-x-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#B98252]" />
                      <span>{isActivating ? 'Granting Credits...' : 'Activate 30 Test Credits'}</span>
                    </button>
                    {activateMessage && (
                      <p className="text-[11px] text-[#4E6348] font-medium bg-[#4E6348]/10 p-2 rounded-lg border border-[#4E6348]/30">
                        {activateMessage}
                      </p>
                    )}
                  </div>

                  {/* Live Credit Ledger History */}
                  <div className="bg-[#FBF8F2] border border-[#DDD4C8] rounded-3xl p-5 space-y-3 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <History className="w-4 h-4 text-[#6B4A3A]" />
                      <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#241A16]">
                        Credit Ledger Activity
                      </span>
                    </div>

                    {creditHistory.length === 0 ? (
                      <div className="text-center py-6 text-[#756B63]">
                        No credit transactions logged yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {creditHistory.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between p-3 bg-[#F5F0E8] rounded-2xl border border-[#DDD4C8] hover:border-[#B98252] transition-colors"
                          >
                            <div className="flex items-center space-x-2.5">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                  entry.amount >= 0 ? 'bg-[#4E6348]/20 text-[#4E6348]' : 'bg-[#A3483E]/20 text-[#A3483E]'
                                }`}
                              >
                                {entry.amount >= 0 ? (
                                  <ArrowDownLeft className="w-4 h-4" />
                                ) : (
                                  <ArrowUpRight className="w-4 h-4" />
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-[#241A16] capitalize text-xs">
                                  {entry.type.replace('_', ' ').toLowerCase()}
                                </div>
                                <div className="text-[10px] text-[#756B63] font-mono">
                                  {new Date(entry.created_at).toLocaleString()}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <span
                                className={`font-mono text-xs font-black ${
                                  entry.amount >= 0 ? 'text-[#4E6348]' : 'text-[#A3483E]'
                                }`}
                              >
                                {entry.amount >= 0 ? '+' : ''}
                                {entry.amount} cr
                              </span>
                              <div className="text-[10px] text-[#756B63] font-mono">
                                Bal: {entry.balance_after}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PLAN & SETTINGS (Card Management, Renewal, & Account Danger Zone)  */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-4 text-xs">
          {/* Billing Card Details */}
          <div className="bg-[#FBF8F2] border border-[#DDD4C8] rounded-3xl p-5 space-y-3 shadow-sm">
            <h4 className="font-mono text-xs uppercase tracking-wider font-bold text-[#241A16]">
              Stripe Customer & Card Management
            </h4>
            <div className="p-3.5 bg-[#F5F0E8] rounded-2xl border border-[#DDD4C8] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#241A16] text-[#FBF8F2] flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-[#241A16] block">Visa ending in 4242</span>
                  <span className="text-[10px] text-[#756B63]">Expires 08/29</span>
                </div>
              </div>
              <button
                onClick={() => alert('Opening Stripe Payment Update Page...')}
                className="text-[#6B4A3A] hover:text-[#241A16] font-bold text-xs flex items-center space-x-1 py-1 px-2.5 rounded-lg hover:bg-white transition-colors"
              >
                <span>Update</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[11px] text-[#756B63] leading-relaxed">
              Receipts and monthly renewal notices are automatically sent to {liveUser ? liveUser.email : member.email} by Stripe.
            </p>
          </div>

          {/* Subscription Controls */}
          <div className="bg-[#FBF8F2] border border-[#DDD4C8] rounded-3xl p-5 space-y-3 shadow-sm">
            <h4 className="font-mono text-xs uppercase tracking-wider font-bold text-[#241A16]">
              Subscription Controls
            </h4>

            {isSubscriber ? (
              <button
                onClick={handleCancelSubscription}
                className="w-full py-3 px-4 bg-[#A3483E]/10 hover:bg-[#A3483E]/20 text-[#A3483E] border border-[#A3483E]/30 rounded-2xl font-bold transition-colors text-left flex items-center justify-between"
              >
                <span>Cancel Membership Subscription</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onOpenCheckout}
                className="w-full py-3 px-4 bg-[#241A16] text-[#FBF8F2] rounded-2xl font-bold transition-colors text-left flex items-center justify-between shadow-sm"
              >
                <span>Re-subscribe to Social Cup ($24.99/mo)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {showCancelNotice && (
              <div className="p-3 bg-[#F5F0E8] border border-[#DDD4C8] rounded-2xl text-[#241A16] text-[11px]">
                Subscription canceled. Remaining credits will stay active until the end of your billing period.
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="bg-[#FBF8F2] border border-[#A3483E]/30 rounded-3xl p-5 space-y-3 shadow-sm">
            <h4 className="font-mono text-xs uppercase tracking-wider font-bold text-[#A3483E] flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-[#A3483E]" />
              <span>Danger Zone</span>
            </h4>
            <p className="text-[11px] text-[#756B63] leading-relaxed">
              Deleting your account purges saved preferences, resets cupping logs, and cancels active subscriptions.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="w-full py-2.5 px-3 bg-[#A3483E]/10 hover:bg-[#A3483E]/20 text-[#A3483E] border border-[#A3483E]/30 rounded-xl font-bold transition-colors flex items-center justify-center space-x-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account & Erase Personal Data</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
