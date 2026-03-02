import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/app/components/ui/dialog';
import { Search, Plus, Copy, Check, UserPlus, Eye, EyeOff, Shield, Users, Trash2 } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { toast } from 'sonner';

const ROLES = [
    { value: 'sales', label: 'Sales' },
    { value: 'accounts', label: 'Accounts' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'procurement', label: 'Procurement' },
];

const ROLE_COLORS: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    sales: 'bg-teal-100 text-teal-700',
    accounts: 'bg-green-100 text-green-700',
    inventory: 'bg-teal-100 text-teal-700',
    procurement: 'bg-pink-100 text-pink-700',
};

// Generate a cryptographically secure random password
function generatePassword(length = 12): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '@#$!%&*';
    const all = uppercase + lowercase + numbers + special;

    // Guarantee at least one of each required character class
    const rand4 = crypto.getRandomValues(new Uint32Array(4));
    const required = [
        uppercase[rand4[0] % uppercase.length],
        lowercase[rand4[1] % lowercase.length],
        numbers[rand4[2] % numbers.length],
        special[rand4[3] % special.length],
    ];

    const restRand = crypto.getRandomValues(new Uint32Array(length - 4));
    const rest = Array.from(restRand, n => all[n % all.length]);

    const pwd = [...required, ...rest];

    // Fisher-Yates shuffle with crypto random values
    const shuffleRand = crypto.getRandomValues(new Uint32Array(pwd.length));
    for (let i = pwd.length - 1; i > 0; i--) {
        const j = shuffleRand[i] % (i + 1);
        [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
    }

    return pwd.join('');
}

