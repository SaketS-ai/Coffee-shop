import React from 'react';
import { UserRole } from '../../types';
import { store } from '../../services/store';
import { Smartphone, QrCode, ShieldCheck, RotateCcw, Coffee, MapPin } from 'lucide-react';

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
    <header className="bg-[#FFF8F0]/95 backdrop-blur-xl border-b border-[#8C5A3C]/20 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-[#4B2E2B]">
        {/* Brand Identity */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#C08552] flex items-center justify-center shadow-md shadow-[#C08552]/30">
            <Coffee className="w-5 h-5 text-[#FFF8F0] stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-tight text-xl text-[#4B2E2B]">
                Social Cup
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#C08552]/15 text-[#8C5A3C] border border-[#C08552]/30">
                Dallas TX
              </span>
            </div>
            <p className="text-[11px] text-[#8C5A3C] hidden sm:block font-medium">
              Coffee Membership & Discovery Network
            </p>
          </div>
        </div>

        {/* Surface Switcher Tabs */}
        <div className="flex items-center bg-[#F4EFE6] p-1 rounded-2xl border border-[#8C5A3C]/20 shadow-inner">
          <button
            onClick={() => onRoleChange('member')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentRole === 'member' || currentRole === 'visitor'
                ? 'bg-[#C08552] text-[#FFF8F0] shadow-md font-extrabold'
                : 'text-[#8C5A3C] hover:text-[#4B2E2B]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Member App</span>
          </button>

          <button
            onClick={() => onRoleChange('barista')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentRole === 'barista'
                ? 'bg-[#8C5A3C] text-[#FFF8F0] shadow-md font-extrabold'
                : 'text-[#8C5A3C] hover:text-[#4B2E2B]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Barista Counter</span>
          </button>

          <button
            onClick={() => onRoleChange('admin')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentRole === 'admin'
                ? 'bg-[#4B2E2B] text-[#FFF8F0] shadow-md font-extrabold'
                : 'text-[#8C5A3C] hover:text-[#4B2E2B]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Panel</span>
          </button>
        </div>

        {/* Quick Context Controls */}
        <div className="flex items-center space-x-2 text-xs">
          {/* Member State Quick Toggle */}
          {(currentRole === 'member' || currentRole === 'visitor') && (
            <div className="flex items-center bg-[#F4EFE6] rounded-xl p-1 border border-[#8C5A3C]/20 text-[11px]">
              <button
                onClick={() => store.setAccountState('visitor')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  member.accountState === 'visitor'
                    ? 'bg-[#8C5A3C] text-[#FFF8F0] font-bold'
                    : 'text-[#8C5A3C] hover:text-[#4B2E2B]'
                }`}
              >
                Visitor
              </button>
              <button
                onClick={() => store.setAccountState('member')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  member.accountState === 'member'
                    ? 'bg-[#C08552] text-[#FFF8F0] font-black shadow'
                    : 'text-[#8C5A3C] hover:text-[#4B2E2B]'
                }`}
              >
                Pass ({member.credits} Cr)
              </button>
            </div>
          )}

          {/* Barista Cafe Selector */}
          {currentRole === 'barista' && (
            <div className="flex items-center space-x-1.5 bg-[#F4EFE6] px-2.5 py-1.5 rounded-xl border border-[#8C5A3C]/20 text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-[#C08552]" />
              <select
                value={selectedCafeId}
                onChange={(e) => onCafeIdChange(e.target.value)}
                className="bg-transparent text-[#4B2E2B] font-extrabold focus:outline-none cursor-pointer text-xs"
              >
                {cafes.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#FFF8F0] text-[#4B2E2B]">
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
