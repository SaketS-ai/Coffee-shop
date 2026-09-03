import React, { useState } from 'react';
import { store } from '../../services/store';
import { 
  CreditCard, 
  Sparkles, 
  Star, 
  BookOpen, 
  Settings, 
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
    <div className="space-y-4 pb-20 text-[#4B2E2B]">
      {/* Profile Header Card */}
      <div className="bg-white border border-[#8C5A3C]/20 rounded-3xl p-5 shadow-md relative overflow-hidden">
        <div className="flex items-center space-x-4">
          <img
            src={member.avatarUrl}
            alt={member.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-[#C08552] shadow-sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-[#4B2E2B] truncate">{member.name}</h2>
              <button
                onClick={onOpenAuth}
                className="text-[#8C5A3C] hover:text-[#C08552] p-1"
                title="Edit Profile"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#6B4E4B] truncate">{member.email}</p>
            
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFF8F0] text-[#4B2E2B] border border-[#8C5A3C]/20">
                📍 {member.homeNeighborhood}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  member.accountState === 'member'
                    ? 'bg-[#C08552] text-[#FFF8F0]'
                    : 'bg-[#E8DED1] text-[#6B4E4B]'
                }`}
              >
                {member.accountState === 'member' ? 'Subscriber' : 'Visitor (Unsubscribed)'}
              </span>
            </div>
          </div>
        </div>

        {/* Subscription & Credit Ledger Banner */}
        <div className="mt-4 pt-4 border-t border-[#8C5A3C]/15 grid grid-cols-2 gap-3">
          <div className="bg-[#FFF8F0] p-3 rounded-2xl border border-[#8C5A3C]/20">
            <span className="text-[10px] text-[#6B4E4B] font-bold uppercase tracking-wider">
              Drink Credits
            </span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-2xl font-black text-[#C08552]">{member.credits}</span>
              <span className="text-xs text-[#6B4E4B]">/ 30 available</span>
            </div>
          </div>

          <div className="bg-[#FFF8F0] p-3 rounded-2xl border border-[#8C5A3C]/20 flex flex-col justify-between">
            <span className="text-[10px] text-[#6B4E4B] font-bold uppercase tracking-wider">
              Renewal Date
            </span>
            <span className="text-xs font-bold text-[#4B2E2B]">
              {member.accountState === 'member' ? member.renewalDate : 'Not Subscribed'}
            </span>
          </div>
        </div>

        {member.accountState === 'visitor' && (
          <button
            onClick={onOpenCheckout}
            className="mt-4 w-full py-3 px-4 bg-[#C08552] hover:bg-[#8C5A3C] text-[#FFF8F0] font-black rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4 fill-[#FFF8F0]" />
            <span>Unlock 30 Drink Credits ($24.99/mo)</span>
          </button>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="flex bg-white p-1 rounded-2xl border border-[#8C5A3C]/20 shadow-sm">
        <button
          onClick={() => setActiveTab('diary')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'diary'
              ? 'bg-[#C08552] text-[#FFF8F0] shadow-sm'
              : 'text-[#6B4E4B] hover:text-[#4B2E2B]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Drink Diary ({ratings.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('membership')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'membership'
              ? 'bg-[#C08552] text-[#FFF8F0] shadow-sm'
              : 'text-[#6B4E4B] hover:text-[#4B2E2B]'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Membership & Billing</span>
        </button>
      </div>

      {/* DRINK DIARY VIEW */}
      {activeTab === 'diary' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#4B2E2B]">
              Personal Drink Diary (Highest Rated First)
            </h3>
            <span className="text-[10px] text-[#6B4E4B] font-mono">
              {sortedRatings.length} Drinks Rated
            </span>
          </div>

          {sortedRatings.length === 0 ? (
            <div className="bg-white border border-[#8C5A3C]/20 rounded-2xl p-8 text-center space-y-2 shadow-sm">
              <Award className="w-10 h-10 text-[#C08552] mx-auto" />
              <h4 className="text-sm font-bold text-[#4B2E2B]">No Drinks Rated Yet</h4>
              <p className="text-xs text-[#6B4E4B] max-w-xs mx-auto">
                Visit any partner cafe in Dallas, redeem a drink, and share your review note!
              </p>
            </div>
          ) : (
            sortedRatings.map((rating) => (
              <div
                key={rating.id}
                className="bg-white border border-[#8C5A3C]/20 rounded-2xl p-4 space-y-2 hover:border-[#C08552] transition-colors shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-black text-[#4B2E2B]">{rating.drinkName}</h4>
                    <span className="text-xs text-[#C08552] font-semibold">
                      📍 {rating.cafeName}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 bg-[#FFF8F0] border border-[#8C5A3C]/20 px-2 py-1 rounded-lg">
                    <Star className="w-3.5 h-3.5 text-[#C08552] fill-[#C08552]" />
                    <span className="text-xs font-black text-[#4B2E2B]">{rating.stars}.0</span>
                  </div>
                </div>

                {rating.note && (
                  <p className="text-xs text-[#6B4E4B] bg-[#FFF8F0] p-2.5 rounded-xl border border-[#8C5A3C]/15 italic">
                    "{rating.note}"
                  </p>
                )}

                <div className="text-[10px] text-[#6B4E4B] font-mono text-right pt-1">
                  Rated on {new Date(rating.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MEMBERSHIP & BILLING VIEW */}
      {activeTab === 'membership' && (
        <div className="space-y-4 text-xs">
          <div className="bg-white border border-[#8C5A3C]/20 rounded-2xl p-4 space-y-3 shadow-sm">
            <h4 className="font-bold text-[#4B2E2B] uppercase tracking-wider text-[11px]">
              Stripe Customer & Card Management
            </h4>
            <div className="p-3 bg-[#FFF8F0] rounded-xl border border-[#8C5A3C]/20 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-[#C08552]" />
                <span className="text-[#4B2E2B]">Visa ending in 4242</span>
              </div>
              <button 
                onClick={() => alert('Opening Stripe Payment Update Page...')}
                className="text-[#C08552] font-bold hover:underline flex items-center space-x-1"
              >
                <span>Update Card</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[11px] text-[#6B4E4B]">
              Receipts and monthly renewal notices are automatically sent to {member.email} by Stripe.
            </p>
          </div>

          <div className="bg-white border border-[#8C5A3C]/20 rounded-2xl p-4 space-y-3 shadow-sm">
            <h4 className="font-bold text-[#4B2E2B] uppercase tracking-wider text-[11px]">
              Subscription Controls
            </h4>

            {member.accountState === 'member' ? (
              <button
                onClick={handleCancelSubscription}
                className="w-full py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold transition-colors text-left flex items-center justify-between"
              >
                <span>Cancel Membership Subscription</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onOpenCheckout}
                className="w-full py-2.5 px-3 bg-[#C08552] text-[#FFF8F0] rounded-xl font-bold transition-colors text-left flex items-center justify-between shadow-sm"
              >
                <span>Re-subscribe to Social Cup ($24.99/mo)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {showCancelNotice && (
              <div className="p-3 bg-[#FFF8F0] border border-[#C08552]/30 rounded-xl text-[#4B2E2B] text-[11px]">
                Subscription canceled. Remaining credits will stay active until the end of your billing period.
              </div>
            )}
          </div>

          <div className="bg-white border border-red-200 rounded-2xl p-4 space-y-2 shadow-sm">
            <h4 className="font-bold text-red-700 uppercase tracking-wider text-[11px] flex items-center space-x-1">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Danger Zone</span>
            </h4>
            <p className="text-[11px] text-[#6B4E4B]">
              Deleting your account cancels active subscriptions and purges saved preferences.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold transition-colors flex items-center justify-center space-x-2"
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
