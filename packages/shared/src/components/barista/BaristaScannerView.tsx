import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { ApiError, api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { AuthGate } from '../common/AuthGate';
import { NavControls } from '../common/NavControls';
import { Cafe } from '../../types';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Camera,
  LogOut,
  MapPin,
  Loader2,
  AlertTriangle,
  Coffee,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

const SCANNER_ELEMENT_ID = 'barista-qr-reader-region';

type Stage = 'ready' | 'validating' | 'success' | 'failure';

type CameraState =
  | 'idle'
  | 'starting'
  | 'active'
  | 'permission_denied'
  | 'no_camera'
  | 'unsupported'
  | 'error';

interface SuccessInfo {
  drinkName: string;
  creditsUsed: number;
  remainingCredits: number;
  cafeName: string;
  redeemedAt: string | null;
}

interface FailureInfo {
  title: string;
  message: string;
}

function mapRedeemError(err: unknown): FailureInfo {
  if (err instanceof ApiError) {
    switch (err.reason) {
      case 'REDEMPTION_EXPIRED':
        return { title: 'Redemption Expired', message: 'The member needs to generate a fresh redemption code.' };
      case 'REDEMPTION_REDEEMED':
        return { title: 'Code Already Redeemed', message: 'This coffee redemption has already been processed.' };
      case 'REDEMPTION_VOID':
        return { title: 'Redemption Canceled', message: 'The member canceled this redemption.' };
      case 'WRONG_CAFE':
        return { title: 'Wrong Counter Location', message: 'This drink redemption belongs to a different partner cafe.' };
      case 'INSUFFICIENT_CREDITS':
        return { title: 'Insufficient Credits', message: 'The member does not have enough remaining drink credits.' };
      case 'MEMBERSHIP_INACTIVE':
        return { title: 'Membership Not Active', message: "The member's monthly subscription is paused or inactive." };
      case 'REDEMPTION_NOT_FOUND':
      case 'MISSING_CODE':
      case 'INVALID_INPUT':
        return { title: 'Invalid QR or PIN', message: 'The scanned code or 6-digit PIN could not be found.' };
      default:
        return { title: 'Redemption Failed', message: err.message || 'The QR or backup code could not be verified.' };
    }
  }
  return { title: 'Verification Error', message: 'Unable to connect to the verification server. Please try again.' };
}

export const BaristaScannerView: React.FC = () => {
  const { user, logout } = useAuth();
  const baristaUser = user && (user.role === 'BARISTA' || user.role === 'ADMIN') ? user : null;

  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [isLoadingCafes, setIsLoadingCafes] = useState(false);
  const [cafesError, setCafesError] = useState<string | null>(null);

  const { cafeId: selectedCafeId = '' } = useParams<{ cafeId?: string }>();
  const navigate = useNavigate();
  const setSelectedCafeId = useCallback(
    (id: string) => navigate(id ? `/barista/${id}` : '/barista'),
    [navigate]
  );

  const [stage, setStage] = useState<Stage>('ready');
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [cameraErrorMsg, setCameraErrorMsg] = useState('');
  const [backupCodeInput, setBackupCodeInput] = useState('');
  const [backupCodeError, setBackupCodeError] = useState('');
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const [failureInfo, setFailureInfo] = useState<FailureInfo | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);
  const isMountedRef = useRef(true);
  const isProcessingRef = useRef(false);
  const selectedCafeIdRef = useRef(selectedCafeId);
  useEffect(() => {
    selectedCafeIdRef.current = selectedCafeId;
  }, [selectedCafeId]);
  const cafesRef = useRef(cafes);
  useEffect(() => {
    cafesRef.current = cafes;
  }, [cafes]);

  useEffect(() => {
    if (!baristaUser) return;
    let cancelled = false;
    (async () => {
      setIsLoadingCafes(true);
      setCafesError(null);
      try {
        const { cafes: list } = await api.getCafes();
        if (!cancelled) setCafes(list);
      } catch (err: any) {
        if (!cancelled) setCafesError(err.message || 'Could not load cafes.');
      } finally {
        if (!cancelled) setIsLoadingCafes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [baristaUser]);

  const selectedCafe = cafes.find((c) => c.id === selectedCafeId) ?? null;

  const stopCamera = useCallback(async () => {
    isStartingRef.current = false;
    const instance = scannerRef.current;
    scannerRef.current = null;

    if (instance) {
      try {
        if (instance.isScanning) {
          await instance.stop();
        }
      } catch (err) {
        // stop errors can be safely ignored
      }
      try {
        instance.clear();
      } catch (err) {
        // clear errors can be safely ignored
      }
    }

    // Completely clear any lingering elements in scanner container
    const container = document.getElementById(SCANNER_ELEMENT_ID);
    if (container) {
      container.innerHTML = '';
    }

    if (isMountedRef.current) {
      setCameraState('idle');
    }
  }, []);

  function resetToReady() {
    isProcessingRef.current = false;
    setSuccessInfo(null);
    setFailureInfo(null);
    setBackupCodeInput('');
    setBackupCodeError('');
    setCameraErrorMsg('');
    setStage('ready');
  }

  const handleDetected = useCallback(async (payload: { token?: string; backup_code?: string }) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    await stopCamera();
    setStage('validating');

    const cafeId = selectedCafeIdRef.current;
    const cafeName = cafesRef.current.find((c) => c.id === cafeId)?.name ?? 'This cafe';

    try {
      const result = await api.redeemCode(cafeId, payload);
      let drinkName = 'Drink';
      try {
        const drink = await api.getDrinkById(result.redemption.drink_id);
        drinkName = drink.name;
      } catch {
        // best-effort enrichment only
      }
      setSuccessInfo({
        drinkName,
        creditsUsed: result.redemption.credit_price,
        remainingCredits: result.new_balance,
        cafeName,
        redeemedAt: result.redemption.redeemed_at,
      });
      setStage('success');
    } catch (err) {
      setFailureInfo(mapRedeemError(err));
      setStage('failure');
    }
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    // Avoid double starting or duplicate instances
    if (isStartingRef.current || scannerRef.current?.isScanning) return;
    const container = document.getElementById(SCANNER_ELEMENT_ID);
    if (!container) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      if (isMountedRef.current) setCameraState('unsupported');
      return;
    }

    // Clean any previous artifacts in the container
    container.innerHTML = '';
    isStartingRef.current = true;
    if (isMountedRef.current) {
      setCameraState('starting');
      setCameraErrorMsg('');
    }

    try {
      // If a previous instance is still around, clean it out first
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch {}
        scannerRef.current = null;
      }

      container.innerHTML = '';

      const instance = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = instance;

      await instance.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: 240 },
        (decodedText) => {
          handleDetected({ token: decodedText });
        },
        () => {}
      );

      // If stop was requested while we were starting, tear down immediately
      if (!isStartingRef.current || !isMountedRef.current) {
        try {
          if (instance.isScanning) {
            await instance.stop();
          }
          instance.clear();
        } catch {}
        scannerRef.current = null;
        container.innerHTML = '';
        if (isMountedRef.current) setCameraState('idle');
        return;
      }

      // Safeguard: remove any extra video elements if multiple were created
      const videos = container.querySelectorAll('video');
      if (videos.length > 1) {
        for (let i = 1; i < videos.length; i++) {
          videos[i].remove();
        }
      }

      if (isMountedRef.current) {
        setCameraState('active');
      }
    } catch (err: any) {
      scannerRef.current = null;
      if (!isMountedRef.current) return;

      const name = err?.name || '';
      const message = String(err?.message || err || '');
      if (name === 'NotAllowedError' || /permission/i.test(message)) {
        setCameraState('permission_denied');
      } else if (name === 'NotFoundError' || /no camera|not found/i.test(message)) {
        setCameraState('no_camera');
      } else {
        setCameraState('error');
        setCameraErrorMsg(message || 'Failed to start the camera.');
      }
    } finally {
      isStartingRef.current = false;
    }
  }, [handleDetected]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (baristaUser && selectedCafeId && stage === 'ready') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [baristaUser, selectedCafeId, stage, startCamera, stopCamera]);

  useEffect(() => {
    if (!baristaUser) {
      setSelectedCafeId('');
      resetToReady();
    }
  }, [baristaUser, setSelectedCafeId]);

  const handleBackupCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessingRef.current) return;
    if (!/^\d{6}$/.test(backupCodeInput)) {
      setBackupCodeError('Please enter exactly 6 numeric digits.');
      return;
    }
    setBackupCodeError('');
    handleDetected({ backup_code: backupCodeInput });
  };

  const formatTimestamp = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="min-h-[calc(100vh-60px)] bg-gradient-to-br from-[#120B09] via-[#1A120F] to-[#120B09] flex flex-col items-center justify-center p-4 sm:p-6 text-white animate-fade-in font-sans">
      <div className="w-full max-w-lg md:max-w-xl lg:max-w-2xl bg-[#1F1714] border border-[#C08552]/30 rounded-3xl overflow-hidden shadow-2xl relative">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#C08552]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Terminal Header Bar */}
        <header className="bg-[#18110E] p-4 sm:p-5 border-b border-white/10 flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-3">
            <NavControls />
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C08552] to-[#8C5A3C] text-white flex items-center justify-center shadow-md border border-[#E2A76F]/30">
              <QrCode className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-black text-[#E2A76F] uppercase tracking-widest block">
                  Barista Terminal
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ONLINE
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <h2 className="font-editorial text-base sm:text-lg font-bold text-white tracking-tight truncate max-w-[180px] sm:max-w-[220px]">
                  {selectedCafe ? selectedCafe.name : baristaUser ? 'Select Counter Cafe' : 'Sign In Required'}
                </h2>
                {selectedCafe && (
                  <button
                    onClick={() => setSelectedCafeId('')}
                    className="text-[10px] text-[#E2A76F] hover:text-white font-mono underline ml-1"
                    title="Switch counter cafe"
                  >
                    Switch
                  </button>
                )}
              </div>
            </div>
          </div>

          {baristaUser && (
            <div className="flex items-center space-x-2">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-white block">{baristaUser.name}</span>
                <span className="text-[10px] font-mono text-[#E8DED1]/60 uppercase">{baristaUser.role}</span>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                aria-label="Sign out"
                className="text-white/60 hover:text-red-400 p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </header>

        {/* Main Terminal Viewport */}
        <main className="relative z-10">
          {!baristaUser ? (
            /* AUTH GATE SCREEN */
            <div className="p-6 sm:p-8 bg-[#1F1714]">
              <AuthGate
                allowedRoles={['BARISTA', 'ADMIN']}
                title="Counter Staff Sign In"
                subtitle="Sign in with verified barista credentials to operate the redemption terminal."
                deniedMessage="This account does not have barista counter permissions."
              />
            </div>
          ) : !selectedCafeId ? (
            /* CAFE PICKER SCREEN */
            <div className="p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#E2A76F]">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="font-editorial text-lg font-bold text-white">Select Your Cafe Counter</h3>
                <p className="text-xs text-[#E8DED1]/70">
                  Choose the partner location where you are pouring drinks today.
                </p>
              </div>

              {isLoadingCafes ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
                  ))}
                </div>
              ) : cafesError ? (
                <p className="text-xs text-red-400 font-bold text-center bg-red-950/40 p-4 rounded-2xl border border-red-800">
                  {cafesError}
                </p>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                  {cafes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCafeId(c.id)}
                      className="w-full text-left p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#C08552]/60 rounded-2xl transition-all flex items-center justify-between group active:scale-[0.99]"
                    >
                      <div>
                        <span className="font-editorial text-base font-bold text-white group-hover:text-[#E2A76F] transition-colors block">
                          {c.name}
                        </span>
                        <span className="text-xs text-[#E8DED1]/70">📍 {c.neighborhood}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : stage === 'success' && successInfo ? (
            /* NATURAL COFFEE-GREEN SUCCESS SCREEN */
            <div className="p-6 sm:p-8 animate-fade-in">
              <div className="bg-[#4E6348]/20 border-2 border-[#4E6348] rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
                <div className="w-20 h-20 bg-[#4E6348] text-white rounded-3xl flex items-center justify-center mx-auto shadow-lg ring-4 ring-[#4E6348]/20">
                  <CheckCircle2 className="w-12 h-12" />
                </div>

                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#B98252]">
                    ✓ Redemption Approved
                  </span>
                  <h2 className="font-editorial text-2xl sm:text-3xl font-black text-white mt-1">
                    {successInfo.drinkName}
                  </h2>
                  <p className="text-xs text-[#DDD4C8] mt-1 font-medium">
                    Serve drink to customer now
                  </p>
                </div>

                <div className="bg-black/40 p-4 rounded-2xl border border-[#4E6348]/40 text-left space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-white/60">Location:</span>
                    <span className="font-bold text-white">{successInfo.cafeName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-white/60">Credits Deducted:</span>
                    <span className="font-bold text-[#B98252]">-{successInfo.creditsUsed} Credit</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-white/60">Customer Remaining Balance:</span>
                    <span className="font-bold text-white">{successInfo.remainingCredits} Credits</span>
                  </div>
                  {formatTimestamp(successInfo.redeemedAt) && (
                    <div className="flex justify-between py-1">
                      <span className="text-white/60">Timestamp:</span>
                      <span className="font-mono text-white/90">{formatTimestamp(successInfo.redeemedAt)}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={resetToReady}
                  className="w-full py-4 bg-[#4E6348] hover:bg-[#3D4F37] text-white font-bold rounded-2xl text-sm shadow-lg transition-all active:scale-[0.99] flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Scan Next Customer</span>
                </button>
              </div>
            </div>
          ) : stage === 'failure' && failureInfo ? (
            /* WARM MUTED RED FAILURE SCREEN */
            <div className="p-6 sm:p-8 animate-fade-in">
              <div className="bg-[#A3483E]/20 border-2 border-[#A3483E] rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
                <div className="w-20 h-20 bg-[#A3483E] text-white rounded-3xl flex items-center justify-center mx-auto shadow-lg ring-4 ring-[#A3483E]/20">
                  <XCircle className="w-12 h-12" />
                </div>

                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#DDD4C8]">
                    ✕ Redemption Rejected
                  </span>
                  <h2 className="font-editorial text-2xl font-black text-white mt-1">
                    {failureInfo.title}
                  </h2>
                </div>

                <div className="bg-black/40 p-4 rounded-2xl border border-[#A3483E]/40 text-xs text-[#DDD4C8] leading-relaxed">
                  {failureInfo.message}
                </div>

                <button
                  onClick={resetToReady}
                  className="w-full py-4 bg-[#6B4A3A] hover:bg-[#241A16] text-white font-bold rounded-2xl text-sm shadow-lg transition-all active:scale-[0.99] flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again / Clear</span>
                </button>
              </div>
            </div>
          ) : (
            /* READY TO SCAN / VALIDATING VIEW */
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#E8DED1]/70 flex items-center space-x-1.5">
                  <Coffee className="w-3.5 h-3.5 text-[#E2A76F]" />
                  <span>Station: {selectedCafe?.name}</span>
                </span>
                <button
                  onClick={() => {
                    stopCamera();
                    setSelectedCafeId('');
                  }}
                  className="text-xs text-[#E2A76F] hover:underline font-bold"
                >
                  Switch Cafe
                </button>
              </div>

              {/* Viewfinder Frame */}
              <div className="bg-black/50 border border-white/10 rounded-3xl p-4 text-center space-y-3 relative overflow-hidden shadow-inner">
                {stage === 'validating' ? (
                  <div className="py-12 space-y-3">
                    <Loader2 className="w-12 h-12 text-[#E2A76F] mx-auto animate-spin" />
                    <p className="font-editorial text-base font-bold text-white">
                      Verifying Drink Redemption...
                    </p>
                    <p className="text-xs text-[#E8DED1]/60">Validating customer credentials with server</p>
                  </div>
                ) : (
                  <>
                    <div
                      id={SCANNER_ELEMENT_ID}
                      className="mx-auto rounded-2xl overflow-hidden shadow-md"
                      style={{ minHeight: cameraState === 'active' ? undefined : 0 }}
                    />

                    {cameraState === 'starting' && (
                      <div className="py-10 space-y-2">
                        <Loader2 className="w-8 h-8 text-[#E2A76F] mx-auto animate-spin" />
                        <p className="text-xs text-white/80">Activating camera sensor...</p>
                      </div>
                    )}
                    {cameraState === 'permission_denied' && (
                      <div className="py-6 space-y-2 text-center">
                        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                        <p className="text-xs font-bold text-white">Camera permission is blocked</p>
                        <p className="text-[11px] text-white/70 max-w-xs mx-auto">
                          Enable camera access in your browser settings, or enter the 6-digit PIN below.
                        </p>
                      </div>
                    )}
                    {cameraState === 'no_camera' && (
                      <div className="py-6 space-y-2 text-center">
                        <Camera className="w-8 h-8 text-[#E2A76F] mx-auto" />
                        <p className="text-xs font-bold text-white">No hardware camera detected</p>
                        <p className="text-[11px] text-white/70 max-w-xs mx-auto">
                          Enter the customer's 6-digit PIN below.
                        </p>
                      </div>
                    )}
                    {cameraState === 'unsupported' && (
                      <div className="py-6 space-y-2 text-center">
                        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                        <p className="text-xs font-bold text-white">Browser camera unsupported</p>
                        <p className="text-[11px] text-white/70 max-w-xs mx-auto">
                          Use the 6-digit backup code below instead.
                        </p>
                      </div>
                    )}
                    {cameraState === 'error' && (
                      <div className="py-6 space-y-2 text-center">
                        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
                        <p className="text-xs font-bold text-white">Camera initialization error</p>
                        {cameraErrorMsg && <p className="text-[11px] text-white/60">{cameraErrorMsg}</p>}
                      </div>
                    )}
                    {cameraState === 'active' && (
                      <p className="text-xs text-[#E8DED1]/80 font-medium pt-1">
                        Align member's QR code within the viewfinder
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center my-3">
                <div className="flex-1 border-t border-white/10" />
                <span className="px-3 text-[10px] font-mono text-white/50 uppercase tracking-widest font-bold">
                  Or Key In 6-Digit PIN
                </span>
                <div className="flex-1 border-t border-white/10" />
              </div>

              {/* Quick 6-Digit PIN Form */}
              <form onSubmit={handleBackupCodeSubmit} className="space-y-2.5">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={6}
                    value={backupCodeInput}
                    onChange={(e) => setBackupCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="• • • • • •"
                    disabled={stage === 'validating'}
                    className="flex-1 bg-white/5 border border-white/20 focus:border-[#C08552] rounded-2xl px-4 py-3.5 text-center font-mono text-xl tracking-[0.4em] text-white placeholder-white/30 focus:outline-none transition-colors disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={stage === 'validating' || backupCodeInput.length !== 6}
                    className="py-3.5 px-6 bg-gradient-to-r from-[#C08552] to-[#8C5A3C] hover:from-[#D19663] hover:to-[#9E6747] text-white font-bold rounded-2xl text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5"
                  >
                    <span>Redeem</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {backupCodeError && (
                  <p className="text-xs text-red-400 font-medium text-center">{backupCodeError}</p>
                )}
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
