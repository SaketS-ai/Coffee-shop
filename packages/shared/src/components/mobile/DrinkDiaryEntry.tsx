import React, { useState } from 'react';
import { StarRating } from '../common/StarRating';
import { Coffee, MapPin, Calendar, Edit3, Trash2, Check, X, Sparkles } from 'lucide-react';

const MAX_NOTE_LENGTH = 500;

interface DrinkDiaryEntryReview {
  id: string;
  rating: number;
  note: string | null;
}

interface DrinkDiaryEntryProps {
  cafeName: string;
  drinkName: string;
  drinkImageUrl: string | null;
  redeemedAt: string | null;
  review: DrinkDiaryEntryReview | null;
  onSubmit: (rating: number, note: string) => Promise<void>;
  onUpdate: (reviewId: string, rating: number, note: string) => Promise<void>;
  onDelete: (reviewId: string) => Promise<void>;
}

export const DrinkDiaryEntry: React.FC<DrinkDiaryEntryProps> = ({
  cafeName,
  drinkName,
  drinkImageUrl,
  redeemedAt,
  review,
  onSubmit,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftRating, setDraftRating] = useState(review?.rating ?? 0);
  const [draftNote, setDraftNote] = useState(review?.note ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Recently';

  const handleSave = async () => {
    if (draftRating < 1 || draftRating > 5) {
      setError('Please select a star rating (1-5 stars).');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      if (review) await onUpdate(review.id, draftRating, draftNote);
      else await onSubmit(draftRating, draftNote);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save rating.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setDraftRating(review?.rating ?? 0);
    setDraftNote(review?.note ?? '');
    setError(null);
  };

  const handleDelete = async () => {
    if (!review) return;
    if (!window.confirm('Delete this tasting entry from your diary?')) return;
    setIsSaving(true);
    setError(null);
    try {
      await onDelete(review.id);
    } catch (err: any) {
      setError(err.message || 'Failed to delete rating.');
      setIsSaving(false);
    }
  };

  const showForm = isEditing || !review;

  return (
    <div className="bg-white border border-[#8C5A3C]/18 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-2xs hover:shadow-md hover:border-[#C08552]/50 transition-all group">
      {/* Header: Drink Image + Metadata */}
      <div className="flex items-start space-x-3.5">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-[#F5EFEB] flex-shrink-0 border border-[#8C5A3C]/15 relative shadow-xs">
          {drinkImageUrl ? (
            <img src={drinkImageUrl} alt={drinkName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#8C5A3C]">
              <Coffee className="w-8 h-8 opacity-60" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center space-x-1.5 text-[10px] font-bold text-[#8C5A3C] uppercase tracking-wider">
            <MapPin className="w-3 h-3 text-[#D4A373]" />
            <span className="truncate">{cafeName}</span>
          </div>

          <h4 className="font-editorial text-base sm:text-lg font-bold text-[#261612] truncate leading-tight">
            {drinkName}
          </h4>

          <div className="flex items-center space-x-1 text-[11px] text-[#6B4E4B] font-medium">
            <Calendar className="w-3 h-3 text-[#8C5A3C]/70" />
            <span>Tasted on {formatDate(redeemedAt)}</span>
          </div>
        </div>
      </div>

      {/* Form or Review Content */}
      {showForm ? (
        <div className="space-y-3 pt-2 border-t border-[#8C5A3C]/10 bg-[#FDFBF7] p-3 rounded-2xl border border-[#8C5A3C]/15">
          <div>
            <span className="text-[10px] font-bold text-[#6B4E4B] uppercase block mb-1">
              Your Roast Rating
            </span>
            <StarRating value={draftRating} onChange={setDraftRating} />
          </div>

          <div>
            <span className="text-[10px] font-bold text-[#6B4E4B] uppercase block mb-1">
              Tasting Notes & Aromas (optional)
            </span>
            <textarea
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
              placeholder="Notes of stone fruit, cacao, velvety mouthfeel..."
              rows={2}
              className="w-full bg-white border border-[#8C5A3C]/25 rounded-xl p-2.5 text-xs text-[#261612] placeholder-[#6B4E4B]/50 focus:outline-none focus:border-[#C08552] resize-none"
            />
          </div>

          {error && <p className="text-red-600 text-xs font-bold">{error}</p>}

          <div className="flex items-center justify-end space-x-2 pt-1">
            {review && (
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-3 py-1.5 text-xs font-bold text-[#6B4E4B] hover:text-[#261612] rounded-lg"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-on-accent text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 active:scale-95 flex items-center space-x-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : review ? 'Update Tasting' : 'Save to Diary'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="pt-2 border-t border-[#8C5A3C]/10 space-y-2">
          <div className="flex items-center justify-between">
            <StarRating value={review.rating} readOnly />
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-[#6B4E4B] hover:text-[#8C5A3C] text-xs font-bold flex items-center space-x-1 p-1 hover:bg-[#F5EFEB] rounded-lg transition-colors"
                title="Edit notes"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="text-[#6B4E4B] hover:text-red-700 text-xs font-bold flex items-center space-x-1 p-1 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete entry"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {review.note && (
            <p className="text-xs text-[#261612] bg-[#FDFBF7] p-2.5 rounded-xl border border-[#8C5A3C]/10 italic font-serif leading-relaxed">
              "{review.note}"
            </p>
          )}
        </div>
      )}
    </div>
  );
};
