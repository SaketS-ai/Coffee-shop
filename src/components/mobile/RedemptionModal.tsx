import React, { useEffect, useState } from 'react';
import { Drink, Cafe } from '../../types';
import { api, MembershipInfo, RedemptionApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { AuthGate } from '../common/AuthGate';
import QRCode from 'qrcode';
import { X, Clock, CheckCircle2, QrCode as QrIcon, AlertTriangle, Star } from 'lucide-react';

interface RedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cafe: Cafe;
  selectedDrink?: Drink;
  onOpenRating: (drink: Drink) => void;
}

// Phase 6: a real, JWT-backed redemption flow, sharing the same AuthContext
// session as Profile/Barista/Admin - signing in here also signs the member
// in on the Profile screen's Credits/Diary tabs, and vice versa.
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

  // Load this cafe's real drink menu (with real credit prices) whenever the
  // modal opens or the cafe changes.
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
        // best-effort - picker just shows empty if this fails
      } finally {
        if (!cancelled) setIsLoadingDrinks(false);
      }
    }
    loadDrinks();
    return () => {
      cancelled = true;
    };
  }, [isOpen, cafe.id]);

  // On every open, sync to the real current redemption - only resume a
  // still-PENDING one; any REDEEMED/VOID/EXPIRED history is stale by
  // definition and must not resurrect an old success/error screen.
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

  // Countdown timer.
  useEffect(() => {
    if (!redemption || redemption.status !== 'PENDING') return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(redemption.expires_at).getTime() - Date.now()) / 1000));
      setTimeLeftSeconds(diff);
      if (diff <= 0) {
        setErrorMsg('Code expired (5 minute window elapsed). Please generate a new code.');
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [redemption]);

  // Poll for the barista-side scan completing this code, since it happens
  // from a different session entirely (no local pub-sub to catch it).
  useEffect(() => {
    if (!redemption || redemption.status !== 'PENDING') return;
    const poll = setInterval(async () => {
      try {
        const current = await api.getCurrentRedemption();
        if (current && current.id === redemption.id && current.status !== 'PENDING') {
          setRedemption(current);
          if (current.status === 'REDEEMED') await loadMembership();
        }
      } catch {
        // transient network hiccup - next tick retries
      }
    }, 3000);
    return () => clearInterval(poll);
  }, [redemption]);

  // Draws the QR code as soon as the canvas actually mounts - a callback
  // ref (rather than a plain ref read in a useEffect keyed on `redemption`)
  // so this fires at the real DOM-attach moment regardless of which render
  // pass that happens to land on; the countdown/picker branch logic below
  // can take an extra render to settle into the QR screen, and a
  // dependency-array effect would miss that first canvas mount entirely.
  // Content is the bare redemption token, nothing else (no PII, no JWT).
  const drawQrCode = (canvas: HTMLCanvasElement | null) => {
    if (!canvas || !redemption) return;
    QRCode.toCanvas(
      canvas,
      redemption.token,
      { width: 220, margin: 2, color: { dark: '#4B2E2B', light: '#ffffff' } },
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
      // best-effort
    } finally {
      setRedemption(null);
      setErrorMsg('');
    }
  };

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = (timeLeftSeconds % 60).toString().padStart(2, '0');
  const balance = liveMembership?.credits ?? 0;
  const redeemedDrink = redemption ? drinks.find((d) => d.id === redemption.drink_id) : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-[#4B2E2B]/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white border border-[#8C5A3C]/20 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl text-[#4B2E2B]">
        {/* Header */}
        <div className="bg-[#FFF8F0] p-4 border-b border-[#8C5A3C]/15 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8C5A3C] tracking-wider">
              {cafe.neighborhood} • {cafe.name}
            </span>
            <h3 className="text-base font-extrabold text-[#4B2E2B]">Counter Redemption</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[#6B4E4B] hover:text-[#4B2E2B] p-1.5 rounded-full hover:bg-[#F4EFE6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {!liveUser ? (
            /* AUTH GATE */
            <AuthGate
              allowedRoles={['MEMBER', 'BARISTA', 'ADMIN']}
              title="Sign In to Redeem"
              subtitle="Sign in or create an account to redeem a drink at the counter."
              allowRegister
            />
          ) : isLoadingMembership ? (
            <div className="h-32 bg-[#FFF8F0] rounded-2xl animate-pulse" />
          ) : liveMembership?.status !== 'ACTIVE' ? (
            /* NO ACTIVE MEMBERSHIP */
            <div className="space-y-3 text-center py-2">
              <AlertTriangle className="w-10 h-10 text-[#8C5A3C] mx-auto" />
              <h4 className="text-sm font-bold text-[#4B2E2B]">Active Membership Required</h4>
              <p className="text-xs text-[#6B4E4B]">
                You need an active Social Cup membership to redeem drinks at the counter.
              </p>
              <div className="bg-white border-2 border-dashed border-[#C08552]/40 rounded-2xl p-4 space-y-2 text-left">
                <span className="block text-[11px] font-black uppercase tracking-widest text-[#8C5A3C]">
                  Local Dev Only — Not A Real Payment
                </span>
                <button
                  onClick={handleActivateTestMembership}
                  disabled={isActivating}
                  className="w-full py-2.5 bg-[#4B2E2B] hover:bg-[#3D2523] text-[#FFF8F0] rounded-xl font-black text-xs disabled:opacity-50"
                >
                  {isActivating ? 'Activating...' : 'Activate Test Membership'}
                </button>
                {errorMsg && <p className="text-red-600 font-bold text-xs">{errorMsg}</p>}
              </div>
            </div>
          ) : redemption && redemption.status === 'REDEEMED' ? (
            /* SUCCESS REDEEMED SCREEN */
            <div className="text-center py-6 space-y-4 animate-in zoom-in-90 duration-300">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-200 shadow-xl">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                  Redemption Confirmed!
                </span>
                <h2 className="text-xl font-black text-[#4B2E2B] mt-1">{redeemedDrink?.name ?? 'Your drink'}</h2>
                <p className="text-xs text-[#6B4E4B] mt-1">Enjoy your coffee at {cafe.name}!</p>
              </div>

              <div className="bg-[#FFF8F0] p-3.5 rounded-xl border border-[#8C5A3C]/20 text-xs flex items-center justify-between">
                <span className="text-[#6B4E4B]">Remaining Balance:</span>
                <span className="font-bold text-[#8C5A3C] text-sm">{balance} Credits</span>
              </div>

              <button
                onClick={() => {
                  setRedemption(null);
                  onClose();
                  if (redeemedDrink) onOpenRating(redeemedDrink);
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#8C5A3C] to-[#4B2E2B] text-[#FFF8F0] font-black rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg"
              >
                <Star className="w-4 h-4 fill-[#FFF8F0]" />
                <span>Rate This Drink & Add to Diary</span>
              </button>
            </div>
          ) : redemption && redemption.status === 'PENDING' && timeLeftSeconds > 0 ? (
            /* ACTIVE COUNTDOWN QR CODE SCREEN */
            <div className="space-y-4 text-center">
              <div className="bg-[#FFF8F0] border border-[#C08552]/30 rounded-2xl p-3 flex items-center justify-between text-[#8C5A3C]">
                <div className="flex items-center space-x-2 text-xs font-semibold">
                  <Clock className="w-4 h-4 text-[#8C5A3C] animate-pulse" />
                  <span>Code Expires In:</span>
                </div>
                <span className="font-mono text-lg font-black tracking-wider">
                  {minutes}:{seconds}
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-inner inline-block mx-auto border-4 border-[#4B2E2B]">
                <canvas ref={drawQrCode} className="mx-auto" />
              </div>

              <div className="bg-[#FFF8F0] p-3 rounded-xl border border-[#8C5A3C]/20 space-y-1">
                <span className="text-[10px] text-[#6B4E4B] uppercase tracking-widest font-bold">
                  Barista Backup 6-Digit Code
                </span>
                <div className="font-mono text-2xl font-black tracking-widest text-[#8C5A3C]">
                  {redemption.backup_code}
                </div>
              </div>

              <p className="text-[11px] text-[#6B4E4B] leading-snug">
                Show this QR or 6-digit code to the barista at {cafe.name}. Credits deduct automatically when scanned.
              </p>

              <button onClick={handleCancelRedemption} className="text-[11px] text-[#8C5A3C] hover:underline font-bold">
                Cancel this code
              </button>
            </div>
          ) : (
            /* DRINK PICKER & CONFIRM SCREEN */
            <div className="space-y-4">
              {redemption && redemption.status !== 'PENDING' && (
                <div className="p-3 bg-[#FFF8F0] border border-[#8C5A3C]/20 rounded-xl text-[11px] text-[#6B4E4B]">
                  {redemption.status === 'VOID' ? 'Previous code canceled.' : 'Previous code expired.'} Generate a new
                  one below.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#6B4E4B] uppercase tracking-wider mb-1.5">
                  Select Drink to Redeem
                </label>
                {isLoadingDrinks ? (
                  <div className="h-24 bg-[#FFF8F0] rounded-xl animate-pulse" />
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {drinks.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => setDrink(d)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          drink?.id === d.id
                            ? 'bg-[#C08552]/10 border-[#C08552]/50 text-[#4B2E2B] shadow'
                            : 'bg-[#FFF8F0] border-[#8C5A3C]/20 text-[#6B4E4B] hover:border-[#C08552]/40'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={d.imageUrl}
                            alt={d.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div>
                            <h4 className="text-xs font-bold text-[#4B2E2B]">{d.name}</h4>
                            <span className="text-[10px] text-[#6B4E4B]">
                              Retail: ${d.retailPrice.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-[#8C5A3C]">
                            {d.creditPrice} Credits
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {drink && (
                <div className="bg-[#FFF8F0] p-3.5 rounded-xl border border-[#8C5A3C]/20 text-xs space-y-1.5">
                  <div className="flex justify-between text-[#6B4E4B]">
                    <span>Current Credit Balance:</span>
                    <span className="font-semibold text-[#4B2E2B]">{balance} Credits</span>
                  </div>
                  <div className="flex justify-between text-[#6B4E4B]">
                    <span>Drink Cost:</span>
                    <span className="font-semibold text-[#8C5A3C]">-{drink.creditPrice} Credits</span>
                  </div>
                  <div className="border-t border-[#8C5A3C]/20 pt-1.5 flex justify-between font-bold text-[#4B2E2B]">
                    <span>Balance After Redeem:</span>
                    <span className="text-emerald-600">
                      {Math.max(0, balance - drink.creditPrice)} Credits
                    </span>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-700 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                onClick={handleConfirmRedeem}
                disabled={!drink || isCreating || balance < (drink?.creditPrice ?? 0)}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#8C5A3C] to-[#4B2E2B] hover:from-[#8C5A3C] hover:to-[#7A4D32] text-[#FFF8F0] font-black rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg disabled:opacity-40"
              >
                <QrIcon className="w-4 h-4" />
                <span>{isCreating ? 'Generating...' : 'Confirm & Show Counter Code'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
