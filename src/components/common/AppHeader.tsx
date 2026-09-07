import React from 'react';
import { Link } from 'react-router-dom';
import { store } from '../../services/store';
import { useAuth } from '../../context/AuthContext';
import { NavControls } from './NavControls';
import { Smartphone, Monitor, Coffee, LogIn, LogOut, RotateCcw } from 'lucide-react';

interface AppHeaderProps {
  viewMode: 'web' | 'mobile_frame';
  onViewModeChange: (mode: 'web' | 'mobile_frame') => void;
}

// Brand chrome for the member surface only - Barista and Admin are each a
// self-contained page with their own header, tabs, and sign-out already
// (see BaristaScannerView / AdminDashboard), so this never renders there.
// Which surface a signed-in user sees is decided by role-based routing
// (src/routes), not by a switcher here - there is no way to pick another
// role's surface from this header.
export const AppHeader: React.FC<AppHeaderProps> = ({ viewMode, onViewModeChange }) => {
  const member = store.getMember();
  const { user, logout } = useAuth();

  return (
    <header className="bg-[#FFF8F0]/95 backdrop-blur-xl border-b border-[#8C5A3C]/20 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 text-[#4B2E2B]">
        <div className="flex items-center space-x-3">
          <NavControls />
          <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center shadow-md shadow-[#8C5A3C]/30">
            <Coffee className="w-5 h-5 text-on-accent stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-tight text-xl text-[#4B2E2B]">Social Cup</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#C08552]/15 text-[#8C5A3C] border border-[#C08552]/30">
                Dallas TX
              </span>
            </div>
            <p className="text-[11px] text-[#8C5A3C] hidden sm:block font-medium">
              Coffee Membership & Discovery Network
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <div className="hidden md:flex items-center bg-[#F4EFE6] rounded-xl p-1 border border-[#8C5A3C]/20 text-[11px]">
            <button
              onClick={() => onViewModeChange('web')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                viewMode === 'web' ? 'bg-accent text-on-accent shadow' : 'text-[#8C5A3C] hover:text-[#4B2E2B]'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Web</span>
            </button>
            <button
              onClick={() => onViewModeChange('mobile_frame')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                viewMode === 'mobile_frame' ? 'bg-accent text-on-accent shadow' : 'text-[#8C5A3C] hover:text-[#4B2E2B]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>

          <div className="flex items-center bg-[#F4EFE6] rounded-xl p-1 border border-[#8C5A3C]/20 text-[11px]">
            <button
              onClick={() => store.setAccountState('member')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                member.accountState === 'member' ? 'bg-accent text-on-accent font-black shadow' : 'text-[#8C5A3C] hover:text-[#4B2E2B]'
              }`}
            >
              Pass ({member.credits} Cr)
            </button>
          </div>

          {user ? (
            <button
              onClick={logout}
              title={`Signed in as ${user.name} (${user.role})`}
              aria-label="Sign out"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#F4EFE6] hover:bg-red-50 text-[#4B2E2B] hover:text-red-700 rounded-xl border border-[#8C5A3C]/20 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px] font-semibold max-w-[8rem] truncate">{user.name}</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-accent hover:bg-accent-hover text-on-accent rounded-xl font-bold text-[11px] shadow-sm transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}

          <button
            onClick={() => store.resetToDemoData()}
            title="Reset All Demo Data"
            aria-label="Reset all demo data"
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#F4EFE6] hover:bg-[#E8DED1] text-[#8C5A3C] hover:text-[#4B2E2B] rounded-xl border border-[#8C5A3C]/20 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px] font-semibold">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
