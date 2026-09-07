import React, { useState } from 'react';
import { StarRating } from '../common/StarRating';

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

// One redeemed-drink card: shows the existing review read-only, or an
// inline rating form if there isn't one yet / the member chose to edit.
// Owns its own transient (draft/editing) state - the parent only supplies
// data and persistence callbacks, then refreshes the list on success.
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
    iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const handleSave = async () => {
    if (draftRating < 1 || draftRating > 5) {
      setError('Select a star rating first.');
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
    if (!window.confirm('Delete this rating?')) return;
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
    <div className="bg-white border border-[#8C5A3C]/20 rounded-2xl p-4 space-y-2.5 shadow-sm">
      <div className="flex items-start space-x-3">
        {drinkImageUrl && (
          <img src={drinkImageUrl} alt={drinkName} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black text-[#4B2E2B] truncate">☕ {drinkName}</h4>
          <span className="text-xs text-[#8C5A3C] font-semibold">📍 {cafeName}</span>
          <div className="text-[10px] text-[#6B4E4B] font-mono mt-0.5">Redeemed: {formatDate(redeemedAt)}</div>
        </div>
      </div>

      {showForm ? (
        <div className="space-y-2 pt-1">
          {!review && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B4E4B]">Rate this drink</span>
          )}
          <StarRating value={draftRating} onChange={setDraftRating} />
          <div>
            <textarea
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
              placeholder="Optional tasting note..."
              rows={2}
              className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-xl p-2.5 text-xs text-[#4B2E2B] placeholder-[#6B4E4B]/50 focus:outline-none focus:border-[#C08552] resize-none"
            />
            <div className="text-right text-[10px] text-[#6B4E4B] font-mono">
              {draftNote.length}/{MAX_NOTE_LENGTH}
            </div>
          </div>
          {error && <p className="text-[11px] text-red-600 font-bold">{error}</p>}
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-2 bg-accent hover:bg-accent-hover text-on-accent rounded-xl font-black text-xs disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : review ? 'Save Changes' : 'Submit Rating'}
            </button>
            {review && (
              <button
                onClick={handleCancelEdit}
                className="py-2 px-3 bg-[#FFF8F0] text-[#6B4E4B] rounded-xl font-bold text-xs border border-[#8C5A3C]/20"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 pt-1">
          <StarRating value={review.rating} readOnly />
          {review.note && (
            <p className="text-xs text-[#6B4E4B] bg-[#FFF8F0] p-2.5 rounded-xl border border-[#8C5A3C]/15 italic">
              "{review.note}"
            </p>
          )}
          {error && <p className="text-[11px] text-red-600 font-bold">{error}</p>}
          <div className="flex space-x-3 pt-0.5">
            <button onClick={() => setIsEditing(true)} className="text-[11px] text-[#8C5A3C] hover:underline font-bold">
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={isSaving}
              className="text-[11px] text-red-600 hover:underline font-bold disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
