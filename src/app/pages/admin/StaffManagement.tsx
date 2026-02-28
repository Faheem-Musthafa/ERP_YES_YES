import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
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

// Generate a strong random password
function generatePassword(length = 12): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '@#$!%&*';
    const all = uppercase + lowercase + numbers + special;

    // Ensure at least one of each required character type
    let pwd = [
        uppercase[Math.floor(Math.random() * uppercase.length)],
        lowercase[Math.floor(Math.random() * lowercase.length)],
        numbers[Math.floor(Math.random() * numbers.length)],
        special[Math.floor(Math.random() * special.length)],
    ];

    for (let i = 4; i < length; i++) {
        pwd.push(all[Math.floor(Math.random() * all.length)]);
    }

    // Shuffle
    return pwd.sort(() => Math.random() - 0.5).join('');
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
        const { data } = await supabase
            .from('users')
            .select('id, full_name, email, role, is_active, must_change_password, employee_id, created_at')
            .order('created_at', { ascending: false });
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
        <div>
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Users size={24} className="text-[#34b0a7]" />
                        <h1 className="text-2xl font-semibold text-gray-900">Staff Management</h1>
                    </div>
                    <p className="text-gray-600">Create and manage staff accounts</p>
                </div>
                <Button
                    onClick={() => { setCreateOpen(true); setForm({ full_name: '', email: '', role: '', employee_id: '' }); }}
                    className="bg-[#34b0a7] hover:bg-[#34b0a7]/90 text-white"
                >
                    <UserPlus size={18} className="mr-2" />Create Staff Account
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Staff', value: users.length },
                    { label: 'Active', value: users.filter(u => u.is_active).length },
                    { label: 'Inactive', value: users.filter(u => !u.is_active).length },
                    { label: 'Pending Password Change', value: users.filter(u => u.must_change_password).length },
                ].map((s, i) => (
                    <Card key={i} className="p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                    </Card>
                ))}
            </div>

            {/* Search */}
            <Card className="p-4 mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                        placeholder="Search by name, email or employee ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading staff...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Users size={48} className="text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No staff accounts yet</p>
                        <Button onClick={() => setCreateOpen(true)} className="mt-4 bg-[#34b0a7] hover:bg-[#34b0a7]/90">
                            <UserPlus size={18} className="mr-2" />Create First Account
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-left text-xs font-semibold text-gray-700 p-3">Staff Member</th>
                                    <th className="text-left text-xs font-semibold text-gray-700 p-3">Employee ID</th>
                                    <th className="text-center text-xs font-semibold text-gray-700 p-3">Role</th>
                                    <th className="text-center text-xs font-semibold text-gray-700 p-3">Status</th>
                                    <th className="text-center text-xs font-semibold text-gray-700 p-3">Pwd Changed</th>
                                    <th className="text-left text-xs font-semibold text-gray-700 p-3">Created</th>
                                    <th className="text-center text-xs font-semibold text-gray-700 p-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(u => (
                                    <tr key={u.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{u.full_name}</p>
                                                <p className="text-xs text-gray-500">{u.email}</p>
                                            </div>
                                        </td>
                                        <td className="p-3 text-sm text-gray-600 font-mono">{u.employee_id ?? '-'}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-700'}`}>
                                                {u.role === 'admin' && <Shield size={10} className="inline mr-1" />}{u.role}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {u.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            {u.must_change_password
                                                ? <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs font-medium">Pending</span>
                                                : <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Done</span>}
                                        </td>
                                        <td className="p-3 text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                                        <td className="p-3 text-center">
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
            </Card>

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
                            className="bg-[#34b0a7] hover:bg-[#34b0a7]/90"
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
                        <Button onClick={() => { setSuccessOpen(false); setCopied(false); setPasswordVisible(false); }} className="bg-[#34b0a7] hover:bg-[#34b0a7]/90">
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
