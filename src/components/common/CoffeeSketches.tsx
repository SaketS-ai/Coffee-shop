import React from 'react';

// V60 Dripper & Kettle Line Art Sketch SVG
export const V60PourOverSketch: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Gooseneck Kettle spout stream */}
    <path d="M 15,25 C 25,15 40,20 48,32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M 48,32 Q 50,42 50,45" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />

    {/* V60 Cone Dripper */}
    <path d="M 30,45 L 70,45 L 56,70 L 44,70 Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    <line x1="38" y1="52" x2="62" y2="52" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    <line x1="41" y1="58" x2="59" y2="58" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    <line x1="44" y1="64" x2="56" y2="64" stroke="currentColor" strokeWidth="1" opacity="0.6" />

    {/* Dripper Base Ring */}
    <ellipse cx="50" cy="71" rx="14" ry="3" stroke="currentColor" strokeWidth="2" />

    {/* Glass Server Carafe */}
    <path d="M 40,74 L 32,88 C 30,92 34,95 50,95 C 66,95 70,92 68,88 L 60,74" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M 36,83 C 45,86 55,86 64,83" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />

    {/* Steam Waves */}
    <path d="M 45,38 Q 43,32 47,26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M 52,38 Q 54,32 50,26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M 58,40 Q 56,34 60,28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Coffee Cherry Branch Sketch SVG
export const CoffeeBranchSketch: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Main Stem */}
    <path d="M 10,85 C 35,70 60,40 90,15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    
    {/* Leaves */}
    <path d="M 35,60 C 20,45 30,30 45,45 C 40,55 35,60 35,60 Z" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.08" />
    <path d="M 35,60 Q 33,45 45,45" stroke="currentColor" strokeWidth="1" />

    <path d="M 55,42 C 65,25 80,30 68,48 C 60,45 55,42 55,42 Z" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.08" />
    <path d="M 55,42 Q 68,32 68,48" stroke="currentColor" strokeWidth="1" />

    {/* Coffee Cherries */}
    <circle cx="38" cy="58" r="6" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
    <circle cx="48" cy="52" r="5.5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
    <circle cx="60" cy="38" r="6.5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
    <circle cx="68" cy="32" r="5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
  </svg>
);

// Espresso Portafilter & Steam Sketch SVG
export const PortafilterSketch: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Handle */}
    <path d="M 10,50 L 38,50" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    <circle cx="10" cy="50" r="4" fill="currentColor" />

    {/* Filter Basket */}
    <rect x="38" y="38" width="28" height="18" rx="3" stroke="currentColor" strokeWidth="2.5" />
    <path d="M 35,38 L 69,38" stroke="currentColor" strokeWidth="3" />

    {/* Spout */}
    <path d="M 46,56 L 46,65 L 50,65 L 50,56" stroke="currentColor" strokeWidth="1.5" />
    <path d="M 56,56 L 56,65 L 60,65 L 60,56" stroke="currentColor" strokeWidth="1.5" />

    {/* Streams */}
    <path d="M 48,65 Q 47,75 48,82" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M 58,65 Q 59,75 58,82" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

    {/* Espresso Cup */}
    <path d="M 40,82 C 40,95 66,95 66,82 Z" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.1" />
    <path d="M 66,84 C 72,84 72,90 66,90" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// Tulip Latte Art Sketch SVG
export const LatteArtSketch: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Cup Rim */}
    <ellipse cx="50" cy="50" rx="36" ry="24" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.05" />
    
    {/* Saucer */}
    <ellipse cx="50" cy="54" rx="44" ry="28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.6" />

    {/* Latte Art Heart Leaves */}
    <path d="M 50,34 C 44,28 36,36 50,48 C 64,36 56,28 50,34 Z" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.2" />
    <path d="M 50,42 C 46,38 40,43 50,52 C 60,43 54,38 50,42 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
    <path d="M 50,50 C 47,47 42,51 50,58 C 58,51 53,47 50,50 Z" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.2" />
    
    {/* Base Stem */}
    <path d="M 50,58 L 50,64" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// Artisanal Stamp Badge SVG
export const ArtisanalStampBadge: React.FC<{ className?: string }> = ({ className = 'w-24 h-24' }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Outer Scallop Circle */}
    <circle cx="60" cy="60" r="54" stroke="currentColor" strokeWidth="2" strokeDasharray="6 3" />
    <circle cx="60" cy="60" r="48" stroke="currentColor" strokeWidth="1" />

    {/* Curved Text Path */}
    <path id="textPath" d="M 22,60 A 38,38 0 1,1 98,60" fill="none" />
    <text textAnchor="middle" fill="currentColor" className="text-[9px] font-black uppercase tracking-widest">
      <textPath href="#textPath" startOffset="50%">
        ★ DALLAS CRAFT COFFEE ★
      </textPath>
    </text>

    {/* Center Coffee Bean */}
    <path d="M 60,46 C 50,46 46,55 46,65 C 46,75 55,78 60,78 C 65,78 74,75 74,65 C 74,55 70,46 60,46 Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
    <path d="M 60,48 Q 54,62 60,76" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
