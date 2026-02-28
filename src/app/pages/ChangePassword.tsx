import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import { Lock, Check, X, Eye, EyeOff } from 'lucide-react';

interface CheckItem {
    label: string;
    test: (p: string) => boolean;
}

const CHECKS: CheckItem[] = [
    { label: 'At least 8 characters', test: p => p.length >= 8 },
    { label: 'One uppercase letter (A-Z)', test: p => /[A-Z]/.test(p) },
    { label: 'One lowercase letter (a-z)', test: p => /[a-z]/.test(p) },
    { label: 'One number (0-9)', test: p => /\d/.test(p) },
    { label: 'One special character (@#$!%&*)', test: p => /[@#$!%&*]/.test(p) },
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

            const { error: profileError } = await supabase
                .from('users')
                .update({ must_change_password: false })
                .eq('id', user?.id);
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
        <div className="min-h-screen bg-gradient-to-br from-[#34b0a7] to-[#1e40af] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
                        <Lock size={28} className="text-[#34b0a7]" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Change Your Password</h1>
                    <p className="text-teal-200 mt-2 text-sm">
                        Welcome, <strong>{user?.full_name}</strong>! Set a new password to continue.
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* New Password */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700">New Password</label>
                            <div className="relative">
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#34b0a7]/30 focus:border-[#34b0a7] text-sm transition-all"
                                    autoComplete="new-password"
                                    autoFocus
                                />
                                <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Checklist */}
                        {newPassword.length > 0 && (
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Password Requirements</p>
                                {checks.map((c, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${c.passed ? 'bg-green-500' : 'bg-gray-200'}`}>
                                            {c.passed ? <Check size={11} className="text-white" strokeWidth={3} /> : <X size={11} className="text-gray-400" strokeWidth={3} />}
                                        </div>
                                        <span className={`text-xs ${c.passed ? 'text-green-700 font-medium' : 'text-gray-500'}`}>{c.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Confirm Password */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter your password"
                                    className={`w-full px-4 py-3 pr-12 rounded-xl border focus:outline-none focus:ring-2 text-sm transition-all ${confirmPassword.length > 0
                                            ? passwordsMatch
                                                ? 'border-green-400 focus:ring-green-200 focus:border-green-500 bg-green-50'
                                                : 'border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50'
                                            : 'border-gray-200 focus:ring-[#34b0a7]/30 focus:border-[#34b0a7]'
                                        }`}
                                    autoComplete="new-password"
                                />
                                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {confirmPassword.length > 0 && (
                                <p className={`text-xs font-medium ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                                    {passwordsMatch ? 'âœ“ Passwords match' : 'âœ— Passwords do not match'}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={!canSubmit || saving}
                            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all bg-[#34b0a7] hover:bg-[#1e40af] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        >
                            {saving ? 'Saving...' : 'Set New Password & Continue'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
