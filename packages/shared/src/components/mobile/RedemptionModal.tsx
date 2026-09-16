import React, { useEffect, useState } from 'react';
import { Drink, Cafe } from '../../types';
import { api, MembershipInfo, RedemptionApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { AuthGate } from '../common/AuthGate';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  X,
  Clock,
  CheckCircle2,
  QrCode as QrIcon,
  AlertTriangle,
  Star,
  Coffee,
  Sparkles,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface RedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cafe: Cafe;
  selectedDrink?: Drink;
  onOpenRating: (drink: Drink) => void;
}

export const RedemptionModal: React.FC<RedemptionModalProps> = ({
  isOpen,
  onClose,
  cafe,
  selectedDrink: initialDrink,
  onOpenRating,
}) => {
  const { user: liveUser } = useAuth();

  const [liveMembership, setLiveMembership] = useState<MembershipInfo | null>(null);
  const [isLoadingMembership, setIsLoadingMembership] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [isLoadingDrinks, setIsLoadingDrinks] = useState(false);
  const [drink, setDrink] = useState<Drink | undefined>(initialDrink);

  const [redemption, setRedemption] = useState<RedemptionApi | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  async function loadMembership() {
    setIsLoadingMembership(true);
    try {
      const membership = await api.getMembership();
      setLiveMembership(membership);
    } catch {
      setLiveMembership(null);
    } finally {
      setIsLoadingMembership(false);
    }
  }

  useEffect(() => {
    if (liveUser) loadMembership();
  }, [liveUser]);

  useEffect(() => {
    if (initialDrink) setDrink(initialDrink);
  }, [initialDrink]);

  // Load this cafe's drinks
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    async function loadDrinks() {
      setIsLoadingDrinks(true);
      try {
        const data = await api.getDrinksByCafe(cafe.id);
        if (!cancelled) {
          setDrinks(data);
          setDrink((prev) => prev ?? data[0]);
        }
      } catch {
        // fallback
      } finally {
        if (!cancelled) setIsLoadingDrinks(false);
      }
    }
    loadDrinks();
    return () => {
      cancelled = true;
    };
  }, [isOpen, cafe.id]);

  // Sync to active pending redemption
  useEffect(() => {
    if (!isOpen || !liveUser) return;
    let cancelled = false;
    async function checkCurrent() {
      try {
        const current = await api.getCurrentRedemption();
        if (!cancelled) setRedemption(current && current.status === 'PENDING' ? current : null);
      } catch {
        if (!cancelled) setRedemption(null);
      }
    }
    checkCurrent();
    return () => {
      cancelled = true;
    };
  }, [isOpen, liveUser]);

  // Countdown timer
  useEffect(() => {
    if (!redemption || redemption.status !== 'PENDING') return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(redemption.expires_at).getTime() - Date.now()) / 1000));
      setTimeLeftSeconds(diff);
      if (diff <= 0) {
        setErrorMsg('Code expired (5-minute window elapsed). Please generate a new code.');
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [redemption]);

  // Polling for barista scanning
  useEffect(() => {
    if (!redemption || redemption.status !== 'PENDING') return;
    const poll = setInterval(async () => {
      try {
        const current = await api.getCurrentRedemption();
        if (current && current.id === redemption.id && current.status !== 'PENDING') {
          setRedemption(current);
          if (current.status === 'REDEEMED') {
            await loadMembership();
            try {
              confetti({
                particleCount: 65,
                spread: 60,
                origin: { y: 0.6 },
                colors: ['#8C5A3C', '#C08552', '#3F5E4D', '#D4A373']
              });
            } catch {
              // best effort
            }
          }
        }
      } catch {
        // retry on next tick
      }
    }, 2500);
    return () => clearInterval(poll);
  }, [redemption]);

  // Draw QR code onto canvas
  const drawQrCode = (canvas: HTMLCanvasElement | null) => {
    if (!canvas || !redemption) return;
    QRCode.toCanvas(
      canvas,
      redemption.token,
      { width: 220, margin: 2, color: { dark: '#261612', light: '#FFFFFF' } },
      (error) => {
        if (error) console.error('QR code generation error:', error);
      }
    );
  };

  if (!isOpen) return null;

  const handleActivateTestMembership = async () => {
    setIsActivating(true);
    try {
      await api.activateDevMembership();
      await loadMembership();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to activate membership.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleConfirmRedeem = async () => {
    if (!drink) return;
    setErrorMsg('');
    setIsCreating(true);
    try {
      const created = await api.createRedemption(cafe.id, drink.id);
      setRedemption(created);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate redemption code.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelRedemption = async () => {
    try {
      await api.cancelCurrentRedemption();
    } catch {
      // best effort
    } finally {
      setRedemption(null);
      setErrorMsg('');
    }
  };

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = (timeLeftSeconds % 60).toString().padStart(2, '0');
  const balance = liveMembership?.credits ?? 0;
  const cost = drink?.creditPrice ?? 4;
  const redeemedDrink = redemption ? drinks.find((d) => d.id === redemption.drink_id) : drink;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-[#251814] border border-[#C58A55]/30 rounded-t-[32px] sm:rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl text-[#F3E7D5] animate-scale-in">
        {/* Header Bar */}
        <div className="bg-[#1E1411] px-5 py-4 border-b border-[#C58A55]/20 flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="flex items-center space-x-1.5 text-[10px] font-mono font-bold uppercase text-[#D6A36F] tracking-wider">
              <Coffee className="w-3.5 h-3.5" />
              <span>{cafe.neighborhood} • {cafe.name}</span>
            </div>
            <h3 className="font-editorial text-lg sm:text-xl font-bold text-white leading-tight mt-0.5">
              Counter Redemption
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[#B9A28F] hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {!liveUser ? (
            /* 1. AUTH GATE */
            <AuthGate
              allowedRoles={['MEMBER', 'BARISTA', 'ADMIN']}
              title="Sign In to Redeem"
              subtitle="Sign in or register to redeem your drink credits at this roastery counter."
              allowRegister
            />
          ) : isLoadingMembership ? (
            <div className="h-44 bg-[#1E1411] rounded-2xl animate-pulse" />
          ) : liveMembership?.status !== 'ACTIVE' ? (
            /* 2. NO ACTIVE MEMBERSHIP */
            <div className="space-y-4 text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-[#C58A55]/20 text-[#D6A36F] flex items-center justify-center mx-auto border border-[#C58A55]/30">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="font-editorial text-lg font-bold text-white">Active Membership Required</h4>
                <p className="text-xs text-[#B9A28F] max-w-xs mx-auto">
                  You need an active Social Cup Dallas pass (30 monthly credits) to redeem drinks.
                </p>
              </div>

              <div className="bg-[#1E1411] border border-[#C58A55]/30 rounded-2xl p-4 space-y-2 text-left">
                <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#D6A36F]">
                  Development Demo Mode
                </span>
                <button
                  onClick={handleActivateTestMembership}
                  disabled={isActivating}
                  className="w-full py-3 bg-gradient-to-r from-[#C58A55] to-[#8C4A32] hover:from-[#B37944] hover:to-[#7B3F2A] text-white rounded-xl font-bold text-xs shadow-md caramel-glow-sm transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
                >
                  {isActivating ? 'Activating...' : 'Activate Free Test Membership (30 Credits)'}
                </button>
                {errorMsg && <p className="text-[#B85D4F] font-bold text-xs">{errorMsg}</p>}
              </div>
            </div>
          ) : redemption && redemption.status === 'REDEEMED' ? (
            /* 3. SUCCESS "COFFEE UNLOCKED!" SCREEN */
            <div className="text-center py-6 space-y-5 animate-scale-in">
              <div className="w-20 h-20 bg-[#537A5A]/20 text-[#74A87C] rounded-3xl flex items-center justify-center mx-auto border-2 border-[#537A5A]/40 shadow-lg">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#74A87C] bg-[#537A5A]/20 px-3 py-1 rounded-full border border-[#537A5A]/30">
                  Coffee Unlocked
                </span>
                <h2 className="font-editorial text-2xl font-bold text-white pt-2">
                  {redeemedDrink?.name ?? 'Artisanal Drink'}
                </h2>
                <p className="text-xs text-[#B9A28F]">
                  Handcrafted with care at {cafe.name}. Enjoy your cup!
                </p>
              </div>

              <div className="bg-[#1E1411] p-3.5 rounded-2xl border border-[#C58A55]/30 text-xs flex items-center justify-between">
                <span className="text-[#B9A28F] font-medium">Credits Remaining:</span>
                <span className="font-bold text-[#D6A36F] text-sm">{balance} Credits</span>
              </div>

              <button
                onClick={() => {
                  setRedemption(null);
                  onClose();
                  if (redeemedDrink) onOpenRating(redeemedDrink);
                }}
                className="w-full py-3.5 bg-gradient-to-r from-[#C58A55] to-[#8C4A32] hover:from-[#B37944] hover:to-[#7B3F2A] text-white rounded-2xl font-bold text-xs shadow-md caramel-glow-sm transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
              >
                <Star className="w-4 h-4 fill-white text-white" />
                <span>Rate Drink & Add to Diary</span>
              </button>
            </div>
          ) : redemption && redemption.status === 'PENDING' ? (
            /* 4. ACTIVE QR CODE RITUAL SCREEN */
            <div className="space-y-5 text-center py-2 animate-scale-in">
              {/* Roaster & Drink Badge */}
              <div className="bg-[#1E1411] p-3.5 rounded-2xl border border-[#C58A55]/30 space-y-1 text-center">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#D6A36F]">
                  Show to Barista at Counter
                </span>
                <h4 className="font-editorial text-base sm:text-lg font-bold text-white">
                  {redeemedDrink?.name}
                </h4>
                <p className="text-[11px] text-[#B9A28F] font-medium">
                  {cafe.name} • {redemption.credit_price} Credits
                </p>
              </div>

              {/* High Contrast QR Canvas Box */}
              <div className="bg-white p-4 rounded-3xl border-2 border-[#C58A55]/40 shadow-xl inline-block relative">
                <canvas ref={drawQrCode} className="mx-auto rounded-xl" />
              </div>

              {/* 6-Digit Backup PIN Display */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#B9A28F]">
                  Backup 6-Digit Counter Code
                </span>
                <div>
                  <div className="font-mono text-xl sm:text-2xl font-black text-[#D6A36F] tracking-[0.25em] bg-[#1E1411] py-2 px-5 rounded-xl inline-block border border-[#C58A55]/40 shadow-inner">
                    {redemption.backup_code}
                  </div>
                </div>
              </div>

              {/* Animated Countdown Timer */}
              <div className="flex items-center justify-center space-x-2 text-xs font-bold text-[#D6A36F]">
                <Clock className="w-4 h-4 text-[#D6A36F]" />
                <span>Expires in {minutes}:{seconds}</span>
              </div>

              {errorMsg && (
                <div className="bg-[#B85D4F]/20 text-red-200 text-xs p-3 rounded-xl border border-[#B85D4F]/40">
                  {errorMsg}
                </div>
              )}

              {/* Cancel Button */}
              <button
                onClick={handleCancelRedemption}
                className="w-full py-2.5 text-xs text-[#B9A28F] hover:text-white font-bold rounded-xl border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel Redemption Code
              </button>
            </div>
          ) : (
            /* 5. CONFIRMATION STEP (Select Drink & Confirm) */
            <div className="space-y-4">
              {/* Drink Selector if multiple */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#261612] block">
                  Select Drink from {cafe.name}
                </label>
                <select
                  value={drink?.id || ''}
                  onChange={(e) => {
                    const found = drinks.find((d) => d.id === e.target.value);
                    if (found) setDrink(found);
                  }}
                  className="w-full bg-[#FDFBF7] border border-[#8C5A3C]/25 rounded-2xl py-2.5 px-3 text-xs font-semibold text-[#261612] focus:outline-none focus:border-[#C08552]"
                >
                  {drinks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.creditPrice} Credits (${d.retailPrice.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Drink Preview Card */}
              {drink && (
                <div className="bg-[#FDFBF7] rounded-2xl p-3.5 border border-[#8C5A3C]/18 flex items-center space-x-3">
                  <img
                    src={drink.imageUrl}
                    alt={drink.name}
                    className="w-14 h-14 rounded-xl object-cover border border-[#8C5A3C]/15"
                  />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <h4 className="font-editorial text-sm font-bold text-[#261612] truncate">
                      {drink.name}
                    </h4>
                    <p className="text-[11px] text-[#756B63] line-clamp-1 font-normal">
                      {drink.description || 'Specialty handcrafted roast.'}
                    </p>
                    <span className="text-[11px] font-bold text-[#6B4A3A]">
                      {drink.creditPrice} Credits Required
                    </span>
                  </div>
                </div>
              )}

              {/* Credit Balance Breakdown */}
              <div className="bg-[#FBF8F2] rounded-2xl p-3.5 border border-[#DDD4C8] space-y-2 text-xs">
                <div className="flex justify-between text-[#756B63]">
                  <span>Available Balance:</span>
                  <span className="font-bold text-[#241A16]">{balance} Credits</span>
                </div>
                <div className="flex justify-between text-[#6B4A3A] font-semibold">
                  <span>This Drink Cost:</span>
                  <span>- {cost} Credits</span>
                </div>
                <div className="pt-1.5 border-t border-[#DDD4C8] flex justify-between font-black text-[#241A16]">
                  <span>Remaining After:</span>
                  <span className={balance < cost ? 'text-[#A3483E]' : 'text-[#4E6348]'}>
                    {balance - cost} Credits
                  </span>
                </div>
              </div>

              {balance < cost ? (
                <div className="bg-[#A3483E]/10 border border-[#A3483E]/30 text-[#A3483E] p-3 rounded-xl text-xs space-y-1">
                  <p className="font-bold">Insufficient Credits</p>
                  <p>You have {balance} credits, but this drink requires {cost} credits.</p>
                </div>
              ) : null}

              {errorMsg && (
                <div className="bg-[#A3483E]/10 border border-[#A3483E]/30 text-[#A3483E] p-3 rounded-xl text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Primary Confirmation Action */}
              <button
                onClick={handleConfirmRedeem}
                disabled={isCreating || balance < cost}
                className="w-full py-3.5 bg-[#241A16] hover:bg-[#3A2922] text-[#FBF8F2] rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-95"
              >
                <QrIcon className="w-4 h-4" />
                <span>{isCreating ? 'Generating QR...' : 'Generate Counter QR Code'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
