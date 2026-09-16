import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@shared/context/AuthContext';
import { api, resolveAssetUrl, getCafeDefaultImage } from '@shared/services/api';
import { Cafe } from '@shared/types';
import {
  QrCode,
  History,
  LogOut,
  Coffee,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  Clock
} from 'lucide-react';

export const CafeDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { cafeId = '' } = useParams<{ cafeId: string }>();
  const navigate = useNavigate();

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [isLoadingCafe, setIsLoadingCafe] = useState(true);
  const [cafeError, setCafeError] = useState<string | null>(null);

  const [todayRedemptions, setTodayRedemptions] = useState<any[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // Fetch current cafe details
  useEffect(() => {
    if (!cafeId) return;
    let isCancelled = false;

    const loadData = async () => {
      try {
        setIsLoadingCafe(true);
        setCafeError(null);
        const cafeData = await api.getCafeById(cafeId);
        if (!isCancelled) {
          setCafe(cafeData);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setCafeError(err.message || 'Unable to load cafe details.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingCafe(false);
        }
      }

      try {
        setIsLoadingActivity(true);
        // Call backend today's redemptions API
        const token = localStorage.getItem('social_cup_scanner_token');
        const authTokenStr = localStorage.getItem('social_cup_auth_token');
        const headers: Record<string, string> = {};
        if (token) headers['x-scanner-token'] = token;
        if (authTokenStr) headers['Authorization'] = `Bearer ${authTokenStr}`;

        const res = await fetch(`http://localhost:5000/api/scanner/${cafeId}/today`, { headers });
        if (res.ok) {
          const json = await res.json();
          if (!isCancelled) {
            setTodayRedemptions(json.redemptions || []);
          }
        }
      } catch {
        // Fallback silently if offline
      } finally {
        if (!isCancelled) {
          setIsLoadingActivity(false);
        }
      }
    };

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [cafeId]);

  const handleExitCafe = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (isLoadingCafe) {
    return (
      <div className="min-h-screen bg-[#120B09] flex flex-col items-center justify-center space-y-3 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#E2A76F]" />
        <p className="text-xs sm:text-sm font-mono text-[#DDD4C8]">Loading Cafe Terminal...</p>
      </div>
    );
  }

  if (cafeError || !cafe) {
    return (
      <div className="min-h-screen bg-[#120B09] flex items-center justify-center p-4 text-white">
        <div className="max-w-md w-full bg-[#1F1714] border border-red-500/40 rounded-3xl p-6 text-center space-y-4 shadow-xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="font-editorial text-xl font-bold">Cafe Station Error</h2>
          <p className="text-xs text-[#DDD4C8]">{cafeError || 'Cafe record could not be found.'}</p>
          <button
            onClick={handleExitCafe}
            className="px-4 py-2 bg-[#B98252] text-white rounded-xl text-xs font-bold"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E1411] text-[#F3E7D5] flex flex-col font-sans selection:bg-[#C58A55] selection:text-[#1E1411]">
      {/* Station Top Navigation Bar */}
      <header className="bg-[#1E1411]/95 border-b border-[#3A2720] px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C58A55] to-[#6F4E3D] flex items-center justify-center shadow-md border border-[#C58A55]/30">
            <Coffee className="w-5 h-5 text-[#1E1411] stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold text-[#C58A55] uppercase tracking-widest block">
                Counter Terminal
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ACTIVE
              </span>
            </div>
            <h1 className="font-editorial text-lg sm:text-xl font-bold text-[#F3E7D5] tracking-tight truncate max-w-[240px] sm:max-w-md">
              {cafe.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-[#F3E7D5] block">{user?.name || `${cafe.name} Staff`}</span>
            <span className="text-[10px] font-mono text-[#B9A28F] uppercase">Authorized Station</span>
          </div>
          <button
            type="button"
            onClick={handleExitCafe}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-[#B9A28F] hover:text-red-300 border border-white/10 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            title="Exit Cafe Session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit Cafe</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Cafe Banner Showcase */}
        <div className="relative rounded-3xl overflow-hidden border border-[#3A2720] shadow-2xl bg-[#251814]">
          <div className="relative h-44 sm:h-52">
            <img
              src={resolveAssetUrl(cafe.photos?.[0]) || getCafeDefaultImage(cafe.name)}
              alt={cafe.name}
              className="w-full h-full object-cover filter brightness-[0.75]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = getCafeDefaultImage(cafe.name);
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#251814] via-[#251814]/40 to-transparent" />
            
            <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <span className="px-2.5 py-1 rounded-lg bg-[#C58A55]/20 border border-[#C58A55]/40 text-[10px] font-mono font-bold uppercase text-[#C58A55]">
                  Dallas Roasters Guild Partner
                </span>
                <h2 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-black text-[#F3E7D5] mt-1">
                  {cafe.name}
                </h2>
                <p className="text-xs sm:text-sm text-[#B9A28F] mt-0.5">
                  📍 {cafe.neighborhood || cafe.address}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-[#3A2720] text-xs font-mono text-[#F3E7D5]">
                  Payout Rate: <strong className="text-[#C58A55]">${cafe.payoutRate.toFixed(2)}</strong>/cup
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#251814] border border-[#3A2720] rounded-3xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#C58A55] font-bold block">
                Today's Redemptions
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-3xl sm:text-4xl font-black text-[#F3E7D5] font-editorial">
                  {todayRedemptions.length}
                </span>
                <span className="text-xs text-[#B9A28F]">cups validated today</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#4E6348]/25 border border-[#4E6348]/40 flex items-center justify-center text-emerald-300">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-[#251814] border border-[#3A2720] rounded-3xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#C58A55] font-bold block">
                Station Status
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-base sm:text-lg font-bold text-[#F3E7D5]">
                  Ready to Validate
                </span>
              </div>
              <p className="text-xs text-[#B9A28F] mt-0.5">
                Authorized for {cafe.name} only
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#C58A55]/20 border border-[#C58A55]/40 flex items-center justify-center text-[#C58A55]">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Scan QR Code Button */}
          <button
            type="button"
            onClick={() => navigate(`/cafe/${cafe.id}/scanner`)}
            className="p-6 rounded-3xl bg-gradient-to-br from-[#C58A55] to-[#6F4E3D] hover:brightness-110 text-[#1E1411] shadow-xl flex items-center justify-between group transition-all active:scale-[0.99] border border-[#C58A55]/50"
          >
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1E1411]/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform text-[#1E1411]">
                <QrCode className="w-8 h-8 text-[#1E1411] stroke-[2.2]" />
              </div>
              <div className="text-left">
                <h3 className="font-editorial text-xl sm:text-2xl font-bold text-[#1E1411]">
                  Scan QR Code
                </h3>
                <p className="text-xs text-[#1E1411]/80 mt-0.5">
                  Launch camera scanner & manual 6-digit backup code
                </p>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-[#1E1411]/70 group-hover:text-[#1E1411] group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </button>

          {/* Today's Activity Button */}
          <button
            type="button"
            onClick={() => navigate(`/cafe/${cafe.id}/activity`)}
            className="p-6 rounded-3xl bg-[#251814] hover:bg-[#2F1F1A] text-[#F3E7D5] shadow-xl flex items-center justify-between group transition-all active:scale-[0.99] border border-[#3A2720] hover:border-[#C58A55]/50"
          >
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-[#3A2720] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform text-[#C58A55]">
                <History className="w-8 h-8 stroke-[2]" />
              </div>
              <div className="text-left">
                <h3 className="font-editorial text-xl sm:text-2xl font-bold text-[#F3E7D5]">
                  Today's Activity
                </h3>
                <p className="text-xs text-[#B9A28F] mt-0.5">
                  View feed of today's {todayRedemptions.length} coffee redemptions
                </p>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-[#B9A28F] group-hover:text-[#F3E7D5] group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </button>
        </div>

        {/* Recent Redemptions Preview */}
        <div className="bg-[#251814] border border-[#3A2720] rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#3A2720] pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#C58A55]" />
              <h3 className="font-editorial text-base sm:text-lg font-bold text-[#F3E7D5]">
                Recent Redemptions Today
              </h3>
            </div>
            <button
              onClick={() => navigate(`/cafe/${cafe.id}/activity`)}
              className="text-xs font-mono font-bold text-[#C58A55] hover:text-[#D6A36F] hover:underline"
            >
              View All ({todayRedemptions.length})
            </button>
          </div>

          {isLoadingActivity ? (
            <div className="py-8 text-center text-xs text-[#DDD4C8]/60 flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#E2A76F]" />
              <span>Checking live counter feed...</span>
            </div>
          ) : todayRedemptions.length === 0 ? (
            <div className="py-8 text-center space-y-1">
              <p className="text-xs sm:text-sm text-[#DDD4C8]/70">No drinks redeemed yet today.</p>
              <p className="text-[11px] text-[#DDD4C8]/50">Click "Scan QR Code" when a customer presents their code.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todayRedemptions.slice(0, 3).map((r: any) => (
                <div
                  key={r.id}
                  className="p-3 bg-black/30 rounded-2xl border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                      ✓
                    </div>
                    <div>
                      <span className="font-bold text-white block">{r.drink?.name || 'Coffee Drink'}</span>
                      <span className="text-[10px] text-[#DDD4C8]/70">Member: {r.user?.name || 'Member'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-[#E2A76F] block">
                      -{r.credit_price || 3} Credits
                    </span>
                    <span className="text-[10px] text-[#DDD4C8]/60 font-mono">
                      {new Date(r.redeemed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