export const StaffManagement = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Create dialog state
    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ full_name: '', email: '', role: '', employee_id: '' });

    // Success dialog state
    const [successOpen, setSuccessOpen] = useState(false);
    const [createdUser, setCreatedUser] = useState<{ name: string; email: string; password: string } | null>(null);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [copied, setCopied] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('users')
            .select('id, full_name, email, role, is_active, must_change_password, employee_id, created_at')
            .order('created_at', { ascending: false });
        if (error) toast.error('Failed to load staff: ' + error.message);
        setUsers(data ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleCreate = async () => {
        if (!form.full_name.trim() || !form.email.trim() || !form.role) {
            toast.error('Please fill in all required fields');
            return;
        }
        setCreating(true);

        const generatedPassword = generatePassword(12);

        try {
            const { data: result, error: fnError } = await supabase.functions.invoke('invite-user', {
                body: {
                    email: form.email.trim().toLowerCase(),
                    full_name: form.full_name.trim(),
                    role: form.role,
                    password: generatedPassword,
                    employee_id: form.employee_id.trim() || null,
                },
            });

            if (fnError || result?.error) throw new Error(result?.error || fnError?.message || 'Failed to create user');

            setCreatedUser({ name: form.full_name, email: form.email, password: generatedPassword });
            setCreateOpen(false);
            setSuccessOpen(true);
            setForm({ full_name: '', email: '', role: '', employee_id: '' });
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message || 'Failed to create user');
        } finally {
            setCreating(false);
        }

    };

    const handleCopyPassword = () => {
        if (createdUser) {
            navigator.clipboard.writeText(createdUser.password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleToggleActive = async (u: any) => {
        const { error } = await supabase
            .from('users')
            .update({ is_active: !u.is_active })
            .eq('id', u.id);
        if (error) toast.error(error.message);
        else { toast.success(`${u.full_name} ${!u.is_active ? 'activated' : 'deactivated'}`); fetchUsers(); }
    };

    const handleDeleteStaff = async (u: any) => {
        if (u.role === 'admin') { toast.error('Cannot delete admin accounts'); return; }
        if (!window.confirm(`Delete "${u.full_name}" permanently? This cannot be undone.`)) return;
        const { error } = await supabase.from('users').delete().eq('id', u.id);
        if (error) toast.error('Failed to delete staff');
        else { toast.success('Staff account deleted'); fetchUsers(); }
    };

    const filtered = users.filter(u =>
        !search ||
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.employee_id ?? '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Staff Management</h1>
                    <p className="text-gray-500 mt-1 text-sm">Create and manage staff accounts</p>
                </div>
                <Button
                    onClick={() => { setCreateOpen(true); setForm({ full_name: '', email: '', role: '', employee_id: '' }); }}
                    className="bg-[#34b0a7] hover:bg-[#2a9d94] text-white rounded-xl"
                >
                    <UserPlus size={18} className="mr-2" />Create Staff Account
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Staff', value: users.length, border: 'border-l-4 border-l-teal-500' },
                    { label: 'Active', value: users.filter(u => u.is_active).length, border: 'border-l-4 border-l-emerald-500' },
                    { label: 'Inactive', value: users.filter(u => !u.is_active).length, border: 'border-l-4 border-l-gray-300' },
                    { label: 'Pending Password Change', value: users.filter(u => u.must_change_password).length, border: 'border-l-4 border-l-amber-500' },
                ].map((s, i) => (
                    <div key={i} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center ${s.border}`}>
                        <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                        <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                    placeholder="Search by name, email or employee ID..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10 rounded-xl"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="w-8 h-8 border-4 border-[#34b0a7] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Users size={48} className="text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 text-sm">No staff accounts yet</p>
                        <Button onClick={() => setCreateOpen(true)} className="mt-4 bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl">
                            <UserPlus size={18} className="mr-2" />Create First Account
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Staff Member</th>
                                    <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Employee ID</th>
                                    <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Role</th>
                                    <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Status</th>
                                    <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Pwd Changed</th>
                                    <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Created</th>
                                    <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-semibold text-gray-900">{u.full_name}</p>
                                                <p className="text-xs text-gray-500">{u.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{u.employee_id ?? '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-700'}`}>
                                                {u.role === 'admin' && <Shield size={10} className="inline mr-1" />}{u.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {u.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {u.must_change_password
                                                ? <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">Pending</span>
                                                : <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">Done</span>}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleToggleActive(u)}
                                                    className={`h-8 text-xs ${u.is_active
                                                        ? 'text-red-600 border-red-200 hover:bg-red-50'
                                                        : 'text-green-600 border-green-200 hover:bg-green-50'}`}
                                                    disabled={u.role === 'admin'}
                                                >
                                                    {u.is_active ? 'Deactivate' : 'Activate'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDeleteStaff(u)}
                                                    className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                                                    disabled={u.role === 'admin'}
                                                    title={u.role === 'admin' ? 'Cannot delete admin' : 'Delete permanently'}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create User Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus size={20} className="text-[#34b0a7]" />Create Staff Account
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Full Name *</Label>
                            <Input
                                value={form.full_name}
                                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                                placeholder="e.g. Rahul Sharma"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email Address *</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                placeholder="e.g. rahul@yesyes.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Role *</Label>
                            <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                                <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                                <SelectContent>
                                    {ROLES.map(r => (
                                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Employee ID <span className="text-gray-400 text-xs">(optional)</span></Label>
                            <Input
                                value={form.employee_id}
                                onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                                placeholder="e.g. EMP-001"
                            />
                        </div>
                        <p className="text-xs text-gray-500 bg-teal-50 border border-teal-100 rounded p-3">
                            A secure auto-generated password will be created. Share it with the staff member — they'll be prompted to change it on first login.
                        </p>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleCreate}
                            className="bg-[#34b0a7] hover:bg-[#2a9d94]"
                            disabled={creating}
                        >
                            {creating ? 'Creating...' : 'Create Account'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Success / Credentials Dialog */}
            <Dialog open={successOpen} onOpenChange={open => { if (!open) { setSuccessOpen(false); setCopied(false); setPasswordVisible(false); } }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-700">
                            <Check size={20} />Account Created Successfully
                        </DialogTitle>
                    </DialogHeader>
                    {createdUser && (
                        <div className="space-y-4 py-2">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                                <div>
                                    <p className="text-xs text-gray-500">Name</p>
                                    <p className="font-medium text-gray-900">{createdUser.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Email</p>
                                    <p className="font-medium text-gray-900">{createdUser.email}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Temporary Password</p>
                                    <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                                        <code className="flex-1 font-mono text-sm tracking-wider">
                                            {passwordVisible ? createdUser.password : 'â€¢'.repeat(createdUser.password.length)}
                                        </code>
                                        <button onClick={() => setPasswordVisible(v => !v)} className="text-gray-400 hover:text-gray-700">
                                            {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                        <button
                                            onClick={handleCopyPassword}
                                            className={`transition-colors ${copied ? 'text-green-600' : 'text-gray-400 hover:text-gray-700'}`}
                                        >
                                            {copied ? <Check size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded p-3">
                                âš ï¸ Save this password now — it won't be shown again. The staff member will be required to change it on first login.
                            </p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => { setSuccessOpen(false); setCopied(false); setPasswordVisible(false); }} className="bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl">
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
