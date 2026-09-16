import React, { useEffect, useState } from 'react';
import { Drink } from '../../types';
import { api, ApiError, resolveAssetUrl, DEFAULT_DRINK_IMAGE } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { X, Star, Check, Sparkles, Coffee } from 'lucide-react';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  drink?: Drink;
}

export const RatingModal: React.FC<RatingModalProps> = ({ isOpen, onClose, drink }) => {
  const { user } = useAuth();
  const [stars, setStars] = useState<number>(5);
  const [note, setNote] = useState<string>('');
  const [hoverStars, setHoverStars] = useState<number>(0);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStars(5);
      setNote('');
      setError(null);
      setIsSubmitted(false);
    }
  }, [isOpen, drink?.id]);

  if (!isOpen || !drink) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Please sign in to rate a drink.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await api.createReview({ drinkId: drink.id, rating: stars, note: note.trim() || null });
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        onClose();
      }, 1000);
    } catch (err) {
      if (err instanceof ApiError && err.reason === 'REVIEW_ALREADY_EXISTS') {
        setError("You've already rated this drink — edit it from your Drink Diary instead.");
      } else {
        setError(err instanceof Error ? err.message : 'Failed to submit rating.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingChars = 140 - note.length;

  return (
    <div className="fixed inset-0 z-50 bg-[#261612]/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#FDFBF7] border border-[#DDD4C8] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl text-[#241A16] animate-scale-in">
        {/* Header Bar */}
        <div className="bg-[#F7F2EA] px-5 py-4 border-b border-[#DDD4C8]/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#B98252]/15 border border-[#B98252]/30 flex items-center justify-center text-[#B98252]">
              <Sparkles className="w-4 h-4 fill-[#B98252]" />
            </div>
            <div>
              <h3 className="font-editorial text-base font-bold text-[#241A16] leading-tight">
                Rate Your Drink
              </h3>
              <span className="text-[10px] font-mono text-[#756B63] uppercase tracking-wider block">
                Artisanal Cupping Journal
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[#756B63] hover:text-[#241A16] p-1.5 rounded-full hover:bg-[#EAE5DF] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {isSubmitted ? (
            <div className="text-center py-6 space-y-2 animate-scale-in">
              <div className="w-12 h-12 bg-[#4E6348]/15 text-[#4E6348] rounded-full flex items-center justify-center mx-auto border border-[#4E6348]/30">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h4 className="text-base font-editorial font-bold text-[#241A16]">Rating Saved!</h4>
              <p className="text-xs text-[#756B63]">Added to your Dallas tasting notes & drink diary.</p>
            </div>
          ) : (
            <>
              {/* Drink Summary Card */}
              <div className="flex items-center space-x-3 bg-white p-3 rounded-2xl border border-[#EAE5DF] shadow-2xs">
                <img
                  src={resolveAssetUrl(drink.imageUrl || DEFAULT_DRINK_IMAGE)}
                  alt={drink.name}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = DEFAULT_DRINK_IMAGE;
                  }}
                  className="w-12 h-12 rounded-xl object-cover border border-[#EAE5DF]"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[#241A16] truncate">{drink.name}</h4>
                  <div className="flex items-center space-x-1.5 mt-0.5 text-[10px] text-[#756B63]">
                    <Coffee className="w-3 h-3 text-[#B98252]" />
                    <span className="capitalize font-medium truncate">
                      {drink.category?.replace(/_/g, ' ') || 'Specialty Drink'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Star Rating Picker */}
              <div className="text-center space-y-2 py-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#756B63]">
                  Select Rating
                </label>
                <div className="flex items-center justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((starNum) => (
                    <button
                      key={starNum}
                      type="button"
                      onClick={() => setStars(starNum)}
                      onMouseEnter={() => setHoverStars(starNum)}
                      onMouseLeave={() => setHoverStars(0)}
                      className="p-1 transition-transform hover:scale-115 focus:outline-none"
                      aria-label={`${starNum} star${starNum > 1 ? 's' : ''}`}
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          starNum <= (hoverStars || stars)
                            ? 'text-[#B98252] fill-[#B98252] drop-shadow-xs'
                            : 'text-[#DDD4C8] hover:text-[#B98252]/50'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className="h-4">
                  <span className="text-xs font-bold text-[#8C5A3C]">
                    {stars === 5
                      ? 'Exceptional!'
                      : stars === 4
                      ? 'Great Roast!'
                      : stars === 3
                      ? 'Good Balance'
                      : stars === 2
                      ? 'Fair'
                      : 'Needs Improvement'}
                  </span>
                </div>
              </div>

              {/* Review Note Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#756B63]">
                    Tasting Note (Optional)
                  </label>
                  <span className="text-[10px] font-mono text-[#756B63]/80">
                    {remainingChars} chars left
                  </span>
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 140))}
                  placeholder="e.g. Smooth espresso balance with subtle lavender sweetness..."
                  rows={3}
                  className="w-full bg-white border border-[#DDD4C8] focus:border-[#8C5A3C] rounded-xl p-3 text-xs text-[#241A16] placeholder-[#756B63]/50 focus:outline-none focus:ring-1 focus:ring-[#8C5A3C]/20 transition-all resize-none shadow-2xs"
                />
              </div>

              {error && (
                <p className="text-xs font-bold text-[#A3483E] bg-[#A3483E]/10 border border-[#A3483E]/30 rounded-xl p-2.5">
                  {error}
                </p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-accent hover:bg-accent-hover text-on-accent font-black rounded-2xl text-xs shadow-md shadow-[#B98252]/20 transition-all active:scale-98 flex items-center justify-center space-x-2 disabled:opacity-60"
              >
                <span>{isSubmitting ? 'Saving...' : 'Save Rating & Review'}</span>
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
