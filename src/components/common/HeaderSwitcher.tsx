import React from 'react';
import { UserRole } from '../../types';
import { store } from '../../services/store';
import { Smartphone, QrCode, ShieldCheck, RotateCcw, Sparkles } from 'lucide-react';

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
    <header className="bg-slate-950 text-slate-100 border-b border-slate-800 sticky top-0 z-50 shadow-2xl backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo & PRD Badge */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-900/30">
            <Sparkles className="w-5 h-5 text-slate-950 font-extrabold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-tight text-lg bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                Social Cup
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Dallas PRD v1.1
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Multi-Surface Live Prototype • Member | Barista | Admin
            </p>
          </div>
        </div>

        {/* Role Surface Selector Tabs */}
        <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            onClick={() => onRoleChange('member')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentRole === 'member' || currentRole === 'visitor'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile App</span>
          </button>

          <button
            onClick={() => onRoleChange('barista')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentRole === 'barista'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Barista Counter</span>
          </button>

          <button
            onClick={() => onRoleChange('admin')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentRole === 'admin'
                ? 'bg-indigo-500 text-slate-100 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Panel</span>
          </button>
        </div>

        {/* Quick Context Controls */}
        <div className="flex items-center space-x-2 text-xs">
          {/* Member State Quick Toggle (when in mobile mode) */}
          {(currentRole === 'member' || currentRole === 'visitor') && (
            <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-800 text-[11px]">
              <span className="text-slate-400 px-1.5">State:</span>
              <button
                onClick={() => store.setAccountState('visitor')}
                className={`px-2 py-0.5 rounded ${
                  member.accountState === 'visitor'
                    ? 'bg-slate-700 text-amber-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Visitor
              </button>
              <button
                onClick={() => store.setAccountState('member')}
                className={`px-2 py-0.5 rounded ${
                  member.accountState === 'member'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Subscriber ({member.credits} cr)
              </button>
            </div>
          )}

          {/* Cafe Selector (when in barista mode) */}
          {currentRole === 'barista' && (
            <div className="flex items-center space-x-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-[11px]">
              <span className="text-slate-400">Cafe:</span>
              <select
                value={selectedCafeId}
                onChange={(e) => onCafeIdChange(e.target.value)}
                className="bg-transparent text-emerald-400 font-semibold focus:outline-none"
              >
                {cafes.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                    {c.name} ({c.neighborhood})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Demo Data */}
          <button
            onClick={() => store.resetToDemoData()}
            title="Reset All Demo Data"
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px]">Reset Data</span>
          </button>
        </div>
      </div>
    </header>
  );
};
