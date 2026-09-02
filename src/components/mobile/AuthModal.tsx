import React, { useState } from 'react';
import { store } from '../../services/store';
import { X, Mail, Sparkles, MapPin, Coffee, Lock, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const member = store.getMember();
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email);
  const [neighborhood, setNeighborhood] = useState(member.homeNeighborhood);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>(member.coffeePreferences);
  const [isSaved, setIsSaved] = useState(false);

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateMemberProfile({
      name,
      email,
      homeNeighborhood: neighborhood,
      coffeePreferences: selectedPreferences,
    });
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
              {/* Quick OAuth options */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    store.updateMemberProfile({ name: 'Alex Morgan (Google)' });
                    onClose();
                  }}
                  className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center space-x-2 text-slate-300 font-semibold hover:border-slate-700"
                >
                  <span>Continue with Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    store.updateMemberProfile({ name: 'Alex Morgan (Apple)' });
                    onClose();
                  }}
                  className="w-full py-2 px-3 bg-slate-100 text-slate-950 rounded-xl flex items-center justify-center space-x-2 font-bold hover:bg-white"
                >
                  <span>Continue with Apple</span>
                </button>
              </div>

              <div className="flex items-center my-2">
                <div className="flex-1 border-t border-slate-800"></div>
                <span className="px-2 text-[10px] text-slate-500 uppercase tracking-widest">
                  Or Email Sign In
                </span>
                <div className="flex-1 border-t border-slate-800"></div>
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
