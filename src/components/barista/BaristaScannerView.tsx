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
} from 'lucide-react';

// Phase 7: a real, JWT-backed barista scanner, built entirely on the Phase 6
// redemption contract. No redemption/credit business logic lives here - this
// component only calls api.redeemCode and displays whatever the backend
// decides. Auth comes from the shared AuthContext session (same login as
// Profile/Admin), gated to BARISTA or ADMIN roles.

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
        return { title: 'Redemption Expired', message: 'The member needs to generate a new redemption.' };
      case 'REDEMPTION_REDEEMED':
        return { title: 'Redemption Already Used', message: 'This redemption has already been completed.' };
      case 'REDEMPTION_VOID':
        return { title: 'Redemption Canceled', message: 'The member canceled this redemption code.' };
      case 'WRONG_CAFE':
        return { title: 'Wrong Cafe', message: 'This redemption belongs to another cafe.' };
      case 'INSUFFICIENT_CREDITS':
        return { title: 'Insufficient Credits', message: 'The member does not have enough credits.' };
      case 'MEMBERSHIP_INACTIVE':
        return { title: 'Membership Inactive', message: "The member's subscription is not active." };
      case 'REDEMPTION_NOT_FOUND':
      case 'MISSING_CODE':
      case 'INVALID_INPUT':
        return { title: 'Invalid Redemption', message: 'The QR or backup code is not valid.' };
      default:
        return { title: 'Invalid Redemption', message: err.message || 'The QR or backup code is not valid.' };
    }
  }
  return { title: 'Unable to Verify Redemption', message: 'Please check the connection and try again.' };
}

