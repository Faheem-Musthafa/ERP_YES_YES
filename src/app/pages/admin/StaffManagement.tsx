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
import { Plus, Copy, Check, UserPlus, Eye, EyeOff, Shield, Pencil, KeyRound, Archive, RotateCcw } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { toast } from 'sonner';
import { archiveRecoverableRecord, restoreRecoverableRecord } from '@/app/recovery';
import { loadSalesTargetSettings } from '@/app/settings';
import { LIMITS, sanitizeEmail, sanitizeText, validateEmail, validateRequired } from '@/app/validation';
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

const ROLES: Array<{ value: Exclude<UserRole, 'admin'>; label: string }> = [
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

async function resolveFunctionError(fnError: unknown, result: unknown, fallback: string): Promise<string> {
    const messages: string[] = [];

    if (result && typeof result === 'object') {
        const payload = result as Record<string, unknown>;
        const valueCandidates = [payload.error, payload.message, payload.details, payload.hint];
        for (const candidate of valueCandidates) {
            if (typeof candidate === 'string' && candidate.trim()) messages.push(candidate.trim());
        }
    }

    if (fnError && typeof fnError === 'object') {
        const err = fnError as {
            name?: string;
            message?: string;
            context?: Record<string, unknown>;
            status?: number;
            statusCode?: number;
        };
        if (typeof err.message === 'string' && err.message.trim()) messages.push(err.message.trim());

        const context = err.context;
        if (context) {
            const contextCandidates = [context.error, context.message, context.details, context.hint];
            for (const candidate of contextCandidates) {
                if (typeof candidate === 'string' && candidate.trim()) messages.push(candidate.trim());
            }

            // FunctionsHttpError keeps the raw Response in `context`.
            const maybeContext = context as {
                json?: () => Promise<unknown>;
                text?: () => Promise<string>;
            };
            if (typeof maybeContext.json === 'function') {
                try {
                    const parsed = await maybeContext.json();
                    if (parsed && typeof parsed === 'object') {
                        const payload = parsed as Record<string, unknown>;
                        const bodyCandidates = [payload.error, payload.message, payload.details, payload.hint];
                        for (const candidate of bodyCandidates) {
                            if (typeof candidate === 'string' && candidate.trim()) messages.push(candidate.trim());
                        }
                    }
                } catch {
                    // Fall back to .text() if body is not JSON.
                    if (typeof maybeContext.text === 'function') {
                        try {
                            const raw = await maybeContext.text();
                            if (raw.trim()) messages.push(raw.trim());
                        } catch {
                            // ignore parse failures
                        }
                    }
                }
            }
        }

        const status = err.statusCode ?? err.status;
        if (typeof status === 'number') messages.push(`HTTP ${status}`);
    }

    const first = messages.find((m) => m.length > 0 && m !== 'Edge Function returned a non-2xx status code');
    return first ?? fallback;
}

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
    const [staffTargets, setStaffTargets] = useState<Record<string, number>>({});
    const [targetDrafts, setTargetDrafts] = useState<Record<string, string>>({});
    const [savingTargetId, setSavingTargetId] = useState<string | null>(null);
    const pageSize = 10;

    const hydrateTargetDrafts = (usersList: StaffUser[], targets: Record<string, number>, defaultTarget: number) => {
        const drafts: Record<string, string> = {};
        usersList.forEach((user) => {
            if (user.role === 'admin') return;
            const assignedTarget = targets[user.id] ?? defaultTarget;
            drafts[user.id] = Math.round(assignedTarget).toString();
        });
        return drafts;
    };

    const refreshTargetsForUsers = async (usersList: StaffUser[]) => {
        try {
            const targetSettings = await loadSalesTargetSettings();
            setStaffTargets(targetSettings.perUserMonthlyTargets);
            setTargetDrafts(hydrateTargetDrafts(usersList, targetSettings.perUserMonthlyTargets, targetSettings.defaultMonthlyTarget));
        } catch {
            setStaffTargets({});
            setTargetDrafts({});
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('users')
            .select('id, full_name, email, role, is_active, must_change_password, employee_id, created_at')
            .order('created_at', { ascending: false });
        if (error) toast.error('Failed to load staff: ' + error.message);
        const usersList = data ?? [];
        setUsers(usersList);

        await refreshTargetsForUsers(usersList);
        setLoading(false);
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleCreate = async () => {
        let normalizedName = '';
        let normalizedEmail = '';
        let normalizedEmployeeId = '';
        try {
            normalizedName = sanitizeText(form.full_name, LIMITS.mediumText);
            normalizedEmail = sanitizeEmail(form.email);
            normalizedEmployeeId = sanitizeText(form.employee_id, LIMITS.employeeId);
            validateRequired(normalizedName, 'Full name');
            validateRequired(normalizedEmail, 'Email address');
            validateEmail(normalizedEmail);
            if (!form.role) throw new Error('Role is required');
        } catch (err: any) {
            toast.error(err?.message || 'Please fill in all required fields'); return;
        }
        setCreating(true);
        const generatedPassword = generatePassword(12);
        try {
            const [{ data: { session } }, { data: { user: authUser } }] = await Promise.all([
                supabase.auth.getSession(),
                supabase.auth.getUser(),
            ]);
            if (!session || !authUser) {
                throw new Error('Session expired. Please log in again.');
            }

            const { data: callerProfile, error: callerProfileError } = await supabase
                .from('users')
                .select('role')
                .eq('id', authUser.id)
                .single();
            if (callerProfileError || callerProfile?.role !== 'admin') {
                throw new Error('Only admin users can create staff accounts.');
            }

            const { data: result, error: fnError } = await supabase.functions.invoke('invite-user', {
                body: {
                    email: normalizedEmail, full_name: normalizedName,
                    role: form.role, password: generatedPassword, employee_id: normalizedEmployeeId || null,
                },
            });
            if (fnError || result?.error) {
                throw new Error(await resolveFunctionError(fnError, result, 'Failed to create user'));
            }
            setCreatedUser({ name: normalizedName, email: normalizedEmail, password: generatedPassword });
            setCreateOpen(false);
            setSuccessOpen(true);
            setForm({ full_name: '', email: '', role: '', employee_id: '' });
            fetchUsers();
        } catch (err: any) {
            console.error('Staff create failed:', err);
            toast.error(err.message || 'Failed to create user');
        } finally { setCreating(false); }
    };

    const handleCopyPassword = () => {
        if (createdUser) {
            navigator.clipboard.writeText(createdUser.password);
            setCopied(true); setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleRestoreStaff = async (u: StaffUser) => {
        try {
            await restoreRecoverableRecord({
                table: 'users',
                id: u.id,
                entityLabel: u.full_name,
                metadata: { role: u.role, email: u.email },
            });
            toast.success(`${u.full_name} restored`);
            await fetchUsers();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to restore staff member');
        }
    };

    const handleDeleteStaff = async (u: StaffUser) => {
        if (u.role === 'admin') { toast.error('Cannot archive admin accounts'); return; }
        try {
            await archiveRecoverableRecord({
                table: 'users',
                id: u.id,
                entityLabel: u.full_name,
                reason: 'Archived from Team Management',
                metadata: { role: u.role, email: u.email },
            });
            toast.success(`${u.full_name} archived`);
            setDeleteTarget(null);
            await fetchUsers();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to archive staff member');
        }
    };

    const openEdit = (u: StaffUser) => {
        setEditTarget(u);
        setEditForm({ full_name: u.full_name, employee_id: u.employee_id ?? '' });
        setEditOpen(true);
    };

    const handleEditSave = async () => {
        if (!editTarget) return;
        let normalizedName = '';
        let normalizedEmployeeId = '';
        try {
            normalizedName = sanitizeText(editForm.full_name, LIMITS.mediumText);
            normalizedEmployeeId = sanitizeText(editForm.employee_id, LIMITS.employeeId);
            validateRequired(normalizedName, 'Name');
        } catch (err: any) {
            toast.error(err?.message || 'Name is required'); return;
        }
        setEditSaving(true);
        const { error } = await supabase.from('users').update({
            full_name: normalizedName,
            employee_id: normalizedEmployeeId || null,
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
            const [{ data: { session } }, { data: { user: authUser } }] = await Promise.all([
                supabase.auth.getSession(),
                supabase.auth.getUser(),
            ]);
            if (!session || !authUser) {
                throw new Error('Session expired. Please log in again.');
            }

            const { data: callerProfile, error: callerProfileError } = await supabase
                .from('users')
                .select('role')
                .eq('id', authUser.id)
                .single();
            if (callerProfileError || callerProfile?.role !== 'admin') {
                throw new Error('Only admin users can reset staff passwords.');
            }

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
            if (fnError || result?.error) {
                throw new Error(await resolveFunctionError(fnError, result, 'Failed to reset password'));
            }
            await supabase.from('users').update({ must_change_password: true }).eq('id', editTarget.id);
            setCreatedUser({ name: editTarget.full_name, email: editTarget.email, password: newPassword });
            setEditOpen(false);
            setSuccessOpen(true);
            fetchUsers();
        } catch (err: any) {
            console.error('Staff password reset failed:', err);
            toast.error(err.message || 'Failed to reset password');
        } finally { setResetting(false); }
    };

    const handleSaveTarget = async (u: StaffUser) => {
        if (u.role === 'admin') return;

        const raw = (targetDrafts[u.id] ?? '').trim();
        if (!raw) {
            toast.error('Please enter monthly target');
            return;
        }

        const parsedTarget = Number(raw);
        if (!Number.isFinite(parsedTarget) || parsedTarget < 0) {
            toast.error('Monthly target must be 0 or greater');
            return;
        }

        const normalizedTarget = Math.round(parsedTarget);
        const nextMap = { ...staffTargets, [u.id]: normalizedTarget };

        setSavingTargetId(u.id);
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({ key: 'sales_monthly_targets_by_user', value: nextMap }, { onConflict: 'key' });

            if (error) throw error;

            setStaffTargets(nextMap);
            setTargetDrafts((prev) => ({ ...prev, [u.id]: normalizedTarget.toString() }));
            toast.success(`Monthly target updated for ${u.full_name}`);
            await refreshTargetsForUsers(users);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save monthly target');
        } finally {
            setSavingTargetId(null);
        }
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
                                            <StyledTh>Monthly Target</StyledTh>
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
                                                                    const { error } = await supabase.from('users').update({ role: newRole as UserRole }).eq('id', u.id);
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
                                                <StyledTd>
                                                    {u.role !== 'admin' ? (
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={targetDrafts[u.id] ?? ''}
                                                                onChange={(event) => {
                                                                    const value = event.target.value;
                                                                    setTargetDrafts((prev) => ({ ...prev, [u.id]: value }));
                                                                }}
                                                                className="h-8 w-32"
                                                                placeholder="Target"
                                                            />
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={savingTargetId === u.id}
                                                                onClick={() => void handleSaveTarget(u)}
                                                                className="h-8 px-2 text-xs"
                                                            >
                                                                {savingTargetId === u.id ? 'Saving...' : 'Save'}
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </StyledTd>
                                                <StyledTd><StatusBadge status={u.is_active ? 'Active' : 'Archived'} /></StyledTd>
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
                                                        <CustomTooltip content={u.role === 'admin' ? 'Cannot archive admin accounts' : u.is_active ? `Archive ${u.full_name}` : `Restore ${u.full_name}`} side="top">
                                                            {u.is_active ? (
                                                                <IconBtn
                                                                    onClick={() => u.role !== 'admin' && setDeleteTarget(u)}
                                                                    danger
                                                                    disabled={u.role === 'admin'}
                                                                >
                                                                    <Archive size={13} />
                                                                </IconBtn>
                                                            ) : (
                                                                <IconBtn
                                                                    onClick={() => void handleRestoreStaff(u)}
                                                                    disabled={u.role === 'admin'}
                                                                >
                                                                    <RotateCcw size={13} />
                                                                </IconBtn>
                                                            )}
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
                            <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: sanitizeText(e.target.value, LIMITS.mediumText) }))} placeholder="e.g. Rahul Sharma" maxLength={LIMITS.mediumText} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Email Address <span className="text-destructive">*</span></Label>
                            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: sanitizeEmail(e.target.value) }))} placeholder="e.g. rahul@company.com" maxLength={LIMITS.email} autoComplete="email" />
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
                            <Input value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: sanitizeText(e.target.value, LIMITS.employeeId) }))} placeholder="e.g. EMP-001" maxLength={LIMITS.employeeId} />
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
                                    onChange={e => setEditForm(f => ({ ...f, full_name: sanitizeText(e.target.value, LIMITS.mediumText) }))}
                                    placeholder="Full name"
                                    maxLength={LIMITS.mediumText}
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
                                    onChange={e => setEditForm(f => ({ ...f, employee_id: sanitizeText(e.target.value, LIMITS.employeeId) }))}
                                    placeholder="e.g. EMP-001"
                                    maxLength={LIMITS.employeeId}
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
                        <Button variant="outline" onClick={() => { setEditForm({ full_name: editTarget?.full_name ?? '', employee_id: editTarget?.employee_id ?? '' }); }}>Reset</Button>
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
                        <AlertDialogTitle>Archive staff account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget ? `Archive "${deleteTarget.full_name}" and disable their login access? You can restore the account later from this screen.` : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteTarget && void handleDeleteStaff(deleteTarget)}
                        >
                            Archive
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
