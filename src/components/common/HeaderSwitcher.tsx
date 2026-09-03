import React from 'react';
import { UserRole } from '../../types';
import { store } from '../../services/store';
import { Smartphone, QrCode, ShieldCheck, RotateCcw, Coffee, Sparkles, MapPin } from 'lucide-react';

interface HeaderSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  selectedCafeId: string;
  onCafeIdChange: (cafeId: string) => void;
}

export const HeaderSwitcher: React.FC<HeaderSwitcherProps> = ({
  currentRole,
  onRoleChange,
  selectedCafeId,
  onCafeIdChange,
}) => {
  const member = store.getMember();
  const cafes = store.getCafes();

  return (
    <header className="bg-[#0B0F17]/90 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Identity */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/25 ring-1 ring-amber-300/30">
            <Coffee className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-tight text-xl bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                Social Cup
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25 shadow-sm">
                Dallas TX
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
              Coffee Membership & Discovery Network
            </p>
          </div>
        </div>

        {/* Role Surface Selector Tabs */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-white/10 shadow-inner">
          <button
            onClick={() => onRoleChange('member')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentRole === 'member' || currentRole === 'visitor'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Member App</span>
          </button>

          <button
            onClick={() => onRoleChange('barista')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentRole === 'barista'
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Barista Counter</span>
          </button>

          <button
            onClick={() => onRoleChange('admin')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentRole === 'admin'
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Panel</span>
          </button>
        </div>

        {/* Quick Context Controls */}
        <div className="flex items-center space-x-2 text-xs">
          {/* Member State Switcher */}
          {(currentRole === 'member' || currentRole === 'visitor') && (
            <div className="flex items-center bg-slate-900/90 rounded-xl p-1 border border-white/10 text-[11px]">
              <span className="text-slate-400 px-2 font-semibold">Account:</span>
              <button
                onClick={() => store.setAccountState('visitor')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  member.accountState === 'visitor'
                    ? 'bg-slate-800 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Visitor
              </button>
              <button
                onClick={() => store.setAccountState('member')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  member.accountState === 'member'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Subscriber ({member.credits} Cr)
              </button>
            </div>
          )}

          {/* Barista Cafe Selector */}
          {currentRole === 'barista' && (
            <div className="flex items-center space-x-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-white/10 text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <select
                value={selectedCafeId}
                onChange={(e) => onCafeIdChange(e.target.value)}
                className="bg-transparent text-emerald-400 font-extrabold focus:outline-none cursor-pointer"
              >
                {cafes.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                    {c.name} ({c.neighborhood})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Demo Data Button */}
          <button
            onClick={() => store.resetToDemoData()}
            title="Reset All Demo Data"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-xl border border-white/10 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px] font-semibold">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
