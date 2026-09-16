import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { store } from './services/store';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/common/LoginPage';
import { VerifyEmailPage } from './components/common/VerifyEmailPage';
import { ResetPasswordPage } from './components/common/ResetPasswordPage';
import { MobileAppContainer } from './components/mobile/MobileAppContainer';
import { MemberRoute } from './routes/MemberRoute';
import { RootRedirect } from './routes/RootRedirect';
import { ShieldAlert, ExternalLink, LogOut } from 'lucide-react';

function RedirectToOperations() {
  useEffect(() => {
    window.location.href = 'http://localhost:3001';
  }, []);

  return (
    <div className="min-h-screen bg-[#120B09] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-[#1F1714] border border-[#B98252]/40 rounded-3xl p-8 shadow-2xl space-y-4">
        <h2 className="font-editorial text-2xl font-bold text-white">Operations Console</h2>
        <p className="text-xs text-[#DDD4C8]">
          Admin and Cafe Staff functionality has been relocated to the dedicated Operations application on port 3001.
        </p>
        <a
          href="http://localhost:3001"
          className="inline-flex items-center justify-center space-x-2 w-full py-3 bg-[#B98252] hover:bg-[#A87244] text-white rounded-xl font-bold text-xs transition-colors"
        >
          <span>Go to Operations Console (Port 3001)</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

function MemberAppSurface() {
  const { user, logout } = useAuth();

  // Strict boundary: If an Admin or Barista token is active, redirect them to Operations
  if (user && (user.role === 'ADMIN' || user.role === 'BARISTA')) {
    return (
      <div className="min-h-screen bg-[#241A16] text-[#FBF8F2] flex items-center justify-center p-6">
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
              <span>Open Operations Application (Port 3001)</span>
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

  // Strictly Mobile View
  return (
    <MemberRoute>
      <MobileAppContainer />
    </MemberRoute>
  );
}

function AppShell() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-[#18100C] font-sans flex flex-col relative selection:bg-[#B98252] selection:text-[#FBF8F2]">
      <main className="flex-1 relative z-10 flex flex-col">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Member surface - strictly mobile view */}
          <Route path="/app" element={<MemberAppSurface />} />
          <Route path="/app/cafes" element={<Navigate to="/app" replace />} />
          <Route path="/app/cafes/:cafeId" element={<MemberAppSurface />} />
          <Route path="/app/profile" element={<MemberAppSurface />} />

          {/* Barista & Admin relocated to Operations port 3001 */}
          <Route path="/barista/*" element={<RedirectToOperations />} />
          <Route path="/admin/*" element={<RedirectToOperations />} />

          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </main>
    </div>
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
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