export const BaristaScannerView: React.FC = () => {
  const { user, logout } = useAuth();
  const baristaUser = user && (user.role === 'BARISTA' || user.role === 'ADMIN') ? user : null;

  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [isLoadingCafes, setIsLoadingCafes] = useState(false);
  const [cafesError, setCafesError] = useState<string | null>(null);
  // :cafeId in the URL is the selected counter - this makes "Change Cafe"
  // a real Back navigation, and lets a specific counter's terminal be
  // reloaded or bookmarked directly (/barista/:cafeId).
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
  const isProcessingRef = useRef(false);
  const selectedCafeIdRef = useRef(selectedCafeId);
  useEffect(() => {
    selectedCafeIdRef.current = selectedCafeId;
  }, [selectedCafeId]);
  const cafesRef = useRef(cafes);
  useEffect(() => {
    cafesRef.current = cafes;
  }, [cafes]);

  // --- Cafe list (existing public GET /api/cafes - already active-only) ---
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

  const stopCamera = useCallback(() => {
    const instance = scannerRef.current;
    if (instance && instance.isScanning) {
      instance.stop().catch(() => {});
    }
    setCameraState('idle');
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

  // Duplicate-scan protection: a ref-based lock (not React state, which
  // batches/updates asynchronously) so a camera callback firing again for
  // the same QR across consecutive frames - or a stray backup-code submit
  // while a scan is already in flight - can never send a second request.
  // Reads cafes/selectedCafeId via refs (not the state directly) so this
  // can be a stable useCallback that startCamera's one-time camera
  // callback can safely close over without ever seeing stale data.
  const handleDetected = useCallback(async (payload: { token?: string; backup_code?: string }) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    stopCamera();
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
        // best-effort enrichment only - redemption already succeeded
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
    if (scannerRef.current?.isScanning) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported');
      return;
    }
    setCameraState('starting');
    try {
      const instance = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = instance;
      await instance.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (decodedText) => {
          handleDetected({ token: decodedText });
        },
        () => {
          // per-frame "no QR found yet" callback - expected on every frame
          // without a code in view, deliberately not surfaced as an error.
        }
      );
      setCameraState('active');
    } catch (err: any) {
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
    }
  }, [handleDetected]);

  // Camera runs only while actually on the scan screen with a cafe chosen;
  // stopped on unmount, logout, cafe change, or once a code is detected.
  useEffect(() => {
    if (baristaUser && selectedCafeId && stage === 'ready') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [baristaUser, selectedCafeId, stage, startCamera, stopCamera]);

  // Signing out (here, or from any other surface sharing this session)
  // should drop back to the cafe picker, not leave a stale scan screen up.
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
      setBackupCodeError('Enter exactly 6 digits.');
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
    <div className="min-h-[calc(100vh-60px)] bg-[#FFF8F0] flex flex-col items-center justify-center p-4 text-[#4B2E2B] animate-fade-in">
      <div className="w-full max-w-md bg-white border border-[#8C5A3C]/20 rounded-3xl overflow-hidden shadow-xl">
        {/* Header Bar */}
        <div className="bg-[#FFF8F0] p-4 border-b border-[#8C5A3C]/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <NavControls />
            <div className="w-9 h-9 rounded-2xl bg-accent text-on-accent flex items-center justify-center shadow-md">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black text-[#8C5A3C] uppercase tracking-widest">
                Barista Scan Terminal
              </span>
              <h2 className="text-sm font-extrabold text-[#4B2E2B]">
                {selectedCafe ? selectedCafe.name : baristaUser ? 'Select a Cafe' : 'Sign In Required'}
              </h2>
            </div>
          </div>

          {baristaUser && (
            <button
              onClick={logout}
              title="Sign Out"
              aria-label="Sign out"
              className="text-[#6B4E4B] hover:text-red-700 p-2 rounded-xl hover:bg-[#F4EFE6] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {!baristaUser ? (
          /* LOGIN */
          <div className="p-6 sm:p-8">
            <AuthGate
              allowedRoles={['BARISTA', 'ADMIN']}
              title="Barista Sign In"
              subtitle="Sign in with a barista or admin account to scan redemptions."
              deniedMessage="This account cannot perform barista redemptions. Sign in with a barista or admin account."
            />
          </div>
        ) : !selectedCafeId ? (
          /* SELECT CAFE */
          <div className="p-6 sm:p-8 space-y-5">
            <div className="text-center space-y-1">
              <MapPin className="w-8 h-8 text-[#8C5A3C] mx-auto" />
              <h3 className="text-sm font-black text-[#4B2E2B] uppercase tracking-wide">Select This Counter's Cafe</h3>
              <p className="text-xs text-[#6B4E4B]">Signed in as {baristaUser.name} ({baristaUser.role})</p>
            </div>

            {isLoadingCafes ? (
              <div className="h-24 bg-[#FFF8F0] rounded-2xl animate-pulse" />
            ) : cafesError ? (
              <p className="text-xs text-red-700 font-bold text-center">{cafesError}</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cafes.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCafeId(c.id)}
                    className="w-full text-left p-3.5 bg-[#FFF8F0] hover:bg-[#F4EFE6] border border-[#8C5A3C]/20 rounded-2xl transition-colors"
                  >
                    <span className="text-sm font-bold text-[#4B2E2B]">{c.name}</span>
                    <span className="block text-[11px] text-[#6B4E4B]">{c.neighborhood}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : stage === 'success' && successInfo ? (
          /* GREEN SUCCESS SCREEN */
          <div className="p-6">
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-6 text-center space-y-5 shadow-lg animate-fade-in">
              <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-emerald-800">
                  Redemption Approved
                </span>
                <h2 className="text-2xl font-black text-[#4B2E2B] mt-1">{successInfo.drinkName}</h2>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-emerald-200 text-left space-y-1.5 text-xs shadow-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B4E4B]">Cafe:</span>
                  <span className="font-bold text-[#4B2E2B]">{successInfo.cafeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B4E4B]">Credits Used:</span>
                  <span className="font-bold text-[#8C5A3C]">-{successInfo.creditsUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B4E4B]">Remaining Balance:</span>
                  <span className="font-bold text-emerald-700">{successInfo.remainingCredits} Credits</span>
                </div>
                {formatTimestamp(successInfo.redeemedAt) && (
                  <div className="flex justify-between">
                    <span className="text-[#6B4E4B]">Time:</span>
                    <span className="font-mono text-[#4B2E2B]">{formatTimestamp(successInfo.redeemedAt)}</span>
                  </div>
                )}
              </div>
              <button
                onClick={resetToReady}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs shadow-md transition-all"
              >
                Scan Another
              </button>
            </div>
          </div>
        ) : stage === 'failure' && failureInfo ? (
          /* RED FAILURE SCREEN */
          <div className="p-6">
            <div className="bg-red-50 border-2 border-red-500 rounded-3xl p-6 text-center space-y-5 shadow-lg animate-fade-in">
              <div className="w-20 h-20 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                <XCircle className="w-12 h-12" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-red-800">
                  Redemption Rejected
                </span>
                <h2 className="text-xl font-black text-red-950 mt-1">{failureInfo.title}</h2>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-red-200 text-xs text-red-800">
                {failureInfo.message}
              </div>
              <button
                onClick={resetToReady}
                className="w-full py-3.5 bg-[#4B2E2B] hover:bg-[#3D2523] text-[#FFF8F0] font-black rounded-2xl text-xs"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          /* READY TO SCAN / SCANNING / VALIDATING */
          <div className="p-5 space-y-5">
            <button
              onClick={() => {
                stopCamera();
                setSelectedCafeId('');
              }}
              className="text-[11px] text-[#8C5A3C] hover:underline font-bold"
            >
              Change Cafe
            </button>

            <div className="bg-[#FFF8F0] border-2 border-dashed border-[#C08552]/40 rounded-3xl p-4 text-center space-y-3 relative overflow-hidden">
              {stage === 'validating' ? (
                <div className="py-10 space-y-3">
                  <Loader2 className="w-10 h-10 text-[#8C5A3C] mx-auto animate-spin" />
                  <p className="text-xs text-[#6B4E4B] font-bold">Validating redemption...</p>
                </div>
              ) : (
                <>
                  <div id={SCANNER_ELEMENT_ID} className="mx-auto rounded-2xl overflow-hidden" style={{ minHeight: cameraState === 'active' ? undefined : 0 }} />

                  {cameraState === 'starting' && (
                    <div className="py-6 space-y-2">
                      <Loader2 className="w-8 h-8 text-[#8C5A3C] mx-auto animate-spin" />
                      <p className="text-xs text-[#6B4E4B]">Starting camera...</p>
                    </div>
                  )}
                  {cameraState === 'permission_denied' && (
                    <div className="py-4 space-y-2">
                      <AlertTriangle className="w-8 h-8 text-[#8C5A3C] mx-auto" />
                      <p className="text-xs text-[#6B4E4B] font-bold">Camera permission denied.</p>
                      <p className="text-[11px] text-[#6B4E4B]">Allow camera access in your browser, or use the backup code below.</p>
                    </div>
                  )}
                  {cameraState === 'no_camera' && (
                    <div className="py-4 space-y-2">
                      <Camera className="w-8 h-8 text-[#8C5A3C] mx-auto" />
                      <p className="text-xs text-[#6B4E4B] font-bold">No camera available on this device.</p>
                      <p className="text-[11px] text-[#6B4E4B]">Use the backup code below instead.</p>
                    </div>
                  )}
                  {cameraState === 'unsupported' && (
                    <div className="py-4 space-y-2">
                      <AlertTriangle className="w-8 h-8 text-[#8C5A3C] mx-auto" />
                      <p className="text-xs text-[#6B4E4B] font-bold">This browser doesn't support camera scanning.</p>
                      <p className="text-[11px] text-[#6B4E4B]">Use the backup code below instead.</p>
                    </div>
                  )}
                  {cameraState === 'error' && (
                    <div className="py-4 space-y-2">
                      <AlertTriangle className="w-8 h-8 text-[#8C5A3C] mx-auto" />
                      <p className="text-xs text-[#6B4E4B] font-bold">Could not start the camera.</p>
                      {cameraErrorMsg && <p className="text-[11px] text-[#6B4E4B]">{cameraErrorMsg}</p>}
                    </div>
                  )}
                  {cameraState === 'active' && (
                    <p className="text-[11px] text-[#6B4E4B] font-medium pt-1">
                      Point camera at member's phone QR code...
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center my-2">
              <div className="flex-1 border-t border-[#8C5A3C]/20"></div>
              <span className="px-3 text-[10px] text-[#6B4E4B] uppercase tracking-widest font-black">
                Or Enter 6-Digit Backup Code
              </span>
              <div className="flex-1 border-t border-[#8C5A3C]/20"></div>
            </div>

            <form onSubmit={handleBackupCodeSubmit} className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={6}
                  value={backupCodeInput}
                  onChange={(e) => setBackupCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="e.g. 512034"
                  disabled={stage === 'validating'}
                  className="flex-1 bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-2xl px-4 py-3 text-center font-mono text-base text-[#8C5A3C] focus:outline-none focus:border-[#C08552] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={stage === 'validating'}
                  className="py-3 px-5 bg-accent hover:bg-accent-hover text-on-accent font-black rounded-2xl text-xs shadow-md disabled:opacity-50"
                >
                  Redeem
                </button>
              </div>
              {backupCodeError && <p className="text-xs text-red-700 font-bold">{backupCodeError}</p>}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
