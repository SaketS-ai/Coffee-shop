import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { ApiError, api } from '@shared/services/api';
import { Cafe } from '@shared/types';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Camera,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Coffee,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

const SCANNER_ELEMENT_ID = 'operations-qr-reader-region';

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

export const CafeScannerScreen: React.FC = () => {
  const { cafeId = '' } = useParams<{ cafeId: string }>();
  const navigate = useNavigate();

  const [cafe, setCafe] = useState<Cafe | null>(null);
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

  useEffect(() => {
    if (!cafeId) return;
    api.getCafeById(cafeId).then(setCafe).catch(() => {});
  }, [cafeId]);

  const stopCamera = useCallback(async () => {
    isStartingRef.current = false;
    const instance = scannerRef.current;
    scannerRef.current = null;

    if (instance) {
      try {
        if (instance.isScanning) {
          await instance.stop();
        }
      } catch {}
      try {
        instance.clear();
      } catch {}
    }

    const container = document.getElementById(SCANNER_ELEMENT_ID);
    if (container) container.innerHTML = '';

    if (isMountedRef.current) {
      setCameraState('idle');
    }
  }, []);

  const resetToReady = () => {
    isProcessingRef.current = false;
    setSuccessInfo(null);
    setFailureInfo(null);
    setBackupCodeInput('');
    setBackupCodeError('');
    setCameraErrorMsg('');
    setStage('ready');
  };

  const handleDetected = useCallback(async (payload: { token?: string; backup_code?: string }) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    await stopCamera();
    setStage('validating');

    const cafeName = cafe?.name ?? 'This cafe';

    try {
      const result = await api.redeemCode(cafeId, payload);
      let drinkName = 'Specialty Drink';
      try {
        const drink = await api.getDrinkById(result.redemption.drink_id);
        drinkName = drink.name;
      } catch {}

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
  }, [cafe, cafeId, stopCamera]);

  const startCamera = useCallback(async () => {
    if (isStartingRef.current || scannerRef.current?.isScanning) return;
    const container = document.getElementById(SCANNER_ELEMENT_ID);
    if (!container) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      if (isMountedRef.current) setCameraState('unsupported');
      return;
    }

    container.innerHTML = '';
    isStartingRef.current = true;
    if (isMountedRef.current) {
      setCameraState('starting');
      setCameraErrorMsg('');
    }

    try {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) await scannerRef.current.stop();
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

      if (!isStartingRef.current || !isMountedRef.current) {
        try {
          if (instance.isScanning) await instance.stop();
          instance.clear();
        } catch {}
        scannerRef.current = null;
        if (container) container.innerHTML = '';
        if (isMountedRef.current) setCameraState('idle');
        return;
      }

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
        setCameraErrorMsg(message || 'Failed to start camera.');
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
    if (stage === 'ready') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [stage, startCamera, stopCamera]);

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
    <div className="min-h-screen bg-[#1E1411] flex flex-col items-center justify-center p-4 sm:p-6 text-[#F3E7D5] font-sans selection:bg-[#C58A55] selection:text-[#1E1411]">
      <div className="w-full max-w-lg md:max-w-xl bg-[#251814] border border-[#3A2720] rounded-3xl overflow-hidden shadow-2xl relative">
        {/* Terminal Header Bar */}
        <header className="bg-[#1E1411]/90 p-4 sm:p-5 border-b border-[#3A2720] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                stopCamera();
                navigate(`/cafe/${cafeId}`);
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#B9A28F] hover:text-[#F3E7D5] transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C58A55] to-[#6F4E3D] text-[#1E1411] flex items-center justify-center shadow-md font-bold">
              <QrCode className="w-5 h-5 stroke-[2.2] text-[#1E1411]" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-[#C58A55] uppercase tracking-widest block">
                QR Scanner Terminal
              </span>
              <h2 className="font-editorial text-base font-bold text-[#F3E7D5] truncate max-w-[200px] sm:max-w-xs">
                {cafe ? cafe.name : 'Counter Scanner'}
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              navigate(`/cafe/${cafeId}`);
            }}
            className="text-xs font-mono text-[#C58A55] hover:text-[#D6A36F] hover:underline"
          >
            Dashboard
          </button>
        </header>

        {/* Main Scanner Viewport */}
        <main className="relative z-10">
          {stage === 'success' && successInfo ? (
            /* SUCCESS SCREEN */
            <div className="p-6 sm:p-8 animate-fade-in">
              <div className="bg-[#251814] border-2 border-[#4E6348] rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-[0_0_35px_rgba(78,99,72,0.25)]">
                <div className="w-20 h-20 bg-[#4E6348] text-white rounded-3xl flex items-center justify-center mx-auto shadow-lg ring-4 ring-[#4E6348]/20">
                  <CheckCircle2 className="w-12 h-12" />
                </div>

                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#C58A55]">
                    ✓ Redemption Approved
                  </span>
                  <h2 className="font-editorial text-2xl sm:text-3xl font-black text-[#F3E7D5] mt-1">
                    {successInfo.drinkName}
                  </h2>
                  <p className="text-xs text-[#B9A28F] mt-1 font-medium">
                    Serve drink to customer now
                  </p>
                </div>

                <div className="bg-[#1E1411] p-4 rounded-2xl border border-[#3A2720] text-left space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#3A2720]/60">
                    <span className="text-[#B9A28F]">Location:</span>
                    <span className="font-bold text-[#F3E7D5]">{successInfo.cafeName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#3A2720]/60">
                    <span className="text-[#B9A28F]">Credits Deducted:</span>
                    <span className="font-bold text-[#C58A55]">-{successInfo.creditsUsed} Credit{successInfo.creditsUsed > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#3A2720]/60">
                    <span className="text-[#B9A28F]">Customer Remaining Balance:</span>
                    <span className="font-bold text-[#F3E7D5]">{successInfo.remainingCredits} Credits</span>
                  </div>
                  {formatTimestamp(successInfo.redeemedAt) && (
                    <div className="flex justify-between py-1">
                      <span className="text-[#B9A28F]">Timestamp:</span>
                      <span className="font-mono text-[#F3E7D5]/90">{formatTimestamp(successInfo.redeemedAt)}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={resetToReady}
                  className="w-full py-4 bg-gradient-to-r from-[#4E6348] to-[#3D4F37] hover:brightness-110 text-white font-bold rounded-2xl text-sm shadow-lg transition-all active:scale-[0.99] flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Scan Next Customer</span>
                </button>
              </div>
            </div>
          ) : stage === 'failure' && failureInfo ? (
            /* FAILURE SCREEN (Wrong Cafe, Expired, etc.) */
            <div className="p-6 sm:p-8 animate-fade-in">
              <div className="bg-[#251814] border-2 border-[#8C2D25] rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-[0_0_35px_rgba(140,45,37,0.25)]">
                <div className="w-20 h-20 bg-[#8C2D25] text-white rounded-3xl flex items-center justify-center mx-auto shadow-lg ring-4 ring-[#8C2D25]/20">
                  <XCircle className="w-12 h-12" />
                </div>

                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#B9A28F]">
                    ✕ Redemption Rejected
                  </span>
                  <h2 className="font-editorial text-2xl font-black text-[#F3E7D5] mt-1">
                    {failureInfo.title}
                  </h2>
                </div>

                <div className="bg-[#1E1411] p-4 rounded-2xl border border-[#3A2720] text-xs text-[#B9A28F] leading-relaxed">
                  {failureInfo.message}
                </div>

                <button
                  onClick={resetToReady}
                  className="w-full py-4 bg-[#6F4E3D] hover:bg-[#5C3E2F] text-[#F3E7D5] font-bold rounded-2xl text-sm shadow-lg transition-all active:scale-[0.99] flex items-center justify-center space-x-2"
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
                <span className="text-xs text-[#B9A28F] flex items-center space-x-1.5">
                  <Coffee className="w-3.5 h-3.5 text-[#C58A55]" />
                  <span>Counter: <strong className="text-[#F3E7D5]">{cafe?.name}</strong></span>
                </span>
                <span className="text-[10px] font-mono uppercase text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                  Camera Ready
                </span>
              </div>

              {/* Viewfinder Frame */}
              <div className="bg-[#1E1411] border border-[#3A2720] rounded-3xl p-4 text-center space-y-3 relative overflow-hidden shadow-inner">
                {stage === 'validating' ? (
                  <div className="py-12 space-y-3">
                    <Loader2 className="w-12 h-12 text-[#C58A55] mx-auto animate-spin" />
                    <p className="font-editorial text-base font-bold text-[#F3E7D5]">
                      Verifying Drink Redemption...
                    </p>
                    <p className="text-xs text-[#B9A28F]">Validating customer credentials with server</p>
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
                        <Loader2 className="w-8 h-8 text-[#C58A55] mx-auto animate-spin" />
                        <p className="text-xs text-[#B9A28F]">Activating camera sensor...</p>
                      </div>
                    )}
                    {cameraState === 'permission_denied' && (
                      <div className="py-6 space-y-2 text-center">
                        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                        <p className="text-xs font-bold text-[#F3E7D5]">Camera permission is blocked</p>
                        <p className="text-[11px] text-[#B9A28F] max-w-xs mx-auto">
                          Enable camera access in your browser settings, or enter the 6-digit PIN below.
                        </p>
                      </div>
                    )}
                    {cameraState === 'no_camera' && (
                      <div className="py-6 space-y-2 text-center">
                        <Camera className="w-8 h-8 text-[#C58A55] mx-auto" />
                        <p className="text-xs font-bold text-[#F3E7D5]">No hardware camera detected</p>
                        <p className="text-[11px] text-[#B9A28F] max-w-xs mx-auto">
                          Enter the customer's 6-digit PIN below.
                        </p>
                      </div>
                    )}
                    {cameraState === 'unsupported' && (
                      <div className="py-6 space-y-2 text-center">
                        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                        <p className="text-xs font-bold text-[#F3E7D5]">Browser camera unsupported</p>
                        <p className="text-[11px] text-[#B9A28F] max-w-xs mx-auto">
                          Use the 6-digit backup code below instead.
                        </p>
                      </div>
                    )}
                    {cameraState === 'error' && (
                      <div className="py-6 space-y-2 text-center">
                        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
                        <p className="text-xs font-bold text-[#F3E7D5]">Camera initialization error</p>
                        {cameraErrorMsg && <p className="text-[11px] text-[#B9A28F]">{cameraErrorMsg}</p>}
                      </div>
                    )}
                    {cameraState === 'active' && (
                      <p className="text-xs text-[#B9A28F] font-medium pt-1">
                        Align member's QR code within the viewfinder
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center my-3">
                <div className="flex-1 border-t border-[#3A2720]" />
                <span className="px-3 text-[10px] font-mono text-[#B9A28F] uppercase tracking-widest font-bold">
                  Or Key In 6-Digit PIN
                </span>
                <div className="flex-1 border-t border-[#3A2720]" />
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
                    className="flex-1 bg-[#1E1411] border border-[#3A2720] focus:border-[#C58A55] rounded-2xl px-4 py-3.5 text-center font-mono text-xl tracking-[0.4em] text-[#F3E7D5] placeholder-[#B9A28F]/40 focus:outline-none transition-colors disabled:opacity-50 shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={stage === 'validating' || backupCodeInput.length !== 6}
                    className="py-3.5 px-6 bg-gradient-to-r from-[#C58A55] to-[#B98252] hover:from-[#D6A36F] hover:to-[#C58A55] text-[#1E1411] font-bold rounded-2xl text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5"
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
