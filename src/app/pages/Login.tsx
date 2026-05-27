import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/app/contexts/AuthContext';
import { supabase } from '@/app/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Loader2, ArrowRight, AlertCircle, Eye, EyeOff, ShieldCheck, Zap, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { cloneCompanyProfiles, getPrimaryCompanyName, loadCompanyProfiles } from '@/app/companyProfiles';
import { LIMITS, sanitizeEmail, validateEmail, validateRequired } from '@/app/validation';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);
  const [companyProfiles, setCompanyProfiles] = useState(cloneCompanyProfiles());
  const { login } = useAuth();
  const navigate = useNavigate();
  const primaryCompanyName = getPrimaryCompanyName(companyProfiles);

  React.useEffect(() => {
    void loadCompanyProfiles()
      .then(setCompanyProfiles)
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    if (resetCooldown <= 0) return;
    const timer = window.setTimeout(() => setResetCooldown(v => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resetCooldown]);

  const handleForgotPassword = async () => {
    const normalizedEmail = sanitizeEmail(email);
    if (!normalizedEmail) { toast.error('Enter your email address first, then click Forgot password.'); return; }
    if (resetCooldown > 0) {
      toast.error(`Please wait ${resetCooldown}s before requesting another reset link.`);
      return;
    }
    setResetLoading(true);
    try {
      validateEmail(normalizedEmail);
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/change-password`,
      });
      if (error) throw error;
      setResetCooldown(45);
      toast.success('If your account exists, a password reset link has been sent to your inbox.');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to send reset email.');
    } finally { setResetLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    let normalizedEmail = '';
    try {
      normalizedEmail = sanitizeEmail(email);
      validateRequired(normalizedEmail, 'Email');
      validateEmail(normalizedEmail);
      validateRequired(password, 'Password');
      setEmail(normalizedEmail);
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password');
      return;
    }
    setLoading(true);
    try {
      const result = await login(normalizedEmail, password);
      if (result.success) navigate('/');
      else setError(result.error || 'Invalid email or password');
    } catch { setError('Login failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-[#f5f7fa]">
      {/* LEFT — Brand / marketing panel (desktop only) */}
      <div
        className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 text-white"
        style={{ background: 'linear-gradient(135deg, #0f4a45 0%, #1f7a72 45%, #2a9d94 100%)' }}
      >
        <div className="absolute top-[-15%] left-[-10%] w-[480px] h-[480px] rounded-full opacity-40 blur-[120px]"
          style={{ background: 'radial-gradient(circle, #6ee7df, transparent)' }} />
        <div className="absolute bottom-[-20%] right-[-15%] w-[520px] h-[520px] rounded-full opacity-30 blur-[140px]"
          style={{ background: 'radial-gradient(circle, #34d399, transparent)' }} />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/25 flex items-center justify-center">
            <img src="/logo.jpg" alt={primaryCompanyName} className="w-7 h-7 object-contain rounded-lg" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide">{primaryCompanyName}</p>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase opacity-80">Enterprise ERP</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Run sales, inventory and accounts from one control room.
          </h2>
          <p className="text-sm leading-relaxed text-white/80">
            Real-time stock, live receivables, and one-tap order entry — built for the {primaryCompanyName} team.
          </p>
          <div className="grid gap-3 pt-2">
            <Feature icon={<Zap size={14} />} label="One-tap order creation & receipts" />
            <Feature icon={<BarChart3 size={14} />} label="Live collection & stock dashboards" />
            <Feature icon={<ShieldCheck size={14} />} label="Role-based access · audit trail" />
          </div>
        </div>

        <p className="relative z-10 text-[10px] font-bold tracking-[0.2em] uppercase text-white/60">
          © {new Date().getFullYear()} {primaryCompanyName}
        </p>
      </div>

      {/* RIGHT — Form panel */}
      <div className="relative flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-hidden">
        {/* Mobile-only ambient blobs */}
        <div className="lg:hidden absolute top-[-15%] left-[-20%] w-[420px] h-[420px] rounded-full opacity-25 blur-[100px]"
          style={{ background: 'radial-gradient(circle, #34b0a7, transparent)' }} />
        <div className="lg:hidden absolute bottom-[-20%] right-[-20%] w-[380px] h-[380px] rounded-full opacity-20 blur-[100px]"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />

        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile brand mark */}
          <div className="lg:hidden flex flex-col items-center mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-teal-500/20"
              style={{ background: 'linear-gradient(135deg, #3bbfb6, #2a9d94)' }}
            >
              <img src="/logo.jpg" alt={primaryCompanyName} className="w-9 h-9 object-contain rounded-lg" />
            </div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#6b7a8d]">{primaryCompanyName} · ERP</p>
          </div>

          <div className="bg-white/95 lg:bg-white backdrop-blur-xl rounded-3xl shadow-xl shadow-black/5 border border-white/80 ring-1 ring-black/[0.04] p-6 sm:p-8 lg:p-10">
            <div className="mb-7">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0d1117] tracking-tight">Welcome back</h1>
              <p className="text-sm text-[#6b7a8d] mt-1.5">Sign in to continue to your dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-[#0d1117] uppercase tracking-wide">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(sanitizeEmail(e.target.value))}
                  placeholder="name@company.com"
                  required
                  maxLength={LIMITS.email}
                  autoComplete="email"
                  inputMode="email"
                  className="h-12 bg-[#f5f7fa] border-[#dde2ea] focus:border-[#34b0a7] focus:ring-2 focus:ring-[#34b0a7]/20 transition-all rounded-xl text-base sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-[#0d1117] uppercase tracking-wide">
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetLoading || resetCooldown > 0}
                    className="text-xs font-medium text-[#34b0a7] hover:text-[#2a9d94] transition-colors underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {resetLoading ? 'Sending…' : resetCooldown > 0 ? `Resend in ${resetCooldown}s` : 'Forgot password?'}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    maxLength={LIMITS.password}
                    autoComplete="current-password"
                    className="h-12 pr-12 bg-[#f5f7fa] border-[#dde2ea] focus:border-[#34b0a7] focus:ring-2 focus:ring-[#34b0a7]/20 transition-all rounded-xl text-base sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 w-12 inline-flex items-center justify-center text-[#6b7a8d] hover:text-[#0d1117] active:text-[#34b0a7] transition-colors rounded-r-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34b0a7]/30"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200/80 rounded-xl">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-sm font-semibold rounded-xl shadow-md shadow-teal-500/20 transition-all active:scale-[0.98] disabled:opacity-70 gap-2 group"
                style={{ background: loading ? '#34b0a7' : 'linear-gradient(135deg, #3bbfb6, #2a9d94)', color: '#fff' }}
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Signing in...</>
                ) : (
                  <>Sign in <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <p className="text-xs text-[#6b7a8d]">
                Need access?{' '}
                <span className="font-semibold text-[#0d1117]">Contact your administrator.</span>
              </p>
            </div>
          </div>

          <p className="lg:hidden text-center text-[10px] font-bold tracking-[0.2em] text-[#6b7a8d] mt-5 uppercase">
            Secure · Encrypted · v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

const Feature = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-3 text-sm">
    <span className="w-7 h-7 rounded-lg bg-white/15 ring-1 ring-white/25 inline-flex items-center justify-center backdrop-blur-md">
      {icon}
    </span>
    <span className="text-white/90">{label}</span>
  </div>
);
