import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import { Lock, Check, X, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';

interface CheckItem {
    label: string;
    test: (p: string) => boolean;
}

const CHECKS: CheckItem[] = [
    { label: 'At least 8 characters', test: p => p.length >= 8 },
    { label: 'One uppercase letter (A-Z)', test: p => /[A-Z]/.test(p) },
    { label: 'One lowercase letter (a-z)', test: p => /[a-z]/.test(p) },
    { label: 'One number (0-9)', test: p => /\d/.test(p) },
    { label: 'One special character', test: p => /[^a-zA-Z0-9\s]/.test(p) },
];

export const ChangePassword = () => {
    const navigate = useNavigate();
    const { user, refreshProfile } = useAuth();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [saving, setSaving] = useState(false);

    const checks = CHECKS.map(c => ({ ...c, passed: c.test(newPassword) }));
    const allPassed = checks.every(c => c.passed);
    const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
    const canSubmit = allPassed && passwordsMatch;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSaving(true);
        try {
            const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword });
            if (pwdError) throw pwdError;

            if (!user?.id) throw new Error('User session expired. Please log in again.');

            const { error: profileError } = await supabase
                .from('users')
                .update({ must_change_password: false })
                .eq('id', user.id);
            if (profileError) throw profileError;

            await refreshProfile();
            toast.success('Password updated successfully! Welcome aboard.');
            navigate('/');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update password');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-cyan-50 flex items-center justify-center p-4">
            <div className="w-full max-w-xl panel-surface-strong p-8 space-y-6">
                <div className="flex items-start gap-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                        <Lock size={22} className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Welcome, <strong>{user?.full_name}</strong>. Update your password to continue using the ERP.
                        </p>
                    </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 flex items-start gap-2">
                    <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                    <span>This action updates your login credentials immediately. Keep your password secure and do not share it.</span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                        <Label>New Password</Label>
                        <div className="relative">
                            <Input
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                className="h-11 pr-12"
                                autoComplete="new-password"
                                autoFocus
                            />
                            <button type="button" onClick={() => setShowNew(v => !v)} aria-label={showNew ? 'Hide new password' : 'Show new password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {newPassword.length > 0 && (
                        <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Password Requirements</p>
                            {checks.map((c, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${c.passed ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                                        {c.passed ? <Check size={11} className="text-white" strokeWidth={3} /> : <X size={11} className="text-gray-400" strokeWidth={3} />}
                                    </div>
                                    <span className={`text-xs ${c.passed ? 'text-emerald-700 font-medium' : 'text-muted-foreground'}`}>{c.label}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label>Confirm Password</Label>
                        <div className="relative">
                            <Input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter your password"
                                className={`h-11 pr-12 ${confirmPassword.length > 0
                                    ? passwordsMatch
                                        ? 'border-green-400 focus-visible:ring-green-200 bg-green-50'
                                        : 'border-red-300 focus-visible:ring-red-200 bg-red-50'
                                    : ''}`}
                                autoComplete="new-password"
                            />
                            <button type="button" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {confirmPassword.length > 0 && (
                            <p className={`text-xs font-medium ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                                {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                            </p>
                        )}
                    </div>

                    <div className="border-t border-border pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-xs text-muted-foreground">Must include uppercase, lowercase, number, and special character.</p>
                        <Button type="submit" disabled={!canSubmit || saving} className="w-full sm:w-auto min-w-[220px]">
                            {saving ? 'Saving...' : 'Set New Password & Continue'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
