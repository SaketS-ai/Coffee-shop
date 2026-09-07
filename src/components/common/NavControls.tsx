import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// In-app Back/Forward buttons alongside the browser's own - useful in the
// Mobile Device Shell preview (no visible browser chrome) and for anyone who
// prefers not to reach for a physical/gesture back button. Just calls the
// same history the browser's own controls use (navigate(-1)/navigate(1)),
// so it stays in sync with Back/Forward however either is triggered. Always
// enabled, same as a real browser's Back/Forward buttons - there's no
// reliable, library-independent way to know whether there's anywhere left
// to go, and clicking one when there isn't is a harmless no-op.
export const NavControls: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center space-x-1">
      <button
        onClick={() => navigate(-1)}
        aria-label="Go back"
        title="Back"
        className="p-2 rounded-xl bg-[#F4EFE6] hover:bg-[#E8DED1] text-[#8C5A3C] border border-[#8C5A3C]/20 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => navigate(1)}
        aria-label="Go forward"
        title="Forward"
        className="p-2 rounded-xl bg-[#F4EFE6] hover:bg-[#E8DED1] text-[#8C5A3C] border border-[#8C5A3C]/20 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
