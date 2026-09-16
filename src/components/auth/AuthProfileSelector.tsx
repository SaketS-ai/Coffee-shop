import React from 'react';
import { ShieldCheck, Store } from 'lucide-react';

export type AuthProfileMode = 'admin' | 'cafe';

interface AuthProfileSelectorProps {
  selectedProfile: AuthProfileMode;
  onSelectProfile: (profile: AuthProfileMode) => void;
  compact?: boolean;
}

export const AuthProfileSelector: React.FC<AuthProfileSelectorProps> = ({
  selectedProfile,
  onSelectProfile,
  compact = false,
}) => {
  return (
    <div className="w-full space-y-2">
      {!compact && (
        <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-[#DDD4C8] px-1">
          <span>Select Operational Profile</span>
          <span className="text-xs font-mono font-medium text-[#E2A76F] uppercase">
            {selectedProfile === 'admin' ? 'Roasters Admin' : 'Counter Scanner'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 p-1.5 bg-[#241A16]/60 rounded-2xl border border-[#FBF8F2]/15 relative">
        {/* Active Pill Indicator */}
        <div
          className={`absolute top-1.5 bottom-1.5 w-[calc(50%-4px)] rounded-xl bg-gradient-to-r transition-all duration-300 shadow-md ${
            selectedProfile === 'admin'
              ? 'left-1.5 from-[#3A2922] to-[#241A16] border border-[#B98252]/50'
              : 'left-[calc(50%+2px)] from-[#3A2922] to-[#241A16] border border-[#E2A76F]/60'
          }`}
          aria-hidden="true"
        />

        {/* Admin Profile Button */}
        <button
          type="button"
          onClick={() => onSelectProfile('admin')}
          className={`relative z-10 ${
            compact ? 'py-2 px-1 sm:px-2 text-xs' : 'py-3 sm:py-3.5 px-2 sm:px-3 text-xs sm:text-sm'
          } rounded-xl flex items-center justify-center space-x-1.5 sm:space-x-2 font-semibold transition-colors ${
            selectedProfile === 'admin'
              ? 'text-white'
              : 'text-[#DDD4C8]/80 hover:text-white'
          }`}
        >
          <ShieldCheck className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4 sm:w-4.5 sm:h-4.5'} flex-shrink-0 text-[#B98252]`} />
          <span className="truncate">Admin Profile</span>
        </button>

        {/* Cafe User Button */}
        <button
          type="button"
          onClick={() => onSelectProfile('cafe')}
          className={`relative z-10 ${
            compact ? 'py-2 px-1 sm:px-2 text-xs' : 'py-3 sm:py-3.5 px-2 sm:px-3 text-xs sm:text-sm'
          } rounded-xl flex items-center justify-center space-x-1.5 sm:space-x-2 font-semibold transition-colors ${
            selectedProfile === 'cafe'
              ? 'text-white'
              : 'text-[#DDD4C8]/80 hover:text-white'
          }`}
        >
          <Store className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4 sm:w-4.5 sm:h-4.5'} flex-shrink-0 text-[#E2A76F]`} />
          <span className="truncate">Cafe User</span>
        </button>
      </div>
    </div>
  );
};
