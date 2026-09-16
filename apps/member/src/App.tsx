import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@shared/context/AuthContext';
import { store } from '@shared/services/store';
import { MemberLoginPage } from './components/MemberLoginPage';
import { VerifyEmailPage } from '@shared/components/common/VerifyEmailPage';
import { ResetPasswordPage } from '@shared/components/common/ResetPasswordPage';
import { MobileAppContainer } from '@shared/components/mobile/MobileAppContainer';
import { PhoneFrame } from '@shared/components/common/PhoneFrame';
import { ShieldAlert, ExternalLink, LogOut } from 'lucide-react';

function MemberSurface() {
  const { user, logout } = useAuth();

  // Strict boundary: If an Admin or Barista token is active, don't show admin/cafe controls here
  if (user && (user.role === 'ADMIN' || user.role === 'BARISTA')) {
    return (
      <div className="h-full bg-[#241A16] text-[#FBF8F2] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#3A2922] border border-[#B98252]/40 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[#B98252]/20 border border-[#B98252]/40 flex items-center justify-center mx-auto text-[#E2A76F]">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#E2A76F] block mb-1">
              Operations Account Detected
            </span>
            <h2 className="font-editorial text-xl sm:text-2xl font-bold text-white">
              Operations Console Required
            </h2>
            <p className="text-xs sm:text-sm text-[#DDD4C8] mt-2 leading-relaxed">
              You are signed in as <strong>{user.name}</strong> ({user.role}). This application is exclusively for customers and coffee passes.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <a
              href="http://localhost:3001"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#B98252] to-[#8C4A32] hover:from-[#A87244] hover:to-[#7B3F2A] text-white font-bold text-xs shadow-lg flex items-center justify-center space-x-2 transition-all"
            >
              <span>Open Operations Application</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={logout}
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-[#DDD4C8] hover:text-white font-medium text-xs transition-colors flex items-center justify-center space-x-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out & Browse as Guest</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fully Responsive Member Application (Mobile-friendly on phones, full-width responsive on tablet and desktop)
  return <MobileAppContainer />;
}

function MemberShell() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <PhoneFrame>
      <div className={`h-full ${isLoginPage ? 'bg-[#18100C] text-[#FBF8F2]' : 'bg-[#FAF5EF] text-[#241A16]'} font-sans flex flex-col relative selection:bg-[#B98252] selection:text-[#FBF8F2] w-full`}>
        {!isLoginPage && (
          <div
            className="absolute inset-0 pointer-events-none z-0 bg-repeat opacity-[0.03]"
            style={{
              backgroundImage: "url('/doodle-pattern-alpha.png')",
              backgroundSize: '360px auto',
            }}
            aria-hidden="true"
          />
        )}

        <main className="flex-1 relative z-10 flex flex-col w-full">
          <Routes>
            <Route path="/login" element={<MemberLoginPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/app" element={<MemberSurface />} />
            <Route path="/app/cafes" element={<Navigate to="/app" replace />} />
            <Route path="/app/cafes/:cafeId" element={<MemberSurface />} />
            <Route path="/app/profile" element={<MemberSurface />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </main>
      </div>
    </PhoneFrame>
  );
}

export function App() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setTick((t) => t + 1);
    });
    return () => unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <MemberShell />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
