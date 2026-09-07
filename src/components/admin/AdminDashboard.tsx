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
}

interface DrinkFormState {
  id?: string;
  cafe_id: string;
  name: string;
  description?: string | null;
  price: number;
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
  const { user } = useAuth();
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
    try {
      if (editingCafe.id) {
        await api.updateCafe(editingCafe.id, editingCafe);
      } else {
        await api.createCafe({
          name: editingCafe.name,
          address: editingCafe.address,
          city: editingCafe.city,
          state: editingCafe.state,
          image_url: editingCafe.image_url,
          description: editingCafe.description,
          payout_rate: editingCafe.payout_rate,
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
    setFormError(null);
    try {
      if (editingDrink.id) {
        await api.updateDrink(editingDrink.id, editingDrink);
      } else {
        await api.createDrink(editingDrink.cafe_id, {
          name: editingDrink.name,
          description: editingDrink.description,
          price: editingDrink.price,
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
    try {
      const reference = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
      await api.recordAdminPayout({
        cafeId,
        periodStart: new Date(payoutPeriodStart).toISOString(),
        periodEnd: new Date(`${payoutPeriodEnd}T23:59:59.999Z`).toISOString(),
        amount,
        reference,
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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 text-[#4B2E2B] min-h-[calc(100vh-60px)] animate-fade-in">
      {/* Admin Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-[#8C5A3C]/20 shadow-md">
        <div className="flex items-center space-x-3">
          <NavControls />
          <div className="w-10 h-10 rounded-2xl bg-accent text-on-accent flex items-center justify-center font-bold shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-[#4B2E2B] tracking-tight">Social Cup Admin Room</h1>
            <p className="text-xs text-[#6B4E4B] font-medium">Dallas Network Management & Financial Control Room</p>
          </div>
        </div>

        <div className="flex space-x-1.5 overflow-x-auto bg-[#FFF8F0] p-1.5 rounded-2xl border border-[#8C5A3C]/20 text-xs font-bold scrollbar-none">
          {[
            { id: 'overview', label: '📊 Dashboard' },
            { id: 'cafes', label: '☕ Cafe Network' },
            { id: 'drinks', label: '🥤 Menu & Pricing' },
            { id: 'calculator', label: '🧮 Margin Calculator' },
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
                  ? 'bg-accent text-on-accent shadow-sm'
                  : 'text-[#6B4E4B] hover:text-[#4B2E2B] hover:bg-[#F4EFE6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
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
            <div className="bg-white rounded-3xl p-8 text-center text-xs text-[#6B4E4B] border border-[#8C5A3C]/20 shadow-sm">
              Sign in above to view the dashboard.
            </div>
          ) : isLoadingDashboard ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-white rounded-3xl border border-[#8C5A3C]/20 shadow-sm animate-pulse" />
              ))}
            </div>
          ) : dashboardError ? (
            <div className="bg-white rounded-3xl p-8 text-center text-xs text-[#6B4E4B] border border-[#8C5A3C]/20 shadow-sm">
              {dashboardError}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-3xl border border-[#8C5A3C]/20 space-y-2 shadow-sm">
                  <div className="flex justify-between text-[#6B4E4B] text-xs font-bold uppercase tracking-wider">
                    <span>Total Members</span>
                    <Users className="w-4 h-4 text-[#8C5A3C]" />
                  </div>
                  <div className="text-3xl font-black text-[#4B2E2B]">{dashboardSummary?.totalMembers ?? 0}</div>
                  <p className="text-xs text-[#8C5A3C] font-semibold flex items-center space-x-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Registered MEMBER accounts</span>
                  </p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[#8C5A3C]/20 space-y-2 shadow-sm">
                  <div className="flex justify-between text-[#6B4E4B] text-xs font-bold uppercase tracking-wider">
                    <span>Active Partner Cafes</span>
                    <Building2 className="w-4 h-4 text-[#8C5A3C]" />
                  </div>
                  <div className="text-3xl font-black text-[#8C5A3C]">{dashboardSummary?.activeCafes ?? 0} Cafes</div>
                  <p className="text-xs text-[#6B4E4B] font-medium">Currently active in the network</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[#8C5A3C]/20 space-y-2 shadow-sm">
                  <div className="flex justify-between text-[#6B4E4B] text-xs font-bold uppercase tracking-wider">
                    <span>Redemptions This Month</span>
                    <CreditCard className="w-4 h-4 text-[#8C5A3C]" />
                  </div>
                  <div className="text-3xl font-black text-[#8C5A3C]">{dashboardSummary?.redemptionsThisMonth ?? 0}</div>
                  <p className="text-xs text-[#6B4E4B] font-medium">{dashboardSummary?.creditsRedeemedThisMonth ?? 0} Credits Redeemed</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[#8C5A3C]/20 space-y-2 shadow-sm">
                  <div className="flex justify-between text-[#6B4E4B] text-xs font-bold uppercase tracking-wider">
                    <span>Owed to Cafes This Month</span>
                    <DollarSign className="w-4 h-4 text-[#8C5A3C]" />
                  </div>
                  <div className="text-3xl font-black text-[#4B2E2B]">
                    ${(dashboardSummary?.totalOwedToCafesThisMonth ?? 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-[#6B4E4B] font-medium">Locked payout rate per credit</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 space-y-4 border border-[#8C5A3C]/20 shadow-md">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#4B2E2B] flex items-center space-x-2">
                  <PieChart className="w-4 h-4 text-[#8C5A3C]" />
                  <span>This Month's Net Unit Economics</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-[#FFF8F0] p-5 rounded-2xl border border-[#8C5A3C]/20 space-y-1">
                    <span className="text-xs text-[#6B4E4B] font-medium">Total Cafe Payout Burden</span>
                    <div className="text-2xl font-black text-[#8C5A3C]">
                      ${(dashboardSummary?.totalOwedToCafesThisMonth ?? 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-[#6B4E4B]">Calculated as credits × cafe payout rate</p>
                  </div>

                  <div className="bg-[#FFF8F0] p-5 rounded-2xl border border-[#8C5A3C]/20 space-y-1">
                    <span className="text-xs text-[#6B4E4B] font-medium">Social Cup Platform Margin</span>
                    <div className="text-2xl font-black text-[#8C5A3C]">
                      ${(dashboardSummary?.totalMarginThisMonth ?? 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-[#6B4E4B]">Member value minus cafe payouts</p>
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
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#4B2E2B]">
              Partner Cafe Network ({managedCafes.length})
            </h3>
            {adminUser && (
              <button
                onClick={() => {
                  setEditingCafe({ name: '', address: '', city: '', state: '' });
                  setCafeImageUploadError(null);
                }}
                className="py-2.5 px-4 bg-accent hover:bg-accent-hover text-on-accent rounded-2xl text-xs font-black flex items-center space-x-1.5 shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Partner Cafe</span>
              </button>
            )}
          </div>

          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 text-xs font-bold">
              {formError}
            </div>
          )}

          {isLoadingCafes ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-40 bg-white rounded-3xl border border-[#8C5A3C]/20 shadow-sm animate-pulse" />
              ))}
            </div>
          ) : cafesError ? (
            <div className="bg-white rounded-3xl p-8 text-center text-xs text-[#6B4E4B] border border-[#8C5A3C]/20 shadow-sm">
              {cafesError}
            </div>
          ) : managedCafes.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-xs text-[#6B4E4B] border border-[#8C5A3C]/20 shadow-sm">
              No partner cafes yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {managedCafes.map((cafe) => (
                <div key={cafe.id} className="bg-white rounded-3xl p-5 space-y-3 shadow-md border border-[#8C5A3C]/20">
                  <div>
                    <span className="text-[10px] font-bold text-[#FFF8F0] uppercase tracking-widest bg-[#8C5A3C] px-2.5 py-0.5 rounded-full">
                      📍 {cafe.neighborhood}
                    </span>
                    <h4 className="text-lg font-black text-[#4B2E2B] mt-1">{cafe.name}</h4>
                  </div>

                  <p className="text-xs text-[#6B4E4B] truncate">{cafe.address}</p>

                  {cafe.perkLine && (
                    <p className="text-xs text-[#6B4E4B] line-clamp-2">{cafe.perkLine}</p>
                  )}

                  {adminUser && (
                    <div className="flex items-center space-x-2 pt-2 border-t border-[#8C5A3C]/15">
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
                          });
                          setCafeImageUploadError(null);
                        }}
                        className="flex-1 py-2 bg-[#FFF8F0] hover:bg-[#F4EFE6] border border-[#8C5A3C]/20 rounded-xl text-xs font-bold text-[#4B2E2B] flex items-center justify-center space-x-1.5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Cafe</span>
                      </button>
                      <button
                        onClick={() => handleDeactivateCafe(cafe.id)}
                        className="py-2 px-3 bg-[#FFF8F0] hover:bg-red-50 border border-[#8C5A3C]/20 rounded-xl text-xs font-bold text-red-600 flex items-center space-x-1 transition-colors"
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
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#4B2E2B]">
            Drink Menu & Pricing Management
          </h3>

          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 text-xs font-bold">
              {formError}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedDrinkCafeId}
              onChange={(e) => setSelectedDrinkCafeId(e.target.value)}
              className="bg-white border border-[#8C5A3C]/30 rounded-2xl px-4 py-2.5 text-xs text-[#8C5A3C] font-extrabold focus:outline-none shadow-sm"
            >
              <option value="">Select a cafe...</option>
              {managedCafes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {adminUser && selectedDrinkCafeId && (
              <button
                onClick={() =>
                  setEditingDrink({ cafe_id: selectedDrinkCafeId, name: '', price: 5.5, is_active: true })
                }
                className="py-2.5 px-4 bg-accent hover:bg-accent-hover text-on-accent rounded-2xl text-xs font-black flex items-center space-x-1.5 shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Drink</span>
              </button>
            )}
          </div>

          {!selectedDrinkCafeId ? (
            <div className="bg-white rounded-3xl p-8 text-center text-xs text-[#6B4E4B] border border-[#8C5A3C]/20 shadow-sm">
              Select a cafe above to view and manage its menu.
            </div>
          ) : isLoadingDrinks ? (
            <div className="h-40 bg-white rounded-3xl border border-[#8C5A3C]/20 shadow-sm animate-pulse" />
          ) : drinksError ? (
            <div className="bg-white rounded-3xl p-8 text-center text-xs text-[#6B4E4B] border border-[#8C5A3C]/20 shadow-sm">
              {drinksError}
            </div>
          ) : (
            <div className="bg-white rounded-3xl overflow-hidden shadow-md border border-[#8C5A3C]/20">
              <table className="w-full text-left text-xs text-[#4B2E2B]">
                <thead className="bg-[#FFF8F0] text-[#6B4E4B] uppercase tracking-wider text-[10px] border-b border-[#8C5A3C]/20">
                  <tr>
                    <th className="p-4">Drink Name</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Price ($)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#8C5A3C]/15">
                  {managedDrinks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-[#6B4E4B]">No drinks on this menu yet.</td>
                    </tr>
                  ) : (
                    managedDrinks.map((drink) => (
                      <tr key={drink.id} className="hover:bg-[#FFF8F0]/60 transition-colors">
                        <td className="p-4 font-bold text-[#4B2E2B] flex items-center space-x-3">
                          {drink.imageUrl && (
                            <img src={drink.imageUrl} alt={drink.name} className="w-9 h-9 rounded-xl object-cover border border-[#8C5A3C]/20" />
                          )}
                          <span>{drink.name}</span>
                        </td>
                        <td className="p-4 text-[#6B4E4B] max-w-xs truncate">{drink.description}</td>
                        <td className="p-4 font-mono font-bold">${drink.retailPrice.toFixed(2)}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              drink.isActive ? 'bg-[#8C5A3C] text-[#FFF8F0]' : 'bg-red-100 text-red-700'
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
                                    image_url: drink.imageUrl,
                                    is_active: drink.isActive,
                                  })
                                }
                                className="p-2 hover:bg-[#FFF8F0] rounded-xl text-[#6B4E4B] hover:text-[#4B2E2B] transition-colors"
                                aria-label={`Edit ${drink.name}`}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeactivateDrink(drink.id)}
                                className="p-2 hover:bg-red-50 rounded-xl text-red-600 transition-colors"
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
          <div className="bg-white rounded-3xl p-6 sm:p-8 space-y-6 border border-[#8C5A3C]/20 shadow-md">
            <div className="flex items-center space-x-2.5">
              <Calculator className="w-6 h-6 text-[#8C5A3C]" />
              <h3 className="text-base font-black uppercase tracking-wider text-[#4B2E2B]">
                Live Pricing & Unit Economics Calculator
              </h3>
            </div>

            <p className="text-xs text-[#6B4E4B]">
              Simulate unit margins in real time as drink retail price, credit price, and cafe payout rates are typed.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#6B4E4B] uppercase tracking-wider mb-1.5">
                  Drink Retail Price ($)
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={calcRetail}
                  onChange={(e) => setCalcRetail(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-2xl px-4 py-3 text-sm font-mono text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B4E4B] uppercase tracking-wider mb-1.5">
                  Member Credit Price (Credits)
                </label>
                <input
                  type="number"
                  step="1"
                  value={calcCredits}
                  onChange={(e) => setCalcCredits(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-2xl px-4 py-3 text-sm font-mono text-[#8C5A3C] focus:outline-none focus:border-[#C08552]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B4E4B] uppercase tracking-wider mb-1.5">
                  Cafe Payout Rate ($ per Credit)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={calcPayoutRate}
                  onChange={(e) => setCalcPayoutRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-2xl px-4 py-3 text-sm font-mono text-[#8C5A3C] focus:outline-none focus:border-[#C08552]"
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
                <div className="pt-6 border-t border-[#8C5A3C]/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#FFF8F0] p-5 rounded-2xl border border-[#8C5A3C]/20 space-y-1">
                    <span className="text-[11px] text-[#6B4E4B] uppercase font-extrabold">Member Pays ($)</span>
                    <div className="text-2xl font-black text-[#8C5A3C]">${memberPaidUsd.toFixed(2)}</div>
                    <p className="text-[10px] text-[#6B4E4B]">Worth {calcCredits} credits in pass</p>
                  </div>

                  <div className="bg-[#FFF8F0] p-5 rounded-2xl border border-[#8C5A3C]/20 space-y-1">
                    <span className="text-[11px] text-[#6B4E4B] uppercase font-extrabold">Member Savings vs Retail</span>
                    <div className="text-2xl font-black text-[#8C5A3C]">${memberSavingsUsd.toFixed(2)}</div>
                    <p className="text-[10px] text-[#6B4E4B]">Member saves on retail price</p>
                  </div>

                  <div className="bg-[#FFF8F0] p-5 rounded-2xl border border-[#8C5A3C]/20 space-y-1">
                    <span className="text-[11px] text-[#6B4E4B] uppercase font-extrabold">Social Cup Pays Cafe</span>
                    <div className="text-2xl font-black text-[#4B2E2B]">${cafePayoutTotalUsd.toFixed(2)}</div>
                    <p className="text-[10px] text-[#6B4E4B]">Direct payout to cafe counter</p>
                  </div>

                  <div className="bg-[#FFF8F0] p-5 rounded-2xl border border-[#8C5A3C]/20 space-y-1">
                    <span className="text-[11px] text-[#6B4E4B] uppercase font-extrabold">Social Cup Margin</span>
                    <div className="text-2xl font-black text-[#8C5A3C]">
                      ${netMarginUsd.toFixed(2)} ({netMarginPercent.toFixed(1)}%)
                    </div>
                    <p className="text-[10px] text-[#6B4E4B]">Net platform earnings per drink</p>
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
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#4B2E2B]">
              Redemption Audit Log ({redemptionLog.length} Records)
            </h3>

            <div className="flex items-center space-x-3">
              <select
                value={selectedCafeFilter}
                onChange={(e) => setSelectedCafeFilter(e.target.value)}
                className="bg-white border border-[#8C5A3C]/30 rounded-2xl px-4 py-2 text-xs text-[#8C5A3C] font-extrabold focus:outline-none shadow-sm"
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
                className="py-2 px-4 bg-accent hover:bg-accent-hover text-on-accent rounded-2xl text-xs font-black flex items-center space-x-1.5 shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV Statement</span>
              </button>
            </div>
          </div>

          {!adminUser ? (
            <div className="bg-white rounded-3xl p-8 text-center text-xs text-[#6B4E4B] border border-[#8C5A3C]/20 shadow-sm">
              Sign in above to view the redemption log.
            </div>
          ) : isLoadingRedemptionLog ? (
            <div className="h-40 bg-white rounded-3xl border border-[#8C5A3C]/20 shadow-sm animate-pulse" />
          ) : redemptionLogError ? (
            <div className="bg-white rounded-3xl p-8 text-center text-xs text-[#6B4E4B] border border-[#8C5A3C]/20 shadow-sm">
              {redemptionLogError}
            </div>
          ) : redemptionLog.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-xs text-[#6B4E4B] border border-[#8C5A3C]/20 shadow-sm">
              No completed redemptions yet.
            </div>
          ) : (
            <div className="bg-white rounded-3xl overflow-hidden shadow-md border border-[#8C5A3C]/20">
              <table className="w-full text-left text-xs text-[#4B2E2B]">
                <thead className="bg-[#FFF8F0] text-[#6B4E4B] uppercase tracking-wider text-[10px] border-b border-[#8C5A3C]/20">
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
                <tbody className="divide-y divide-[#8C5A3C]/15 font-mono">
                  {redemptionLog.map((entry) => {
                    const isVoided = entry.status === 'VOID';
                    return (
                      <tr key={entry.id} className={isVoided ? 'bg-red-50 text-slate-400 line-through' : 'hover:bg-[#FFF8F0]/60 transition-colors'}>
                        <td className="p-4">{entry.redeemed_at ? new Date(entry.redeemed_at).toLocaleString() : '—'}</td>
                        <td className="p-4 font-sans font-bold text-[#4B2E2B]">{entry.member_name}</td>
                        <td className="p-4 font-sans text-[#8C5A3C] font-extrabold">{entry.cafe_name}</td>
                        <td className="p-4 font-sans text-[#4B2E2B]">{entry.drink_name}</td>
                        <td className="p-4 text-[#8C5A3C] font-bold">{entry.credit_price} Cr</td>
                        <td className="p-4">${entry.member_value_usd.toFixed(2)}</td>
                        <td className="p-4 text-[#8C5A3C]">${entry.cafe_payout_usd.toFixed(2)}</td>
                        <td className="p-4 text-[#4B2E2B]">${entry.margin_usd.toFixed(2)}</td>
                        <td className="p-4 font-sans">
                          {isVoided ? (
                            <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase no-underline">
                              Voided ({entry.void_reason})
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-[#FFF8F0] text-[#8C5A3C] border border-[#C08552]/30 text-[10px] font-bold uppercase">
                              Confirmed
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right font-sans">
                          {!isVoided && (
                            <button
                              onClick={() => setVoidModalRecord(entry)}
                              className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-[11px] font-bold transition-all"
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
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#4B2E2B]">
              Cafe Payout Runs & Statements
            </h3>

            <div className="flex flex-wrap items-end gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#6B4E4B] mb-1">Period Start</label>
                <input
                  type="date"
                  value={payoutPeriodStart}
                  onChange={(e) => setPayoutPeriodStart(e.target.value)}
                  className="bg-white border border-[#8C5A3C]/30 rounded-xl px-3 py-2 text-[#4B2E2B]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#6B4E4B] mb-1">Period End</label>
                <input
                  type="date"
                  value={payoutPeriodEnd}
                  onChange={(e) => setPayoutPeriodEnd(e.target.value)}
                  className="bg-white border border-[#8C5A3C]/30 rounded-xl px-3 py-2 text-[#4B2E2B]"
                />
              </div>
              <button
                onClick={() => loadPayoutData()}
                className="py-2 px-3 bg-[#FFF8F0] hover:bg-[#F4EFE6] border border-[#8C5A3C]/20 rounded-xl font-bold text-[#4B2E2B]"
              >
                Apply
              </button>
              <button
                onClick={() => handleExportCsv()}
                className="py-2 px-4 bg-accent text-on-accent rounded-2xl font-black flex items-center space-x-1.5 shadow-md"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Full Network CSV</span>
              </button>
            </div>
          </div>

          {payoutsError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 text-xs font-bold">
              {payoutsError}
            </div>
          )}

          {!adminUser ? (
            <div className="bg-white rounded-3xl p-8 text-center text-xs text-[#6B4E4B] border border-[#8C5A3C]/20 shadow-sm">
              Sign in above to view payouts.
            </div>
          ) : isLoadingPayouts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-48 bg-white rounded-3xl border border-[#8C5A3C]/20 shadow-sm animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {managedCafes.map((cafe) => {
                const summary = payoutSummaries[cafe.id];
                const history = payoutHistoryByCafe[cafe.id] ?? [];

                return (
                  <div key={cafe.id} className="bg-white rounded-3xl p-5 space-y-4 shadow-md border border-[#8C5A3C]/20">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-[#FFF8F0] uppercase tracking-widest bg-[#8C5A3C] px-2.5 py-0.5 rounded-full">
                          📍 {cafe.neighborhood}
                        </span>
                        <h4 className="text-lg font-black text-[#4B2E2B] mt-1">{cafe.name}</h4>
                      </div>
                      <span className="font-mono text-xs text-[#6B4E4B]">${cafe.payoutRate.toFixed(2)}/cr</span>
                    </div>

                    <div className="bg-[#FFF8F0] p-4 rounded-2xl border border-[#8C5A3C]/20 space-y-1.5 text-xs">
                      <div className="flex justify-between text-[#6B4E4B]">
                        <span>Redemptions this period:</span>
                        <span className="font-bold text-[#4B2E2B]">{summary?.redemptionCount ?? 0} Drinks</span>
                      </div>
                      <div className="flex justify-between text-[#6B4E4B]">
                        <span>Total Credits:</span>
                        <span className="font-bold text-[#8C5A3C]">{summary?.totalCredits ?? 0} Cr</span>
                      </div>
                      <div className="border-t border-[#8C5A3C]/15 pt-2 flex justify-between font-bold text-sm">
                        <span className="text-[#4B2E2B]">Amount Owed:</span>
                        <span className="text-[#8C5A3C] font-mono text-base">${(summary?.amountOwed ?? 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {history.length > 0 && (
                      <div className="text-[10px] text-[#6B4E4B] space-y-1">
                        <span className="font-bold uppercase tracking-wider">Payout History</span>
                        {history.slice(0, 3).map((p) => (
                          <div key={p.id} className="flex justify-between">
                            <span>{new Date(p.created_at).toLocaleDateString()} ({p.reference})</span>
                            <span className="font-bold text-[#4B2E2B]">${parseFloat(p.amount).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={() => handleExportCsv(cafe.id)}
                        className="flex-1 py-2.5 bg-[#FFF8F0] hover:bg-[#F4EFE6] border border-[#8C5A3C]/20 rounded-2xl text-xs font-bold text-[#4B2E2B] flex items-center justify-center space-x-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-[#8C5A3C]" />
                        <span>CSV Statement</span>
                      </button>
                      <button
                        onClick={() => handleRecordPayout(cafe.id, summary?.amountOwed ?? 0)}
                        disabled={!summary || summary.amountOwed <= 0}
                        className="py-2.5 px-4 bg-accent hover:bg-accent-hover text-on-accent rounded-2xl text-xs font-black shadow disabled:opacity-40"
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
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#4B2E2B]">
            Members ({adminMembers.length})
          </h3>

          {!adminUser ? (
            <div className="bg-white rounded-3xl p-8 text-center text-xs text-[#6B4E4B] border border-[#8C5A3C]/20 shadow-sm">
              Sign in above to view members.
            </div>
          ) : isLoadingMembers ? (
            <div className="h-40 bg-white rounded-3xl border border-[#8C5A3C]/20 shadow-sm animate-pulse" />
          ) : membersError ? (
            <div className="bg-white rounded-3xl p-8 text-center text-xs text-[#6B4E4B] border border-[#8C5A3C]/20 shadow-sm">
              {membersError}
            </div>
          ) : adminMembers.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-xs text-[#6B4E4B] border border-[#8C5A3C]/20 shadow-sm">
              No registered members yet.
            </div>
          ) : (
            <div className="bg-white rounded-3xl overflow-hidden shadow-md border border-[#8C5A3C]/20">
              <table className="w-full text-left text-xs text-[#4B2E2B]">
                <thead className="bg-[#FFF8F0] text-[#6B4E4B] uppercase tracking-wider text-[10px] border-b border-[#8C5A3C]/20">
                  <tr>
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Joined</th>
                    <th className="p-4">Membership Status</th>
                    <th className="p-4">Credits Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#8C5A3C]/15">
                  {adminMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-[#FFF8F0]/60 transition-colors">
                      <td className="p-4 font-bold text-[#4B2E2B]">{m.name}</td>
                      <td className="p-4 text-[#6B4E4B]">{m.email}</td>
                      <td className="p-4 font-mono text-[#6B4E4B]">{new Date(m.created_at).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            m.membership_status === 'ACTIVE'
                              ? 'bg-accent text-on-accent'
                              : 'bg-[#E8DED1] text-[#6B4E4B]'
                          }`}
                        >
                          {m.membership_status ?? 'INACTIVE'}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-[#8C5A3C]">{m.credits ?? 0}</td>
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
        <div className="bg-white rounded-3xl p-6 sm:p-8 space-y-5 max-w-xl shadow-md border border-[#8C5A3C]/20 text-xs animate-fade-in">
          <h3 className="text-base font-black uppercase tracking-wider text-[#4B2E2B]">
            Platform Settings (Stripe Synchronized)
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block font-extrabold text-[#6B4E4B] uppercase text-[10px] mb-1">
                Credit Valuation ($ per credit)
              </label>
              <input
                type="text"
                disabled
                value={`$${settings.creditDollarValue.toFixed(2)} USD = 1 Credit`}
                className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/20 rounded-2xl px-4 py-3 text-[#4B2E2B] font-mono"
              />
            </div>

            <div>
              <label className="block font-extrabold text-[#6B4E4B] uppercase text-[10px] mb-1">
                Monthly Subscription Plan Price (Stripe Native Sheet)
              </label>
              <input
                type="text"
                disabled
                value={`$${settings.monthlyPlanPrice.toFixed(2)} / month`}
                className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/20 rounded-2xl px-4 py-3 text-[#4B2E2B] font-mono"
              />
            </div>

            <div>
              <label className="block font-extrabold text-[#6B4E4B] uppercase text-[10px] mb-1">
                Monthly Credit Allowance per Subscriber
              </label>
              <input
                type="text"
                disabled
                value={`${settings.monthlyCreditAllowance} Drink Credits`}
                className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/20 rounded-2xl px-4 py-3 text-[#4B2E2B] font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* CAFE EDIT/ADD MODAL */}
      {editingCafe && (
        <div className="fixed inset-0 z-50 bg-[#4B2E2B]/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCafe}
            className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl border border-[#8C5A3C]/20 text-xs text-[#4B2E2B] max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-sm font-extrabold text-[#4B2E2B]">
              {editingCafe.id ? 'Edit Partner Cafe' : 'Add New Partner Cafe'}
            </h3>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#6B4E4B] mb-1">Cafe Name</label>
              <input
                type="text"
                required
                value={editingCafe.name || ''}
                onChange={(e) => setEditingCafe({ ...editingCafe, name: e.target.value })}
                className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-2xl px-3.5 py-2.5 text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-[#6B4E4B] mb-1">City</label>
                <input
                  type="text"
                  required
                  value={editingCafe.city}
                  onChange={(e) => setEditingCafe({ ...editingCafe, city: e.target.value })}
                  className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-2xl px-3.5 py-2.5 text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-[#6B4E4B] mb-1">State</label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={editingCafe.state}
                  onChange={(e) => setEditingCafe({ ...editingCafe, state: e.target.value.toUpperCase() })}
                  className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-2xl px-3.5 py-2.5 text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#6B4E4B] mb-1">Street Address</label>
              <input
                type="text"
                required
                value={editingCafe.address}
                onChange={(e) => setEditingCafe({ ...editingCafe, address: e.target.value })}
                className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-2xl px-3.5 py-2.5 text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#6B4E4B] mb-1">Cafe Photo</label>
              <div className="flex items-center space-x-3">
                {editingCafe.image_url && (
                  <img
                    src={resolveAssetUrl(editingCafe.image_url)}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover border border-[#8C5A3C]/20 flex-shrink-0"
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
                    className="w-full py-2.5 bg-[#FFF8F0] hover:bg-[#F4EFE6] border border-[#8C5A3C]/30 rounded-2xl text-xs font-bold text-[#4B2E2B] flex items-center justify-center space-x-1.5 disabled:opacity-50 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {isUploadingCafeImage ? 'Uploading...' : editingCafe.image_url ? 'Replace Image' : 'Upload Image'}
                    </span>
                  </button>
                  {cafeImageUploadError && <p className="text-red-600 font-bold">{cafeImageUploadError}</p>}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#6B4E4B] mb-1">
                Payout Rate ($ per credit)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={editingCafe.payout_rate ?? 0}
                onChange={(e) => setEditingCafe({ ...editingCafe, payout_rate: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-2xl px-3.5 py-2.5 text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#6B4E4B] mb-1">Description</label>
              <textarea
                rows={2}
                value={editingCafe.description || ''}
                onChange={(e) => setEditingCafe({ ...editingCafe, description: e.target.value })}
                className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-2xl px-3.5 py-2.5 text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCafe(null)}
                className="flex-1 py-3 bg-[#FFF8F0] text-[#6B4E4B] font-bold rounded-2xl border border-[#8C5A3C]/20"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploadingCafeImage}
                className="flex-1 py-3 bg-accent hover:bg-accent-hover text-on-accent font-black rounded-2xl shadow-md disabled:opacity-50"
              >
                {editingCafe.id ? 'Save Changes' : 'Add Cafe'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DRINK EDIT/ADD MODAL */}
      {editingDrink && (
        <div className="fixed inset-0 z-50 bg-[#4B2E2B]/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveDrink}
            className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl border border-[#8C5A3C]/20 text-xs text-[#4B2E2B] max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-sm font-extrabold text-[#4B2E2B]">
              {editingDrink.id ? 'Edit Drink' : 'Add New Drink'}
            </h3>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#6B4E4B] mb-1">Drink Name</label>
              <input
                type="text"
                required
                value={editingDrink.name || ''}
                onChange={(e) => setEditingDrink({ ...editingDrink, name: e.target.value })}
                className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-2xl px-3.5 py-2.5 text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#6B4E4B] mb-1">Cafe</label>
              <select
                required
                disabled={!!editingDrink.id}
                value={editingDrink.cafe_id}
                onChange={(e) => setEditingDrink({ ...editingDrink, cafe_id: e.target.value })}
                className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-2xl px-3.5 py-2.5 text-[#4B2E2B] focus:outline-none focus:border-[#C08552] disabled:opacity-60"
              >
                {managedCafes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#6B4E4B] mb-1">Description</label>
              <textarea
                rows={2}
                value={editingDrink.description || ''}
                onChange={(e) => setEditingDrink({ ...editingDrink, description: e.target.value })}
                className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-2xl px-3.5 py-2.5 text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-[#6B4E4B] mb-1">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  value={editingDrink.price}
                  onChange={(e) => setEditingDrink({ ...editingDrink, price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-2xl px-3.5 py-2.5 text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-[#6B4E4B] mb-1">Image URL</label>
                <input
                  type="text"
                  value={editingDrink.image_url || ''}
                  onChange={(e) => setEditingDrink({ ...editingDrink, image_url: e.target.value })}
                  className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-2xl px-3.5 py-2.5 text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
                />
              </div>
            </div>

            <label className="flex items-center space-x-2 text-[#4B2E2B] font-bold">
              <input
                type="checkbox"
                checked={editingDrink.is_active ?? true}
                onChange={(e) => setEditingDrink({ ...editingDrink, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <span>Active on Menu</span>
            </label>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingDrink(null)}
                className="flex-1 py-3 bg-[#FFF8F0] text-[#6B4E4B] font-bold rounded-2xl border border-[#8C5A3C]/20"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-accent hover:bg-accent-hover text-on-accent font-black rounded-2xl shadow-md"
              >
                {editingDrink.id ? 'Save Changes' : 'Add Drink'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VOID MODAL */}
      {voidModalRecord && (
        <div className="fixed inset-0 z-50 bg-[#4B2E2B]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl border border-[#8C5A3C]/20 text-xs text-[#4B2E2B]">
            <h3 className="text-sm font-extrabold text-red-600 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>Void Redemption Audit Record</span>
            </h3>
            <p className="text-[#6B4E4B]">
              Voiding redemption <code className="text-[#8C5A3C]">{voidModalRecord.id}</code> will restore{' '}
              <strong className="text-[#4B2E2B]">{voidModalRecord.credit_price} credits</strong> to member{' '}
              {voidModalRecord.member_name} and remove the ${voidModalRecord.cafe_payout_usd.toFixed(2)} payout from {voidModalRecord.cafe_name}.
            </p>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-[#6B4E4B] mb-1">
                Reason for Void (Required Audit Log Input)
              </label>
              <textarea
                value={voidReasonInput}
                onChange={(e) => setVoidReasonInput(e.target.value)}
                placeholder="e.g. Counter system duplicate scan error..."
                rows={2}
                className="w-full bg-[#FFF8F0] border border-[#8C5A3C]/30 rounded-2xl p-3.5 text-[#4B2E2B] focus:outline-none focus:border-[#C08552]"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setVoidModalRecord(null)}
                className="flex-1 py-3 bg-[#FFF8F0] text-[#6B4E4B] font-bold rounded-2xl border border-[#8C5A3C]/20"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVoid}
                disabled={!voidReasonInput.trim()}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl disabled:opacity-40 shadow-md"
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
