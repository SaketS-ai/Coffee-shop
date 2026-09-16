import React from 'react';
import { Signal, Wifi, BatteryFull } from 'lucide-react';

interface PhoneFrameProps {
  children: React.ReactNode;
}

// The Member App only ever renders inside this device mockup - at every
// browser width - per the product decision to keep the member experience
// visually "mobile app", not a responsive website. See MobileAppContainer
// and UnifiedAuthPage, which fill this frame's screen area (h-full) rather
// than assuming they own the real viewport (min-h-screen).
export const PhoneFrame: React.FC<PhoneFrameProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-[#1B120D] flex items-center justify-center p-4 sm:p-8">
      <div className="relative aspect-[9/19.5] h-[min(844px,92vh)] max-w-[430px] bg-black rounded-[55px] p-2.5 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.65)]">
        {/* Side buttons */}
        <div className="absolute -left-[2px] top-[26%] w-[2px] h-7 bg-[#0a0a0a] rounded-l-sm" />
        <div className="absolute -left-[2px] top-[33%] w-[2px] h-12 bg-[#0a0a0a] rounded-l-sm" />
        <div className="absolute -left-[2px] top-[43%] w-[2px] h-12 bg-[#0a0a0a] rounded-l-sm" />
        <div className="absolute -right-[2px] top-[30%] w-[2px] h-16 bg-[#0a0a0a] rounded-r-sm" />

        {/* Screen */}
        <div className="relative w-full h-full bg-[#1E1411] rounded-[44px] overflow-hidden flex flex-col">
          {/* Dynamic Island */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-[22px] bg-black rounded-full z-30" />

          {/* Status Bar */}
          <div className="relative z-20 flex items-center justify-between px-7 pt-3.5 pb-1 text-white text-[13px] font-semibold shrink-0 select-none">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <Signal className="w-3.5 h-3.5" />
              <Wifi className="w-3.5 h-3.5" />
              <BatteryFull className="w-5 h-5" />
            </div>
          </div>

          {/* App content - the one scrollable region, like a real phone screen */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none relative">
            {children}
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-[5px] bg-white/80 rounded-full z-30 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
