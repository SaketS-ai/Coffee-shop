import React from 'react';
import { Coffee, Sparkles } from 'lucide-react';

interface AuthHeaderImageProps {
  onDismiss?: () => void;
  showDismiss?: boolean;
}

const DEFAULT_COFFEE_IMAGE = '/auth-coffee-hero.jpg';
const FALLBACK_COFFEE_IMAGE = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=1200';

export const AuthHeaderImage: React.FC<AuthHeaderImageProps> = ({ onDismiss, showDismiss = false }) => {
  return (
    <div className="relative w-full h-56 sm:h-60 overflow-hidden bg-[#3A2922] select-none">
      {/* High-Resolution Coffee Photo */}
      <img
        src={DEFAULT_COFFEE_IMAGE}
        alt="Artisanal Coffee Flat Lay"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = FALLBACK_COFFEE_IMAGE;
        }}
        className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-1000 ease-out"
      />

      {/* Subtle Warm Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent pointer-events-none" />

      {/* Top Brand Pill */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="inline-flex items-center space-x-2 bg-[#241A16]/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-sm text-[#FBF8F2]">
          <Coffee className="w-4 h-4 text-[#B98252]" />
          <span className="font-editorial text-xs font-bold tracking-wider uppercase">Social Cup</span>
          <span className="text-[10px] text-[#DDD4C8]/60">•</span>
          <span className="text-[10px] font-mono font-medium text-[#DDD4C8]">Dallas Roasters</span>
        </div>

        {showDismiss && onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-[#241A16]/80 hover:bg-[#241A16] text-[#FBF8F2] backdrop-blur-md flex items-center justify-center border border-white/15 transition-all active:scale-95 shadow-sm"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        )}
      </div>

      {/* Organic Asymmetric Wave Curve (Transitions smoothly into #6B4A3A auth panel) */}
      <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
        <svg
          viewBox="0 0 500 80"
          preserveAspectRatio="none"
          className="w-full h-12 sm:h-14 fill-[#6B4A3A] block transform translate-y-[1px]"
        >
          {/* Smooth organic curve: starts slightly higher on the left, dips gracefully, and softly slopes */}
          <path d="M0,35 C140,0 260,75 500,20 L500,80 L0,80 Z" />
        </svg>
      </div>
    </div>
  );
};
