import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { AuthProfileMode } from './AuthProfileSelector';

interface SignInFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onForgotPassword: () => void;
  isSubmitting: boolean;
  error: string | null;
  profileMode?: AuthProfileMode;
}

export const SignInForm: React.FC<SignInFormProps> = ({
  onSubmit,
  onForgotPassword,
  isSubmitting,
  error,
  profileMode = 'member',
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // When profile mode switches, clear error
  useEffect(() => {
    setValidationError(null);
  }, [profileMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!email.trim() || !password) {
      setValidationError('Please enter both email and password.');
      return;
    }

    await onSubmit(email.trim(), password);
  };

  const displayError = validationError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-[#FBF8F2] animate-fade-in">
      {/* Email Field */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#FBF8F2] tracking-normal">
          Email Address
        </label>
        <div className="flex items-center bg-[#241A16]/70 border border-white/15 focus-within:border-[#B98252] focus-within:ring-2 focus-within:ring-[#B98252]/30 rounded-2xl px-4 py-3 sm:py-3.5 transition-all shadow-inner">
          <Mail className="w-5 h-5 text-[#C08552] flex-shrink-0 mr-3" />
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="name@example.com"
            className="w-full bg-transparent text-[#FBF8F2] placeholder-[#DDD4C8]/40 text-sm sm:text-base focus:outline-none font-normal"
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#FBF8F2] tracking-normal">
          Password
        </label>
        <div className="flex items-center bg-[#241A16]/70 border border-white/15 focus-within:border-[#B98252] focus-within:ring-2 focus-within:ring-[#B98252]/30 rounded-2xl px-4 py-3 sm:py-3.5 transition-all shadow-inner">
          <Lock className="w-5 h-5 text-[#C08552] flex-shrink-0 mr-3" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="••••••••"
            className="w-full bg-transparent text-[#FBF8F2] placeholder-[#DDD4C8]/40 text-sm sm:text-base focus:outline-none font-normal"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="text-[#DDD4C8]/70 hover:text-[#FBF8F2] p-1 transition-colors flex-shrink-0 ml-1"
          >
            {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
          </button>
        </div>
      </div>

      {/* Forgot Password Link */}
      <div className="text-right pt-0.5">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm text-[#E2A76F] hover:text-white font-medium transition-colors hover:underline inline-block"
        >
          Forgot Password?
        </button>
      </div>

      {/* Error Alert */}
      {displayError && (
        <div className="bg-[#A3483E]/20 border border-[#A3483E]/40 text-[#FBF8F2] text-sm p-3.5 rounded-2xl flex items-center space-x-2.5 animate-fade-in">
          <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 text-red-300" />
          <span className="leading-snug">{displayError}</span>
        </div>
      )}

      {/* Sign In CTA Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-gradient-to-r from-[#B98252] via-[#A86540] to-[#8C4A32] hover:from-[#C08552] hover:via-[#B9724C] hover:to-[#99533B] disabled:opacity-50 text-white font-semibold text-sm sm:text-base shadow-xl shadow-black/40 transition-all flex items-center justify-center space-x-2.5 active:scale-[0.99] border border-[#E2A76F]/30 cursor-pointer"
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2.5">
              <span className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Verifying credentials...</span>
            </div>
          ) : (
            <>
              {profileMode === 'admin' ? (
                <ShieldCheck className="w-5 h-5 text-white" />
              ) : (
                <LogIn className="w-5 h-5 text-white" />
              )}
              <span>{profileMode === 'admin' ? 'Sign In to Admin Console' : 'Sign In as Member'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
