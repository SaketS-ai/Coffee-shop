import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogIn, LogOut } from 'lucide-react';

interface AuthGateProps {
  allowedRoles: string[];
  title: string;
  subtitle?: string;
  allowRegister?: boolean;
  deniedMessage?: string;
}

// One shared login form / signed-in banner / wrong-role notice, reused by
// every surface (member, barista, admin) via the shared AuthContext - each
// caller still decides for itself what to show/hide based on `user` from
// useAuth(), same as before, just no longer duplicating the form markup or
// session-restore logic per component.
export const AuthGate: React.FC<AuthGateProps> = ({
  allowedRoles,
  title,
  subtitle,
  allowRegister = false,
  deniedMessage,
}) => {
  const { user, isLoading, login, register, logout } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return <div className="h-14 bg-white rounded-2xl border border-[#8C5A3C]/20 shadow-sm animate-pulse" />;
  }

  if (user && allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-between bg-[#FBF8F2] border border-[#DDD4C8] shadow-2xs rounded-2xl px-4 py-2.5 text-xs">
        <span className="text-[#241A16] font-bold">
          Signed in as {user.name} ({user.role})
        </span>
        <button
          onClick={logout}
          className="flex items-center space-x-1 text-[#6B4A3A] hover:text-[#241A16] font-bold transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    );
  }

  if (user) {
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-4 space-y-2 shadow-sm text-xs">
        <p className="text-red-600 font-bold">
          {deniedMessage || `Signed in as ${user.name} (${user.role}) - insufficient permissions here.`}
        </p>
        <button onClick={logout} className="text-[#8C5A3C] hover:underline font-bold">
          Sign Out & Try a Different Account
        </button>
      </div>
    );
  }

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
    setPassword('');
  };

  return (
    <div className="bg-white border border-[#8C5A3C]/20 rounded-2xl p-5 space-y-4 shadow-sm text-xs">
      <div>
        <h4 className="font-bold text-[#4B2E2B] text-sm">{title}</h4>
        {subtitle && <p className="text-[#6B4E4B] mt-1">{subtitle}</p>}
      </div>
      <form onSubmit={handleSubmit} className="space-y-2.5">
        {mode === 'register' && (
          <input
            type="text"
            required
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-xl px-3 py-2.5 text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
          />
        )}
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-xl px-3 py-2.5 text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-xl px-3 py-2.5 text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
        />
        {error && <p className="text-red-600 font-bold">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 bg-accent hover:bg-accent-hover text-on-accent rounded-xl font-black flex items-center justify-center space-x-1.5 disabled:opacity-50"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>{isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
        </button>
      </form>
      {allowRegister && (
        <button
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
          className="text-[#8C5A3C] hover:underline font-bold w-full text-center"
        >
          {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
      )}
    </div>
  );
};
