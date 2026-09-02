import React, { useState, useEffect } from 'react';
import { store } from '../../services/store';
import { ScanResult, Cafe, RedemptionRecord } from '../../types';
import { 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  History, 
  Camera, 
  RotateCcw, 
  Sparkles,
  LogOut,
  Coffee,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BaristaScannerViewProps {
  cafeId: string;
}

export const BaristaScannerView: React.FC<BaristaScannerViewProps> = ({ cafeId }) => {
  const cafes = store.getCafes();
  const cafe = cafes.find((c) => c.id === cafeId) || cafes[0];

  const trustedKey = `social_cup_trusted_device_${cafe.id}`;

  const [isPinAuthenticated, setIsPinAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(trustedKey) === 'true';
  });

  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  const [codeScanInput, setCodeScanInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'scanner' | 'today'>('scanner');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // Today's redemptions list for this cafe
  const todayRedemptions = store
    .getRedemptions()
    .filter((r) => r.cafeId === cafe.id && !r.isVoided);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === cafe.scanPin || pinInput === '1234') {
      localStorage.setItem(trustedKey, 'true');
      setIsPinAuthenticated(true);
      setPinError('');
    } else {
      setPinError(`Incorrect 4-digit PIN for ${cafe.name}. Try '1234'.`);
    }
  };

  const handleUntrustDevice = () => {
    localStorage.removeItem(trustedKey);
    setIsPinAuthenticated(false);
    setPinInput('');
  };

  const handleProcessScan = (codeToTest?: string) => {
    const targetCode = codeToTest || codeScanInput;
    if (!targetCode.trim()) return;

    const result = store.validateAndRedeemCode(cafe.id, targetCode);
    setScanResult(result);

    if (result.success) {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#10b981', '#34d399', '#f59e0b'],
      });
    }
  };

  const handleSimulateQuickScan = () => {
    // Pick active code or create a mock member scan code
    const codes = store.getRedemptionCodes().filter((c) => c.cafeId === cafe.id && c.status === 'active');
    if (codes.length > 0) {
      handleProcessScan(codes[0].code);
    } else {
      // Generate a valid live code for testing convenience
      const member = store.getMember();
      const drinks = store.getDrinks().filter((d) => d.cafeId === cafe.id);
      if (drinks.length > 0) {
        const newCode = store.generateRedemptionCode(cafe.id, drinks[0].id);
        handleProcessScan(newCode.code);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 px-2 bg-slate-950 min-h-[calc(100vh-60px)] text-slate-100">
      {/* Mobile Web Browser Frame */}
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Barista Header Banner */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                Barista Scan Counter
              </span>
              <h2 className="text-sm font-extrabold text-slate-100">{cafe.name}</h2>
            </div>
          </div>

          {isPinAuthenticated && (
            <button
              onClick={handleUntrustDevice}
              title="Untrust Device / Log Out PIN"
              className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* UNAUTHENTICATED PIN PROMPT */}
        {!isPinAuthenticated ? (
          <div className="p-6 space-y-5 text-center">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-100">Enter Cafe Counter PIN</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter 4-digit PIN for {cafe.name} to trust this browser device. Default PIN: <code className="text-amber-400 font-mono">1234</code>
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="1234"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 text-center font-mono text-2xl tracking-widest text-amber-400 focus:outline-none focus:border-amber-500"
              />

              {pinError && (
                <p className="text-xs text-red-400 font-semibold">{pinError}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20"
              >
                Authenticate & Unlock Counter Camera
              </button>
            </form>
          </div>
        ) : scanResult ? (
          /* FULL SCREEN SCAN RESULT SCREEN (GREEN OR RED - PRD Module 8.2) */
          <div className="p-6">
            {scanResult.success ? (
              /* GREEN SCREEN SUCCESS */
              <div className="bg-emerald-950/80 border-2 border-emerald-500 rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="w-20 h-20 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/40">
                  <CheckCircle2 className="w-12 h-12" />
                </div>

                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-300">
                    VALID REDEMPTION ✓
                  </span>
                  <h2 className="text-xl font-black text-slate-100 mt-1">
                    {scanResult.memberInfo?.drinkName}
                  </h2>
                </div>

                {/* Member Info Card */}
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-emerald-800 flex items-center space-x-3 text-left">
                  <img
                    src={scanResult.memberInfo?.photo}
                    alt={scanResult.memberInfo?.name}
                    className="w-12 h-12 rounded-xl object-cover border border-emerald-500/40"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">
                      {scanResult.memberInfo?.name}
                    </h4>
                    <span className="text-[10px] font-extrabold text-amber-400">
                      -{scanResult.memberInfo?.creditsDeducted} Credits Deducted
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setScanResult(null)}
                  className="w-full py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs shadow-md"
                >
                  Scan Next Code
                </button>
              </div>
            ) : (
              /* RED SCREEN REJECTION REASON */
              <div className="bg-red-950/80 border-2 border-red-500 rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="w-20 h-20 bg-red-500 text-slate-100 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-500/40">
                  <XCircle className="w-12 h-12" />
                </div>

                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-red-300">
                    REDEMPTION REJECTED ✗
                  </span>
                  <h2 className="text-lg font-black text-red-100 mt-1">
                    Reason: {scanResult.reason?.replace('_', ' ')}
                  </h2>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-2xl border border-red-800 text-xs text-red-300">
                  {scanResult.reason === 'EXPIRED_CODE' && 'Code exceeded 5-minute counter limit.'}
                  {scanResult.reason === 'ALREADY_REDEEMED' && 'This single-use code has already been scanned.'}
                  {scanResult.reason === 'WRONG_CAFE' && 'Code belongs to a different partner cafe.'}
                  {scanResult.reason === 'INSUFFICIENT_CREDITS' && 'Member has insufficient credits.'}
                  {scanResult.reason === 'INACTIVE_SUBSCRIPTION' && 'Member subscription is inactive.'}
                  {scanResult.reason === 'INVALID_CODE' && 'Invalid or unrecognised QR code.'}
                </div>

                <button
                  onClick={() => setScanResult(null)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-black rounded-xl text-xs"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        ) : (
          /* SCANNER MAIN INTERFACE */
          <div className="p-4 space-y-4">
            {/* Surface Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setActiveTab('scanner')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1 transition-all ${
                  activeTab === 'scanner'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>QR Scanner</span>
              </button>
              <button
                onClick={() => setActiveTab('today')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1 transition-all ${
                  activeTab === 'today'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Today ({todayRedemptions.length})</span>
              </button>
            </div>

            {activeTab === 'scanner' ? (
              <div className="space-y-4">
                {/* Simulated Camera Viewport */}
                <div className="bg-slate-950 border-2 border-dashed border-emerald-500/50 rounded-2xl p-6 text-center space-y-3 relative overflow-hidden">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                    <Camera className="w-8 h-8 animate-pulse" />
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    Point camera at member's phone QR code...
                  </p>

                  <button
                    onClick={handleSimulateQuickScan}
                    className="py-2 px-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all shadow"
                  >
                    ⚡ Test Scan Member Code
                  </button>
                </div>

                <div className="flex items-center my-2">
                  <div className="flex-1 border-t border-slate-800"></div>
                  <span className="px-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    Or 6-Digit Backup PIN
                  </span>
                  <div className="flex-1 border-t border-slate-800"></div>
                </div>

                {/* 6-Digit Backup Code Input */}
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={codeScanInput}
                      onChange={(e) => setCodeScanInput(e.target.value.toUpperCase())}
                      placeholder="e.g. SC-948210"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-center font-mono text-sm uppercase text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => handleProcessScan()}
                      className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-md"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* TODAY TAB (PRD Module 8.2) */
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1 text-xs">
                  <span className="font-extrabold uppercase text-slate-400">
                    Today's Redemptions
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {todayRedemptions.length} Drinks Served
                  </span>
                </div>

                {todayRedemptions.length === 0 ? (
                  <div className="bg-slate-950 p-6 rounded-2xl text-center text-xs text-slate-500">
                    No redemptions scanned yet today.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {todayRedemptions.map((record) => (
                      <div
                        key={record.id}
                        className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <h4 className="font-bold text-slate-200">{record.drinkName}</h4>
                          <span className="text-[10px] text-slate-400">
                            Member: {record.memberName}
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-emerald-400">
                            +${record.cafePayoutUsd.toFixed(2)}
                          </span>
                          <div className="text-[9px] text-slate-500">
                            {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
