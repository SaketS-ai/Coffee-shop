import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';

interface SignUpFormProps {
  onSubmit: (name: string, email: string, password: string) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ onSubmit, isSubmitting, error }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // 1. Required fields
    if (!email.trim() || !password) {
      setValidationError('Please enter your email and password.');
      return;
    }

    // 2. Validate password match
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match. Please re-enter.');
      return;
    }

    // 3. Validate password strength (at least 8 chars, letter and number to satisfy backend)
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setValidationError('Password must be at least 8 characters and include a letter and a number.');
      return;
    }

    // 4. Name fallback to email username if empty to satisfy backend isValidName
    const finalName = name.trim() || email.split('@')[0] || 'Coffee Member';
    if (finalName.length < 2) {
      setValidationError('Name must be at least 2 characters.');
      return;
    }

    await onSubmit(finalName, email.trim(), password);
  };

  const displayError = validationError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-[#FBF8F2] animate-fade-in">
      {/* Full Name */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#FBF8F2] tracking-normal">
          Full Name
        </label>
        <div className="flex items-center bg-[#241A16]/70 border border-white/15 focus-within:border-[#B98252] focus-within:ring-2 focus-within:ring-[#B98252]/30 rounded-2xl px-4 py-3 sm:py-3.5 transition-all shadow-inner">
          <User className="w-5 h-5 text-[#C08552] flex-shrink-0 mr-3" />
          <input
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="Maya Lin"
            className="w-full bg-transparent text-[#FBF8F2] placeholder-[#DDD4C8]/40 text-sm sm:text-base focus:outline-none font-normal"
          />
        </div>
      </div>

      {/* Email Address */}
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

      {/* Password */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#FBF8F2] tracking-normal">
          Password
        </label>
        <div className="flex items-center bg-[#241A16]/70 border border-white/15 focus-within:border-[#B98252] focus-within:ring-2 focus-within:ring-[#B98252]/30 rounded-2xl px-4 py-3 sm:py-3.5 transition-all shadow-inner">
          <Lock className="w-5 h-5 text-[#C08552] flex-shrink-0 mr-3" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="Min. 8 chars (letters & numbers)"
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

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#FBF8F2] tracking-normal">
          Confirm Password
        </label>
        <div className="flex items-center bg-[#241A16]/70 border border-white/15 focus-within:border-[#B98252] focus-within:ring-2 focus-within:ring-[#B98252]/30 rounded-2xl px-4 py-3 sm:py-3.5 transition-all shadow-inner">
          <Lock className="w-5 h-5 text-[#C08552] flex-shrink-0 mr-3" />
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="Re-enter password"
            className="w-full bg-transparent text-[#FBF8F2] placeholder-[#DDD4C8]/40 text-sm sm:text-base focus:outline-none font-normal"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            className="text-[#DDD4C8]/70 hover:text-[#FBF8F2] p-1 transition-colors flex-shrink-0 ml-1"
          >
            {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {displayError && (
        <div className="bg-[#A3483E]/20 border border-[#A3483E]/40 text-[#FBF8F2] text-sm p-3.5 rounded-2xl flex items-center space-x-2.5 animate-fade-in">
          <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 text-red-300" />
          <span className="leading-snug">{displayError}</span>
        </div>
      )}

      {/* Sign Up CTA Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-gradient-to-r from-[#B98252] via-[#A86540] to-[#8C4A32] hover:from-[#C08552] hover:via-[#B9724C] hover:to-[#99533B] disabled:opacity-50 text-white font-semibold text-sm sm:text-base shadow-xl shadow-black/40 transition-all flex items-center justify-center space-x-2.5 active:scale-[0.99] border border-[#E2A76F]/30 cursor-pointer"
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2.5">
              <span className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Creating Member Account...</span>
            </div>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-white" />
              <span>Join Social Cup</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
