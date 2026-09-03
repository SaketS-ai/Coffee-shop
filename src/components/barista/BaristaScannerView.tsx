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
  Zap
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
        colors: ['#C08552', '#8C5A3C', '#FFF8F0', '#4B2E2B'],
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
    <div className="min-h-[calc(100vh-60px)] bg-[#FFF8F0] flex flex-col items-center justify-center p-4 text-[#4B2E2B] animate-fade-in">
      <div className="w-full max-w-md bg-white border border-[#8C5A3C]/20 rounded-3xl overflow-hidden shadow-xl">
        {/* Header Bar */}
        <div className="bg-[#FFF8F0] p-4 border-b border-[#8C5A3C]/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-[#C08552] text-[#FFF8F0] flex items-center justify-center shadow-md">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black text-[#C08552] uppercase tracking-widest">
                Barista Scan Terminal
              </span>
              <h2 className="text-sm font-extrabold text-[#4B2E2B]">{cafe.name}</h2>
            </div>
          </div>

          {isPinAuthenticated && (
            <button
              onClick={handleUntrustDevice}
              title="Untrust Device / Log Out PIN"
              className="text-[#6B4E4B] hover:text-red-700 p-2 rounded-xl hover:bg-[#F4EFE6] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {!isPinAuthenticated ? (
          /* PIN AUTHENTICATION SCREEN */
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-[#FFF8F0] border border-[#8C5A3C]/20 text-[#C08552] rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-[#4B2E2B]">Enter Counter PIN</h3>
              <p className="text-xs text-[#6B4E4B] mt-1">
                Authenticate {cafe.name} counter device. Default PIN: <code className="text-[#C08552] font-mono font-bold">1234</code>
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="1234"
                className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-2xl py-3.5 text-center font-mono text-3xl tracking-widest text-[#C08552] focus:outline-none focus:border-[#C08552]"
              />

              {pinError && (
                <p className="text-xs text-red-700 font-bold">{pinError}</p>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-[#C08552] hover:bg-[#8C5A3C] text-[#FFF8F0] font-black rounded-2xl text-xs shadow-md transition-all"
              >
                Authenticate Terminal Device
              </button>
            </form>
          </div>
        ) : scanResult ? (
          /* SCAN RESULT SCREEN */
          <div className="p-6">
            {scanResult.success ? (
              /* GREEN SUCCESS SCREEN */
              <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-6 text-center space-y-5 shadow-lg animate-fade-in">
                <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-12 h-12" />
                </div>

                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-800">
                    VALID REDEMPTION ✓
                  </span>
                  <h2 className="text-2xl font-black text-[#4B2E2B] mt-1">
                    {scanResult.memberInfo?.drinkName}
                  </h2>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-200 flex items-center space-x-3 text-left shadow-sm">
                  <img
                    src={scanResult.memberInfo?.photo}
                    alt={scanResult.memberInfo?.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-emerald-300"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-[#4B2E2B]">
                      {scanResult.memberInfo?.name}
                    </h4>
                    <span className="text-xs font-extrabold text-[#C08552]">
                      -{scanResult.memberInfo?.creditsDeducted} Credits Deducted
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setScanResult(null)}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs shadow-md transition-all"
                >
                  Scan Next Member Code
                </button>
              </div>
            ) : (
              /* RED REJECTION SCREEN */
              <div className="bg-red-50 border-2 border-red-500 rounded-3xl p-6 text-center space-y-5 shadow-lg animate-fade-in">
                <div className="w-20 h-20 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                  <XCircle className="w-12 h-12" />
                </div>

                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-red-800">
                    REDEMPTION REJECTED ✗
                  </span>
                  <h2 className="text-xl font-black text-red-950 mt-1">
                    {scanResult.reason?.replace('_', ' ')}
                  </h2>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-red-200 text-xs text-red-800">
                  {scanResult.reason === 'EXPIRED_CODE' && 'Code exceeded 5-minute counter window.'}
                  {scanResult.reason === 'ALREADY_REDEEMED' && 'This single-use code has already been scanned.'}
                  {scanResult.reason === 'WRONG_CAFE' && 'Code belongs to a different partner cafe.'}
                  {scanResult.reason === 'INSUFFICIENT_CREDITS' && 'Member has insufficient credit balance.'}
                  {scanResult.reason === 'INACTIVE_SUBSCRIPTION' && 'Member subscription is inactive.'}
                  {scanResult.reason === 'INVALID_CODE' && 'Invalid or unrecognised QR code.'}
                </div>

                <button
                  onClick={() => setScanResult(null)}
                  className="w-full py-3.5 bg-[#4B2E2B] hover:bg-[#3D2523] text-[#FFF8F0] font-black rounded-2xl text-xs"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        ) : (
          /* SCANNER MAIN INTERFACE */
          <div className="p-5 space-y-5">
            <div className="flex bg-[#FFF8F0] p-1 rounded-2xl border border-[#8C5A3C]/20 text-xs font-bold">
              <button
                onClick={() => setActiveTab('scanner')}
                className={`flex-1 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
                  activeTab === 'scanner'
                    ? 'bg-[#C08552] text-[#FFF8F0] shadow-md font-black'
                    : 'text-[#6B4E4B] hover:text-[#4B2E2B]'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Camera Scanner</span>
              </button>
              <button
                onClick={() => setActiveTab('today')}
                className={`flex-1 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
                  activeTab === 'today'
                    ? 'bg-[#C08552] text-[#FFF8F0] shadow-md font-black'
                    : 'text-[#6B4E4B] hover:text-[#4B2E2B]'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Today ({todayRedemptions.length})</span>
              </button>
            </div>

            {activeTab === 'scanner' ? (
              <div className="space-y-4">
                <div className="bg-[#FFF8F0] border-2 border-dashed border-[#C08552]/40 rounded-3xl p-8 text-center space-y-4 relative overflow-hidden">
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#C08552] to-transparent animate-scan-laser"></div>

                  <div className="w-16 h-16 bg-[#C08552]/10 text-[#C08552] rounded-full flex items-center justify-center mx-auto border border-[#C08552]/30">
                    <Camera className="w-8 h-8 animate-pulse" />
                  </div>
                  <p className="text-xs text-[#6B4E4B] font-medium">
                    Point camera at member's phone QR code...
                  </p>

                  <button
                    onClick={handleSimulateQuickScan}
                    className="py-2.5 px-4 bg-[#C08552] hover:bg-[#8C5A3C] text-[#FFF8F0] rounded-2xl text-xs font-black transition-all shadow-md flex items-center space-x-1.5 mx-auto"
                  >
                    <Zap className="w-4 h-4 text-[#FFF8F0]" />
                    <span>Test Scan Member Code</span>
                  </button>
                </div>

                <div className="flex items-center my-2">
                  <div className="flex-1 border-t border-[#8C5A3C]/20"></div>
                  <span className="px-3 text-[10px] text-[#6B4E4B] uppercase tracking-widest font-black">
                    Or Enter 6-Digit Backup PIN
                  </span>
                  <div className="flex-1 border-t border-[#8C5A3C]/20"></div>
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={codeScanInput}
                    onChange={(e) => setCodeScanInput(e.target.value.toUpperCase())}
                    placeholder="e.g. SC-948210"
                    className="flex-1 bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-2xl px-4 py-3 text-center font-mono text-base uppercase text-[#C08552] focus:outline-none focus:border-[#C08552]"
                  />
                  <button
                    onClick={() => handleProcessScan()}
                    className="py-3 px-5 bg-[#C08552] hover:bg-[#8C5A3C] text-[#FFF8F0] font-black rounded-2xl text-xs shadow-md"
                  >
                    Verify
                  </button>
                </div>
              </div>
            ) : (
              /* TODAY TAB */
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1 text-xs">
                  <span className="font-black uppercase tracking-wider text-[#4B2E2B]">
                    Today's Redemptions
                  </span>
                  <span className="font-mono text-[#C08552] font-extrabold">
                    {todayRedemptions.length} Drinks Served
                  </span>
                </div>

                {todayRedemptions.length === 0 ? (
                  <div className="bg-[#FFF8F0] p-6 rounded-2xl text-center text-xs text-[#6B4E4B]">
                    No redemptions scanned yet today.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {todayRedemptions.map((record) => (
                      <div
                        key={record.id}
                        className="bg-[#FFF8F0] p-3.5 rounded-2xl border border-[#8C5A3C]/15 flex items-center justify-between text-xs"
                      >
                        <div>
                          <h4 className="font-bold text-[#4B2E2B]">{record.drinkName}</h4>
                          <span className="text-[10px] text-[#6B4E4B]">
                            Member: {record.memberName}
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-[#C08552]">
                            +${record.cafePayoutUsd.toFixed(2)}
                          </span>
                          <div className="text-[9px] text-[#6B4E4B]">
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
