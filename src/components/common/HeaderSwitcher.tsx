import React from 'react';
import { UserRole, CoffeeTheme } from '../../types';
import { store } from '../../services/store';
import { Smartphone, QrCode, ShieldCheck, RotateCcw, Coffee, Sparkles, MapPin, Palette } from 'lucide-react';

interface HeaderSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  selectedCafeId: string;
  onCafeIdChange: (cafeId: string) => void;
  currentTheme: CoffeeTheme;
  onThemeChange: (theme: CoffeeTheme) => void;
}

export const HeaderSwitcher: React.FC<HeaderSwitcherProps> = ({
  currentRole,
  onRoleChange,
  selectedCafeId,
  onCafeIdChange,
  currentTheme,
  onThemeChange,
}) => {
  const member = store.getMember();
  const cafes = store.getCafes();

  return (
    <header className="bg-[#140D0A]/90 backdrop-blur-xl border-b border-amber-900/30 sticky top-0 z-50 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Identity */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 flex items-center justify-center shadow-lg shadow-amber-900/40 ring-1 ring-amber-500/30">
            <Coffee className="w-5 h-5 text-amber-100 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-tight text-xl bg-gradient-to-r from-amber-100 via-amber-300 to-orange-200 bg-clip-text text-transparent">
                Social Cup
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Dallas TX
              </span>
            </div>
            <p className="text-[11px] text-amber-200/70 hidden sm:block font-medium">
              Handcrafted Coffee Membership & Discovery
            </p>
          </div>
        </div>

        {/* Role Surface Selector Tabs */}
        <div className="flex items-center bg-[#1A120F] p-1 rounded-2xl border border-amber-900/40 shadow-inner">
          <button
            onClick={() => onRoleChange('member')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentRole === 'member' || currentRole === 'visitor'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-100 shadow-lg shadow-amber-900/40 font-extrabold'
                : 'text-amber-200/60 hover:text-amber-100'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Member App</span>
          </button>

          <button
            onClick={() => onRoleChange('barista')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentRole === 'barista'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-800 text-emerald-100 shadow-lg shadow-emerald-900/40 font-extrabold'
                : 'text-amber-200/60 hover:text-amber-100'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Barista Counter</span>
          </button>

          <button
            onClick={() => onRoleChange('admin')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentRole === 'admin'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-800 text-indigo-100 shadow-lg shadow-indigo-900/40 font-extrabold'
                : 'text-amber-200/60 hover:text-amber-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Panel</span>
          </button>
        </div>

        {/* Quick Controls & Trending Coffee Theme Switcher */}
        <div className="flex items-center space-x-2 text-xs">
          {/* Trending Theme Switcher Dropdown */}
          <div className="flex items-center space-x-1.5 bg-[#1A120F] px-2.5 py-1.5 rounded-xl border border-amber-900/40 text-[11px]">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-200/70 font-semibold hidden md:inline">Theme:</span>
            <select
              value={currentTheme}
              onChange={(e) => onThemeChange(e.target.value as CoffeeTheme)}
              className="bg-transparent text-amber-300 font-extrabold focus:outline-none cursor-pointer text-xs"
            >
              <option value="roast_cream" className="bg-[#1A120F] text-amber-200">
                ☕ Warm Roast & Cream (Blue Bottle/Stumptown)
              </option>
              <option value="botanical_sage" className="bg-[#111815] text-emerald-300">
                🌿 Botanical Sage (Devoción/Verve)
              </option>
              <option value="obsidian_gold" className="bg-[#0B0F17] text-amber-400">
                🌘 Obsidian & Gold (% Arabica/Onyx)
              </option>
            </select>
          </div>

          {/* Member State Quick Toggle */}
          {(currentRole === 'member' || currentRole === 'visitor') && (
            <div className="flex items-center bg-[#1A120F] rounded-xl p-1 border border-amber-900/40 text-[11px]">
              <button
                onClick={() => store.setAccountState('visitor')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  member.accountState === 'visitor'
                    ? 'bg-amber-900/40 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-amber-200/60 hover:text-amber-100'
                }`}
              >
                Visitor
              </button>
              <button
                onClick={() => store.setAccountState('member')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  member.accountState === 'member'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-100 font-black shadow'
                    : 'text-amber-200/60 hover:text-amber-100'
                }`}
              >
                Pass ({member.credits} Cr)
              </button>
            </div>
          )}

          {/* Barista Cafe Selector */}
          {currentRole === 'barista' && (
            <div className="flex items-center space-x-1.5 bg-[#1A120F] px-2.5 py-1.5 rounded-xl border border-amber-900/40 text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <select
                value={selectedCafeId}
                onChange={(e) => onCafeIdChange(e.target.value)}
                className="bg-transparent text-emerald-400 font-extrabold focus:outline-none cursor-pointer text-xs"
              >
                {cafes.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#1A120F] text-amber-200">
                    {c.name} ({c.neighborhood})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Button */}
          <button
            onClick={() => store.resetToDemoData()}
            title="Reset All Demo Data"
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#1A120F] hover:bg-amber-950/40 text-amber-200/70 hover:text-amber-100 rounded-xl border border-amber-900/40 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px] font-semibold">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
