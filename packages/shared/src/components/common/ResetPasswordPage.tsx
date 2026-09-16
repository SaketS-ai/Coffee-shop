import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Coffee, KeyRound, CheckCircle2 } from 'lucide-react';

// PRD Module 2.2: the destination of the password-reset email (1-hour
// expiry, enforced server-side - see backend/src/services/auth.service.ts).
export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('This reset link is missing its token.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await api.resetPassword(token, newPassword);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Failed to reset password.');
      return;
    }
    setIsDone(true);
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center p-4">
      <div className="bg-[#FFF8F0] text-[#4B2E2B] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="bg-[#4B2E2B] px-6 pt-8 pb-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Coffee className="w-6 h-6 text-on-accent" />
          </div>
          <h2 className="text-lg font-black text-[#FFF8F0]">Choose a New Password</h2>
        </div>

        {isDone ? (
          <div className="p-6 space-y-4 text-xs text-center">
            <div className="flex flex-col items-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
              <p className="font-bold text-[#4B2E2B]">Password updated. You can now sign in.</p>
            </div>
            <Link
              to="/login"
              className="block w-full py-3 bg-accent hover:bg-accent-hover text-on-accent rounded-xl font-black shadow-md shadow-[#8C5A3C]/20 transition-all"
            >
              Go to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-3 text-xs">
            <input
              type="password"
              required
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-white border border-[#8C5A3C]/30 rounded-xl px-3.5 py-3 text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
            />
            <input
              type="password"
              required
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              <KeyRound className="w-4 h-4" />
              <span>{isSubmitting ? 'Please wait...' : 'Reset Password'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-[#8C5A3C] hover:underline font-bold w-full text-center pt-1"
            >
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
