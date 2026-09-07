import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Coffee, LogIn, Sparkles } from 'lucide-react';

interface LoginScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

// The real, backend-authenticated entry point for the member app (email +
// password against the Postgres-backed API via AuthContext) - distinct from
// the legacy AuthModal, which only edits locally-stored profile preferences
// and has no password field. Visitors can still dismiss this and keep
// browsing without an account (PRD 2.5) - it's reachable from the header,
// never a forced wall in front of Discover.
export const LoginScreen: React.FC<LoginScreenProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError(null);
    setMode('login');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = mode === 'login' ? await login(email, password) : await register(name, email, password);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error || `Failed to ${mode === 'login' ? 'sign in' : 'create account'}.`);
      return;
    }
    resetAndClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#4B2E2B]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FFF8F0] text-[#4B2E2B] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-[#4B2E2B] px-6 pt-8 pb-6 relative text-center">
          <button
            onClick={resetAndClose}
            className="absolute top-3 right-3 text-[#FFF8F0]/70 hover:text-[#FFF8F0] p-1.5 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Coffee className="w-6 h-6 text-on-accent" />
          </div>
          <h2 className="text-lg font-black text-[#FFF8F0]">
            {mode === 'login' ? 'Welcome back' : 'Join Social Cup'}
          </h2>
          <p className="text-xs text-[#FFF8F0]/70 mt-1">
            Sign in to redeem drinks, track your diary, and manage your membership.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3 text-xs">
          {mode === 'register' && (
            <input
              type="text"
              required
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-[#8C5A3C]/30 rounded-xl px-3.5 py-3 text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
            />
          )}
          <input
            type="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border border-[#8C5A3C]/30 rounded-xl px-3.5 py-3 text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white border border-[#8C5A3C]/30 rounded-xl px-3.5 py-3 text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
          />

          {error && (
            <p className="text-red-600 font-bold bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-accent hover:bg-accent-hover text-on-accent rounded-xl font-black flex items-center justify-center space-x-1.5 disabled:opacity-50 shadow-md shadow-[#8C5A3C]/20 transition-all"
          >
            {mode === 'login' ? <LogIn className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            <span>
              {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            className="text-[#8C5A3C] hover:underline font-bold w-full text-center pt-1"
          >
            {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>

          <button
            type="button"
            onClick={resetAndClose}
            className="text-[#6B4E4B] hover:text-[#4B2E2B] w-full text-center pt-1"
          >
            Continue browsing without an account
          </button>
        </form>
      </div>
    </div>
  );
};
