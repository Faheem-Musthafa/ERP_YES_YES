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
import { Plus, Copy, Check, UserPlus, Eye, EyeOff, Shield, Trash2 } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { toast } from 'sonner';
import {
    PageHeader, SearchBar, DataCard,
    StyledThead, StyledTh, StyledTr, StyledTd,
    EmptyState, Spinner, StatusBadge, IconBtn,
} from '@/app/components/ui/primitives';

const ROLES = [
    { value: 'sales', label: 'Sales' },
    { value: 'accounts', label: 'Accounts' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'procurement', label: 'Procurement' },
];

const ROLE_STYLES: Record<string, string> = {
    admin: 'bg-violet-50 text-violet-700 border border-violet-200',
    sales: 'bg-teal-50 text-teal-700 border border-teal-200',
    accounts: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    inventory: 'bg-sky-50 text-sky-700 border border-sky-200',
    procurement: 'bg-rose-50 text-rose-700 border border-rose-200',
};

function generatePassword(length = 12): string {
    const u = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', l = 'abcdefghijklmnopqrstuvwxyz',
        n = '0123456789', s = '@#$!%&*', all = u + l + n + s;
    const rand4 = crypto.getRandomValues(new Uint32Array(4));
    const required = [u[rand4[0] % u.length], l[rand4[1] % l.length], n[rand4[2] % n.length], s[rand4[3] % s.length]];
    const rest = Array.from(crypto.getRandomValues(new Uint32Array(length - 4)), x => all[x % all.length]);
    const pwd = [...required, ...rest];
    const sh = crypto.getRandomValues(new Uint32Array(pwd.length));
    for (let i = pwd.length - 1; i > 0; i--) { const j = sh[i] % (i + 1);[pwd[i], pwd[j]] = [pwd[j], pwd[i]]; }
    return pwd.join('');
}

