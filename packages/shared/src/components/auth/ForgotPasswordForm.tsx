import React, { useState } from 'react';
import { api } from '../../services/api';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface ForgotPasswordFormProps {
  onBackToSignIn: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBackToSignIn }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await api.forgotPassword(email.trim());
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Failed to request password reset.');
      return;
    }

    setSuccessMessage(
      result.data?.message || 'If an account exists for that email, a password reset link has been sent.'
    );
  };

  return (
    <div className="space-y-4 animate-fade-in text-[#FBF8F2]">
      <div className="space-y-1.5 mb-2">
        <h3 className="font-editorial text-xl font-bold text-white">
          Reset Password
        </h3>
        <p className="text-sm text-[#DDD4C8] font-normal leading-relaxed">
          Enter your registered email address and we'll send you recovery instructions.
        </p>
      </div>

      {successMessage ? (
        <div className="space-y-4 py-2">
          <div className="bg-[#4E6348]/25 border border-[#4E6348]/50 rounded-2xl p-4 text-sm text-[#FBF8F2] space-y-2">
            <div className="flex items-center space-x-2 text-[#DDD4C8]">
              <CheckCircle2 className="w-5 h-5 text-[#E2A76F]" />
              <span className="font-bold text-white">Instructions Sent</span>
            </div>
            <p className="text-[#DDD4C8] leading-relaxed font-normal">
              {successMessage}
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToSignIn}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-[#B98252] to-[#8C4A32] hover:from-[#C08552] hover:to-[#99533B] text-white rounded-2xl text-sm sm:text-base font-semibold shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-98 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Sign In</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Address Field */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#FBF8F2] tracking-normal">
              Email Address
            </label>
            <div className="flex items-center bg-[#241A16]/70 border border-white/15 focus-within:border-[#B98252] focus-within:ring-2 focus-within:ring-[#B98252]/30 rounded-2xl px-4 py-3 sm:py-3.5 transition-all shadow-inner">
              <Mail className="w-5 h-5 text-[#C08552] flex-shrink-0 mr-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-transparent text-[#FBF8F2] placeholder-[#DDD4C8]/40 text-sm sm:text-base focus:outline-none font-normal"
              />
            </div>
          </div>

          {error && (
            <div className="bg-[#A3483E]/20 border border-[#A3483E]/40 text-[#FBF8F2] text-sm p-3.5 rounded-2xl flex items-center space-x-2.5">
              <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 text-red-300" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-gradient-to-r from-[#B98252] via-[#A86540] to-[#8C4A32] hover:from-[#C08552] hover:via-[#B9724C] hover:to-[#99533B] disabled:opacity-50 text-white font-semibold text-sm sm:text-base shadow-xl shadow-black/40 transition-all flex items-center justify-center space-x-2.5 active:scale-[0.99] border border-[#E2A76F]/30 cursor-pointer"
          >
            <Send className="w-4 h-4 text-white" />
            <span>{isSubmitting ? 'Sending instructions...' : 'Send Reset Link'}</span>
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onBackToSignIn}
              className="text-sm text-[#E2A76F] hover:text-white inline-flex items-center space-x-1.5 transition-colors font-medium hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Sign In</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
