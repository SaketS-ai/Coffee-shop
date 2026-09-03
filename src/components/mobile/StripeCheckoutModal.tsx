import React, { useState } from 'react';
import { store } from '../../services/store';
import { X, CreditCard, ShieldCheck, CheckCircle2, Coffee } from 'lucide-react';
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
      
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#C08552', '#8C5A3C', '#FFF8F0', '#4B2E2B'],
      });

      onSuccess();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#4B2E2B]/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#3D2523] border border-[#C08552]/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in text-[#FFF8F0]">
        {/* Card Header - Warm Caramel to Roasted Brown */}
        <div className="bg-gradient-to-br from-[#C08552] to-[#8C5A3C] p-6 text-[#FFF8F0] relative overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#FFF8F0] hover:bg-[#4B2E2B]/20 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[#FFF8F0] mb-1">
            <Coffee className="w-4 h-4" />
            <span>Social Cup Dallas Pass</span>
          </div>

          <h2 className="text-2xl font-black tracking-tight">30 Drink Credits Pass</h2>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold">$24.99</span>
            <span className="text-sm font-bold text-[#FFF8F0]/90">/ month</span>
          </div>
          <p className="text-xs text-[#FFF8F0]/80 mt-1 font-semibold">
            Redeem 1 credit = $1.00 value at any partner cafe. Cancel anytime.
          </p>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod('apple_pay')}
              className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl border text-xs font-extrabold transition-all ${
                paymentMethod === 'apple_pay'
                  ? 'bg-[#C08552] text-[#FFF8F0] border-[#C08552] shadow-lg'
                  : 'bg-[#4B2E2B] border-[#C08552]/30 text-[#FFF8F0]/80'
              }`}
            >
              <span> Pay</span>
            </button>
            <button
              onClick={() => setPaymentMethod('google_pay')}
              className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl border text-xs font-extrabold transition-all ${
                paymentMethod === 'google_pay'
                  ? 'bg-[#C08552] text-[#FFF8F0] border-[#C08552] shadow-lg'
                  : 'bg-[#4B2E2B] border-[#C08552]/30 text-[#FFF8F0]/80'
              }`}
            >
              <span>G Pay</span>
            </button>
          </div>

          <div className="flex items-center my-3">
            <div className="flex-1 border-t border-[#C08552]/30"></div>
            <span className="px-3 text-[10px] text-[#FFF8F0]/60 uppercase tracking-widest font-black">
              Or Pay with Card
            </span>
            <div className="flex-1 border-t border-[#C08552]/30"></div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-extrabold text-[#FFF8F0]/70 uppercase tracking-wider mb-1">
                Card Information
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full bg-[#4B2E2B] border border-[#C08552]/40 rounded-2xl px-4 py-3 pl-11 text-sm font-mono text-[#FFF8F0] focus:outline-none focus:border-[#C08552]"
                />
                <CreditCard className="w-5 h-5 text-[#C08552] absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-[#FFF8F0]/70 uppercase tracking-wider mb-1">
                  Expires
                </label>
                <input
                  type="text"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  placeholder="MM/YY"
                  className="w-full bg-[#4B2E2B] border border-[#C08552]/40 rounded-2xl px-3.5 py-2.5 text-sm font-mono text-[#FFF8F0] focus:outline-none focus:border-[#C08552] text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-[#FFF8F0]/70 uppercase tracking-wider mb-1">
                  CVC / CVV
                </label>
                <input
                  type="text"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  placeholder="123"
                  className="w-full bg-[#4B2E2B] border border-[#C08552]/40 rounded-2xl px-3.5 py-2.5 text-sm font-mono text-[#FFF8F0] focus:outline-none focus:border-[#C08552] text-center"
                />
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-[#4B2E2B] border border-[#C08552]/30 text-xs text-[#FFF8F0]/80">
            <ShieldCheck className="w-5 h-5 text-[#C08552] flex-shrink-0" />
            <p className="leading-snug">
              Secured by Stripe 256-bit encryption. Instant activation of 30 drink credits.
            </p>
          </div>

          <button
            onClick={handleSubscribe}
            disabled={isProcessing}
            className="w-full py-4 px-6 bg-[#C08552] hover:bg-[#8C5A3C] text-[#FFF8F0] font-black rounded-2xl text-sm shadow-2xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
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
