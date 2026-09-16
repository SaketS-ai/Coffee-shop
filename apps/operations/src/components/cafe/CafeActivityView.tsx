import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@shared/services/api';
import { Cafe } from '@shared/types';
import { ArrowLeft, Clock, Coffee, QrCode, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';

export const CafeActivityView: React.FC = () => {
  const { cafeId = '' } = useParams<{ cafeId: string }>();
  const navigate = useNavigate();

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (cafeId) {
        const cafeData = await api.getCafeById(cafeId);
        setCafe(cafeData);
      }
      const token = localStorage.getItem('social_cup_scanner_token');
      const authTokenStr = localStorage.getItem('social_cup_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['x-scanner-token'] = token;
      if (authTokenStr) headers['Authorization'] = `Bearer ${authTokenStr}`;

      const res = await fetch(`http://localhost:5000/api/scanner/${cafeId}/today`, { headers });
      if (res.ok) {
        const json = await res.json();
        setRedemptions(json.redemptions || []);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cafeId]);

  return (
    <div className="min-h-screen bg-[#1E1411] text-[#F3E7D5] flex flex-col font-sans selection:bg-[#C58A55] selection:text-[#1E1411]">
      {/* Header */}
      <header className="bg-[#1E1411]/95 border-b border-[#3A2720] px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(`/cafe/${cafeId}`)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#B9A28F] hover:text-[#F3E7D5] transition-colors"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-mono font-bold text-[#C58A55] uppercase tracking-widest block">
              Today's Audit Feed
            </span>
            <h1 className="font-editorial text-lg sm:text-xl font-bold text-[#F3E7D5]">
              {cafe ? cafe.name : 'Counter Activity'}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#B9A28F] hover:text-[#F3E7D5] transition-colors"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate(`/cafe/${cafeId}/scanner`)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C58A55] to-[#B98252] hover:brightness-110 text-[#1E1411] text-xs font-bold flex items-center space-x-1.5 shadow-md"
          >
            <QrCode className="w-3.5 h-3.5 text-[#1E1411]" />
            <span>Scan QR</span>
          </button>
        </div>
      </header>

      {/* Main Activity Feed */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#C58A55]" />
            <h2 className="text-sm sm:text-base font-bold text-[#F3E7D5]">
              Validated Redemptions Today ({redemptions.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-[#B9A28F]">
            {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-[#C58A55] mx-auto" />
            <p className="text-xs text-[#B9A28F]">Loading activity feed...</p>
          </div>
        ) : redemptions.length === 0 ? (
          <div className="bg-[#251814] border border-[#3A2720] rounded-3xl p-10 text-center space-y-3 shadow-xl">
            <Coffee className="w-12 h-12 text-[#C58A55]/40 mx-auto" />
            <h3 className="font-editorial text-lg font-bold text-[#F3E7D5]">No Redemptions Logged Today</h3>
            <p className="text-xs text-[#B9A28F] max-w-xs mx-auto">
              When counter staff scan customer QR codes at {cafe?.name || 'this counter'}, they will appear here in real time.
            </p>
            <button
              onClick={() => navigate(`/cafe/${cafeId}/scanner`)}
              className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C58A55] to-[#B98252] hover:brightness-110 text-[#1E1411] text-xs font-bold inline-flex items-center space-x-1.5 shadow-lg"
            >
              <QrCode className="w-4 h-4" />
              <span>Open Scanner</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {redemptions.map((r) => (
              <div
                key={r.id}
                className="bg-[#251814] border border-[#3A2720] rounded-2xl p-4 flex items-center justify-between shadow-md"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#4E6348]/25 border border-[#4E6348]/40 flex items-center justify-center text-emerald-300 flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm sm:text-base font-bold text-[#F3E7D5] truncate">
                      {r.drink?.name || 'Specialty Drink'}
                    </h4>
                    <p className="text-xs text-[#B9A28F] truncate mt-0.5">
                      Member: <span className="text-[#F3E7D5] font-medium">{r.user?.name || 'Member'}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 pl-3">
                  <span className="text-xs sm:text-sm font-mono font-bold text-[#C58A55] block">
                    -{r.credit_price || 3} Credit{r.credit_price && r.credit_price > 1 ? 's' : ''}
                  </span>
                  <span className="text-[11px] font-mono text-[#B9A28F] block mt-0.5">
                    {new Date(r.redeemed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
