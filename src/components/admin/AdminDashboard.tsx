import React, { useState } from 'react';
import { store } from '../../services/store';
import { Cafe, Drink, RedemptionRecord } from '../../types';
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
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'cafes' | 'drinks' | 'calculator' | 'members' | 'redemptions' | 'payouts' | 'settings'
  >('overview');

  const settings = store.getSettings();
  const member = store.getMember();
  const cafes = store.getCafes();
  const drinks = store.getDrinks();
  const redemptions = store.getRedemptions();

  const [selectedCafeFilter, setSelectedCafeFilter] = useState<string>('All');
  const [voidModalRecord, setVoidModalRecord] = useState<RedemptionRecord | null>(null);
  const [voidReasonInput, setVoidReasonInput] = useState<string>('');

  const [editingCafe, setEditingCafe] = useState<Partial<Cafe> | null>(null);
  const [editingDrink, setEditingDrink] = useState<Partial<Drink> | null>(null);

  const [calcRetail, setCalcRetail] = useState<number>(6.50);
  const [calcCredits, setCalcCredits] = useState<number>(4);
  const [calcPayoutRate, setCalcPayoutRate] = useState<number>(2.10);

  const activeRedemptions = redemptions.filter((r) => !r.isVoided);
  const totalRedemptionsCount = activeRedemptions.length;
  const totalCreditsRedeemed = activeRedemptions.reduce((sum, r) => sum + r.creditsDeducted, 0);
  const totalOwedToCafesUsd = activeRedemptions.reduce((sum, r) => sum + r.cafePayoutUsd, 0);
  const totalMemberValueUsd = activeRedemptions.reduce((sum, r) => sum + r.memberValueUsd, 0);
  const totalPlatformMarginUsd = totalMemberValueUsd - totalOwedToCafesUsd;

  const handleExportCsv = (cafeId?: string) => {
    const recordsToExport = cafeId
      ? redemptions.filter((r) => r.cafeId === cafeId)
      : redemptions;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Redemption ID,Timestamp,Member Name,Cafe Name,Drink Name,Credits Deducted,Retail Value ($),Cafe Payout Rate ($/cr),Cafe Payout ($),Platform Margin ($),Status,Void Reason\n';

    recordsToExport.forEach((r) => {
      const status = r.isVoided ? 'VOIDED' : 'COMPLETED';
      const reason = r.voidReason ? `"${r.voidReason}"` : '';
      csvContent += `${r.id},"${r.timestamp}","${r.memberName}","${r.cafeName}","${r.drinkName}",${r.creditsDeducted},${r.memberValueUsd.toFixed(2)},${r.cafePayoutRate.toFixed(2)},${r.cafePayoutUsd.toFixed(2)},${r.platformMarginUsd.toFixed(2)},${status},${reason}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Social_Cup_Statement_${cafeId || 'All_Cafes'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmVoid = () => {
    if (!voidModalRecord || !voidReasonInput.trim()) return;
    store.voidRedemption(voidModalRecord.id, voidReasonInput, 'Admin Lead');
    setVoidModalRecord(null);
    setVoidReasonInput('');
  };

  const handleSaveCafe = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCafe) {
      store.saveCafe(editingCafe);
      setEditingCafe(null);
    }
  };

  const handleSaveDrink = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDrink) {
      store.saveDrink(editingDrink);
      setEditingDrink(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 text-slate-100 min-h-[calc(100vh-60px)] animate-fade-in">
      {/* Admin Navigation Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold shadow-lg shadow-indigo-500/10">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">Social Cup Admin Room</h1>
            <p className="text-xs text-slate-400 font-medium">Dallas Network Management & Financial Control Room</p>
          </div>
        </div>

        <div className="flex space-x-1.5 overflow-x-auto bg-slate-950/90 p-1.5 rounded-2xl border border-white/10 text-xs font-bold scrollbar-none">
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
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* DASHBOARD METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-2 shadow-xl">
              <div className="flex justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Active Subscribers</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-3xl font-black text-white">
                {member.accountState === 'member' ? '1 Active' : '0 Active'}
              </div>
              <p className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+100% active retention</span>
              </p>
            </div>

            <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-2 shadow-xl">
              <div className="flex justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Active Partner Cafes</span>
                <Building2 className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-black text-amber-400">{cafes.length} Cafes</div>
              <p className="text-xs text-slate-400 font-medium">Deep Ellum, Bishop Arts, Uptown</p>
            </div>

            <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-2 shadow-xl">
              <div className="flex justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Total Redemptions</span>
                <CreditCard className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-emerald-400">{totalRedemptionsCount}</div>
              <p className="text-xs text-slate-400 font-medium">{totalCreditsRedeemed} Credits Redeemed</p>
            </div>

            <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-2 shadow-xl">
              <div className="flex justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Total Owed to Cafes</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-black text-white">
                ${totalOwedToCafesUsd.toFixed(2)}
              </div>
              <p className="text-xs text-slate-400 font-medium">Locked payout rate per credit</p>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 shadow-2xl">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-indigo-400" />
              <span>Financial Ledger & Net Unit Economics</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-xs text-slate-400 font-medium">Member Retail Value</span>
                <div className="text-2xl font-black text-white">${totalMemberValueUsd.toFixed(2)}</div>
                <p className="text-xs text-slate-500">Retail dollar value of drinks redeemed</p>
              </div>

              <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-xs text-slate-400 font-medium">Total Cafe Payout Burden</span>
                <div className="text-2xl font-black text-amber-400">${totalOwedToCafesUsd.toFixed(2)}</div>
                <p className="text-xs text-slate-500">Calculated as credits × cafe payout rate</p>
              </div>

              <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-xs text-slate-400 font-medium">Social Cup Platform Margin</span>
                <div className={`text-2xl font-black ${totalPlatformMarginUsd >= 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                  ${totalPlatformMarginUsd.toFixed(2)}
                </div>
                <p className="text-xs text-slate-500">Pass revenue minus cafe payouts</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CAFE MANAGEMENT */}
      {activeTab === 'cafes' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
              Partner Cafe Network ({cafes.length})
            </h3>
            <button
              onClick={() => setEditingCafe({ name: '', neighborhood: 'Deep Ellum', payoutRate: 2.10, isFeatured: false })}
              className="py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white rounded-2xl text-xs font-black flex items-center space-x-1.5 shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Partner Cafe</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cafes.map((cafe) => (
              <div key={cafe.id} className="glass-panel glass-panel-hover rounded-3xl p-5 space-y-3 shadow-xl border border-white/10">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      📍 {cafe.neighborhood}
                    </span>
                    <h4 className="text-lg font-black text-white mt-1">{cafe.name}</h4>
                  </div>
                  <button
                    onClick={() => {
                      const updated = { ...cafe, isFeatured: !cafe.isFeatured };
                      store.saveCafe(updated);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border transition-all ${
                      cafe.isFeatured
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-slate-950 text-slate-500 border-white/10'
                    }`}
                  >
                    {cafe.isFeatured ? '⭐ Featured' : 'Unfeatured'}
                  </button>
                </div>

                <p className="text-xs text-slate-400 truncate">{cafe.address}</p>

                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-white/10 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Payout Rate per Credit:</span>
                    <span className="font-mono font-bold text-emerald-400">${cafe.payoutRate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Counter Scan PIN:</span>
                    <span className="font-mono font-bold text-amber-400">{cafe.scanPin}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => setEditingCafe(cafe)}
                    className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-white/10 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Cafe</span>
                  </button>
                  <button
                    onClick={() => {
                      const newPin = Math.floor(1000 + Math.random() * 9000).toString();
                      store.resetCafePin(cafe.id, newPin);
                    }}
                    className="py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-white/10 rounded-xl text-xs font-bold text-amber-400 flex items-center space-x-1 transition-colors"
                    title="Reset PIN & Sign Out Trusted Devices"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Reset PIN</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MENU & PRICING */}
      {activeTab === 'drinks' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
              Drink Menu & Credit Pricing Management
            </h3>
            <button
              onClick={() => setEditingDrink({ name: '', cafeId: cafes[0]?.id || '', retailPrice: 5.50, creditPrice: 4, isSignature: false, isActive: true })}
              className="py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white rounded-2xl text-xs font-black flex items-center space-x-1.5 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Drink</span>
            </button>
          </div>

          <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10">
                <tr>
                  <th className="p-4">Drink Name</th>
                  <th className="p-4">Cafe</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Retail Price ($)</th>
                  <th className="p-4">Credit Price</th>
                  <th className="p-4">Signature</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {drinks.map((drink) => {
                  const cafe = cafes.find((c) => c.id === drink.cafeId);
                  return (
                    <tr key={drink.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="p-4 font-bold text-white flex items-center space-x-3">
                        <img src={drink.imageUrl} alt={drink.name} className="w-9 h-9 rounded-xl object-cover border border-white/10" />
                        <span>{drink.name}</span>
                      </td>
                      <td className="p-4 text-amber-400 font-extrabold">{cafe?.name || 'Cafe'}</td>
                      <td className="p-4 capitalize text-slate-400 font-medium">{drink.category.replace('_', ' ')}</td>
                      <td className="p-4 font-mono font-bold">${drink.retailPrice.toFixed(2)}</td>
                      <td className="p-4 font-mono font-bold text-amber-400">{drink.creditPrice} Credits</td>
                      <td className="p-4">
                        {drink.isSignature ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase border border-amber-500/30">
                            Signature
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => store.toggleDrinkActive(drink.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            drink.isActive
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {drink.isActive ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setEditingDrink(drink)}
                          className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LIVE MARGIN CALCULATOR */}
      {activeTab === 'calculator' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10 shadow-2xl">
            <div className="flex items-center space-x-2.5">
              <Calculator className="w-6 h-6 text-amber-400" />
              <h3 className="text-base font-black uppercase tracking-wider text-white">
                Live Pricing & Unit Economics Calculator
              </h3>
            </div>

            <p className="text-xs text-slate-400">
              Simulate unit margins in real time as drink retail price, credit price, and cafe payout rates are typed.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Drink Retail Price ($)
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={calcRetail}
                  onChange={(e) => setCalcRetail(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Member Credit Price (Credits)
                </label>
                <input
                  type="number"
                  step="1"
                  value={calcCredits}
                  onChange={(e) => setCalcCredits(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-sm font-mono text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Cafe Payout Rate ($ per Credit)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={calcPayoutRate}
                  onChange={(e) => setCalcPayoutRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-sm font-mono text-emerald-400 focus:outline-none focus:border-amber-500"
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
                <div className="pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[11px] text-slate-400 uppercase font-extrabold">Member Pays ($)</span>
                    <div className="text-2xl font-black text-amber-400">${memberPaidUsd.toFixed(2)}</div>
                    <p className="text-[10px] text-slate-500">Worth {calcCredits} credits in pass</p>
                  </div>

                  <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[11px] text-slate-400 uppercase font-extrabold">Member Savings vs Retail</span>
                    <div className="text-2xl font-black text-emerald-400">${memberSavingsUsd.toFixed(2)}</div>
                    <p className="text-[10px] text-slate-500">Member saves on retail price</p>
                  </div>

                  <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[11px] text-slate-400 uppercase font-extrabold">Social Cup Pays Cafe</span>
                    <div className="text-2xl font-black text-amber-300">${cafePayoutTotalUsd.toFixed(2)}</div>
                    <p className="text-[10px] text-slate-500">Direct payout to cafe counter</p>
                  </div>

                  <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[11px] text-slate-400 uppercase font-extrabold">Social Cup Margin</span>
                    <div className={`text-2xl font-black ${netMarginUsd >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>
                      ${netMarginUsd.toFixed(2)} ({netMarginPercent.toFixed(1)}%)
                    </div>
                    <p className="text-[10px] text-slate-500">Net platform earnings per drink</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* REDEMPTION AUDIT LOG */}
      {activeTab === 'redemptions' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
              Redemption Audit Log ({redemptions.length} Records)
            </h3>

            <div className="flex items-center space-x-3">
              <select
                value={selectedCafeFilter}
                onChange={(e) => setSelectedCafeFilter(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-2xl px-4 py-2 text-xs text-amber-400 font-extrabold focus:outline-none"
              >
                <option value="All">All Partner Cafes</option>
                {cafes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleExportCsv(selectedCafeFilter === 'All' ? undefined : selectedCafeFilter)}
                className="py-2 px-4 bg-gradient-to-r from-emerald-400 to-emerald-600 text-slate-950 rounded-2xl text-xs font-black flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV Statement</span>
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10">
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
              <tbody className="divide-y divide-white/5 font-mono">
                {redemptions
                  .filter((r) => selectedCafeFilter === 'All' || r.cafeId === selectedCafeFilter)
                  .map((record) => (
                    <tr key={record.id} className={record.isVoided ? 'bg-red-950/30 text-slate-500 line-through' : 'hover:bg-slate-900/60 transition-colors'}>
                      <td className="p-4">{new Date(record.timestamp).toLocaleString()}</td>
                      <td className="p-4 font-sans font-bold text-white">{record.memberName}</td>
                      <td className="p-4 font-sans text-amber-400 font-extrabold">{record.cafeName}</td>
                      <td className="p-4 font-sans text-slate-200">{record.drinkName}</td>
                      <td className="p-4 text-amber-400 font-bold">{record.creditsDeducted} Cr</td>
                      <td className="p-4">${record.memberValueUsd.toFixed(2)}</td>
                      <td className="p-4 text-emerald-400">${record.cafePayoutUsd.toFixed(2)}</td>
                      <td className="p-4 text-indigo-400">${record.platformMarginUsd.toFixed(2)}</td>
                      <td className="p-4 font-sans">
                        {record.isVoided ? (
                          <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold uppercase no-underline border border-red-500/30">
                            Voided ({record.voidReason})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/30">
                            Confirmed
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right font-sans">
                        {!record.isVoided && (
                          <button
                            onClick={() => setVoidModalRecord(record)}
                            className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-[11px] font-bold transition-all"
                          >
                            Void
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAYOUT RUNS */}
      {activeTab === 'payouts' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
              Monthly Cafe Payout Runs & Statements
            </h3>

            <button
              onClick={() => handleExportCsv()}
              className="py-2 px-4 bg-gradient-to-r from-emerald-400 to-emerald-600 text-slate-950 rounded-2xl text-xs font-black flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Full Network CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cafes.map((cafe) => {
              const cafeRedemptions = redemptions.filter((r) => r.cafeId === cafe.id && !r.isVoided);
              const totalCredits = cafeRedemptions.reduce((acc, r) => acc + r.creditsDeducted, 0);
              const totalOwedUsd = cafeRedemptions.reduce((acc, r) => acc + r.cafePayoutUsd, 0);

              return (
                <div key={cafe.id} className="glass-panel glass-panel-hover rounded-3xl p-5 space-y-4 shadow-xl border border-white/10">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                        📍 {cafe.neighborhood}
                      </span>
                      <h4 className="text-lg font-black text-white mt-1">{cafe.name}</h4>
                    </div>
                    <span className="font-mono text-xs text-slate-400">${cafe.payoutRate.toFixed(2)}/cr</span>
                  </div>

                  <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Redemptions this period:</span>
                      <span className="font-bold text-white">{cafeRedemptions.length} Drinks</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Total Credits:</span>
                      <span className="font-bold text-amber-400">{totalCredits} Cr</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-sm">
                      <span className="text-slate-300">Amount Owed:</span>
                      <span className="text-emerald-400 font-mono text-base">${totalOwedUsd.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => handleExportCsv(cafe.id)}
                      className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-800 border border-white/10 rounded-2xl text-xs font-bold text-slate-200 flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>CSV Statement</span>
                    </button>
                    <button
                      onClick={() => {
                        const ref = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
                        store.recordPayout(cafe.id, 'September 2026', totalOwedUsd, ref);
                        alert(`Recorded bank payout of $${totalOwedUsd.toFixed(2)} to ${cafe.name} (Ref: ${ref}).`);
                      }}
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black shadow"
                    >
                      Record Payout
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {activeTab === 'settings' && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5 max-w-xl shadow-2xl border border-white/10 text-xs animate-fade-in">
          <h3 className="text-base font-black uppercase tracking-wider text-white">
            Platform Settings (Stripe Synchronized)
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block font-extrabold text-slate-400 uppercase text-[10px] mb-1">
                Credit Valuation ($ per credit)
              </label>
              <input
                type="text"
                disabled
                value={`$${settings.creditDollarValue.toFixed(2)} USD = 1 Credit`}
                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block font-extrabold text-slate-400 uppercase text-[10px] mb-1">
                Monthly Subscription Plan Price (Stripe Native Sheet)
              </label>
              <input
                type="text"
                disabled
                value={`$${settings.monthlyPlanPrice.toFixed(2)} / month`}
                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block font-extrabold text-slate-400 uppercase text-[10px] mb-1">
                Monthly Credit Allowance per Subscriber
              </label>
              <input
                type="text"
                disabled
                value={`${settings.monthlyCreditAllowance} Drink Credits`}
                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-slate-300 font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* VOID MODAL */}
      {voidModalRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl border border-white/10 text-xs">
            <h3 className="text-sm font-extrabold text-red-400 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span>Void Redemption Audit Record</span>
            </h3>
            <p className="text-slate-300">
              Voiding redemption <code className="text-amber-400">{voidModalRecord.id}</code> will restore{' '}
              <strong className="text-white">{voidModalRecord.creditsDeducted} credits</strong> to member{' '}
              {voidModalRecord.memberName} and remove the ${voidModalRecord.cafePayoutUsd.toFixed(2)} payout from {voidModalRecord.cafeName}.
            </p>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                Reason for Void (Required Audit Log Input)
              </label>
              <textarea
                value={voidReasonInput}
                onChange={(e) => setVoidReasonInput(e.target.value)}
                placeholder="e.g. Counter system duplicate scan error..."
                rows={2}
                className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3.5 text-slate-200 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setVoidModalRecord(null)}
                className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-2xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVoid}
                disabled={!voidReasonInput.trim()}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl disabled:opacity-40 shadow-lg"
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
