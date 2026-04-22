import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/app/contexts/AuthContext';
import { supabase } from '@/app/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cloneCompanyProfiles, getPrimaryCompanyName, loadCompanyProfiles } from '@/app/companyProfiles';
import { LIMITS, sanitizeEmail, validateEmail, validateRequired } from '@/app/validation';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f0fffe 0%, #e6f7f6 40%, #f5f7fa 100%)' }}
    >
      {/* Ambient glow blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-30 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #34b0a7, transparent)' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-[100px]"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-black/5 border border-white ring-1 ring-black/5 p-8">

          {/* Brand mark */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #3bbfb6, #2a9d94)' }}
            >
              <img src="/logo.jpg" alt={primaryCompanyName} className="w-8 h-8 object-contain rounded-lg" />
            </div>
            <h1 className="text-xl font-bold text-[#0d1117] tracking-tight">Welcome back</h1>
            <p className="text-sm text-[#6b7a8d] mt-1">Sign in to {primaryCompanyName} ERP</p>
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
                className="h-11 bg-[#f5f7fa] border-[#dde2ea] focus:border-[#34b0a7] focus:ring-2 focus:ring-[#34b0a7]/20 transition-all rounded-xl text-sm"
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
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                maxLength={LIMITS.password}
                autoComplete="current-password"
                className="h-11 bg-[#f5f7fa] border-[#dde2ea] focus:border-[#34b0a7] focus:ring-2 focus:ring-[#34b0a7]/20 transition-all rounded-xl text-sm"
              />
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
              className="w-full h-11 text-sm font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-70 gap-2 group"
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

        <p className="text-center text-[10px] font-bold tracking-widest text-[#6b7a8d] mt-6 uppercase">
          {primaryCompanyName} · ERP
        </p>
      </div>
    </div>
  );
};
