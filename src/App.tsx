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
    <div className="min-h-screen bg-[#4B2E2B] font-sans text-[#FFF8F0] flex flex-col selection:bg-[#C08552] selection:text-[#FFF8F0]">
      {/* Surface Navigation Header */}
      <HeaderSwitcher
        currentRole={currentRole}
        onRoleChange={(role) => setCurrentRole(role)}
        selectedCafeId={selectedCafeId}
        onCafeIdChange={(cafeId) => setSelectedCafeId(cafeId)}
      />

      {/* Display Layout Switcher Bar */}
      {(currentRole === 'member' || currentRole === 'visitor') && (
        <div className="bg-[#3D2523] border-b border-[#C08552]/30 px-4 py-1.5 flex justify-end items-center space-x-2 text-xs text-[#FFF8F0]">
          <span className="text-[#FFF8F0]/70 font-semibold text-[11px]">Display Layout:</span>
          <button
            onClick={() => setViewMode('web')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              viewMode === 'web'
                ? 'bg-[#C08552] text-[#FFF8F0] shadow'
                : 'text-[#FFF8F0]/70 hover:text-[#FFF8F0]'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Full Web Layout</span>
          </button>
          <button
            onClick={() => setViewMode('mobile_frame')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              viewMode === 'mobile_frame'
                ? 'bg-[#C08552] text-[#FFF8F0] shadow'
                : 'text-[#FFF8F0]/70 hover:text-[#FFF8F0]'
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
      <footer className="bg-[#3D2523] border-t border-[#C08552]/30 py-4 text-center text-xs text-[#FFF8F0]/70">
        Social Cup Dallas • Artisanal Coffee Membership & Discovery • PRD v1.1
      </footer>
    </div>
  );
}

export default App;
