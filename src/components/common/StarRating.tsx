import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md';
}

// Reusable 1-5 star picker/display (Phase 9). Controlled component - the
// parent owns the value and persists it; this only renders and reports
// clicks.
export const StarRating: React.FC<StarRatingProps> = ({ value, onChange, readOnly = false, size = 'md' }) => {
  const starSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-6 h-6';

  return (
    <div
      className="flex items-center space-x-1"
      role={readOnly ? undefined : 'radiogroup'}
      aria-label="Rating"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          role={readOnly ? undefined : 'radio'}
          aria-checked={readOnly ? undefined : n === value}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={`p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C08552] ${
            readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'
          }`}
        >
          <Star className={`${starSize} ${n <= value ? 'text-[#8C5A3C] fill-[#8C5A3C]' : 'text-[#8C5A3C]/30'}`} />
        </button>
      ))}
    </div>
  );
};
