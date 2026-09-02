import React, { useState } from 'react';
import { store } from '../../services/store';
import { X, CreditCard, ShieldCheck, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface StripeCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'google_pay'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expDate, setExpDate] = useState('12/28');
  const [cvc, setCvc] = useState('888');

  if (!isOpen) return null;

  const handleSubscribe = () => {
    setIsProcessing(true);
    setTimeout(() => {
      store.subscribeMember();
      setIsProcessing(false);
      
      // Fire celebration confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#6366f1'],
      });

      onSuccess();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Stripe Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-6 text-slate-950 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-amber-950 hover:text-slate-950 bg-amber-500/30 p-1.5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-950 mb-1">
            <Sparkles className="w-4 h-4 text-amber-950" />
            <span>Social Cup Dallas Pass</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">30 Drink Credits</h2>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold">$24.99</span>
            <span className="text-sm text-amber-950 font-semibold">/ month</span>
          </div>
          <p className="text-xs text-amber-950/80 mt-1 font-medium">
            Redeem 1 credit = $1.00 at any Dallas partner cafe. No contracts, cancel anytime.
          </p>
        </div>

        {/* Stripe Payment Sheet Content */}
        <div className="p-6 space-y-5 text-slate-200">
          {/* Quick Pay Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod('apple_pay')}
              className={`flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all ${
                paymentMethod === 'apple_pay'
                  ? 'bg-slate-100 text-slate-950 border-slate-100 shadow'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <span> Pay</span>
            </button>
            <button
              onClick={() => setPaymentMethod('google_pay')}
              className={`flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all ${
                paymentMethod === 'google_pay'
                  ? 'bg-slate-100 text-slate-950 border-slate-100 shadow'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <span>G Pay</span>
            </button>
          </div>

          <div className="flex items-center my-3">
            <div className="flex-1 border-t border-slate-800"></div>
            <span className="px-3 text-[11px] text-slate-500 uppercase tracking-widest font-semibold">
              Or pay with card
            </span>
            <div className="flex-1 border-t border-slate-800"></div>
          </div>

          {/* Card Form Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Card Information
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 pl-10 text-sm font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <CreditCard className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Expires
                </label>
                <input
                  type="text"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  placeholder="MM/YY"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-amber-500 text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  CVC / CVV
                </label>
                <input
                  type="text"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  placeholder="123"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-amber-500 text-center"
                />
              </div>
            </div>
          </div>

          {/* Guarantee Note */}
          <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>
              Secured by Stripe 256-bit encryption. Instant activation of 30 drink credits.
            </p>
          </div>

          {/* Pay Button */}
          <button
            onClick={handleSubscribe}
            disabled={isProcessing}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <span>Processing Subscription...</span>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Subscribe & Unlock 30 Credits ($24.99)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
