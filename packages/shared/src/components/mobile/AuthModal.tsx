import React, { useState, useRef } from 'react';
import { store } from '../../services/store';
import { api, resolveAssetUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { X, Sparkles, CheckCircle2, Camera, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const member = store.getMember();
  const { user: liveUser, updateUser } = useAuth();
  const [name, setName] = useState(liveUser ? liveUser.name : member.name);
  const [email, setEmail] = useState(liveUser ? liveUser.email : member.email);
  const [neighborhood, setNeighborhood] = useState(member.homeNeighborhood);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>(member.coffeePreferences);
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayAvatar = liveUser?.profile_image_url
    ? resolveAssetUrl(liveUser.profile_image_url)
    : member.avatarUrl;

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setUploadError('Please select a JPG, PNG, WEBP, or GIF image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5MB.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    try {
      if (liveUser) {
        const res = await api.uploadAvatar(file);
        updateUser({ profile_image_url: res.image_url });
        store.updateMemberProfile({ avatarUrl: resolveAssetUrl(res.image_url) });
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            store.updateMemberProfile({ avatarUrl: reader.result });
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload image.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const dallasNeighborhoods = [
    'Deep Ellum',
    'Bishop Arts',
    'Knox-Henderson',
    'Uptown',
    'Oak Lawn',
    'Design District',
    'Downtown Dallas',
  ];

  const coffeeTypes = [
    { id: 'matcha', label: 'Matcha' },
    { id: 'espresso', label: 'Espresso' },
    { id: 'cold_brew', label: 'Cold Brew' },
    { id: 'latte', label: 'Latte & Milk Drinks' },
  ];

  const togglePreference = (id: string) => {
    if (selectedPreferences.includes(id)) {
      setSelectedPreferences(selectedPreferences.filter((p) => p !== id));
    } else {
      setSelectedPreferences([...selectedPreferences, id]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    store.updateMemberProfile({
      name,
      email,
      homeNeighborhood: neighborhood,
      coffeePreferences: selectedPreferences,
    });
    if (liveUser) {
      updateUser({ name });
      try {
        await api.updateProfile({
          name,
          neighborhood,
          coffee_preferences: selectedPreferences.filter((p) =>
            ['matcha', 'espresso', 'cold brew', 'latte'].includes(p)
          ),
        });
      } catch (err) {
        // Non-blocking
      }
    }
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-100">
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-extrabold text-slate-100">Account & Profile Setup</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {isSaved ? (
            <div className="text-center py-6 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="font-bold text-slate-100">Preferences Saved!</h4>
            </div>
          ) : (
            <>
              {/* Profile Photo */}
              <div className="flex items-center space-x-3.5 p-3 bg-slate-950/70 rounded-2xl border border-slate-800">
                <div className="relative shrink-0">
                  <img
                    src={displayAvatar}
                    alt={name}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-12 h-12 rounded-xl object-cover border border-amber-500/40 shadow-sm cursor-pointer hover:border-amber-400 transition-colors"
                    title="Click to choose picture"
                  />
                  {isUploading ? (
                    <div className="absolute inset-0 bg-black/70 rounded-xl flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow transition-transform active:scale-95"
                      title="Upload profile picture"
                    >
                      <Camera className="w-2.5 h-2.5" />
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleAvatarFile}
                    className="hidden"
                    disabled={isUploading}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold text-slate-200">Profile Photo</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-medium underline mt-0.5 cursor-pointer"
                  >
                    {isUploading ? 'Uploading...' : 'Change profile picture'}
                  </button>
                  {uploadError && <p className="text-[10px] text-rose-400 mt-0.5">{uploadError}</p>}
                </div>
              </div>

              {/* Name & Email */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Dallas Home Neighborhood */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Home Dallas Neighborhood
                </label>
                <select
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {dallasNeighborhoods.map((nh) => (
                    <option key={nh} value={nh}>
                      {nh}
                    </option>
                  ))}
                </select>
              </div>

              {/* Coffee Preferences */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                  Coffee & Beverage Preferences
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {coffeeTypes.map((type) => {
                    const isSelected = selectedPreferences.includes(type.id);
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => togglePreference(type.id)}
                        className={`p-2 rounded-xl border text-[11px] font-semibold text-left transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 mt-2"
              >
                Save Profile Preferences
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
