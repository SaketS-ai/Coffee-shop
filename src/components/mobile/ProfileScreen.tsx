import React, { useState } from 'react';
import { store } from '../../services/store';
import { MemberProfile, DrinkRating } from '../../types';
import { 
  User, 
  CreditCard, 
  Sparkles, 
  Star, 
  BookOpen, 
  Settings, 
  LogOut, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Award
} from 'lucide-react';

interface ProfileScreenProps {
  onOpenCheckout: () => void;
  onOpenAuth: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onOpenCheckout, onOpenAuth }) => {
  const member = store.getMember();
  const ratings = store.getRatings().filter((r) => r.memberId === member.id);
  
  // Sort Drink Diary by highest rated first (PRD 5.3)
  const sortedRatings = [...ratings].sort((a, b) => b.stars - a.stars);

  const [activeTab, setActiveTab] = useState<'diary' | 'membership'>('diary');
  const [showCancelNotice, setShowCancelNotice] = useState(false);

  const handleCancelSubscription = () => {
    store.setAccountState('visitor');
    setShowCancelNotice(true);
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your Social Cup account? This will cancel your subscription immediately.')) {
      store.setAccountState('visitor');
      store.updateMemberProfile({ name: 'Guest User', email: 'guest@example.com' });
    }
  };

  return (
    <div className="space-y-4 pb-20 text-slate-100">
      {/* Profile Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center space-x-4">
          <img
            src={member.avatarUrl}
            alt={member.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/40 shadow-md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-slate-100 truncate">{member.name}</h2>
              <button
                onClick={onOpenAuth}
                className="text-slate-400 hover:text-amber-400 p-1"
                title="Edit Profile"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 truncate">{member.email}</p>
            
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800">
                📍 {member.homeNeighborhood}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  member.accountState === 'member'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {member.accountState === 'member' ? 'Subscriber' : 'Visitor (Unsubscribed)'}
              </span>
            </div>
          </div>
        </div>

        {/* Subscription & Credit Ledger Banner */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-3">
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Drink Credits
            </span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-2xl font-black text-amber-400">{member.credits}</span>
              <span className="text-xs text-slate-400">/ 30 available</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Renewal Date
            </span>
            <span className="text-xs font-bold text-slate-200">
              {member.accountState === 'member' ? member.renewalDate : 'Not Subscribed'}
            </span>
          </div>
        </div>

        {/* Subscription Upgrade CTA if Visitor */}
        {member.accountState === 'visitor' && (
          <button
            onClick={onOpenCheckout}
            className="mt-4 w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>Unlock 30 Drink Credits ($24.99/mo)</span>
          </button>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
        <button
          onClick={() => setActiveTab('diary')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'diary'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Drink Diary ({ratings.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('membership')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'membership'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Membership & Billing</span>
        </button>
      </div>

      {/* DRINK DIARY VIEW (PRD Module 5.3) */}
      {activeTab === 'diary' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Personal Drink Diary (Highest Rated First)
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              {sortedRatings.length} Drinks Rated
            </span>
          </div>

          {sortedRatings.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
              <Award className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">No Drinks Rated Yet</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Visit any partner cafe in Dallas, redeem a drink, and share your 1-5 star review note!
              </p>
            </div>
          ) : (
            sortedRatings.map((rating) => (
              <div
                key={rating.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-100">{rating.drinkName}</h4>
                    <span className="text-xs text-amber-400 font-semibold">
                      📍 {rating.cafeName}
                    </span>
                  </div>
                  {/* Star Pill */}
                  <div className="flex items-center space-x-1 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-lg">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-black text-amber-400">{rating.stars}.0</span>
                  </div>
                </div>

                {rating.note && (
                  <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 italic">
                    "{rating.note}"
                  </p>
                )}

                <div className="text-[10px] text-slate-500 font-mono text-right pt-1">
                  Rated on {new Date(rating.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MEMBERSHIP & BILLING VIEW (PRD Module 7.4 & 2.6) */}
      {activeTab === 'membership' && (
        <div className="space-y-4 text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              Stripe Customer & Card Management
            </h4>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">Visa ending in 4242</span>
              </div>
              <button 
                onClick={() => alert('Opening Stripe Secure Payment Update Page...')}
                className="text-amber-400 font-bold hover:underline flex items-center space-x-1"
              >
                <span>Update Card</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Receipts and monthly renewal notices are automatically sent to {member.email} by Stripe.
            </p>
          </div>

          {/* Cancel Subscription */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              Subscription Controls
            </h4>

            {member.accountState === 'member' ? (
              <button
                onClick={handleCancelSubscription}
                className="w-full py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-bold transition-colors text-left flex items-center justify-between"
              >
                <span>Cancel Membership Subscription</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onOpenCheckout}
                className="w-full py-2.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold transition-colors text-left flex items-center justify-between"
              >
                <span>Re-subscribe to Social Cup ($24.99/mo)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {showCancelNotice && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px]">
                Subscription canceled. Remaining credits will remain valid until the end of your billing cycle.
              </div>
            )}
          </div>

          {/* Account Deletion (Apple Requirement PRD 2.6) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <h4 className="font-bold text-red-400 uppercase tracking-wider text-[11px] flex items-center space-x-1">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Danger Zone</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Deleting your account cancels active subscriptions and purges saved preferences.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="w-full py-2 px-3 bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-800 rounded-xl font-bold transition-colors flex items-center justify-center space-x-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account & Erase Personal Data</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
