import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Coffee, CheckCircle2, XCircle } from 'lucide-react';

// PRD Module 2.2: the destination of the verification-link email sent on
// registration (see backend/src/services/email.service.ts). A plain page,
// not a modal, since it's reached by clicking a link from outside the app.
export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing its token.');
      return;
    }
    let cancelled = false;
    api.verifyEmail(token).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setStatus('success');
        setMessage('Your email is verified.');
      } else {
        setStatus('error');
        setMessage(result.error || 'This verification link is invalid or has expired.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center p-4">
      <div className="bg-[#FFF8F0] text-[#4B2E2B] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="bg-[#4B2E2B] px-6 pt-8 pb-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Coffee className="w-6 h-6 text-on-accent" />
          </div>
          <h2 className="text-lg font-black text-[#FFF8F0]">Email Verification</h2>
        </div>
        <div className="p-6 space-y-4 text-xs text-center">
          {status === 'checking' && <p className="text-[#6B4E4B]">Verifying your email...</p>}
          {status === 'success' && (
            <div className="flex flex-col items-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
              <p className="font-bold text-[#4B2E2B]">{message}</p>
            </div>
          )}
          {status === 'error' && (
            <div className="flex flex-col items-center space-y-2">
              <XCircle className="w-10 h-10 text-red-600" />
              <p className="font-bold text-red-600">{message}</p>
            </div>
          )}
          <Link
            to="/app"
            className="block w-full py-3 bg-accent hover:bg-accent-hover text-on-accent rounded-xl font-black shadow-md shadow-[#8C5A3C]/20 transition-all"
          >
            Continue to Social Cup
          </Link>
        </div>
      </div>
    </div>
  );
};
