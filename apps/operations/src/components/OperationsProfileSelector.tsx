import React from 'react';
import { ShieldCheck, Store } from 'lucide-react';

export type OperationsProfileMode = 'admin' | 'cafe';

interface OperationsProfileSelectorProps {
  selectedProfile: OperationsProfileMode;
  onSelectProfile: (profile: OperationsProfileMode) => void;
  compact?: boolean;
}

export const OperationsProfileSelector: React.FC<OperationsProfileSelectorProps> = ({
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
            {selectedProfile === 'admin' ? 'Roasters Admin' : 'Cafe Counter Staff'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 p-1.5 bg-[#241A16]/80 rounded-2xl border border-[#FBF8F2]/15 relative">
        {/* Active Pill Indicator */}
        <div
          className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl bg-gradient-to-r transition-all duration-300 shadow-md ${
            selectedProfile === 'admin'
              ? 'left-1.5 from-[#B98252] to-[#8C5A3C] border border-[#E2A76F]/50'
              : 'left-[calc(50%+3px)] from-[#B98252] to-[#8C5A3C] border border-[#E2A76F]/50'
          }`}
          aria-hidden="true"
        />

        {/* Admin Profile Button */}
        <button
          type="button"
          onClick={() => onSelectProfile('admin')}
          className={`relative z-10 ${
            compact ? 'py-2 px-2 text-xs' : 'py-3 sm:py-3.5 px-3 text-xs sm:text-sm'
          } rounded-xl flex items-center justify-center space-x-2 font-semibold transition-colors ${
            selectedProfile === 'admin' ? 'text-white' : 'text-[#DDD4C8]/80 hover:text-white'
          }`}
        >
          <ShieldCheck className={`${compact ? 'w-4 h-4' : 'w-4.5 h-4.5'} flex-shrink-0 text-white`} />
          <span className="truncate">Admin Profile</span>
        </button>

        {/* Cafe User Button */}
        <button
          type="button"
          onClick={() => onSelectProfile('cafe')}
          className={`relative z-10 ${
            compact ? 'py-2 px-2 text-xs' : 'py-3 sm:py-3.5 px-3 text-xs sm:text-sm'
          } rounded-xl flex items-center justify-center space-x-2 font-semibold transition-colors ${
            selectedProfile === 'cafe' ? 'text-white' : 'text-[#DDD4C8]/80 hover:text-white'
          }`}
        >
          <Store className={`${compact ? 'w-4 h-4' : 'w-4.5 h-4.5'} flex-shrink-0 text-white`} />
          <span className="truncate">Cafe User</span>
        </button>
      </div>
    </div>
  );
};
