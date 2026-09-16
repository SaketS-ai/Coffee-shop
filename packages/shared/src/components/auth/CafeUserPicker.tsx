import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api, resolveAssetUrl, getCafeDefaultImage } from '../../services/api';
import { Cafe } from '../../types';
import {
  Search,
  Store,
  ChevronRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  QrCode,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

interface CafeUserPickerProps {
  onSuccess?: () => void;
}

export const CafeUserPicker: React.FC<CafeUserPickerProps> = ({ onSuccess }) => {
  const { cafeLogin } = useAuth();
  const navigate = useNavigate();

  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Fetch all partner cafes
  useEffect(() => {
    let isCancelled = false;
    const loadCafes = async () => {
      try {
        setIsLoading(true);
        setFetchError(null);
        const result = await api.getCafes({ limit: 100 });
        if (!isCancelled) {
          setCafes(result.cafes || []);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setFetchError(err.message || 'Unable to load partner cafes.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadCafes();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Filter cafes by name or neighborhood/city
  const filteredCafes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return cafes;
    return cafes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.neighborhood.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
    );
  }, [cafes, searchQuery]);

  // Handle PIN submission
  const handleVerifyPin = async () => {
    const targetPin = pin.trim();
    if (!selectedCafe) return;

    if (!targetPin || targetPin.length < 4) {
      setPinError('Please enter your 4-digit cafe PIN.');
      return;
    }

    setIsSubmitting(true);
    setPinError(null);

    try {
      const result = await cafeLogin(selectedCafe.id, targetPin);
      if (!result.success) {
        setPinError(result.error || 'Invalid 4-digit PIN for this cafe.');
        setIsSubmitting(false);
        return;
      }

      // Navigate directly to the barista scanner terminal for this cafe
      if (onSuccess) onSuccess();
      navigate(`/barista/${selectedCafe.id}`, { replace: true });
    } catch (err: any) {
      setPinError(err.message || 'Failed to authenticate cafe staff.');
      setIsSubmitting(false);
    }
  };

  // Append digit to PIN (for virtual numeric keypad)
  const handleAppendDigit = (digit: string) => {
    if (pin.length < 6) {
      const updated = pin + digit;
      setPin(updated);
      setPinError(null);
    }
  };

  // Backspace digit
  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  return (
    <div className="w-full space-y-4 animate-fade-in">
      {/* ----------------------------------------------------------------- */}
      {/* VIEW A: SELECTED CAFE & 4-DIGIT PIN ENTRY                          */}
      {/* ----------------------------------------------------------------- */}
      {selectedCafe ? (
        <div className="space-y-5 bg-[#241A16]/70 p-5 sm:p-7 rounded-3xl border border-[#B98252]/40 backdrop-blur-md shadow-2xl">
          {/* Header & Back Button */}
          <div className="flex items-center justify-between pb-3 border-b border-[#DDD4C8]/15">
            <button
              type="button"
              onClick={() => {
                setSelectedCafe(null);
                setPin('');
                setShowPin(false);
                setPinError(null);
              }}
              className="inline-flex items-center space-x-2 text-xs sm:text-sm text-[#DDD4C8] hover:text-[#FBF8F2] font-semibold transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to all cafes</span>
            </button>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#E2A76F] font-bold bg-[#E2A76F]/15 px-2.5 py-1 rounded-lg border border-[#E2A76F]/30">
              Station Terminal
            </span>
          </div>

          {/* Selected Cafe Summary Card */}
          <div className="flex items-center space-x-3.5 sm:space-x-4 p-3.5 sm:p-4 rounded-2xl bg-black/40 border border-white/10">
            <img
              src={resolveAssetUrl(selectedCafe.photos?.[0]) || getCafeDefaultImage(selectedCafe.name)}
              alt={selectedCafe.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-[#B98252]/30 flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = getCafeDefaultImage(selectedCafe.name);
              }}
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-[#FBF8F2] truncate">{selectedCafe.name}</h3>
              <p className="text-xs sm:text-sm text-[#DDD4C8]/75 truncate mt-0.5">{selectedCafe.neighborhood} • {selectedCafe.address}</p>
            </div>
          </div>

          {/* 4-Digit PIN Input Area */}
          <div className="space-y-3.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-semibold text-[#DDD4C8] flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-[#E2A76F]" />
                <span>Enter 4-Digit Cafe PIN</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPin((prev) => !prev)}
                className="text-xs text-[#DDD4C8]/70 hover:text-[#FBF8F2] font-mono flex items-center space-x-1.5 transition-colors"
                title={showPin ? 'Hide PIN digits' : 'Show PIN digits'}
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5 text-[#E2A76F]" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPin ? 'Hide PIN' : 'Show PIN'}</span>
              </button>
            </div>

            {/* PIN Display Input (Masked with password dots for privacy) */}
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPin(val);
                  setPinError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleVerifyPin();
                  }
                }}
                placeholder="••••"
                className="w-full text-center text-3xl sm:text-4xl font-mono font-bold tracking-[0.7em] py-3.5 sm:py-4 px-4 bg-black/50 rounded-2xl border border-[#DDD4C8]/30 focus:border-[#E2A76F] focus:outline-none focus:ring-2 focus:ring-[#E2A76F]/40 text-[#FBF8F2] placeholder-[#DDD4C8]/30 transition-all shadow-inner"
              />
            </div>

            {/* Error Message */}
            {pinError && (
              <div className="p-3 rounded-2xl bg-red-900/30 border border-red-500/40 text-red-200 text-xs sm:text-sm flex items-center space-x-2 animate-shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{pinError}</span>
              </div>
            )}

            {/* Numeric Keypad for Counter Touchscreens & Desktop */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleAppendDigit(num)}
                  className="py-2.5 sm:py-3 text-base sm:text-lg font-mono font-bold text-[#FBF8F2] bg-white/5 hover:bg-white/15 active:bg-white/25 rounded-2xl border border-white/10 transition-all active:scale-[0.98]"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin('')}
                className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono font-bold text-[#DDD4C8]/70 hover:text-white bg-white/5 hover:bg-white/15 rounded-2xl border border-white/10 transition-all uppercase"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleAppendDigit('0')}
                className="py-2.5 sm:py-3 text-base sm:text-lg font-mono font-bold text-[#FBF8F2] bg-white/5 hover:bg-white/15 rounded-2xl border border-white/10 transition-all active:scale-[0.98]"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono font-bold text-[#DDD4C8]/70 hover:text-white bg-white/5 hover:bg-white/15 rounded-2xl border border-white/10 transition-all uppercase"
              >
                ⌫
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={isSubmitting || pin.length < 4}
              onClick={() => handleVerifyPin()}
              className="w-full mt-2 py-3.5 sm:py-4 px-5 rounded-2xl bg-gradient-to-r from-[#B98252] to-[#8C4A32] hover:from-[#A87244] hover:to-[#7B3F2A] disabled:opacity-50 disabled:cursor-not-allowed text-[#FBF8F2] font-bold text-xs sm:text-sm shadow-xl flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span>Verifying PIN...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-[#FBF8F2]" />
                  <span>Open Cafe Scanner Terminal</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* ----------------------------------------------------------------- */
        /* VIEW B: ALL CAFES LIST WITH AMPLE SCREEN FIT                      */
        /* ----------------------------------------------------------------- */
        <div className="space-y-3.5">
          {/* Top Instruction Banner */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#241A16]/60 border border-[#B98252]/40 flex items-start space-x-3.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#E2A76F]/20 border border-[#E2A76F]/40 flex items-center justify-center flex-shrink-0 text-[#E2A76F]">
              <Store className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm font-bold text-[#FBF8F2]">Partner Cafe Counter Login</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-white/10 text-[#DDD4C8] border border-white/15 font-semibold">
                  Authorized Access
                </span>
              </div>
              <p className="text-xs text-[#DDD4C8]/80 mt-1 leading-snug">
                Select your cafe below and enter your confidential 4-digit station PIN to unlock the redemption scanner.
              </p>
            </div>
          </div>

          {/* Search Filter Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#DDD4C8]/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cafe by name or neighborhood..."
              className="w-full pl-10 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm bg-black/40 rounded-2xl border border-[#DDD4C8]/25 focus:border-[#E2A76F] focus:outline-none focus:ring-2 focus:ring-[#E2A76F]/30 text-[#FBF8F2] placeholder-[#DDD4C8]/40 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#DDD4C8]/60 hover:text-white px-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-[#DDD4C8]/80">
              <Loader2 className="w-7 h-7 animate-spin text-[#E2A76F]" />
              <span className="text-xs sm:text-sm font-medium">Loading partner cafes...</span>
            </div>
          )}

          {/* Fetch Error */}
          {fetchError && (
            <div className="p-3.5 rounded-2xl bg-red-900/30 border border-red-500/40 text-red-200 text-xs sm:text-sm flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{fetchError}</span>
            </div>
          )}

          {/* Generously Sized Scrollable Cafe List to Fit Screen */}
          {!isLoading && !fetchError && (
            <div className="max-h-[min(580px,calc(100vh-300px))] min-h-[360px] sm:min-h-[440px] overflow-y-auto space-y-2.5 pr-1.5 scrollbar-thin">
              {filteredCafes.length === 0 ? (
                <div className="py-10 text-center text-xs sm:text-sm text-[#DDD4C8]/60">
                  No cafes matching "{searchQuery}"
                </div>
              ) : (
                filteredCafes.map((cafe) => (
                  <button
                    key={cafe.id}
                    type="button"
                    onClick={() => {
                      setSelectedCafe(cafe);
                      setPin('');
                      setShowPin(false);
                      setPinError(null);
                    }}
                    className="w-full p-3 sm:p-3.5 rounded-2xl bg-[#241A16]/55 hover:bg-[#241A16]/90 border border-white/10 hover:border-[#E2A76F]/60 flex items-center justify-between transition-all group text-left shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0 pr-2">
                      <img
                        src={resolveAssetUrl(cafe.photos?.[0]) || getCafeDefaultImage(cafe.name)}
                        alt={cafe.name}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-white/10 flex-shrink-0 group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getCafeDefaultImage(cafe.name);
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm sm:text-base font-bold text-[#FBF8F2] truncate group-hover:text-[#E2A76F] transition-colors">
                            {cafe.name}
                          </h4>
                        </div>
                        <p className="text-xs text-[#DDD4C8]/75 truncate mt-0.5">{cafe.neighborhood}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                      {/* Privacy-Preserving Badge */}
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-[#DDD4C8]/75 group-hover:border-[#E2A76F]/40 group-hover:text-[#E2A76F] transition-colors">
                        <Lock className="w-3 h-3 text-[#E2A76F]" />
                        <span>PIN Protected</span>
                      </span>

                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/5 flex items-center justify-center text-[#DDD4C8]/60 group-hover:text-[#FBF8F2] group-hover:bg-[#E2A76F]/30 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Quick Helper Text */}
          <div className="pt-1.5 flex items-center justify-between text-[11px] text-[#DDD4C8]/60 font-mono">
            <span>{filteredCafes.length} Dallas Roasteries Available</span>
            <span className="flex items-center space-x-1 text-[#DDD4C8]/70">
              <Lock className="w-3 h-3 text-[#E2A76F]" />
              <span>Confidential Station Terminal</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
