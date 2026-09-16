import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CafeUserPicker } from './CafeUserPicker';
import {
  Coffee,
  ShieldCheck,
  Store,
  Sparkles,
  Award,
  QrCode,
  CheckCircle2,
  KeyRound,
  Mail,
  Lock,
  User as UserIcon,
  Loader2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export type AuthRole = 'member' | 'admin' | 'cafe';

interface UnifiedAuthPageProps {
  initialRole?: AuthRole;
  isOperationsApp?: boolean;
  // The Member App renders this page inside PhoneFrame, which owns the real
  // viewport - so it must fill that frame's screen area (h-full) instead of
  // claiming the literal browser viewport (min-h-screen), which the
  // Operations app's desktop login still does.
  fillParent?: boolean;
}

export const UnifiedAuthPage: React.FC<UnifiedAuthPageProps> = ({
  initialRole = 'member',
  isOperationsApp = false,
  fillParent = false,
}) => {
  const heightClass = fillParent ? 'h-full' : 'min-h-screen';
  const { user, login, register, logout } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<AuthRole>(initialRole);
  const [memberTab, setMemberTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // Switch role handler
  const handleRoleChange = (role: AuthRole) => {
    setSelectedRole(role);
    setError(null);
    setResetSent(false);
  };

  // Member Sign In
  const handleMemberSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide your email and password.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Invalid credentials. Please verify your email and password.');
      return;
    }

    if (isOperationsApp) {
      // In operations app, redirect customer to member app
      window.location.href = 'http://localhost:3000';
    } else {
      navigate('/app', { replace: true });
    }
  };

  // Member Sign Up
  const handleMemberSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all registration fields.');
      return;
    }
    if (!agreeTerms) {
      setError('Please accept the membership terms and conditions.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const result = await register(name, email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Failed to create membership account.');
      return;
    }

    if (isOperationsApp) {
      window.location.href = 'http://localhost:3000';
    } else {
      navigate('/app', { replace: true });
    }
  };

  // Admin Sign In
  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your administrator email and password.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Invalid administrator credentials.');
      return;
    }

    if (!isOperationsApp) {
      // If signed in on Member app as Admin, can open Operations app
      window.location.href = 'http://localhost:3001/admin';
    } else {
      navigate('/admin', { replace: true });
    }
  };

  // Forgot Password
  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }
    setError(null);
    setResetSent(true);
  };

  return (
    <div className={`w-full ${heightClass} flex flex-col bg-[#1E1411] text-[#F3E7D5] relative font-sans selection:bg-[#C58A55] selection:text-white`}>
      {/* ========================================================================= */}
      {/* DESKTOP LEFT COLUMN: Immersive Coffee Brand Showcase (58%)                 */}
      {/* Mobile-only Member App: this brand showcase column never renders,        */}
      {/* login always stays in the single-column mobile layout below.            */}
      {/* ========================================================================= */}
      <div className="hidden min-h-screen relative overflow-hidden flex-col justify-between p-8 select-none border-r border-white/5">
        {/* Full-Bleed Cinematic Photography */}
        <img
          src="/auth-coffee-hero.jpg"
          alt="Artisanal Roastery Experience"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.78] contrast-[1.05] transition-transform duration-1000 scale-100"
        />

        {/* Cinematic Vignettes */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E1411] via-[#1E1411]/60 to-[#1E1411]/30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#1E1411]/20 to-[#1E1411]/80 pointer-events-none" />
        <div className="absolute inset-0 radial-gradient-vignette pointer-events-none" />

        {/* Top Brand Monogram */}
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-3.5 bg-black/40 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 shadow-xl">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C58A55] to-[#6F4E3D] flex items-center justify-center shadow-md">
              <Coffee className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <div className="text-left">
              <span className="font-editorial text-sm font-bold tracking-wider text-white uppercase block leading-tight">
                SOCIAL CUP
              </span>
              <span className="text-[10px] font-mono tracking-widest text-[#D6A36F] uppercase font-bold">
                Dallas Roasters Guild
              </span>
            </div>
          </div>
        </div>

        {/* Center Dynamic Brand Narrative Based on Role */}
        <div className="relative z-10 my-auto py-8 max-w-xl">
          {selectedRole === 'member' && (
            <div className="space-y-5 animate-fade-in-up">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#C58A55]/20 border border-[#C58A55]/35 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#D6A36F]" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#F3E7D5]">
                  Artisanal Coffee Pass
                </span>
              </div>

              <h1 className="font-editorial text-4xl lg:text-5xl xl:text-6xl font-bold text-white tracking-tight leading-[1.12]">
                Discover coffee. <br />
                Explore local cafes. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F3E7D5] via-[#E8D8C4] to-[#C58A55]">
                  One membership.
                </span>
              </h1>

              <p className="text-sm lg:text-base text-[#E8D8C4]/85 leading-relaxed max-w-lg font-light">
                Enjoy 30 cup credits each month across Dallas’s finest independent roasters. Redeem in seconds with your secure member QR pass.
              </p>

              {/* Member Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="flex items-start space-x-3 bg-black/35 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-[#C58A55]/25 flex items-center justify-center flex-shrink-0 text-[#D6A36F] border border-[#C58A55]/30">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Boutique Roasters</h3>
                    <p className="text-[11px] text-[#B9A28F] mt-0.5">Dallas’s top specialty cafes</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-black/35 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-[#C58A55]/25 flex items-center justify-center flex-shrink-0 text-[#D6A36F] border border-[#C58A55]/30">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Instant QR Pass</h3>
                    <p className="text-[11px] text-[#B9A28F] mt-0.5">Counter validation in seconds</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-black/35 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 sm:col-span-2">
                  <div className="w-8 h-8 rounded-xl bg-[#6F4E3D]/40 flex items-center justify-center flex-shrink-0 text-[#D6A36F] border border-white/10">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Personal Cupping Journal</h3>
                    <p className="text-[11px] text-[#B9A28F] mt-0.5">Log tasting notes, origin roasts, and ratings with each redemption</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedRole === 'admin' && (
            <div className="space-y-5 animate-fade-in-up">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#C58A55]/20 border border-[#C58A55]/35 backdrop-blur-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D6A36F]" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#F3E7D5]">
                  Operations Authority
                </span>
              </div>

              <h1 className="font-editorial text-4xl lg:text-5xl xl:text-6xl font-bold text-white tracking-tight leading-[1.12]">
                Management & <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F3E7D5] via-[#E8D8C4] to-[#C58A55]">
                  Financial Clearinghouse.
                </span>
              </h1>

              <p className="text-sm lg:text-base text-[#E8D8C4]/85 leading-relaxed max-w-lg font-light">
                Complete operational clearinghouse over partner roasteries, real-time redemption ledgers, credit valuations, and automated partner payouts.
              </p>

              {/* Admin Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="flex items-start space-x-3 bg-black/35 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-[#C58A55]/25 flex items-center justify-center flex-shrink-0 text-[#D6A36F] border border-[#C58A55]/30">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Live Audit Ledger</h3>
                    <p className="text-[11px] text-[#B9A28F] mt-0.5">Real-time cup verification</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-black/35 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-[#C58A55]/25 flex items-center justify-center flex-shrink-0 text-[#D6A36F] border border-[#C58A55]/30">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Roastery Directory</h3>
                    <p className="text-[11px] text-[#B9A28F] mt-0.5">Manage cafes, menus & rates</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-black/35 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 sm:col-span-2">
                  <div className="w-8 h-8 rounded-xl bg-[#6F4E3D]/40 flex items-center justify-center flex-shrink-0 text-[#D6A36F] border border-white/10">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Automated Clearinghouse</h3>
                    <p className="text-[11px] text-[#B9A28F] mt-0.5">Period clearinghouse, locked rates & CSV statement exports</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedRole === 'cafe' && (
            <div className="space-y-5 animate-fade-in-up">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#D6A36F]/20 border border-[#D6A36F]/35 backdrop-blur-sm">
                <Store className="w-3.5 h-3.5 text-[#D6A36F]" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#F3E7D5]">
                  Counter Operations
                </span>
              </div>

              <h1 className="font-editorial text-4xl lg:text-5xl xl:text-6xl font-bold text-white tracking-tight leading-[1.12]">
                Instant Redemptions. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F3E7D5] via-[#E8D8C4] to-[#D6A36F]">
                  Zero Credential Friction.
                </span>
              </h1>

              <p className="text-sm lg:text-base text-[#E8D8C4]/85 leading-relaxed max-w-lg font-light">
                Counter baristas quickly select their cafe, enter their confidential 4-digit station PIN, and scan member QR codes for immediate validation.
              </p>

              {/* Cafe Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="flex items-start space-x-3 bg-black/35 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-[#D6A36F]/25 flex items-center justify-center flex-shrink-0 text-[#D6A36F] border border-[#D6A36F]/30">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">QR Camera Scanner</h3>
                    <p className="text-[11px] text-[#B9A28F] mt-0.5">Live video stream & backup codes</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-black/35 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-[#537A5A]/30 flex items-center justify-center flex-shrink-0 text-[#74A87C] border border-[#537A5A]/40">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Live Balance Check</h3>
                    <p className="text-[11px] text-[#B9A28F] mt-0.5">Real-time credit verification</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-black/35 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 sm:col-span-2">
                  <div className="w-8 h-8 rounded-xl bg-[#6F4E3D]/40 flex items-center justify-center flex-shrink-0 text-[#D6A36F] border border-white/10">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Station 4-Digit PIN</h3>
                    <p className="text-[11px] text-[#B9A28F] mt-0.5">Fast counter access without cafe passwords</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Metadata */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#B9A28F] font-mono">
          <span>Dallas, Texas • Roasters Guild</span>
          <span>Platform Clearinghouse</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN STACK: Authentication Card - always the mobile single-column layout */}
      {/* ========================================================================= */}
      <div className={`w-full ${heightClass} bg-[#251814] flex flex-col justify-between relative overflow-y-auto scrollbar-thin`}>

        {/* TOP SECTION: Brand Header & Hero Visual */}
        <div className="flex flex-col">
          {/* Mobile Top Brand Bar */}
          <div className="p-4 bg-[#1E1411] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#C58A55] to-[#6F4E3D] flex items-center justify-center">
                <Coffee className="w-4 h-4 text-white stroke-[2.2]" />
              </div>
              <span className="font-editorial font-bold text-base tracking-wider uppercase text-white">
                Social Cup
              </span>
            </div>

            <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-[#C58A55]/20 text-[#D6A36F] border border-[#C58A55]/30">
              Dallas Roasters
            </span>
          </div>

          {/* Mobile Hero Visual */}
          <div className="relative h-44 w-full overflow-hidden">
            <img
              src="/auth-coffee-hero.jpg"
              alt="Social Cup Dallas"
              className="w-full h-full object-cover object-center filter brightness-[0.75]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#251814] via-[#251814]/40 to-black/30 pointer-events-none" />
            <div className="absolute bottom-3 left-4 right-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#D6A36F] font-bold block">
                {selectedRole === 'member' ? 'Customer Pass' : selectedRole === 'admin' ? 'Admin Console' : 'Counter Station'}
              </span>
              <h2 className="font-editorial text-2xl font-bold text-white tracking-tight leading-tight">
                {selectedRole === 'member'
                  ? 'Your Coffee Membership'
                  : selectedRole === 'admin'
                  ? 'Management Console'
                  : 'Cafe Operations'}
              </h2>
            </div>
          </div>
        </div>

        {/* AUTH CONTENT CONTAINER (Overlaps hero on mobile) */}
        <div className="relative z-10 w-full max-w-md mx-auto px-5 py-6 flex-1 flex flex-col justify-center -mt-6 bg-[#251814] rounded-t-[32px]">
          
          {/* Active Session Badge if User is Already Signed In */}
          {user && (
            <div className="mb-5 p-3.5 bg-[#1E1411] border border-[#C58A55]/40 rounded-2xl text-xs flex items-center justify-between gap-2 shadow-lg animate-fade-in-up">
              <div className="truncate">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#D6A36F] block font-bold">
                  Active Session ({user.role})
                </span>
                <span className="font-bold text-white truncate block">{user.name}</span>
                <span className="text-[10px] text-[#B9A28F] truncate block">{user.email}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (user.role === 'ADMIN') navigate('/admin');
                    else if (user.role === 'BARISTA') navigate('/cafe/select');
                    else navigate('/app');
                  }}
                  className="px-3 py-1.5 bg-[#C58A55] hover:bg-[#B37944] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-[#E8D8C4] hover:text-white rounded-xl text-xs transition-all"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Section Header - only ever shown alongside the (always-hidden) desktop brand column */}
          <div className="hidden mb-6 text-left">
            <span className="text-xs font-mono uppercase tracking-widest text-[#D6A36F] block mb-1.5 font-bold">
              {selectedRole === 'member'
                ? 'Member Experience'
                : selectedRole === 'admin'
                ? 'Management & Clearinghouse'
                : 'Partner Operations'}
            </span>
            <h2 className="font-editorial text-3xl lg:text-4xl font-bold text-white tracking-tight">
              {selectedRole === 'member'
                ? 'Your Coffee Membership'
                : selectedRole === 'admin'
                ? 'Management Console'
                : 'Cafe Operations'}
            </h2>
            <p className="text-xs sm:text-sm text-[#B9A28F] mt-1.5 leading-relaxed font-light">
              {selectedRole === 'member'
                ? 'Discover cafes, enjoy your favorite drinks, and redeem using your Social Cup credits.'
                : selectedRole === 'admin'
                ? 'Manage cafes, menus, memberships, and Social Cup operations.'
                : 'Select your cafe, unlock access, and verify customer coffee redemptions.'}
            </p>
          </div>

          {/* ========================================================================= */}
          {/* SEGMENTED ROLE SELECTOR: [ ☕ Member ] [ 🛡 Admin ] [ 🏪 Cafe User ]      */}
          {/* ========================================================================= */}
          <div className="mb-6 p-1 bg-[#1E1411] rounded-2xl border border-white/10 grid grid-cols-3 gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => handleRoleChange('member')}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all duration-200 cursor-pointer ${
                selectedRole === 'member'
                  ? 'bg-gradient-to-r from-[#C58A55] to-[#8C4A32] text-white shadow-md caramel-glow-sm scale-[1.02]'
                  : 'text-[#B9A28F] hover:text-[#F3E7D5] hover:bg-white/5'
              }`}
            >
              <Coffee className="w-3.5 h-3.5 flex-shrink-0 stroke-[2.2]" />
              <span className="truncate">Member</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all duration-200 cursor-pointer ${
                selectedRole === 'admin'
                  ? 'bg-gradient-to-r from-[#C58A55] to-[#8C4A32] text-white shadow-md caramel-glow-sm scale-[1.02]'
                  : 'text-[#B9A28F] hover:text-[#F3E7D5] hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 stroke-[2.2]" />
              <span className="truncate">Admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange('cafe')}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all duration-200 cursor-pointer ${
                selectedRole === 'cafe'
                  ? 'bg-gradient-to-r from-[#C58A55] to-[#8C4A32] text-white shadow-md caramel-glow-sm scale-[1.02]'
                  : 'text-[#B9A28F] hover:text-[#F3E7D5] hover:bg-white/5'
              }`}
            >
              <Store className="w-3.5 h-3.5 flex-shrink-0 stroke-[2.2]" />
              <span className="truncate">Cafe User</span>
            </button>
          </div>

          {/* Error Message Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center space-x-2 animate-fade-in-up">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ROLE VIEW: MEMBER EXPERIENCE                                              */}
          {/* ========================================================================= */}
          {selectedRole === 'member' && (
            <div className="space-y-4 animate-fade-in-up">
              {/* Member Sign In / Join Guild Tab Switcher */}
              {memberTab !== 'forgot' ? (
                <div className="flex p-1 bg-[#1E1411]/80 rounded-xl border border-white/10 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setMemberTab('login');
                      setError(null);
                    }}
                    className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                      memberTab === 'login'
                        ? 'bg-[#3A2720] text-white shadow-sm font-bold'
                        : 'text-[#B9A28F] hover:text-white'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMemberTab('register');
                      setError(null);
                    }}
                    className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                      memberTab === 'register'
                        ? 'bg-[#3A2720] text-white shadow-sm font-bold'
                        : 'text-[#B9A28F] hover:text-white'
                    }`}
                  >
                    Join Guild
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMemberTab('login');
                      setError(null);
                      setResetSent(false);
                    }}
                    className="text-xs text-[#D6A36F] hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <span>← Back to Sign In</span>
                  </button>
                  <span className="text-[10px] font-mono uppercase text-[#B9A28F] font-bold">
                    Password Reset
                  </span>
                </div>
              )}

              {/* TAB 1: Member Sign In Form */}
              {memberTab === 'login' && (
                <form onSubmit={handleMemberSignIn} className="space-y-3.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-mono uppercase font-bold text-[#E8D8C4] mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#B9A28F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="member@example.com"
                        className="w-full pl-10 pr-3.5 py-3 bg-black/40 rounded-xl border border-white/15 focus:border-[#C58A55] focus:outline-none focus:ring-1 focus:ring-[#C58A55]/30 text-white text-xs sm:text-sm placeholder-white/30 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-mono uppercase font-bold text-[#E8D8C4]">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMemberTab('forgot');
                          setError(null);
                        }}
                        className="text-[11px] text-[#D6A36F] hover:underline cursor-pointer"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#B9A28F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-3.5 py-3 bg-black/40 rounded-xl border border-white/15 focus:border-[#C58A55] focus:outline-none focus:ring-1 focus:ring-[#C58A55]/30 text-white text-xs sm:text-sm placeholder-white/30 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-[#C58A55] to-[#8C4A32] hover:from-[#B37944] hover:to-[#7B3F2A] text-white font-bold text-xs sm:text-sm shadow-lg caramel-glow-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing in as Member...</span>
                      </>
                    ) : (
                      <span>Sign In as Member</span>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 2: Member Sign Up Form */}
              {memberTab === 'register' && (
                <form onSubmit={handleMemberSignUp} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-mono uppercase font-bold text-[#E8D8C4] mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-[#B9A28F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Roaster"
                        className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-black/40 rounded-xl border border-white/15 focus:border-[#C58A55] focus:outline-none focus:ring-1 focus:ring-[#C58A55]/30 text-white text-xs sm:text-sm placeholder-white/30 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase font-bold text-[#E8D8C4] mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#B9A28F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jane@example.com"
                        className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-black/40 rounded-xl border border-white/15 focus:border-[#C58A55] focus:outline-none focus:ring-1 focus:ring-[#C58A55]/30 text-white text-xs sm:text-sm placeholder-white/30 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase font-bold text-[#E8D8C4] mb-1">
                      Create Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#B9A28F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-black/40 rounded-xl border border-white/15 focus:border-[#C58A55] focus:outline-none focus:ring-1 focus:ring-[#C58A55]/30 text-white text-xs sm:text-sm placeholder-white/30 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="terms-check"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 rounded border-white/20 bg-black/40 text-[#C58A55] focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="terms-check" className="text-[10px] text-[#B9A28F] leading-tight cursor-pointer">
                      I agree to the Social Cup Roasters Guild membership terms and community charter.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-[#C58A55] to-[#8C4A32] hover:from-[#B37944] hover:to-[#7B3F2A] text-white font-bold text-xs sm:text-sm shadow-lg caramel-glow-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Membership...</span>
                      </>
                    ) : (
                      <span>Join Social Cup Guild</span>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 3: Forgot Password */}
              {memberTab === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-3.5 pt-1">
                  {resetSent ? (
                    <div className="p-4 bg-black/40 border border-[#537A5A]/60 rounded-2xl text-center space-y-2">
                      <p className="text-xs font-bold text-emerald-300">Reset Link Dispatched</p>
                      <p className="text-[11px] text-[#B9A28F]">
                        If an account exists for {email}, a recovery link has been sent to your inbox.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setMemberTab('login');
                          setResetSent(false);
                        }}
                        className="mt-2 text-xs font-bold text-[#D6A36F] hover:underline cursor-pointer"
                      >
                        Return to Sign In
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-[#B9A28F]">
                        Enter your registered email and we'll send a password recovery link.
                      </p>
                      <div>
                        <label className="block text-[11px] font-mono uppercase font-bold text-[#E8D8C4] mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="member@example.com"
                          className="w-full px-3.5 py-3 bg-black/40 rounded-xl border border-white/15 focus:border-[#C58A55] focus:outline-none text-white text-xs sm:text-sm placeholder-white/30 transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-3.5 rounded-xl bg-[#C58A55] hover:bg-[#B37944] text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
                      >
                        Send Reset Instructions
                      </button>
                    </>
                  )}
                </form>
              )}

              {/* Secondary Actions: Guest Browse */}
              <div className="pt-3 text-center border-t border-white/10">
                <button
                  type="button"
                  onClick={() => navigate('/app')}
                  className="text-xs text-[#B9A28F] hover:text-[#D6A36F] transition-colors inline-flex items-center space-x-1 cursor-pointer font-medium"
                >
                  <span>Browse Dallas cafes as guest</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ROLE VIEW: ADMIN CONSOLE                                                  */}
          {/* ========================================================================= */}
          {selectedRole === 'admin' && (
            <div className="space-y-4 animate-fade-in-up">
              {/* Admin Scope Notice Card */}
              <div className="p-3.5 rounded-2xl bg-[#1E1411] border border-[#C58A55]/30 flex items-start space-x-3 shadow-md">
                <div className="w-9 h-9 rounded-xl bg-[#C58A55]/20 border border-[#C58A55]/40 flex items-center justify-center flex-shrink-0 text-[#D6A36F]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs sm:text-sm font-bold text-white">Management Console</span>
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#C58A55]/25 text-[#D6A36F] border border-[#C58A55]/30 font-bold">
                      Restricted
                    </span>
                  </div>
                  <p className="text-[11px] text-[#B9A28F] mt-0.5 leading-snug">
                    Access cafe rosters, drink menus, credit rates & clearinghouse settlement ledgers.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAdminSignIn} className="space-y-3.5 pt-1">
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-[#E8D8C4] mb-1">
                    Administrator Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#B9A28F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@socialcup.dev"
                      className="w-full pl-10 pr-3.5 py-3 bg-black/40 rounded-xl border border-white/15 focus:border-[#C58A55] focus:outline-none focus:ring-1 focus:ring-[#C58A55]/30 text-white text-xs sm:text-sm placeholder-white/30 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-[#E8D8C4] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#B9A28F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-3.5 py-3 bg-black/40 rounded-xl border border-white/15 focus:border-[#C58A55] focus:outline-none focus:ring-1 focus:ring-[#C58A55]/30 text-white text-xs sm:text-sm placeholder-white/30 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-[#C58A55] to-[#8C4A32] hover:from-[#B37944] hover:to-[#7B3F2A] text-white font-bold text-xs sm:text-sm shadow-lg caramel-glow-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating console...</span>
                    </>
                  ) : (
                    <span>Sign In to Admin Console</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ROLE VIEW: CAFE USER (BARISTA STATION)                                    */}
          {/* ========================================================================= */}
          {selectedRole === 'cafe' && (
            <div className="animate-fade-in-up">
              <CafeUserPicker />
            </div>
          )}
        </div>

        {/* BOTTOM FOOTER */}
        <div className="relative z-10 p-4 border-t border-white/10 text-center text-[11px] text-[#B9A28F]/70 font-mono">
          <span>Social Cup Roasters Guild • Dallas, Texas</span>
        </div>
      </div>
    </div>
  );
};
