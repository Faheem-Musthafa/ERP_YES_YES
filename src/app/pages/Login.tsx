import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/app/contexts/AuthContext';
import { supabase } from '@/app/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { LogIn, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error('Enter your email address first, then click Forgot password.');
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/change-password`,
      });
      if (error) throw error;
      toast.success('Password reset email sent. Check your inbox.');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to send reset email. Try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Invalid email or password');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans">
      {/* Subtle background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-400/10 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />

      <div className="w-full max-w-[420px] relative z-10">
        <div className="bg-white/80 backdrop-blur-xl rounded-[24px] shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-white/80 p-8 sm:p-10">

          <div className="mb-8 text-center flex flex-col items-center">
            <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5">
              <LogIn className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Enter your credentials to access the ERP
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 flex flex-col">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-700 ml-1">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@yesyes.com"
                required
                className="w-full h-12 px-4 text-sm bg-slate-50/50 border-slate-200 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline underline-offset-4 transition-all focus:outline-none disabled:opacity-50"
                >
                  {resetLoading ? 'Sending…' : 'Forgot password?'}
                </button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-12 px-4 text-sm bg-slate-50/50 border-slate-200 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all rounded-xl"
              />
            </div>

            {error && (
              <div className="p-3 mt-2 text-sm text-red-600 bg-red-50/80 border border-red-100/80 rounded-xl flex items-start gap-2 animate-in fade-in zoom-in-95 duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0 text-red-500/80">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-4 text-[15px] font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-900/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group flex items-center justify-center border border-slate-800"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-white/70" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 ml-1.5 opacity-70 group-hover:translate-x-1 transition-transform">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 font-medium">
              Don't have an account?{' '}
              <span className="font-semibold text-slate-700">Contact your administrator.</span>
            </p>
          </div>
        </div>

        {/* Footer branding */}
        <div className="mt-8 text-center flex flex-col items-center justify-center">
          <p className="text-xs font-bold tracking-wider text-slate-400">YES YES MARKETING</p>
        </div>
      </div>
    </div>
  );
};
