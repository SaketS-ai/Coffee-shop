import React, { useState } from 'react';
import { api } from '../../services/api';
import { Coffee, Sparkles, Compass } from 'lucide-react';

interface WelcomeChoiceModalProps {
  isOpen: boolean;
  memberName: string;
  onDismiss: () => void;
  onMembershipActivated: () => void;
}

// Shown once per session to a freshly-logged-in member with no active
// membership yet (see the `api.getMembership()` check in WebMemberApp/
// MobileAppContainer). "Take Membership" calls the same real, JWT-backed
// activation endpoint as Profile's "Activate Test Membership" button - not
// the mock Stripe-flavored checkout modal - so credits and membership
// status actually change for real, matching what redemption checks against.
export const WelcomeChoiceModal: React.FC<WelcomeChoiceModalProps> = ({
  isOpen,
  memberName,
  onDismiss,
  onMembershipActivated,
}) => {
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTakeMembership = async () => {
    setIsActivating(true);
    setError(null);
    try {
      await api.activateDevMembership();
      onMembershipActivated();
    } catch (err: any) {
      setError(err.message || 'Failed to activate membership.');
    } finally {
      setIsActivating(false);
    }
  };

  const firstName = memberName.split(' ')[0] || memberName;

  return (
    <div className="fixed inset-0 z-50 bg-[#4B2E2B]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FFF8F0] text-[#4B2E2B] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-[#4B2E2B] px-6 pt-8 pb-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Coffee className="w-6 h-6 text-on-accent" />
          </div>
          <h2 className="text-lg font-black text-[#FFF8F0]">Welcome, {firstName}!</h2>
          <p className="text-xs text-[#FFF8F0]/70 mt-1">
            Take a Social Cup membership now for 30 drink credits, or preview the app first.
          </p>
        </div>

        <div className="p-6 space-y-3 text-xs">
          <button
            onClick={handleTakeMembership}
            disabled={isActivating}
            className="w-full py-3 bg-accent hover:bg-accent-hover text-on-accent rounded-xl font-black flex items-center justify-center space-x-1.5 disabled:opacity-50 shadow-md shadow-[#8C5A3C]/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isActivating ? 'Activating...' : 'Take Membership - $24.99/mo'}</span>
          </button>

          {error && (
            <p className="text-red-600 font-bold bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            onClick={onDismiss}
            disabled={isActivating}
            className="w-full py-3 bg-white border border-[#8C5A3C]/30 hover:bg-[#F4EFE6] text-[#4B2E2B] rounded-xl font-black flex items-center justify-center space-x-1.5 disabled:opacity-50 transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>Just Preview For Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
