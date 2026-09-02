import React, { useState, useEffect } from 'react';
import { UserRole } from './types';
import { store } from './services/store';
import { HeaderSwitcher } from './components/common/HeaderSwitcher';
import { WebMemberApp } from './components/mobile/WebMemberApp';
import { MobileAppContainer } from './components/mobile/MobileAppContainer';
import { BaristaScannerView } from './components/barista/BaristaScannerView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Smartphone, Monitor } from 'lucide-react';

export function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('member');
  const [viewMode, setViewMode] = useState<'web' | 'mobile_frame'>('web');
  const [selectedCafeId, setSelectedCafeId] = useState<string>(() => {
    return store.getCafes()[0]?.id || 'cafe_fiction';
  });

  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setTick((t) => t + 1);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Surface Navigation Header */}
      <HeaderSwitcher
        currentRole={currentRole}
        onRoleChange={(role) => setCurrentRole(role)}
        selectedCafeId={selectedCafeId}
        onCafeIdChange={(cafeId) => setSelectedCafeId(cafeId)}
      />

      {/* Layout Viewport Mode Switcher Bar */}
      {(currentRole === 'member' || currentRole === 'visitor') && (
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-1.5 flex justify-end items-center space-x-2 text-xs">
          <span className="text-slate-400 font-semibold text-[11px]">Display Layout:</span>
          <button
            onClick={() => setViewMode('web')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              viewMode === 'web'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Full Web Page Layout</span>
          </button>
          <button
            onClick={() => setViewMode('mobile_frame')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              viewMode === 'mobile_frame'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Device Shell</span>
          </button>
        </div>
      )}

      {/* Main Viewport Content */}
      <main className="flex-1">
        {(currentRole === 'member' || currentRole === 'visitor') && (
          viewMode === 'web' ? <WebMemberApp /> : <MobileAppContainer />
        )}
        {currentRole === 'barista' && <BaristaScannerView cafeId={selectedCafeId} />}
        {currentRole === 'admin' && <AdminDashboard />}
      </main>

      {/* Persistent Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-3 text-center text-xs text-slate-500">
        Social Cup Dallas • Full Web & Mobile Responsive Platform • PRD v1.1
      </footer>
    </div>
  );
}

export default App;
