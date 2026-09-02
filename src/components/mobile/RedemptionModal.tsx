import React, { useEffect, useRef, useState } from 'react';
import { Drink, Cafe, RedemptionCode } from '../../types';
import { store } from '../../services/store';
import QRCode from 'qrcode';
import { X, Clock, CheckCircle2, QrCode as QrIcon, AlertTriangle, Sparkles, Star } from 'lucide-react';

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
  const member = store.getMember();
  const drinks = store.getDrinks().filter((d) => d.cafeId === cafe.id && d.isActive);
  
  const [drink, setDrink] = useState<Drink | undefined>(initialDrink || drinks[0]);
  const [activeCode, setActiveCode] = useState<RedemptionCode | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(300); // 5 mins
  const [isRedeemed, setIsRedeemed] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (initialDrink) setDrink(initialDrink);
    else if (drinks.length > 0 && !drink) setDrink(drinks[0]);
  }, [initialDrink, cafe.id]);

  // Subscribe to store to catch instant barista scan completion
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      if (activeCode) {
        const codes = store.getRedemptionCodes();
        const updated = codes.find((c) => c.id === activeCode.id);
        if (updated && updated.status === 'redeemed') {
          setIsRedeemed(true);
        }
      }
    });
    return () => unsubscribe();
  }, [activeCode]);

  // Countdown Timer
  useEffect(() => {
    if (!activeCode || isRedeemed) return;

    const interval = setInterval(() => {
      const expiry = new Date(activeCode.expiresAt).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      
      setTimeLeftSeconds(diff);

      if (diff <= 0) {
        clearInterval(interval);
        setErrorMsg('Code expired (5 minute window elapsed). Please generate a new code.');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCode, isRedeemed]);

  // Draw Canvas QR Code when active code is generated
  useEffect(() => {
    if (activeCode && qrCanvasRef.current && !isRedeemed) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        activeCode.qrData,
        {
          width: 220,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('QR code generation error:', error);
        }
      );
    }
  }, [activeCode, isRedeemed]);

  if (!isOpen) return null;

  const handleConfirmRedeem = () => {
    if (!drink) return;
    setErrorMsg('');
    try {
      const codeObj = store.generateRedemptionCode(cafe.id, drink.id);
      setActiveCode(codeObj);
      setIsRedeemed(false);
      setTimeLeftSeconds(300);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate redemption code.');
    }
  };

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = (timeLeftSeconds % 60).toString().padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-100">
        {/* Header */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
              {cafe.neighborhood} • {cafe.name}
            </span>
            <h3 className="text-base font-extrabold text-slate-100">Counter Redemption</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* SUCCESS REDEEMED SCREEN */}
          {isRedeemed ? (
            <div className="text-center py-6 space-y-4 animate-in zoom-in-90 duration-300">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/40 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  Redemption Confirmed!
                </span>
                <h2 className="text-xl font-black text-slate-100 mt-1">{drink?.name}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enjoy your coffee at {cafe.name}!
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                <span className="text-slate-400">Remaining Balance:</span>
                <span className="font-bold text-amber-400 text-sm">
                  {store.getMember().credits} Credits
                </span>
              </div>

              {/* Prompt to rate drink */}
              <button
                onClick={() => {
                  onClose();
                  if (drink) onOpenRating(drink);
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20"
              >
                <Star className="w-4 h-4 fill-slate-950" />
                <span>Rate This Drink & Add to Diary</span>
              </button>
            </div>
          ) : activeCode ? (
            /* ACTIVE COUNTDOWN QR CODE SCREEN */
            <div className="space-y-4 text-center">
              {/* Countdown Banner */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between text-amber-400">
                <div className="flex items-center space-x-2 text-xs font-semibold">
                  <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Code Expires In:</span>
                </div>
                <span className="font-mono text-lg font-black tracking-wider">
                  {minutes}:{seconds}
                </span>
              </div>

              {/* QR Code Canvas */}
              <div className="bg-white p-4 rounded-2xl shadow-inner inline-block mx-auto border-4 border-slate-800">
                <canvas ref={qrCanvasRef} className="mx-auto" />
              </div>

              {/* 6-Digit Backup PIN Code */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  Barista Backup 6-Digit Code
                </span>
                <div className="font-mono text-2xl font-black tracking-widest text-amber-400">
                  {activeCode.code}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-snug">
                Show this QR or 6-digit code to the barista at {cafe.name}. Credits deduct automatically when scanned.
              </p>
            </div>
          ) : (
            /* DRINK PICKER & CONFIRM SCREEN */
            <div className="space-y-4">
              {/* Drink Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Select Drink to Redeem
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {drinks.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => setDrink(d)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        drink?.id === d.id
                          ? 'bg-amber-500/10 border-amber-500/50 text-slate-100 shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={d.imageUrl}
                          alt={d.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-slate-100">{d.name}</h4>
                          <span className="text-[10px] text-slate-400">
                            Retail: ${d.retailPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-amber-400">
                          {d.creditPrice} Credits
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Balance Summary */}
              {drink && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Current Credit Balance:</span>
                    <span className="font-semibold text-slate-200">{member.credits} Credits</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Drink Cost:</span>
                    <span className="font-semibold text-amber-400">-{drink.creditPrice} Credits</span>
                  </div>
                  <div className="border-t border-slate-800 pt-1.5 flex justify-between font-bold text-slate-200">
                    <span>Balance After Redeem:</span>
                    <span className="text-emerald-400">
                      {Math.max(0, member.credits - drink.creditPrice)} Credits
                    </span>
                  </div>
                </div>
              )}

              {/* Error Message Alert */}
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center space-x-2 text-red-400 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleConfirmRedeem}
                disabled={!drink || member.credits < (drink?.creditPrice || 0)}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 disabled:opacity-40"
              >
                <QrIcon className="w-4 h-4" />
                <span>Confirm & Show Counter Code</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
