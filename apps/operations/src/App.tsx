import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@shared/context/AuthContext';
import { OperationsLoginPage } from './components/OperationsLoginPage';
import { CafeDashboard } from './components/cafe/CafeDashboard';
import { CafeScannerScreen } from './components/cafe/CafeScannerScreen';
import { CafeActivityView } from './components/cafe/CafeActivityView';
import { AdminDashboard } from '@shared/components/admin/AdminDashboard';
import { CafeUserPicker } from './components/cafe/CafeUserPicker';

function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#120B09] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#B98252]/30 border-t-[#B98252] animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function CafeRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#120B09] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#B98252]/30 border-t-[#B98252] animate-spin" />
      </div>
    );
  }

  if (!user || (user.role !== 'BARISTA' && user.role !== 'ADMIN')) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#120B09] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#B98252]/30 border-t-[#B98252] animate-spin" />
      </div>
    );
  }

  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  const activeCafeId = localStorage.getItem('social_cup_active_cafe_id');
  if (user?.role === 'BARISTA' && activeCafeId) {
    return <Navigate to={`/cafe/${activeCafeId}`} replace />;
  }

  return <Navigate to="/login" replace />;
}

function CafeSelectPage() {
  return (
    <div className="min-h-screen bg-[#120B09] text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full bg-[#1F1714] border border-[#B98252]/40 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <h2 className="font-editorial text-2xl font-bold mb-4">Select Your Cafe Counter</h2>
        <CafeUserPicker />
      </div>
    </div>
  );
}

function OperationsShell() {
  return (
    <div className="min-h-screen bg-[#120B09] text-white font-sans flex flex-col relative selection:bg-[#B98252] selection:text-[#FBF8F2]">
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/login" element={<OperationsLoginPage />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Admin Surface */}
          <Route
            path="/admin"
            element={
              <AdminRouteGuard>
                <AdminDashboard />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/admin/:tab"
            element={
              <AdminRouteGuard>
                <AdminDashboard />
              </AdminRouteGuard>
            }
          />

          {/* Cafe User Surface */}
          <Route path="/cafe/select" element={<CafeSelectPage />} />
          <Route
            path="/cafe/:cafeId"
            element={
              <CafeRouteGuard>
                <CafeDashboard />
              </CafeRouteGuard>
            }
          />
          <Route
            path="/cafe/:cafeId/scanner"
            element={
              <CafeRouteGuard>
                <CafeScannerScreen />
              </CafeRouteGuard>
            }
          />
          <Route
            path="/cafe/:cafeId/activity"
            element={
              <CafeRouteGuard>
                <CafeActivityView />
              </CafeRouteGuard>
            }
          />

          {/* Legacy Barista Route Compatibility */}
          <Route
            path="/barista/:cafeId"
            element={
              <CafeRouteGuard>
                <CafeDashboard />
              </CafeRouteGuard>
            }
          />
          <Route path="/barista" element={<Navigate to="/cafe/select" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OperationsShell />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
