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
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Plus, Copy, Check, UserPlus, Eye, EyeOff, Shield, Trash2, Pencil, KeyRound } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { toast } from 'sonner';
import { isValidEmail } from '@/app/utils';
import {
    PageHeader, SearchBar, DataCard,
    StyledThead, StyledTh, StyledTr, StyledTd,
    EmptyState, Spinner, StatusBadge, IconBtn, TablePagination,
    CustomTooltip,
} from '@/app/components/ui/primitives';
import type { UserRole } from '@/app/types/database';

interface StaffUser {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
    is_active: boolean;
    must_change_password: boolean;
    employee_id: string | null;
    created_at: string;
}

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
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ full_name: '', email: '', role: '', employee_id: '' });
    const [successOpen, setSuccessOpen] = useState(false);
    const [createdUser, setCreatedUser] = useState<{ name: string; email: string; password: string } | null>(null);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [copied, setCopied] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<StaffUser | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<StaffUser | null>(null);
    const [editForm, setEditForm] = useState({ full_name: '', employee_id: '' });
    const [editSaving, setEditSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
    const pageSize = 10;

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
        if (!isValidEmail(form.email)) {
            toast.error('Please enter a valid email address'); return;
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

    const handleToggleActive = async (u: StaffUser) => {
        const { error } = await supabase.from('users').update({ is_active: !u.is_active }).eq('id', u.id);
        if (error) toast.error(error.message);
        else { toast.success(`${u.full_name} ${!u.is_active ? 'activated' : 'deactivated'}`); fetchUsers(); }
    };

    const handleDeleteStaff = async (u: StaffUser) => {
        if (u.role === 'admin') { toast.error('Cannot deactivate admin accounts'); return; }
        const { error } = await supabase.from('users').update({ is_active: false }).eq('id', u.id);
        if (error) toast.error('Failed to deactivate staff');
        else { toast.success(`${u.full_name} deactivated`); setDeleteTarget(null); fetchUsers(); }
    };

    const openEdit = (u: StaffUser) => {
        setEditTarget(u);
        setEditForm({ full_name: u.full_name, employee_id: u.employee_id ?? '' });
        setEditOpen(true);
    };

    const handleEditSave = async () => {
        if (!editTarget || !editForm.full_name.trim()) {
            toast.error('Name is required'); return;
        }
        setEditSaving(true);
        const { error } = await supabase.from('users').update({
            full_name: editForm.full_name.trim(),
            employee_id: editForm.employee_id.trim() || null,
        }).eq('id', editTarget.id);
        if (error) toast.error('Failed to update staff');
        else { toast.success('Staff details updated'); setEditOpen(false); fetchUsers(); }
        setEditSaving(false);
    };

    const handleResetPassword = async () => {
        if (!editTarget) return;
        setResetting(true);
        const newPassword = generatePassword(12);
        try {
            const { data: result, error: fnError } = await supabase.functions.invoke('invite-user', {
                body: {
                    email: editTarget.email,
                    full_name: editTarget.full_name,
                    role: editTarget.role,
                    password: newPassword,
                    employee_id: editTarget.employee_id,
                    reset_password: true,
                },
            });
            if (fnError || result?.error) throw new Error(result?.error || fnError?.message || 'Failed to reset password');
            await supabase.from('users').update({ must_change_password: true }).eq('id', editTarget.id);
            setCreatedUser({ name: editTarget.full_name, email: editTarget.email, password: newPassword });
            setEditOpen(false);
            setSuccessOpen(true);
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message || 'Failed to reset password');
        } finally { setResetting(false); }
    };

    const filtered = users.filter(u =>
        !search ||
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.employee_id ?? '').toLowerCase().includes(search.toLowerCase())
    );
    useEffect(() => { setCurrentPage(1); }, [search, users.length]);
    const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

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
                    <CustomTooltip content="Set up a new staff member account" side="bottom">
                        <Button
                            size="sm"
                            onClick={() => { setCreateOpen(true); setForm({ full_name: '', email: '', role: '', employee_id: '' }); }}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                        >
                            <UserPlus size={15} /> Create Staff Account
                        </Button>
                    </CustomTooltip>
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
                        <>
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
                                        {paginated.map(u => (
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
                                                                setUpdatingRoleId(u.id);
                                                                try {
                                                                    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', u.id);
                                                                    if (error) {
                                                                        toast.error('Failed to update role');
                                                                    } else {
                                                                        toast.success('Role updated');
                                                                        await fetchUsers();
                                                                    }
                                                                } finally {
                                                                    setUpdatingRoleId(null);
                                                                }
                                                            }}
                                                            disabled={updatingRoleId !== null && updatingRoleId !== u.id}
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
                                                        <CustomTooltip content={`Edit ${u.full_name}`} side="top">
                                                            <IconBtn onClick={() => openEdit(u)}>
                                                                <Pencil size={13} />
                                                            </IconBtn>
                                                        </CustomTooltip>
                                                        <CustomTooltip content={u.is_active ? 'Deactivate staff member' : 'Activate staff member'} side="top">
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
                                                        </CustomTooltip>
                                                        <CustomTooltip content={u.role === 'admin' ? 'Cannot delete admin accounts' : `Delete ${u.full_name}`} side="top">
                                                            <IconBtn
                                                                onClick={() => u.role !== 'admin' && setDeleteTarget(u)}
                                                                danger
                                                                disabled={u.role === 'admin'}
                                                            >
                                                                <Trash2 size={13} />
                                                            </IconBtn>
                                                        </CustomTooltip>
                                                    </div>
                                                </StyledTd>
                                            </StyledTr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <TablePagination
                                totalItems={filtered.length}
                                currentPage={page}
                                pageSize={pageSize}
                                onPageChange={setCurrentPage}
                                itemLabel="staff members"
                            />
                        </>
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
                                        <button onClick={() => setPasswordVisible(v => !v)} aria-label={passwordVisible ? 'Hide temporary password' : 'Show temporary password'} className="text-muted-foreground hover:text-foreground transition-colors">
                                            {passwordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                        <button
                                            onClick={handleCopyPassword}
                                            aria-label="Copy temporary password"
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
            {/* Edit Staff Dialog */}
            <Dialog open={editOpen} onOpenChange={open => { if (!open) setEditOpen(false); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Pencil size={14} className="text-blue-600" />
                            </div>
                            Edit Staff Member
                        </DialogTitle>
                    </DialogHeader>
                    {editTarget && (
                        <div className="space-y-3 py-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Full Name <span className="text-destructive">*</span></Label>
                                <Input
                                    value={editForm.full_name}
                                    onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                                    placeholder="Full name"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Email</Label>
                                <Input value={editTarget.email} disabled className="opacity-60" />
                                <p className="text-[10px] text-muted-foreground">Email cannot be changed after account creation</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Employee ID</Label>
                                <Input
                                    value={editForm.employee_id}
                                    onChange={e => setEditForm(f => ({ ...f, employee_id: e.target.value }))}
                                    placeholder="e.g. EMP-001"
                                />
                            </div>
                            <div className="pt-2 border-t">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleResetPassword}
                                    disabled={resetting}
                                    className="gap-2 text-amber-700 border-amber-200 hover:bg-amber-50"
                                >
                                    <KeyRound size={14} />
                                    {resetting ? 'Resetting...' : 'Reset Password'}
                                </Button>
                                <p className="text-[10px] text-muted-foreground mt-1.5">
                                    Generates a new temporary password. The staff member will be required to change it on next login.
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleEditSave} disabled={editSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            {editSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={Boolean(deleteTarget)} onOpenChange={open => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete staff account permanently?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget ? `Delete "${deleteTarget.full_name}" permanently? This action cannot be undone.` : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteTarget && void handleDeleteStaff(deleteTarget)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
