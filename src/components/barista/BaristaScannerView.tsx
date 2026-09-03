import React, { useState } from 'react';
import { store } from '../../services/store';
import { ScanResult } from '../../types';
import { 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  History, 
  Camera, 
  LogOut,
  Zap,
  ShieldCheck,
  Smartphone
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
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#10b981', '#34d399', '#f59e0b'],
      });
    }
  };

  const handleSimulateQuickScan = () => {
    const codes = store.getRedemptionCodes().filter((c) => c.cafeId === cafe.id && c.status === 'active');
    if (codes.length > 0) {
      handleProcessScan(codes[0].code);
    } else {
      const member = store.getMember();
      const drinks = store.getDrinks().filter((d) => d.cafeId === cafe.id);
      if (drinks.length > 0) {
        const newCode = store.generateRedemptionCode(cafe.id, drinks[0].id);
        handleProcessScan(newCode.code);
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] bg-[#0B0F17] flex flex-col items-center justify-center p-4 text-slate-100 animate-fade-in">
      <div className="w-full max-w-md glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        {/* Header Bar */}
        <div className="bg-slate-950/90 p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                Barista Scan Terminal
              </span>
              <h2 className="text-sm font-extrabold text-white">{cafe.name}</h2>
            </div>
          </div>

          {isPinAuthenticated && (
            <button
              onClick={handleUntrustDevice}
              title="Untrust Device / Log Out PIN"
              className="text-slate-400 hover:text-red-400 p-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {!isPinAuthenticated ? (
          /* PIN AUTHENTICATION SCREEN */
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner amber-glow">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">Enter Counter PIN</h3>
              <p className="text-xs text-slate-400 mt-1">
                Authenticate {cafe.name} counter device. Default PIN: <code className="text-amber-400 font-mono font-bold">1234</code>
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="1234"
                className="w-full bg-slate-950 border border-white/10 rounded-2xl py-3.5 text-center font-mono text-3xl tracking-widest text-amber-400 focus:outline-none focus:border-amber-500"
              />

              {pinError && (
                <p className="text-xs text-red-400 font-bold">{pinError}</p>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-emerald-400 to-emerald-600 text-slate-950 font-black rounded-2xl text-xs shadow-lg shadow-emerald-500/20"
              >
                Authenticate Terminal Device
              </button>
            </form>
          </div>
        ) : scanResult ? (
          /* SCAN RESULT SCREEN */
          <div className="p-6">
            {scanResult.success ? (
              /* GREEN SCREEN */
              <div className="bg-emerald-950/90 border-2 border-emerald-400 rounded-3xl p-6 text-center space-y-5 shadow-2xl emerald-glow animate-fade-in">
                <div className="w-20 h-20 bg-emerald-400 text-slate-950 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/50">
                  <CheckCircle2 className="w-12 h-12" />
                </div>

                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-300">
                    VALID REDEMPTION ✓
                  </span>
                  <h2 className="text-2xl font-black text-white mt-1">
                    {scanResult.memberInfo?.drinkName}
                  </h2>
                </div>

                <div className="bg-slate-950/90 p-4 rounded-2xl border border-emerald-500/30 flex items-center space-x-3 text-left">
                  <img
                    src={scanResult.memberInfo?.photo}
                    alt={scanResult.memberInfo?.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-emerald-500/40"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {scanResult.memberInfo?.name}
                    </h4>
                    <span className="text-xs font-extrabold text-amber-400">
                      -{scanResult.memberInfo?.creditsDeducted} Credits Deducted
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setScanResult(null)}
                  className="w-full py-3.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black rounded-2xl text-xs shadow-lg"
                >
                  Scan Next Member Code
                </button>
              </div>
            ) : (
              /* RED SCREEN */
              <div className="bg-red-950/90 border-2 border-red-500 rounded-3xl p-6 text-center space-y-5 shadow-2xl animate-fade-in">
                <div className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-500/50">
                  <XCircle className="w-12 h-12" />
                </div>

                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-red-300">
                    REDEMPTION REJECTED ✗
                  </span>
                  <h2 className="text-xl font-black text-white mt-1">
                    {scanResult.reason?.replace('_', ' ')}
                  </h2>
                </div>

                <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-red-500/30 text-xs text-red-300">
                  {scanResult.reason === 'EXPIRED_CODE' && 'Code exceeded 5-minute counter window.'}
                  {scanResult.reason === 'ALREADY_REDEEMED' && 'This single-use code has already been scanned.'}
                  {scanResult.reason === 'WRONG_CAFE' && 'Code belongs to a different partner cafe.'}
                  {scanResult.reason === 'INSUFFICIENT_CREDITS' && 'Member has insufficient credit balance.'}
                  {scanResult.reason === 'INACTIVE_SUBSCRIPTION' && 'Member subscription is inactive.'}
                  {scanResult.reason === 'INVALID_CODE' && 'Invalid or unrecognised QR code.'}
                </div>

                <button
                  onClick={() => setScanResult(null)}
                  className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl text-xs"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        ) : (
          /* SCANNER MAIN INTERFACE */
          <div className="p-5 space-y-5">
            <div className="flex bg-slate-950/90 p-1 rounded-2xl border border-white/10 text-xs font-bold">
              <button
                onClick={() => setActiveTab('scanner')}
                className={`flex-1 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
                  activeTab === 'scanner'
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Camera Scanner</span>
              </button>
              <button
                onClick={() => setActiveTab('today')}
                className={`flex-1 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
                  activeTab === 'today'
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Today ({todayRedemptions.length})</span>
              </button>
            </div>

            {activeTab === 'scanner' ? (
              <div className="space-y-4">
                {/* Camera Viewport with Laser Beam */}
                <div className="bg-slate-950 border-2 border-dashed border-emerald-500/40 rounded-3xl p-8 text-center space-y-4 relative overflow-hidden">
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan-laser"></div>

                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                    <Camera className="w-8 h-8 animate-pulse" />
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    Point camera at member's phone QR code...
                  </p>

                  <button
                    onClick={handleSimulateQuickScan}
                    className="py-2.5 px-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-2xl text-xs font-black transition-all shadow-md flex items-center space-x-1.5 mx-auto"
                  >
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Test Scan Member Code</span>
                  </button>
                </div>

                <div className="flex items-center my-2">
                  <div className="flex-1 border-t border-white/10"></div>
                  <span className="px-3 text-[10px] text-slate-400 uppercase tracking-widest font-black">
                    Or Enter 6-Digit Backup PIN
                  </span>
                  <div className="flex-1 border-t border-white/10"></div>
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={codeScanInput}
                    onChange={(e) => setCodeScanInput(e.target.value.toUpperCase())}
                    placeholder="e.g. SC-948210"
                    className="flex-1 bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-center font-mono text-base uppercase text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => handleProcessScan()}
                    className="py-3 px-5 bg-gradient-to-r from-emerald-400 to-emerald-600 text-slate-950 font-black rounded-2xl text-xs shadow-lg"
                  >
                    Verify
                  </button>
                </div>
              </div>
            ) : (
              /* TODAY TAB */
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1 text-xs">
                  <span className="font-black uppercase tracking-wider text-slate-300">
                    Today's Redemptions
                  </span>
                  <span className="font-mono text-emerald-400 font-extrabold">
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
                        className="bg-slate-950 p-3.5 rounded-2xl border border-white/10 flex items-center justify-between text-xs"
                      >
                        <div>
                          <h4 className="font-bold text-white">{record.drinkName}</h4>
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
