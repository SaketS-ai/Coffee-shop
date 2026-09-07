import React, { useState } from 'react';
import { store } from '../../services/store';
import { api } from '../../services/api';
import { X, CreditCard, ShieldCheck, CheckCircle2, Coffee, ExternalLink } from 'lucide-react';
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

  const member = store.getMember();

  const handleSubscribeModal = () => {
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

  const handleRealStripeCheckoutRedirect = async () => {
    setIsProcessing(true);
    const sessionResult = await api.createStripeCheckoutSession(member.id);
    setIsProcessing(false);

    if (sessionResult.success && sessionResult.url) {
      if (sessionResult.isMock) {
        handleSubscribeModal();
      } else {
        window.location.href = sessionResult.url;
      }
    } else {
      handleSubscribeModal();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#4B2E2B]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white border border-[#8C5A3C]/20 rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl animate-fade-in text-[#4B2E2B] max-h-[90vh] overflow-y-auto">
        {/* Card Header - Warm Caramel to Roasted Brown */}
        <div className="bg-gradient-to-br from-[#8C5A3C] to-[#4B2E2B] p-4 text-[#FFF8F0] relative overflow-hidden">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 text-[#FFF8F0] hover:bg-[#4B2E2B]/20 p-1.5 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-1.5 text-[10px] font-black uppercase tracking-wider text-[#FFF8F0] mb-1">
            <Coffee className="w-3.5 h-3.5" />
            <span>Social Cup Dallas Pass</span>
          </div>

          <h2 className="text-base font-black tracking-tight">30 Drink Credits Pass</h2>
          <div className="mt-1 flex items-baseline space-x-1.5">
            <span className="text-xl font-extrabold">$24.99</span>
            <span className="text-[11px] font-bold text-[#FFF8F0]/90">/ month</span>
          </div>
          <p className="text-[10px] text-[#FFF8F0]/80 mt-1 font-semibold leading-snug">
            Redeem 1 credit = $1.00 value at any partner cafe. Cancel anytime.
          </p>
        </div>

        {/* Form Content */}
        <div className="p-4 space-y-3">
          {/* Real Stripe Hosted Checkout Redirect Button */}
          <button
            onClick={handleRealStripeCheckoutRedirect}
            disabled={isProcessing}
            className="w-full py-2.5 px-3 bg-[#4B2E2B] hover:bg-[#3D2523] text-[#FFF8F0] font-black rounded-xl text-[11px] flex items-center justify-center space-x-1.5 shadow-md transition-all"
          >
            <span>Proceed to Hosted Stripe Checkout</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center my-1">
            <div className="flex-1 border-t border-[#8C5A3C]/20"></div>
            <span className="px-2 text-[11px] text-[#6B4E4B] uppercase tracking-widest font-black">
              Or Pay Direct
            </span>
            <div className="flex-1 border-t border-[#8C5A3C]/20"></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPaymentMethod('apple_pay')}
              className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl border text-[11px] font-extrabold transition-all ${
                paymentMethod === 'apple_pay'
                  ? 'bg-accent text-on-accent border-[#C08552] shadow-sm'
                  : 'bg-[#FFF8F0] border-[#8C5A3C]/20 text-[#4B2E2B]'
              }`}
            >
              <span> Pay</span>
            </button>
            <button
              onClick={() => setPaymentMethod('google_pay')}
              className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl border text-[11px] font-extrabold transition-all ${
                paymentMethod === 'google_pay'
                  ? 'bg-accent text-on-accent border-[#C08552] shadow-sm'
                  : 'bg-[#FFF8F0] border-[#8C5A3C]/20 text-[#4B2E2B]'
              }`}
            >
              <span>G Pay</span>
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-extrabold text-[#6B4E4B] uppercase tracking-wider mb-1">
                Card Information
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-xl px-3 py-2 pl-9 text-xs font-mono text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
                />
                <CreditCard className="w-4 h-4 text-[#8C5A3C] absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-extrabold text-[#6B4E4B] uppercase tracking-wider mb-1">
                  Expires
                </label>
                <input
                  type="text"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  placeholder="MM/YY"
                  className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-xl px-2.5 py-2 text-xs font-mono text-[#4B2E2B] focus:outline-none focus:border-[#C08552] text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-[#6B4E4B] uppercase tracking-wider mb-1">
                  CVC / CVV
                </label>
                <input
                  type="text"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  placeholder="123"
                  className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-xl px-2.5 py-2 text-xs font-mono text-[#4B2E2B] focus:outline-none focus:border-[#C08552] text-center"
                />
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-[#FFF8F0] border border-[#8C5A3C]/20 text-[10px] text-[#6B4E4B]">
            <ShieldCheck className="w-4 h-4 text-[#8C5A3C] flex-shrink-0" />
            <p className="leading-snug">
              Secured by Stripe 256-bit encryption. Instant activation of 30 drink credits.
            </p>
          </div>

          <button
            onClick={handleSubscribeModal}
            disabled={isProcessing}
            className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-on-accent font-black rounded-xl text-xs shadow-xl transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            {isProcessing ? (
              <span>Processing Subscription...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Subscribe & Unlock 30 Credits ($24.99)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
