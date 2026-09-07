import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { store } from './services/store';
import { AuthProvider } from './context/AuthContext';
import { AppHeader } from './components/common/AppHeader';
import { LoginPage } from './components/common/LoginPage';
import { WebMemberApp } from './components/mobile/WebMemberApp';
import { MobileAppContainer } from './components/mobile/MobileAppContainer';
import { BaristaScannerView } from './components/barista/BaristaScannerView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { MemberRoute } from './routes/MemberRoute';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RootRedirect } from './routes/RootRedirect';

// The one place viewMode (web layout vs. mobile device-frame preview) lives -
// both the header toggle and the member route read/write it directly, no
// context needed for a single sibling relationship.
function AppShell() {
  const [viewMode, setViewMode] = useState<'web' | 'mobile_frame'>('web');
  const location = useLocation();
  const isMemberRoute = location.pathname.startsWith('/app');

  const memberSurface = (
    <MemberRoute>{viewMode === 'web' ? <WebMemberApp /> : <MobileAppContainer />}</MemberRoute>
  );
  const baristaSurface = (
    <ProtectedRoute allowedRoles={['BARISTA', 'ADMIN']}>
      <BaristaScannerView />
    </ProtectedRoute>
  );
  const adminSurface = (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AdminDashboard />
    </ProtectedRoute>
  );

  return (
    <div className="min-h-screen bg-[#4B2E2B] font-sans text-[#FFF8F0] flex flex-col selection:bg-accent selection:text-on-accent">
      {isMemberRoute && <AppHeader viewMode={viewMode} onViewModeChange={setViewMode} />}

      <main className="flex-1">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Member surface - Discover/Cafe Detail/Profile each get a real
              URL so browser Back/Forward, reload, and deep links all work;
              WebMemberApp/MobileAppContainer read the active screen from
              the URL themselves (useLocation/useParams), not local state. */}
          <Route path="/app" element={memberSurface} />
          <Route path="/app/cafes/:cafeId" element={memberSurface} />
          <Route path="/app/profile" element={memberSurface} />

          {/* Barista - :cafeId in the URL is the selected counter, so Back
              from the scanner returns to cafe selection and a specific
              counter's terminal can be reloaded/bookmarked directly. */}
          <Route path="/barista" element={baristaSurface} />
          <Route path="/barista/:cafeId" element={baristaSurface} />

          {/* Admin - :tab in the URL is the active back-office tab. */}
          <Route path="/admin" element={adminSurface} />
          <Route path="/admin/:tab" element={adminSurface} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="bg-[#3D2523] border-t border-[#C08552]/30 py-4 text-center text-xs text-[#FFF8F0]/70">
        Social Cup Dallas • Artisanal Coffee Membership & Discovery • PRD v1.1
      </footer>
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
