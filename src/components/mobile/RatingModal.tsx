import React, { useState } from 'react';
import { Drink } from '../../types';
import { store } from '../../services/store';
import { X, Star, Check, Sparkles } from 'lucide-react';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  drink?: Drink;
}

export const RatingModal: React.FC<RatingModalProps> = ({ isOpen, onClose, drink }) => {
  const [stars, setStars] = useState<number>(5);
  const [note, setNote] = useState<string>('');
  const [hoverStars, setHoverStars] = useState<number>(0);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  if (!isOpen || !drink) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.submitDrinkRating(drink.id, stars, note);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 1000);
  };

  const remainingChars = 140 - note.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-100">
        {/* Header */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-extrabold text-slate-100">Rate Your Drink</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {isSubmitted ? (
            <div className="text-center py-6 space-y-2 animate-in zoom-in-90 duration-200">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/40">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-100">Rating Saved!</h4>
              <p className="text-xs text-slate-400">Added to your personal Drink Diary.</p>
            </div>
          ) : (
            <>
              {/* Drink Summary Card */}
              <div className="flex items-center space-x-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <img
                  src={drink.imageUrl}
                  alt={drink.name}
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-100">{drink.name}</h4>
                  <span className="text-[10px] text-slate-400">
                    Category: {drink.category.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Star Rating Picker */}
              <div className="text-center space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
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
                      className="p-1 transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          starNum <= (hoverStars || stars)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-semibold text-amber-400">
                  {stars === 5 ? 'Exceptional!' : stars === 4 ? 'Great!' : stars === 3 ? 'Average' : 'Below Expectations'}
                </span>
              </div>

              {/* Review Note Input (Optional up to 140 chars) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Tasting Note (Optional)
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">
                    {remainingChars} chars left
                  </span>
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 140))}
                  placeholder="e.g. Smooth espresso balance with subtle lavender sweetness..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20"
              >
                Save Rating & Review
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
