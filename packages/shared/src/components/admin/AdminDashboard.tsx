import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { store } from '../../services/store';
import {
  api,
  resolveAssetUrl,
  AdminDashboardSummary,
  AdminRedemptionLogEntry,
  AdminMemberEntry,
  AdminPayoutSummary,
  AdminPayoutRecord,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { AuthGate } from '../common/AuthGate';
import { NavControls } from '../common/NavControls';
import { Cafe, Drink } from '../../types';
import {
  Building2,
  Users,
  CreditCard,
  Plus,
  Edit3,
  Download,
  Calculator,
  Sparkles,
  DollarSign,
  PieChart,
  FileSpreadsheet,
  AlertTriangle,
  KeyRound,
  ArrowUpRight,
  Upload,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

// Real database fields (Phase 1/3 schema) - decoupled from the display-only
// Cafe/Drink types in types/index.ts, which are adapted from this shape with
// defaults for fields (neighborhood, vibeTags, payoutRate, credits...) that
// don't exist in the database yet. Admin forms edit the real fields.
interface CafeFormState {
  id?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  image_url?: string | null;
  description?: string | null;
  payout_rate?: number;
  is_active?: boolean;
  neighborhood?: string | null;
  vibe_tags?: string[];
  is_featured?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  opening_hours?: Record<string, string> | null;
}

const OPENING_HOURS_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

interface DrinkFormState {
  id?: string;
  cafe_id: string;
  name: string;
  description?: string | null;
  price: number;
  credit_price: number;
  category?: string | null;
  is_signature?: boolean;
  image_url?: string | null;
  is_active?: boolean;
}

export const AdminDashboard: React.FC = () => {
  // :tab in the URL is the active back-office tab, so it's a real URL
  // (bookmarkable, reloadable) and browser Back/Forward moves between tabs.
  type AdminTab = 'overview' | 'cafes' | 'drinks' | 'calculator' | 'members' | 'redemptions' | 'payouts' | 'settings';
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const activeTab = (tab as AdminTab) || 'overview';
  const setActiveTab = (t: AdminTab) => navigate(t === 'overview' ? '/admin' : `/admin/${t}`);

  const settings = store.getSettings();

  const [selectedCafeFilter, setSelectedCafeFilter] = useState<string>('All');
  const [voidModalRecord, setVoidModalRecord] = useState<AdminRedemptionLogEntry | null>(null);
  const [voidReasonInput, setVoidReasonInput] = useState<string>('');

  // --- Phase 10: real admin back-office data (dashboard, redemption log,
  // members, payouts) - all require the same real ADMIN JWT as Cafe/Drink
  // management below. ---
  const [dashboardSummary, setDashboardSummary] = useState<AdminDashboardSummary | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [redemptionLog, setRedemptionLog] = useState<AdminRedemptionLogEntry[]>([]);
  const [isLoadingRedemptionLog, setIsLoadingRedemptionLog] = useState(false);
  const [redemptionLogError, setRedemptionLogError] = useState<string | null>(null);

  const [adminMembers, setAdminMembers] = useState<AdminMemberEntry[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [payoutPeriodStart, setPayoutPeriodStart] = useState<string>(firstOfMonth);
  const [payoutPeriodEnd, setPayoutPeriodEnd] = useState<string>(today);
  const [payoutSummaries, setPayoutSummaries] = useState<Record<string, AdminPayoutSummary>>({});
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(false);
  const [payoutsError, setPayoutsError] = useState<string | null>(null);
  const [payoutHistoryByCafe, setPayoutHistoryByCafe] = useState<Record<string, AdminPayoutRecord[]>>({});

  // --- Real cafe/drink management state (Phase 3) ---
  const [managedCafes, setManagedCafes] = useState<Cafe[]>([]);
  const [isLoadingCafes, setIsLoadingCafes] = useState(true);
  const [cafesError, setCafesError] = useState<string | null>(null);

  const [selectedDrinkCafeId, setSelectedDrinkCafeId] = useState<string>('');
  const [managedDrinks, setManagedDrinks] = useState<Drink[]>([]);
  const [isLoadingDrinks, setIsLoadingDrinks] = useState(false);
  const [drinksError, setDrinksError] = useState<string | null>(null);

  const [editingCafe, setEditingCafe] = useState<CafeFormState | null>(null);
  const [vibeTagsInput, setVibeTagsInput] = useState('');
  const [cafeCoordError, setCafeCoordError] = useState<string | null>(null);
  const [editingDrink, setEditingDrink] = useState<DrinkFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Cafe photo upload (Phase 3 image upload button) - stores whatever
  // /api/uploads/image returns straight onto editingCafe.image_url, same
  // field the rest of the form/save flow already uses.
  const cafeImageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingCafeImage, setIsUploadingCafeImage] = useState(false);
  const [cafeImageUploadError, setCafeImageUploadError] = useState<string | null>(null);

  const handleCafeImageUpload = async (file: File) => {
    setIsUploadingCafeImage(true);
    setCafeImageUploadError(null);
    try {
      const { image_url } = await api.uploadImage(file);
      setEditingCafe((prev) => (prev ? { ...prev, image_url } : prev));
    } catch (err: any) {
      setCafeImageUploadError(err.message || 'Failed to upload image.');
    } finally {
      setIsUploadingCafeImage(false);
    }
  };

  // Cafe/drink mutations and the admin back-office tabs below require a real
  // ADMIN account - this comes from the shared AuthContext (same session as
  // Barista/Profile), not a component-local login state.
  const { user, logout } = useAuth();
  const adminUser = user && user.role === 'ADMIN' ? user : null;

  const loadManagedCafes = async () => {
    setIsLoadingCafes(true);
    setCafesError(null);
    try {
      // Phase 4 added search/city/pagination to GET /api/cafes; admin just
      // wants the plain list, same default page size as public discovery
      // (fine while the network is this small - no admin-specific endpoint
      // needed yet).
      const { cafes } = await api.getCafes();
      setManagedCafes(cafes);
    } catch (err: any) {
      setCafesError(err.message || 'Could not load cafes.');
    } finally {
      setIsLoadingCafes(false);
    }
  };

  useEffect(() => {
    loadManagedCafes();
  }, []);

  const loadDashboardSummary = async () => {
    setIsLoadingDashboard(true);
    setDashboardError(null);
    try {
      setDashboardSummary(await api.getAdminDashboard());
    } catch (err: any) {
      setDashboardError(err.message || 'Could not load the dashboard.');
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const loadRedemptionLog = async () => {
    setIsLoadingRedemptionLog(true);
    setRedemptionLogError(null);
    try {
      const { entries } = await api.getAdminRedemptions({
        cafeId: selectedCafeFilter === 'All' ? undefined : selectedCafeFilter,
      });
      setRedemptionLog(entries);
    } catch (err: any) {
      setRedemptionLogError(err.message || 'Could not load the redemption log.');
    } finally {
      setIsLoadingRedemptionLog(false);
    }
  };

  const loadMembers = async () => {
    setIsLoadingMembers(true);
    setMembersError(null);
    try {
      setAdminMembers(await api.getAdminMembers());
    } catch (err: any) {
      setMembersError(err.message || 'Could not load members.');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const loadPayoutData = async () => {
    if (managedCafes.length === 0) return;
    setIsLoadingPayouts(true);
    setPayoutsError(null);
    try {
      const periodStartIso = new Date(payoutPeriodStart).toISOString();
      const periodEndIso = new Date(`${payoutPeriodEnd}T23:59:59.999Z`).toISOString();
      const summaries = await Promise.all(
        managedCafes.map((cafe) => api.getAdminPayoutSummary(cafe.id, periodStartIso, periodEndIso))
      );
      const summaryByCafe: Record<string, AdminPayoutSummary> = {};
      summaries.forEach((s) => {
        summaryByCafe[s.cafeId] = s;
      });
      setPayoutSummaries(summaryByCafe);

      const histories = await Promise.all(managedCafes.map((cafe) => api.getAdminPayoutHistory(cafe.id)));
      const historyByCafe: Record<string, AdminPayoutRecord[]> = {};
      managedCafes.forEach((cafe, i) => {
        historyByCafe[cafe.id] = histories[i];
      });
      setPayoutHistoryByCafe(historyByCafe);
    } catch (err: any) {
      setPayoutsError(err.message || 'Could not load payout data.');
    } finally {
      setIsLoadingPayouts(false);
    }
  };

  useEffect(() => {
    if (!adminUser) return;
    if (activeTab === 'overview') loadDashboardSummary();
    if (activeTab === 'redemptions') loadRedemptionLog();
    if (activeTab === 'members') loadMembers();
    if (activeTab === 'payouts') loadPayoutData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUser, activeTab, selectedCafeFilter, managedCafes]);

  useEffect(() => {
    if (!selectedDrinkCafeId) {
      setManagedDrinks([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setIsLoadingDrinks(true);
      setDrinksError(null);
      try {
        const data = await api.getDrinksByCafe(selectedDrinkCafeId);
        if (!cancelled) setManagedDrinks(data);
      } catch (err: any) {
        if (!cancelled) setDrinksError(err.message || 'Could not load drinks.');
      } finally {
        if (!cancelled) setIsLoadingDrinks(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDrinkCafeId]);

  const handleSaveCafe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCafe) return;
    setFormError(null);
    setCafeCoordError(null);

    const lat = editingCafe.latitude;
    const lng = editingCafe.longitude;
    const hasLat = lat !== null && lat !== undefined;
    const hasLng = lng !== null && lng !== undefined;
    if (hasLat !== hasLng) {
      setCafeCoordError('Provide both latitude and longitude, or leave both blank.');
      return;
    }
    if (hasLat && (lat! < -90 || lat! > 90)) {
      setCafeCoordError('Latitude must be between -90 and 90.');
      return;
    }
    if (hasLng && (lng! < -180 || lng! > 180)) {
      setCafeCoordError('Longitude must be between -180 and 180.');
      return;
    }

    const vibe_tags = vibeTagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    // The member-facing app always displays perk_line over description (see
    // adaptCafe's perkLine fallback) - mirroring the same text into both
    // keeps this one textarea meaningful without a second field editing a
    // distinction the adapted Cafe type doesn't actually preserve.
    const perk_line = editingCafe.description || null;

    try {
      if (editingCafe.id) {
        await api.updateCafe(editingCafe.id, { ...editingCafe, vibe_tags, perk_line });
      } else {
        await api.createCafe({
          name: editingCafe.name,
          address: editingCafe.address,
          city: editingCafe.city,
          state: editingCafe.state,
          image_url: editingCafe.image_url,
          description: editingCafe.description,
          payout_rate: editingCafe.payout_rate,
          neighborhood: editingCafe.neighborhood,
          perk_line,
          vibe_tags,
          is_featured: editingCafe.is_featured,
          latitude: editingCafe.latitude,
          longitude: editingCafe.longitude,
          opening_hours: editingCafe.opening_hours,
        });
      }
      setEditingCafe(null);
      await loadManagedCafes();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save cafe.');
    }
  };

  const handleDeactivateCafe = async (cafeId: string) => {
    setFormError(null);
    try {
      await api.deactivateCafe(cafeId);
      await loadManagedCafes();
    } catch (err: any) {
      setFormError(err.message || 'Failed to deactivate cafe.');
    }
  };

  const handleSaveDrink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDrink) return;
    if (!Number.isInteger(editingDrink.credit_price) || editingDrink.credit_price < 1) {
      setFormError('Credit price must be a whole number of 1 or more.');
      return;
    }
    setFormError(null);
    try {
      if (editingDrink.id) {
        await api.updateDrink(editingDrink.id, editingDrink);
      } else {
        await api.createDrink(editingDrink.cafe_id, {
          name: editingDrink.name,
          description: editingDrink.description,
          price: editingDrink.price,
          credit_price: editingDrink.credit_price,
          category: editingDrink.category,
          is_signature: editingDrink.is_signature,
          image_url: editingDrink.image_url,
        });
      }
      setEditingDrink(null);
      if (selectedDrinkCafeId) {
        const data = await api.getDrinksByCafe(selectedDrinkCafeId);
        setManagedDrinks(data);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save drink.');
    }
  };

  const handleDeactivateDrink = async (drinkId: string) => {
    setFormError(null);
    try {
      await api.deactivateDrink(drinkId);
      if (selectedDrinkCafeId) {
        const data = await api.getDrinksByCafe(selectedDrinkCafeId);
        setManagedDrinks(data);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to deactivate drink.');
    }
  };

  const [calcRetail, setCalcRetail] = useState<number>(6.50);
  const [calcCredits, setCalcCredits] = useState<number>(4);
  const [calcPayoutRate, setCalcPayoutRate] = useState<number>(2.10);

  const handleExportCsv = async (cafeId?: string) => {
    try {
      const blob = await api.exportAdminRedemptionsCsv({ cafeId });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Social_Cup_Statement_${cafeId || 'All_Cafes'}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setRedemptionLogError(err.message || 'Failed to export redemptions.');
    }
  };

  const handleRecordPayout = async (cafeId: string, amount: number) => {
    setPayoutsError(null);
    // No auto-generated reference number - it would look like a real bank/wire
    // confirmation on the payout history and CSV export without being one.
    // Leave it to the admin to paste the actual transfer reference, or blank.
    const reference = window.prompt(
      'Optional: enter the real bank/wire transfer reference for this payout (leave blank if none).'
    );
    if (reference === null) return; // admin cancelled
    try {
      await api.recordAdminPayout({
        cafeId,
        periodStart: new Date(payoutPeriodStart).toISOString(),
        periodEnd: new Date(`${payoutPeriodEnd}T23:59:59.999Z`).toISOString(),
        amount,
        reference: reference.trim() || null,
      });
      await loadPayoutData();
    } catch (err: any) {
      setPayoutsError(err.message || 'Failed to record payout.');
    }
  };

  const handleConfirmVoid = async () => {
    if (!voidModalRecord || !voidReasonInput.trim()) return;
    try {
      await api.voidRedemption(voidModalRecord.id, voidReasonInput);
      setVoidModalRecord(null);
      setVoidReasonInput('');
      await Promise.all([loadRedemptionLog(), loadDashboardSummary()]);
    } catch (err: any) {
      setRedemptionLogError(err.message || 'Failed to void redemption.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 text-[#F3E7D5] min-h-[calc(100vh-60px)] animate-fade-in font-sans selection:bg-[#C58A55] selection:text-[#1E1411]">
      {/* Admin Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#251814] p-5 rounded-3xl border border-[#3A2720] shadow-xl">
        <div className="flex items-center space-x-3">
          <NavControls />
          <div className="w-11 h-11 rounded-2xl bg-[#1E1411] text-[#F3E7D5] flex items-center justify-center font-bold shadow-sm border border-[#3A2720]">
            <Sparkles className="w-5 h-5 fill-[#C58A55] text-[#C58A55]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-editorial text-xl font-bold text-[#F3E7D5] tracking-tight">Social Cup Admin Console</span>
              <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-[#C58A55]/15 text-[#C58A55] font-bold border border-[#C58A55]/30 uppercase tracking-wider">
                Dallas Metro
              </span>
            </div>
            <p className="text-xs text-[#B9A28F] font-medium mt-0.5">Network Management & Financial Clearinghouse</p>
          </div>
        </div>

        <div className="flex space-x-1.5 overflow-x-auto bg-[#1E1411] p-1.5 rounded-2xl border border-[#3A2720] text-xs font-bold scrollbar-none">
          {[
            { id: 'overview', label: '📊 Dashboard' },
            { id: 'cafes', label: '☕ Cafe Network' },
            { id: 'drinks', label: '🥤 Menu & Pricing' },
            { id: 'calculator', label: '🧮 Margin Engine' },
            { id: 'members', label: '👤 Members' },
            { id: 'redemptions', label: '📜 Audit Log' },
            { id: 'payouts', label: '💵 Payout Runs' },
            { id: 'settings', label: '⚙️ Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#C58A55] to-[#B98252] text-[#1E1411] font-bold shadow-md'
                  : 'text-[#B9A28F] hover:text-[#F3E7D5] hover:bg-[#3A2720]/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Administrator Profile Badge & Sign Out */}
        {adminUser && (
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-[#1E1411] border border-[#3A2720] text-xs shadow-sm">
              <div className="w-6 h-6 rounded-lg bg-[#3A2720] flex items-center justify-center text-[#C58A55]">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <span className="font-bold text-[#F3E7D5] block leading-tight truncate max-w-[130px]">
                  {adminUser.name}
                </span>
                <span className="text-[9px] font-mono text-[#C58A55] font-bold uppercase tracking-wider block">
                  Admin Profile
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="py-2 px-3 bg-[#1E1411] hover:bg-red-950/40 text-red-400 rounded-xl border border-red-500/25 text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
              title="Sign Out of Admin Console"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        )}
      </div>

      {/* Shared login gate (AuthContext) - every tab below needs an ADMIN session */}
      <AuthGate
        allowedRoles={['ADMIN']}
        title="Admin Sign In"
        subtitle="Sign in with an admin account to manage cafes, drinks, and the back office."
        deniedMessage="This account is not an admin."
      />

      {/* DASHBOARD METRICS (Phase 10: real data from GET /api/admin/dashboard) */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {!adminUser ? (
            <div className="bg-[#251814] rounded-3xl p-8 text-center text-xs text-[#B9A28F] border border-[#3A2720] shadow-sm">
              Sign in above to view the dashboard.
            </div>
          ) : isLoadingDashboard ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-[#251814] rounded-3xl border border-[#3A2720] shadow-sm animate-pulse" />
              ))}
            </div>
          ) : dashboardError ? (
            <div className="bg-[#251814] rounded-3xl p-8 text-center text-xs text-[#B9A28F] border border-[#3A2720] shadow-sm">
              {dashboardError}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-[#251814] p-5 rounded-3xl border border-[#3A2720] space-y-2 shadow-lg">
                  <div className="flex justify-between text-[#B9A28F] text-xs font-bold uppercase tracking-wider">
                    <span>Total Members</span>
                    <Users className="w-4 h-4 text-[#C58A55]" />
                  </div>
                  <div className="text-3xl font-black text-[#F3E7D5] font-editorial">{dashboardSummary?.totalMembers ?? 0}</div>
                  <p className="text-xs text-[#C58A55] font-semibold flex items-center space-x-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Registered MEMBER accounts</span>
                  </p>
                </div>

                <div className="bg-[#251814] p-5 rounded-3xl border border-[#3A2720] space-y-2 shadow-lg">
                  <div className="flex justify-between text-[#B9A28F] text-xs font-bold uppercase tracking-wider">
                    <span>Active Partner Cafes</span>
                    <Building2 className="w-4 h-4 text-[#C58A55]" />
                  </div>
                  <div className="text-3xl font-black text-[#F3E7D5] font-editorial">{dashboardSummary?.activeCafes ?? 0} Cafes</div>
                  <p className="text-xs text-[#B9A28F] font-medium">Currently active in the network</p>
                </div>

                <div className="bg-[#251814] p-5 rounded-3xl border border-[#3A2720] space-y-2 shadow-lg">
                  <div className="flex justify-between text-[#B9A28F] text-xs font-bold uppercase tracking-wider">
                    <span>Redemptions This Month</span>
                    <CreditCard className="w-4 h-4 text-[#C58A55]" />
                  </div>
                  <div className="text-3xl font-black text-[#F3E7D5] font-editorial">{dashboardSummary?.redemptionsThisMonth ?? 0}</div>
                  <p className="text-xs text-[#B9A28F] font-medium">{dashboardSummary?.creditsRedeemedThisMonth ?? 0} Credits Redeemed</p>
                </div>

                <div className="bg-[#251814] p-5 rounded-3xl border border-[#3A2720] space-y-2 shadow-lg">
                  <div className="flex justify-between text-[#B9A28F] text-xs font-bold uppercase tracking-wider">
                    <span>Owed to Cafes This Month</span>
                    <DollarSign className="w-4 h-4 text-[#C58A55]" />
                  </div>
                  <div className="text-3xl font-black text-[#F3E7D5] font-editorial">
                    ${(dashboardSummary?.totalOwedToCafesThisMonth ?? 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-[#B9A28F] font-medium">Locked payout rate per credit</p>
                </div>
              </div>

              <div className="bg-[#251814] rounded-3xl p-6 space-y-4 border border-[#3A2720] shadow-xl">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#F3E7D5] flex items-center space-x-2">
                  <PieChart className="w-4 h-4 text-[#C58A55]" />
                  <span>This Month's Net Unit Economics</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-[#1E1411] p-5 rounded-2xl border border-[#3A2720] space-y-1">
                    <span className="text-xs text-[#B9A28F] font-medium">Total Cafe Payout Burden</span>
                    <div className="text-2xl font-black text-[#C58A55] font-editorial">
                      ${(dashboardSummary?.totalOwedToCafesThisMonth ?? 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-[#B9A28F]">Calculated as credits × cafe payout rate</p>
                  </div>

                  <div className="bg-[#1E1411] p-5 rounded-2xl border border-[#3A2720] space-y-1">
                    <span className="text-xs text-[#B9A28F] font-medium">Social Cup Platform Margin</span>
                    <div className="text-2xl font-black text-emerald-400 font-editorial">
                      ${(dashboardSummary?.totalMarginThisMonth ?? 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-[#B9A28F]">Member value minus cafe payouts</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* CAFE MANAGEMENT */}
      {activeTab === 'cafes' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#F3E7D5]">
              Partner Cafe Network ({managedCafes.length})
            </h3>
            {adminUser && (
              <button
                onClick={() => {
                  setEditingCafe({ name: '', address: '', city: '', state: '' });
                  setVibeTagsInput('');
                  setCafeCoordError(null);
                  setCafeImageUploadError(null);
                }}
                className="py-2.5 px-4 bg-gradient-to-r from-[#C58A55] to-[#B98252] hover:from-[#D6A36F] hover:to-[#C58A55] text-[#1E1411] rounded-2xl text-xs font-black flex items-center space-x-1.5 shadow-md transition-all active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Partner Cafe</span>
              </button>
            )}
          </div>

          {formError && (
            <div className="bg-red-950/40 border border-red-500/30 text-red-300 rounded-2xl p-3 text-xs font-bold">
              {formError}
            </div>
          )}

          {isLoadingCafes ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-40 bg-[#251814] rounded-3xl border border-[#3A2720] shadow-sm animate-pulse" />
              ))}
            </div>
          ) : cafesError ? (
            <div className="bg-[#251814] rounded-3xl p-8 text-center text-xs text-[#B9A28F] border border-[#3A2720] shadow-sm">
              {cafesError}
            </div>
          ) : managedCafes.length === 0 ? (
            <div className="bg-[#251814] rounded-3xl p-8 text-center text-xs text-[#B9A28F] border border-[#3A2720] shadow-sm">
              No partner cafes yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {managedCafes.map((cafe) => (
                <div key={cafe.id} className="bg-[#251814] rounded-3xl p-5 space-y-3 shadow-lg border border-[#3A2720]">
                  <div>
                    <span className="text-[10px] font-bold text-[#C58A55] uppercase tracking-widest bg-[#1E1411] px-2.5 py-0.5 rounded-full border border-[#3A2720] font-mono">
                      📍 {cafe.neighborhood}
                    </span>
                    <h4 className="text-lg font-black text-[#F3E7D5] mt-1 font-editorial">{cafe.name}</h4>
                  </div>

                  <p className="text-xs text-[#B9A28F] truncate">{cafe.address}</p>

                  {cafe.perkLine && (
                    <p className="text-xs text-[#B9A28F] line-clamp-2">{cafe.perkLine}</p>
                  )}

                  {adminUser && (
                    <div className="flex items-center space-x-2 pt-2 border-t border-[#3A2720]">
                      <button
                        onClick={() => {
                          const [address, city, state] = cafe.address.split(', ');
                          setEditingCafe({
                            id: cafe.id,
                            name: cafe.name,
                            address: address || cafe.address,
                            city: city || '',
                            state: state || '',
                            image_url: cafe.photos[0] || '',
                            description: cafe.perkLine,
                            payout_rate: cafe.payoutRate,
                            neighborhood: cafe.neighborhood,
                            is_featured: cafe.isFeatured,
                            latitude: cafe.coordinates.lat !== 0 || cafe.coordinates.lng !== 0 ? cafe.coordinates.lat : null,
                            longitude: cafe.coordinates.lat !== 0 || cafe.coordinates.lng !== 0 ? cafe.coordinates.lng : null,
                            opening_hours: cafe.openingHours,
                          });
                          setVibeTagsInput(cafe.vibeTags.join(', '));
                          setCafeCoordError(null);
                          setCafeImageUploadError(null);
                        }}
                        className="flex-1 py-2 bg-[#1E1411] hover:bg-[#3A2720] border border-[#3A2720] rounded-xl text-xs font-bold text-[#F3E7D5] flex items-center justify-center space-x-1.5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#C58A55]" />
                        <span>Edit Cafe</span>
                      </button>
                      <button
                        onClick={() => handleDeactivateCafe(cafe.id)}
                        className="py-2 px-3 bg-[#1E1411] hover:bg-red-950/40 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 flex items-center space-x-1 transition-colors"
                        title="Deactivate (soft delete - keeps history intact)"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Deactivate</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MENU & PRICING */}
      {activeTab === 'drinks' && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#F3E7D5]">
            Drink Menu & Pricing Management
          </h3>

          {formError && (
            <div className="bg-red-950/40 border border-red-500/30 text-red-300 rounded-2xl p-3 text-xs font-bold">
              {formError}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedDrinkCafeId}
              onChange={(e) => setSelectedDrinkCafeId(e.target.value)}
              className="bg-[#1E1411] border border-[#3A2720] rounded-2xl px-4 py-2.5 text-xs text-[#F3E7D5] font-bold focus:outline-none focus:border-[#C58A55] shadow-sm"
            >
              <option value="">Select a cafe...</option>
              {managedCafes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {adminUser && selectedDrinkCafeId && (
              <button
                onClick={() =>
                  setEditingDrink({ cafe_id: selectedDrinkCafeId, name: '', price: 5.5, credit_price: 4, is_active: true })
                }
                className="py-2.5 px-4 bg-gradient-to-r from-[#C58A55] to-[#B98252] hover:from-[#D6A36F] hover:to-[#C58A55] text-[#1E1411] rounded-2xl text-xs font-black flex items-center space-x-1.5 shadow-md transition-all active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Drink</span>
              </button>
            )}
          </div>

          {!selectedDrinkCafeId ? (
            <div className="bg-[#251814] rounded-3xl p-8 text-center text-xs text-[#B9A28F] border border-[#3A2720] shadow-sm">
              Select a cafe above to view and manage its menu.
            </div>
          ) : isLoadingDrinks ? (
            <div className="h-40 bg-[#251814] rounded-3xl border border-[#3A2720] shadow-sm animate-pulse" />
          ) : drinksError ? (
            <div className="bg-[#251814] rounded-3xl p-8 text-center text-xs text-[#B9A28F] border border-[#3A2720] shadow-sm">
              {drinksError}
            </div>
          ) : (
            <div className="bg-[#251814] rounded-3xl overflow-hidden shadow-xl border border-[#3A2720]">
              <table className="w-full text-left text-xs text-[#F3E7D5]">
                <thead className="bg-[#1E1411] text-[#B9A28F] uppercase tracking-wider text-[10px] font-mono border-b border-[#3A2720]">
                  <tr>
                    <th className="p-4">Drink Name</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Price ($)</th>
                    <th className="p-4">Credits</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3A2720]/60">
                  {managedDrinks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-[#B9A28F]">No drinks on this menu yet.</td>
                    </tr>
                  ) : (
                    managedDrinks.map((drink) => (
                      <tr key={drink.id} className="hover:bg-[#3A2720]/30 transition-colors">
                        <td className="p-4 font-bold text-[#F3E7D5] flex items-center space-x-3">
                          {drink.imageUrl && (
                            <img src={drink.imageUrl} alt={drink.name} className="w-9 h-9 rounded-xl object-cover border border-[#3A2720]" />
                          )}
                          <span>{drink.name}</span>
                          {drink.isSignature && (
                            <span className="px-1.5 py-0.5 rounded-md bg-[#C58A55]/20 text-[#C58A55] text-[9px] font-mono font-bold uppercase">Signature</span>
                          )}
                        </td>
                        <td className="p-4 text-[#B9A28F] max-w-xs truncate">{drink.description}</td>
                        <td className="p-4 font-mono font-bold text-[#F3E7D5]">${drink.retailPrice.toFixed(2)}</td>
                        <td className="p-4 font-mono font-bold text-[#C58A55]">{drink.creditPrice} Cr</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                              drink.isActive
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                                : 'bg-red-950/60 text-red-300 border-red-500/30'
                            }`}
                          >
                            {drink.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {adminUser && (
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() =>
                                  setEditingDrink({
                                    id: drink.id,
                                    cafe_id: drink.cafeId,
                                    name: drink.name,
                                    description: drink.description,
                                    price: drink.retailPrice,
                                    credit_price: drink.creditPrice,
                                    category: drink.category,
                                    is_signature: drink.isSignature,
                                    image_url: drink.imageUrl,
                                    is_active: drink.isActive,
                                  })
                                }
                                className="p-2 hover:bg-[#3A2720] rounded-xl text-[#B9A28F] hover:text-[#F3E7D5] transition-colors"
                                aria-label={`Edit ${drink.name}`}
                              >
                                <Edit3 className="w-4 h-4 text-[#C58A55]" />
                              </button>
                              <button
                                onClick={() => handleDeactivateDrink(drink.id)}
                                className="p-2 hover:bg-red-950/40 rounded-xl text-red-400 transition-colors"
                                title="Deactivate (soft delete)"
                                aria-label={`Deactivate ${drink.name}`}
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* LIVE MARGIN CALCULATOR */}
      {activeTab === 'calculator' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#251814] rounded-3xl p-6 sm:p-8 space-y-6 border border-[#3A2720] shadow-xl">
            <div className="flex items-center space-x-2.5">
              <Calculator className="w-6 h-6 text-[#C58A55]" />
              <h3 className="text-base font-black uppercase tracking-wider text-[#F3E7D5] font-editorial">
                Live Pricing & Unit Economics Calculator
              </h3>
            </div>

            <p className="text-xs text-[#B9A28F]">
              Simulate unit margins in real time as drink retail price, credit price, and cafe payout rates are typed.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#B9A28F] uppercase tracking-wider mb-1.5">
                  Drink Retail Price ($)
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={calcRetail}
                  onChange={(e) => setCalcRetail(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-4 py-3 text-sm font-mono text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#B9A28F] uppercase tracking-wider mb-1.5">
                  Member Credit Price (Credits)
                </label>
                <input
                  type="number"
                  step="1"
                  value={calcCredits}
                  onChange={(e) => setCalcCredits(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-4 py-3 text-sm font-mono text-[#C58A55] focus:outline-none focus:border-[#C58A55]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#B9A28F] uppercase tracking-wider mb-1.5">
                  Cafe Payout Rate ($ per Credit)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={calcPayoutRate}
                  onChange={(e) => setCalcPayoutRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-4 py-3 text-sm font-mono text-[#C58A55] focus:outline-none focus:border-[#C58A55]"
                />
              </div>
            </div>

            {(() => {
              const memberPaidUsd = calcCredits * settings.creditDollarValue;
              const memberSavingsUsd = calcRetail - memberPaidUsd;
              const cafePayoutTotalUsd = calcCredits * calcPayoutRate;
              const netMarginUsd = memberPaidUsd - cafePayoutTotalUsd;
              const netMarginPercent = memberPaidUsd > 0 ? (netMarginUsd / memberPaidUsd) * 100 : 0;

              return (
                <div className="pt-6 border-t border-[#3A2720] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#1E1411] p-5 rounded-2xl border border-[#3A2720] space-y-1">
                    <span className="text-[11px] text-[#B9A28F] uppercase font-bold">Member Pays ($)</span>
                    <div className="text-2xl font-black text-[#F3E7D5] font-editorial">${memberPaidUsd.toFixed(2)}</div>
                    <p className="text-[10px] text-[#B9A28F]">Worth {calcCredits} credits in pass</p>
                  </div>

                  <div className="bg-[#1E1411] p-5 rounded-2xl border border-[#3A2720] space-y-1">
                    <span className="text-[11px] text-[#B9A28F] uppercase font-bold">Member Savings vs Retail</span>
                    <div className="text-2xl font-black text-[#C58A55] font-editorial">${memberSavingsUsd.toFixed(2)}</div>
                    <p className="text-[10px] text-[#B9A28F]">Member saves on retail price</p>
                  </div>

                  <div className="bg-[#1E1411] p-5 rounded-2xl border border-[#3A2720] space-y-1">
                    <span className="text-[11px] text-[#B9A28F] uppercase font-bold">Social Cup Pays Cafe</span>
                    <div className="text-2xl font-black text-[#F3E7D5] font-editorial">${cafePayoutTotalUsd.toFixed(2)}</div>
                    <p className="text-[10px] text-[#B9A28F]">Direct payout to cafe counter</p>
                  </div>

                  <div className="bg-[#1E1411] p-5 rounded-2xl border border-[#3A2720] space-y-1">
                    <span className="text-[11px] text-[#B9A28F] uppercase font-bold">Social Cup Margin</span>
                    <div className="text-2xl font-black text-emerald-400 font-editorial">
                      ${netMarginUsd.toFixed(2)} ({netMarginPercent.toFixed(1)}%)
                    </div>
                    <p className="text-[10px] text-[#B9A28F]">Net platform earnings per drink</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* REDEMPTION AUDIT LOG (Phase 10: real data from GET /api/admin/redemptions) */}
      {activeTab === 'redemptions' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#F3E7D5]">
              Redemption Audit Log ({redemptionLog.length} Records)
            </h3>

            <div className="flex items-center space-x-3">
              <select
                value={selectedCafeFilter}
                onChange={(e) => setSelectedCafeFilter(e.target.value)}
                className="bg-[#1E1411] border border-[#3A2720] rounded-2xl px-4 py-2 text-xs text-[#F3E7D5] font-bold focus:outline-none focus:border-[#C58A55] shadow-sm"
              >
                <option value="All">All Partner Cafes</option>
                {managedCafes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleExportCsv(selectedCafeFilter === 'All' ? undefined : selectedCafeFilter)}
                className="py-2 px-4 bg-gradient-to-r from-[#C58A55] to-[#B98252] hover:from-[#D6A36F] hover:to-[#C58A55] text-[#1E1411] rounded-2xl text-xs font-black flex items-center space-x-1.5 shadow-md transition-all active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV Statement</span>
              </button>
            </div>
          </div>

          {!adminUser ? (
            <div className="bg-[#251814] rounded-3xl p-8 text-center text-xs text-[#B9A28F] border border-[#3A2720] shadow-sm">
              Sign in above to view the redemption log.
            </div>
          ) : isLoadingRedemptionLog ? (
            <div className="h-40 bg-[#251814] rounded-3xl border border-[#3A2720] shadow-sm animate-pulse" />
          ) : redemptionLogError ? (
            <div className="bg-[#251814] rounded-3xl p-8 text-center text-xs text-[#B9A28F] border border-[#3A2720] shadow-sm">
              {redemptionLogError}
            </div>
          ) : redemptionLog.length === 0 ? (
            <div className="bg-[#251814] rounded-3xl p-8 text-center text-xs text-[#B9A28F] border border-[#3A2720] shadow-sm">
              No completed redemptions yet.
            </div>
          ) : (
            <div className="bg-[#251814] rounded-3xl overflow-hidden shadow-xl border border-[#3A2720]">
              <table className="w-full text-left text-xs text-[#F3E7D5]">
                <thead className="bg-[#1E1411] text-[#B9A28F] uppercase tracking-wider text-[10px] font-mono border-b border-[#3A2720]">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Member</th>
                    <th className="p-4">Cafe</th>
                    <th className="p-4">Drink</th>
                    <th className="p-4">Credits</th>
                    <th className="p-4">Member Value</th>
                    <th className="p-4">Cafe Payout</th>
                    <th className="p-4">Margin</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3A2720]/60 font-mono">
                  {redemptionLog.map((entry) => {
                    const isVoided = entry.status === 'VOID';
                    return (
                      <tr key={entry.id} className={isVoided ? 'bg-red-950/25 text-[#B9A28F]/60 line-through' : 'hover:bg-[#3A2720]/30 transition-colors'}>
                        <td className="p-4">{entry.redeemed_at ? new Date(entry.redeemed_at).toLocaleString() : '—'}</td>
                        <td className="p-4 font-sans font-bold text-[#F3E7D5]">{entry.member_name}</td>
                        <td className="p-4 font-sans text-[#C58A55] font-extrabold">{entry.cafe_name}</td>
                        <td className="p-4 font-sans text-[#F3E7D5]">{entry.drink_name}</td>
                        <td className="p-4 text-[#C58A55] font-bold">{entry.credit_price} Cr</td>
                        <td className="p-4">${entry.member_value_usd.toFixed(2)}</td>
                        <td className="p-4 text-[#C58A55]">${entry.cafe_payout_usd.toFixed(2)}</td>
                        <td className="p-4 text-emerald-400 font-bold">${entry.margin_usd.toFixed(2)}</td>
                        <td className="p-4 font-sans">
                          {isVoided ? (
                            <span className="px-2.5 py-1 rounded-full bg-red-950/60 text-red-300 border border-red-500/30 text-[10px] font-bold uppercase no-underline">
                              Voided ({entry.void_reason})
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-[#1E1411] text-[#C58A55] border border-[#3A2720] text-[10px] font-bold uppercase">
                              Confirmed
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right font-sans">
                          {!isVoided && (
                            <button
                              onClick={() => setVoidModalRecord(entry)}
                              className="px-3 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 rounded-xl text-[11px] font-bold transition-all"
                            >
                              Void
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PAYOUT RUNS (Phase 10: real per-period totals from GET /api/admin/payouts/summary) */}
      {activeTab === 'payouts' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#F3E7D5]">
              Cafe Payout Runs & Statements
            </h3>

            <div className="flex flex-wrap items-end gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#B9A28F] mb-1">Period Start</label>
                <input
                  type="date"
                  value={payoutPeriodStart}
                  onChange={(e) => setPayoutPeriodStart(e.target.value)}
                  className="bg-[#1E1411] border border-[#3A2720] rounded-xl px-3 py-2 text-[#F3E7D5]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#B9A28F] mb-1">Period End</label>
                <input
                  type="date"
                  value={payoutPeriodEnd}
                  onChange={(e) => setPayoutPeriodEnd(e.target.value)}
                  className="bg-[#1E1411] border border-[#3A2720] rounded-xl px-3 py-2 text-[#F3E7D5]"
                />
              </div>
              <button
                onClick={() => loadPayoutData()}
                className="py-2 px-3 bg-[#1E1411] hover:bg-[#3A2720] border border-[#3A2720] rounded-xl font-bold text-[#F3E7D5] transition-colors"
              >
                Apply
              </button>
              <button
                onClick={() => handleExportCsv()}
                className="py-2 px-4 bg-gradient-to-r from-[#C58A55] to-[#B98252] hover:from-[#D6A36F] hover:to-[#C58A55] text-[#1E1411] rounded-2xl font-black flex items-center space-x-1.5 shadow-md transition-all active:scale-[0.98]"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Full Network CSV</span>
              </button>
            </div>
          </div>

          {payoutsError && (
            <div className="bg-red-950/40 border border-red-500/30 text-red-300 rounded-2xl p-3 text-xs font-bold">
              {payoutsError}
            </div>
          )}

          {!adminUser ? (
            <div className="bg-[#251814] rounded-3xl p-8 text-center text-xs text-[#B9A28F] border border-[#3A2720] shadow-sm">
              Sign in above to view payouts.
            </div>
          ) : isLoadingPayouts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-48 bg-[#251814] rounded-3xl border border-[#3A2720] shadow-sm animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {managedCafes.map((cafe) => {
                const summary = payoutSummaries[cafe.id];
                const history = payoutHistoryByCafe[cafe.id] ?? [];

                return (
                  <div key={cafe.id} className="bg-[#251814] rounded-3xl p-5 space-y-4 shadow-lg border border-[#3A2720]">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-[#C58A55] uppercase tracking-widest bg-[#1E1411] px-2.5 py-0.5 rounded-full border border-[#3A2720] font-mono">
                          📍 {cafe.neighborhood}
                        </span>
                        <h4 className="text-lg font-black text-[#F3E7D5] mt-1 font-editorial">{cafe.name}</h4>
                      </div>
                      <span className="font-mono text-xs text-[#C58A55]">${cafe.payoutRate.toFixed(2)}/cr</span>
                    </div>

                    <div className="bg-[#1E1411] p-4 rounded-2xl border border-[#3A2720] space-y-1.5 text-xs">
                      <div className="flex justify-between text-[#B9A28F]">
                        <span>Redemptions this period:</span>
                        <span className="font-bold text-[#F3E7D5]">{summary?.redemptionCount ?? 0} Drinks</span>
                      </div>
                      <div className="flex justify-between text-[#B9A28F]">
                        <span>Total Credits:</span>
                        <span className="font-bold text-[#C58A55]">{summary?.totalCredits ?? 0} Cr</span>
                      </div>
                      <div className="border-t border-[#3A2720] pt-2 flex justify-between font-bold text-sm">
                        <span className="text-[#F3E7D5]">Amount Owed:</span>
                        <span className="text-[#C58A55] font-mono text-base font-editorial">${(summary?.amountOwed ?? 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {history.length > 0 && (
                      <div className="text-[10px] text-[#B9A28F] space-y-1">
                        <span className="font-bold uppercase tracking-wider text-[#C58A55]">Payout History</span>
                        {history.slice(0, 3).map((p) => (
                          <div key={p.id} className="flex justify-between">
                            <span>{new Date(p.created_at).toLocaleDateString()} ({p.reference})</span>
                            <span className="font-bold text-[#F3E7D5]">${parseFloat(p.amount).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={() => handleExportCsv(cafe.id)}
                        className="flex-1 py-2.5 bg-[#1E1411] hover:bg-[#3A2720] border border-[#3A2720] rounded-2xl text-xs font-bold text-[#F3E7D5] flex items-center justify-center space-x-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-[#C58A55]" />
                        <span>CSV Statement</span>
                      </button>
                      <button
                        onClick={() => handleRecordPayout(cafe.id, summary?.amountOwed ?? 0)}
                        disabled={!summary || summary.amountOwed <= 0}
                        className="py-2.5 px-4 bg-gradient-to-r from-[#C58A55] to-[#B98252] hover:from-[#D6A36F] hover:to-[#C58A55] text-[#1E1411] rounded-2xl text-xs font-black shadow disabled:opacity-40"
                      >
                        Record Payout
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MEMBERS (Phase 10: real data from GET /api/admin/members) */}
      {activeTab === 'members' && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#F3E7D5]">
            Members ({adminMembers.length})
          </h3>

          {!adminUser ? (
            <div className="bg-[#251814] rounded-3xl p-8 text-center text-xs text-[#B9A28F] border border-[#3A2720] shadow-sm">
              Sign in above to view members.
            </div>
          ) : isLoadingMembers ? (
            <div className="h-40 bg-[#251814] rounded-3xl border border-[#3A2720] shadow-sm animate-pulse" />
          ) : membersError ? (
            <div className="bg-[#251814] rounded-3xl p-8 text-center text-xs text-[#B9A28F] border border-[#3A2720] shadow-sm">
              {membersError}
            </div>
          ) : adminMembers.length === 0 ? (
            <div className="bg-[#251814] rounded-3xl p-8 text-center text-xs text-[#B9A28F] border border-[#3A2720] shadow-sm">
              No registered members yet.
            </div>
          ) : (
            <div className="bg-[#251814] rounded-3xl overflow-hidden shadow-xl border border-[#3A2720]">
              <table className="w-full text-left text-xs text-[#F3E7D5]">
                <thead className="bg-[#1E1411] text-[#B9A28F] uppercase tracking-wider text-[10px] font-mono border-b border-[#3A2720]">
                  <tr>
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Joined</th>
                    <th className="p-4">Membership Status</th>
                    <th className="p-4">Credits Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3A2720]/60">
                  {adminMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-[#3A2720]/30 transition-colors">
                      <td className="p-4 font-bold text-[#F3E7D5]">{m.name}</td>
                      <td className="p-4 text-[#B9A28F]">{m.email}</td>
                      <td className="p-4 font-mono text-[#B9A28F]">{new Date(m.created_at).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                            m.membership_status === 'ACTIVE'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                              : 'bg-[#1E1411] text-[#B9A28F] border border-[#3A2720]'
                          }`}
                        >
                          {m.membership_status ?? 'INACTIVE'}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-[#C58A55]">{m.credits ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-[#251814] rounded-3xl p-6 sm:p-8 space-y-5 max-w-xl shadow-xl border border-[#3A2720] text-xs animate-fade-in">
          <h3 className="text-base font-black uppercase tracking-wider text-[#F3E7D5] font-editorial">
            Platform Settings (Stripe Synchronized)
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block font-bold text-[#B9A28F] uppercase text-[10px] mb-1">
                Credit Valuation ($ per credit)
              </label>
              <input
                type="text"
                disabled
                value={`$${settings.creditDollarValue.toFixed(2)} USD = 1 Credit`}
                className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-4 py-3 text-[#F3E7D5] font-mono opacity-80"
              />
            </div>

            <div>
              <label className="block font-bold text-[#B9A28F] uppercase text-[10px] mb-1">
                Monthly Subscription Plan Price (Stripe Native Sheet)
              </label>
              <input
                type="text"
                disabled
                value={`$${settings.monthlyPlanPrice.toFixed(2)} / month`}
                className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-4 py-3 text-[#F3E7D5] font-mono opacity-80"
              />
            </div>

            <div>
              <label className="block font-bold text-[#B9A28F] uppercase text-[10px] mb-1">
                Monthly Credit Allowance per Subscriber
              </label>
              <input
                type="text"
                disabled
                value={`${settings.monthlyCreditAllowance} Drink Credits`}
                className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-4 py-3 text-[#F3E7D5] font-mono opacity-80"
              />
            </div>
          </div>
        </div>
      )}

      {/* CAFE EDIT/ADD MODAL */}
      {editingCafe && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCafe}
            className="bg-[#251814] rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl border border-[#3A2720] text-xs text-[#F3E7D5] max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-sm font-extrabold text-[#F3E7D5] font-editorial">
              {editingCafe.id ? 'Edit Partner Cafe' : 'Add New Partner Cafe'}
            </h3>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">Cafe Name</label>
              <input
                type="text"
                required
                value={editingCafe.name || ''}
                onChange={(e) => setEditingCafe({ ...editingCafe, name: e.target.value })}
                className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-3.5 py-2.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">
                Neighborhood <span className="normal-case font-normal text-[#B9A28F]/70">(shown to members, e.g. "Deep Ellum")</span>
              </label>
              <input
                type="text"
                value={editingCafe.neighborhood || ''}
                onChange={(e) => setEditingCafe({ ...editingCafe, neighborhood: e.target.value })}
                className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-3.5 py-2.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">City</label>
                <input
                  type="text"
                  required
                  value={editingCafe.city}
                  onChange={(e) => setEditingCafe({ ...editingCafe, city: e.target.value })}
                  className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-3.5 py-2.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">State</label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={editingCafe.state}
                  onChange={(e) => setEditingCafe({ ...editingCafe, state: e.target.value.toUpperCase() })}
                  className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-3.5 py-2.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">Street Address</label>
              <input
                type="text"
                required
                value={editingCafe.address}
                onChange={(e) => setEditingCafe({ ...editingCafe, address: e.target.value })}
                className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-3.5 py-2.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">Cafe Photo</label>
              <div className="flex items-center space-x-3">
                {editingCafe.image_url && (
                  <img
                    src={resolveAssetUrl(editingCafe.image_url)}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover border border-[#3A2720] flex-shrink-0"
                  />
                )}
                <div className="flex-1 space-y-1.5">
                  <input
                    ref={cafeImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCafeImageUpload(file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => cafeImageInputRef.current?.click()}
                    disabled={isUploadingCafeImage}
                    className="w-full py-2.5 bg-[#1E1411] hover:bg-[#3A2720] border border-[#3A2720] rounded-2xl text-xs font-bold text-[#F3E7D5] flex items-center justify-center space-x-1.5 disabled:opacity-50 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#C58A55]" />
                    <span>
                      {isUploadingCafeImage ? 'Uploading...' : editingCafe.image_url ? 'Replace Image' : 'Upload Image'}
                    </span>
                  </button>
                  {cafeImageUploadError && <p className="text-red-400 font-bold">{cafeImageUploadError}</p>}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">
                Payout Rate ($ per credit)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={editingCafe.payout_rate ?? 0}
                onChange={(e) => setEditingCafe({ ...editingCafe, payout_rate: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-3.5 py-2.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">
                Description / Tagline <span className="normal-case font-normal text-[#B9A28F]/70">(shown on the cafe page)</span>
              </label>
              <textarea
                rows={2}
                value={editingCafe.description || ''}
                onChange={(e) => setEditingCafe({ ...editingCafe, description: e.target.value })}
                className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-3.5 py-2.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">
                Vibe Tags <span className="normal-case font-normal text-[#B9A28F]/70">(comma-separated, e.g. "Work Friendly, Sunlit Patio")</span>
              </label>
              <input
                type="text"
                value={vibeTagsInput}
                onChange={(e) => setVibeTagsInput(e.target.value)}
                className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-3.5 py-2.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
              />
            </div>

            <label className="flex items-center space-x-2 text-[#F3E7D5] font-bold">
              <input
                type="checkbox"
                checked={editingCafe.is_featured ?? false}
                onChange={(e) => setEditingCafe({ ...editingCafe, is_featured: e.target.checked })}
                className="w-4 h-4 accent-[#C58A55]"
              />
              <span>Featured on Discover</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">
                  Latitude <span className="normal-case font-normal text-[#B9A28F]/70">(optional)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={editingCafe.latitude ?? ''}
                  onChange={(e) =>
                    setEditingCafe({ ...editingCafe, latitude: e.target.value === '' ? null : parseFloat(e.target.value) })
                  }
                  placeholder="e.g. 32.7767"
                  className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-3.5 py-2.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">
                  Longitude <span className="normal-case font-normal text-[#B9A28F]/70">(optional)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  value={editingCafe.longitude ?? ''}
                  onChange={(e) =>
                    setEditingCafe({ ...editingCafe, longitude: e.target.value === '' ? null : parseFloat(e.target.value) })
                  }
                  placeholder="e.g. -96.7970"
                  className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-3.5 py-2.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
                />
              </div>
            </div>
            {cafeCoordError && <p className="text-red-400 font-bold text-xs">{cafeCoordError}</p>}
            <p className="text-[10px] text-[#B9A28F] -mt-2">
              Coordinates power "Near You" sorting for members with location enabled. Leave both blank if unknown.
            </p>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1.5">Opening Hours (optional)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {OPENING_HOURS_DAYS.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <span className="w-20 flex-shrink-0 text-[10px] font-bold uppercase text-[#B9A28F] capitalize">{day.slice(0, 3)}</span>
                    <input
                      type="text"
                      value={editingCafe.opening_hours?.[day] || ''}
                      onChange={(e) =>
                        setEditingCafe({
                          ...editingCafe,
                          opening_hours: { ...(editingCafe.opening_hours || {}), [day]: e.target.value },
                        })
                      }
                      placeholder="e.g. 7am - 6pm"
                      className="flex-1 min-w-0 bg-[#1E1411] border border-[#3A2720] rounded-xl px-3 py-1.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCafe(null)}
                className="flex-1 py-3 bg-[#1E1411] hover:bg-[#3A2720] text-[#B9A28F] font-bold rounded-2xl border border-[#3A2720] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploadingCafeImage}
                className="flex-1 py-3 bg-gradient-to-r from-[#C58A55] to-[#B98252] hover:from-[#D6A36F] hover:to-[#C58A55] text-[#1E1411] font-black rounded-2xl shadow-md disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {editingCafe.id ? 'Save Changes' : 'Add Cafe'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DRINK EDIT/ADD MODAL */}
      {editingDrink && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveDrink}
            className="bg-[#251814] rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl border border-[#3A2720] text-xs text-[#F3E7D5] max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-sm font-extrabold text-[#F3E7D5] font-editorial">
              {editingDrink.id ? 'Edit Drink' : 'Add New Drink'}
            </h3>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">Drink Name</label>
              <input
                type="text"
                required
                value={editingDrink.name || ''}
                onChange={(e) => setEditingDrink({ ...editingDrink, name: e.target.value })}
                className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-3.5 py-2.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">Cafe</label>
              <select
                required
                disabled={!!editingDrink.id}
                value={editingDrink.cafe_id}
                onChange={(e) => setEditingDrink({ ...editingDrink, cafe_id: e.target.value })}
                className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-3.5 py-2.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55] disabled:opacity-60"
              >
                {managedCafes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">Description</label>
              <textarea
                rows={2}
                value={editingDrink.description || ''}
                onChange={(e) => setEditingDrink({ ...editingDrink, description: e.target.value })}
                className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-3.5 py-2.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">Retail Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  value={editingDrink.price}
                  onChange={(e) => setEditingDrink({ ...editingDrink, price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-3.5 py-2.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">Credit Price</label>
                <input
                  type="number"
                  step="1"
                  min={1}
                  required
                  value={editingDrink.credit_price}
                  onChange={(e) => setEditingDrink({ ...editingDrink, credit_price: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-3.5 py-2.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
                />
                <span className="block text-[10px] text-[#B9A28F] mt-1">Credits deducted from a member's balance on redemption.</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">Category</label>
                <select
                  value={editingDrink.category || ''}
                  onChange={(e) => setEditingDrink({ ...editingDrink, category: e.target.value || null })}
                  className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-3.5 py-2.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
                >
                  <option value="">Uncategorized</option>
                  <option value="espresso">Espresso</option>
                  <option value="cold_brew">Cold Brew</option>
                  <option value="latte">Latte</option>
                  <option value="matcha">Matcha</option>
                  <option value="specialty">Specialty</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">Image URL</label>
                <input
                  type="text"
                  value={editingDrink.image_url || ''}
                  onChange={(e) => setEditingDrink({ ...editingDrink, image_url: e.target.value })}
                  className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl px-3.5 py-2.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
                />
              </div>
            </div>

            <div className="flex items-center space-x-5">
              <label className="flex items-center space-x-2 text-[#F3E7D5] font-bold">
                <input
                  type="checkbox"
                  checked={editingDrink.is_active ?? true}
                  onChange={(e) => setEditingDrink({ ...editingDrink, is_active: e.target.checked })}
                  className="w-4 h-4 accent-[#C58A55]"
                />
                <span>Active on Menu</span>
              </label>
              <label className="flex items-center space-x-2 text-[#F3E7D5] font-bold">
                <input
                  type="checkbox"
                  checked={editingDrink.is_signature ?? false}
                  onChange={(e) => setEditingDrink({ ...editingDrink, is_signature: e.target.checked })}
                  className="w-4 h-4 accent-[#C58A55]"
                />
                <span>Signature Drink</span>
              </label>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingDrink(null)}
                className="flex-1 py-3 bg-[#1E1411] hover:bg-[#3A2720] text-[#B9A28F] font-bold rounded-2xl border border-[#3A2720] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-gradient-to-r from-[#C58A55] to-[#B98252] hover:from-[#D6A36F] hover:to-[#C58A55] text-[#1E1411] font-black rounded-2xl shadow-md transition-all active:scale-[0.98]"
              >
                {editingDrink.id ? 'Save Changes' : 'Add Drink'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VOID MODAL */}
      {voidModalRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#251814] rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl border border-[#3A2720] text-xs text-[#F3E7D5]">
            <h3 className="text-sm font-extrabold text-red-400 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span>Void Redemption Audit Record</span>
            </h3>
            <p className="text-[#B9A28F]">
              Voiding redemption <code className="text-[#C58A55] font-mono">{voidModalRecord.id}</code> will restore{' '}
              <strong className="text-[#F3E7D5]">{voidModalRecord.credit_price} credits</strong> to member{' '}
              {voidModalRecord.member_name} and remove the ${voidModalRecord.cafe_payout_usd.toFixed(2)} payout from {voidModalRecord.cafe_name}.
            </p>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#B9A28F] mb-1">
                Reason for Void (Required Audit Log Input)
              </label>
              <textarea
                value={voidReasonInput}
                onChange={(e) => setVoidReasonInput(e.target.value)}
                placeholder="e.g. Counter system duplicate scan error..."
                rows={2}
                className="w-full bg-[#1E1411] border border-[#3A2720] rounded-2xl p-3.5 text-[#F3E7D5] focus:outline-none focus:border-[#C58A55]"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setVoidModalRecord(null)}
                className="flex-1 py-3 bg-[#1E1411] hover:bg-[#3A2720] text-[#B9A28F] font-bold rounded-2xl border border-[#3A2720] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVoid}
                disabled={!voidReasonInput.trim()}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl disabled:opacity-40 shadow-md transition-all active:scale-[0.98]"
              >
                Confirm Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
