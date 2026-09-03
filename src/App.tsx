import React, { useState, useEffect } from 'react';
import { UserRole, CoffeeTheme } from './types';
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
  const [currentTheme, setCurrentTheme] = useState<CoffeeTheme>('roast_cream');
  const [selectedCafeId, setSelectedCafeId] = useState<string>(() => {
    return store.getCafes()[0]?.id || 'cafe_fiction';
  });

  const [, setTick] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setTick((t) => t + 1);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] font-sans text-[var(--text-primary)] flex flex-col selection:bg-amber-500 selection:text-slate-950 transition-colors duration-500">
      {/* Surface Navigation Header */}
      <HeaderSwitcher
        currentRole={currentRole}
        onRoleChange={(role) => setCurrentRole(role)}
        selectedCafeId={selectedCafeId}
        onCafeIdChange={(cafeId) => setSelectedCafeId(cafeId)}
        currentTheme={currentTheme}
        onThemeChange={(theme) => setCurrentTheme(theme)}
      />

      {/* Display Layout Switcher Bar */}
      {(currentRole === 'member' || currentRole === 'visitor') && (
        <div className="bg-[#140D0A]/90 border-b border-amber-900/30 px-4 py-1.5 flex justify-end items-center space-x-2 text-xs">
          <span className="text-amber-200/60 font-semibold text-[11px]">Display Layout:</span>
          <button
            onClick={() => setViewMode('web')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              viewMode === 'web'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-100 shadow'
                : 'text-amber-200/60 hover:text-amber-100'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Full Web Layout</span>
          </button>
          <button
            onClick={() => setViewMode('mobile_frame')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              viewMode === 'mobile_frame'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-100 shadow'
                : 'text-amber-200/60 hover:text-amber-100'
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
      <footer className="bg-[#0B0F17] border-t border-amber-900/20 py-4 text-center text-xs text-amber-200/50">
        Social Cup Dallas • Artisanal Coffee Membership & Discovery • PRD v1.1
      </footer>
    </div>
  );
}

export default App;