export const StaffManagement = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ full_name: '', email: '', role: '', employee_id: '' });
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
            toast.error('Please fill in all required fields'); return;
        }
        setCreating(true);
        const generatedPassword = generatePassword(12);
        try {
            const { data: result, error: fnError } = await supabase.functions.invoke('invite-user', {
                body: {
                    email: form.email.trim().toLowerCase(), full_name: form.full_name.trim(),
                    role: form.role, password: generatedPassword, employee_id: form.employee_id.trim() || null,
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
        } finally { setCreating(false); }
    };

    const handleCopyPassword = () => {
        if (createdUser) {
            navigator.clipboard.writeText(createdUser.password);
            setCopied(true); setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleToggleActive = async (u: any) => {
        const { error } = await supabase.from('users').update({ is_active: !u.is_active }).eq('id', u.id);
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

    const stats = [
        { label: 'Total', value: users.length, color: 'text-primary' },
        { label: 'Active', value: users.filter(u => u.is_active).length, color: 'text-emerald-600' },
        { label: 'Inactive', value: users.filter(u => !u.is_active).length, color: 'text-muted-foreground' },
        { label: 'Pwd Pending', value: users.filter(u => u.must_change_password).length, color: 'text-amber-600' },
    ];

    return (
        <div className="space-y-5">
            <PageHeader
                title="Team Management"
                subtitle="Create and manage staff accounts"
                actions={
                    <Button
                        size="sm"
                        onClick={() => { setCreateOpen(true); setForm({ full_name: '', email: '', role: '', employee_id: '' }); }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                    >
                        <UserPlus size={15} /> Create Staff Account
                    </Button>
                }
            />

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stats.map(s => (
                    <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
                        <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            <SearchBar
                placeholder="Search by name, email or employee ID..."
                value={search}
                onChange={setSearch}
                className="max-w-sm"
            />

            <DataCard>
                {loading ? <Spinner /> :
                    filtered.length === 0 ? (
                        <EmptyState icon={UserPlus} message="No staff accounts" sub="Create your first staff account to get started" />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <StyledThead>
                                    <tr>
                                        <StyledTh>Staff Member</StyledTh>
                                        <StyledTh>Employee ID</StyledTh>
                                        <StyledTh>Role</StyledTh>
                                        <StyledTh>Status</StyledTh>
                                        <StyledTh>Pwd Changed</StyledTh>
                                        <StyledTh>Joined</StyledTh>
                                        <StyledTh right>Actions</StyledTh>
                                    </tr>
                                </StyledThead>
                                <tbody>
                                    {filtered.map(u => (
                                        <StyledTr key={u.id}>
                                            <StyledTd>
                                                <div>
                                                    <p className="font-semibold text-foreground">{u.full_name}</p>
                                                    <p className="text-xs text-muted-foreground">{u.email}</p>
                                                </div>
                                            </StyledTd>
                                            <StyledTd mono className="text-muted-foreground">{u.employee_id ?? '—'}</StyledTd>
                                            <StyledTd>
                                                {u.role === 'admin' ? (
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ROLE_STYLES.admin}`}>
                                                        <Shield size={9} /> admin
                                                    </span>
                                                ) : (
                                                    <Select
                                                        value={u.role}
                                                        onValueChange={async (newRole) => {
                                                            const { error } = await supabase.from('users').update({ role: newRole }).eq('id', u.id);
                                                            if (error) toast.error('Failed to update role');
                                                            else { toast.success('Role updated'); fetchUsers(); }
                                                        }}
                                                    >
                                                        <SelectTrigger className={`h-7 w-28 text-[10px] font-semibold rounded-full px-2.5 border ${ROLE_STYLES[u.role] ?? ''}`}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {ROLES.map(r => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </StyledTd>
                                            <StyledTd><StatusBadge status={u.is_active ? 'Active' : 'Inactive'} /></StyledTd>
                                            <StyledTd>
                                                <StatusBadge status={u.must_change_password ? 'Pending' : 'Approved'} />
                                            </StyledTd>
                                            <StyledTd mono className="text-xs text-muted-foreground">
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </StyledTd>
                                            <StyledTd right>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleToggleActive(u)}
                                                        disabled={u.role === 'admin'}
                                                        className={`h-6 text-[10px] px-2 rounded-full ${u.is_active
                                                            ? 'text-red-600 border-red-200 hover:bg-red-50'
                                                            : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
                                                    >
                                                        {u.is_active ? 'Deactivate' : 'Activate'}
                                                    </Button>
                                                    <IconBtn
                                                        onClick={() => handleDeleteStaff(u)}
                                                        title={u.role === 'admin' ? 'Cannot delete admin' : 'Delete'}
                                                        danger
                                                    >
                                                        <Trash2 size={13} />
                                                    </IconBtn>
                                                </div>
                                            </StyledTd>
                                        </StyledTr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                }
            </DataCard>

            {/* Create Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                <UserPlus size={15} className="text-primary" />
                            </div>
                            Create Staff Account
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Full Name <span className="text-destructive">*</span></Label>
                            <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Rahul Sharma" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Email Address <span className="text-destructive">*</span></Label>
                            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. rahul@yesyes.com" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Role <span className="text-destructive">*</span></Label>
                            <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                                <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                                <SelectContent>
                                    {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Employee ID <span className="text-muted-foreground">(optional)</span></Label>
                            <Input value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} placeholder="e.g. EMP-001" />
                        </div>
                        <div className="p-3 bg-primary/5 border border-primary/15 rounded-lg">
                            <p className="text-xs text-muted-foreground">
                                A secure auto-generated password will be created and shown after account creation.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={creating}>
                            {creating ? 'Creating...' : 'Create Account'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Credentials Dialog */}
            <Dialog open={successOpen} onOpenChange={open => { if (!open) { setSuccessOpen(false); setCopied(false); setPasswordVisible(false); } }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Check size={14} className="text-emerald-600" />
                            </div>
                            Account Created
                        </DialogTitle>
                    </DialogHeader>
                    {createdUser && (
                        <div className="space-y-4 py-2">
                            <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3 text-sm">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Name</p>
                                    <p className="font-semibold text-foreground">{createdUser.name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Email</p>
                                    <p className="font-semibold text-foreground">{createdUser.email}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Temporary Password</p>
                                    <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
                                        <code className="flex-1 font-mono text-sm tracking-wider text-foreground">
                                            {passwordVisible ? createdUser.password : '•'.repeat(createdUser.password.length)}
                                        </code>
                                        <button onClick={() => setPasswordVisible(v => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
                                            {passwordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                        <button
                                            onClick={handleCopyPassword}
                                            className={`transition-colors ${copied ? 'text-emerald-600' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            {copied ? <Check size={15} /> : <Copy size={15} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                ⚠ Save this password now — it won't be shown again. The staff member must change it on first login.
                            </p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => { setSuccessOpen(false); setCopied(false); setPasswordVisible(false); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
