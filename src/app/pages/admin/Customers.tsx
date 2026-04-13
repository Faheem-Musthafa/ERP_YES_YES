import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/app/supabase';
import { Button } from '@/app/components/ui/button';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Plus, Phone, MapPin, Edit2, UserCircle, UserCheck, Archive, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { archiveRecoverableRecord, restoreRecoverableRecord } from '@/app/recovery';
import {
    PageHeader, SearchBar, DataCard,
    StyledThead, StyledTh, StyledTr, StyledTd,
    EmptyState, Spinner, StatusBadge, IconBtn, TablePagination,
    CustomTooltip,
} from '@/app/components/ui/primitives';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/app/components/ui/dialog';

interface Customer {
    id: string;
    name: string;
    place: string | null;
    address: string | null;
    phone: string;
    pincode: string | null;
    gst_pan: string | null;
    location: string | null;
    assigned_to: string | null;
    users: { full_name: string } | null;
    is_active: boolean;
    created_at: string;
}

export const Customers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [assignTarget, setAssignTarget] = useState<{ id: string; name: string; assigned_to: string | null } | null>(null);
    const [salesReps, setSalesReps] = useState<any[]>([]);
    const [selectedRep, setSelectedRep] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const fetchCustomers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('customers')
            .select('id, name, place, address, phone, pincode, gst_pan, location, assigned_to, users(full_name), is_active, created_at')
            .order('name');
        if (error) toast.error('Failed to load customers');
        else setCustomers(data ?? []);
        setLoading(false);
    };

    useEffect(() => {
        void fetchCustomers();
        // Fetch sales reps
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('id, full_name')
                    .eq('role', 'sales')
                    .eq('is_active', true)
                    .order('full_name');
                if (error) {
                    console.error('Failed to fetch sales reps:', error);
                    toast.error('Could not load sales representatives');
                } else {
                    setSalesReps(data ?? []);
                }
            } catch (err) {
                console.error('Sales reps fetch error:', err);
            }
        })();
    }, []);

    const restoreCustomer = async (id: string, name: string) => {
        try {
            await restoreRecoverableRecord({
                table: 'customers',
                id,
                entityLabel: name,
            });
            toast.success('Customer restored');
            await fetchCustomers();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to restore customer');
        }
    };

    const deleteCustomer = async (id: string) => {
        const target = customers.find((customer) => customer.id === id);
        if (!target) return;

        try {
            await archiveRecoverableRecord({
                table: 'customers',
                id,
                entityLabel: target.name,
                reason: 'Archived from Customers management',
                metadata: { phone: target.phone, assigned_to: target.assigned_to },
            });
            toast.success('Customer archived');
            setDeleteTarget(null);
            await fetchCustomers();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to archive customer');
        }
    };

    const assignSalesRep = async (id: string, repId: string) => {
        const { error } = await supabase.from('customers').update({ assigned_to: repId || null }).eq('id', id);
        if (error) toast.error('Failed to assign customer');
        else {
            toast.success('Customer assigned successfully!');
            setAssignTarget(null);
            setSelectedRep('');
            fetchCustomers();
        }
    };

    const filtered = customers.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        c.place?.toLowerCase().includes(search.toLowerCase())
    );
    useEffect(() => { setCurrentPage(1); }, [search, customers.length]);
    const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="space-y-5">
            <PageHeader
                title="Customers"
                subtitle={`${customers.length} total customers`}
                actions={
                    <CustomTooltip content="Create a new customer record" side="bottom">
                        <Link to="/admin/customers/new">
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                                <Plus size={15} /> Add Customer
                            </Button>
                        </Link>
                    </CustomTooltip>
                }
            />

            <SearchBar
                placeholder="Search by name, phone, or place..."
                value={search}
                onChange={setSearch}
                className="max-w-sm"
            />

            <DataCard>
                {loading ? <Spinner /> :
                    filtered.length === 0 ? (
                        <EmptyState
                            icon={UserCircle}
                            message="No customers found"
                            sub={search ? 'Try a different search' : 'Add your first customer to get started'}
                            action={!search ? (
                                <Link to="/admin/customers/new">
                                    <Button size="sm" variant="outline">Add Customer</Button>
                                </Link>
                            ) : undefined}
                        />
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <StyledThead>
                                        <tr>
                                            <StyledTh>Name</StyledTh>
                                            <StyledTh>Place</StyledTh>
                                            <StyledTh>Location</StyledTh>
                                            <StyledTh>Phone</StyledTh>
                                            <StyledTh>Pincode</StyledTh>
                                            <StyledTh>GSTIN/PAN</StyledTh>
                                            <StyledTh>Assigned To</StyledTh>
                                            <StyledTh>Status</StyledTh>
                                            <StyledTh right>Actions</StyledTh>
                                        </tr>
                                    </StyledThead>
                                    <tbody>
                                        {paginated.map(c => (
                                            <StyledTr key={c.id}>
                                                <StyledTd>
                                                    <div>
                                                        <p className="font-semibold text-foreground">{c.name}</p>
                                                        {c.address && <p className="text-xs text-muted-foreground truncate max-w-[180px]" title={c.address}>{c.address}</p>}
                                                    </div>
                                                </StyledTd>
                                                <StyledTd>
                                                    {c.place ? (
                                                        <span className="flex items-center gap-1 text-muted-foreground">
                                                            <MapPin size={11} className="text-primary" />{c.place}
                                                        </span>
                                                    ) : '—'}
                                                </StyledTd>
                                                <StyledTd>
                                                    {c.location ? (
                                                        <span className="px-2 py-1 rounded text-xs font-medium bg-violet-100 text-violet-900">{c.location}</span>
                                                    ) : '—'}
                                                </StyledTd>
                                                <StyledTd>
                                                    <span className="flex items-center gap-1 text-muted-foreground">
                                                        <Phone size={11} className="text-primary" />{c.phone}
                                                    </span>
                                                </StyledTd>
                                                <StyledTd mono className="text-muted-foreground">{c.pincode || '—'}</StyledTd>
                                                <StyledTd mono className="text-xs text-muted-foreground">{c.gst_pan || '—'}</StyledTd>
                                                <StyledTd className="text-sm">
                                                    {c.users?.full_name ? (
                                                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-900">{c.users.full_name}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">Unassigned</span>
                                                    )}
                                                </StyledTd>
                                                <StyledTd>
                                                    <StatusBadge status={c.is_active ? 'Active' : 'Archived'} />
                                                </StyledTd>
                                                <StyledTd right>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <CustomTooltip content={`Assign sales rep to ${c.name}`} side="top">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setAssignTarget({ id: c.id, name: c.name, assigned_to: c.assigned_to });
                                                                    setSelectedRep(c.assigned_to || '');
                                                                }}
                                                                className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                                                            >
                                                                <UserCheck size={14} />
                                                            </button>
                                                        </CustomTooltip>

                                                        <Link to={`/admin/customers/${c.id}/edit`}>
                                                            <CustomTooltip content={`Edit ${c.name}`} side="top">
                                                                <IconBtn><Edit2 size={14} /></IconBtn>
                                                            </CustomTooltip>
                                                        </Link>
                                                        <CustomTooltip content={c.is_active ? `Archive ${c.name}` : `Restore ${c.name}`} side="top">
                                                            {c.is_active ? (
                                                                <IconBtn
                                                                    onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                                                                    danger
                                                                >
                                                                    <Archive size={14} />
                                                                </IconBtn>
                                                            ) : (
                                                                <IconBtn onClick={() => void restoreCustomer(c.id, c.name)}>
                                                                    <RotateCcw size={14} />
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
                                itemLabel="customers"
                            />
                        </>
                    )
                }
            </DataCard>
            <AlertDialog open={Boolean(deleteTarget)} onOpenChange={open => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Archive customer?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget ? `Archive "${deleteTarget.name}" from active customer lists? You can restore the record later from this screen.` : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteTarget && void deleteCustomer(deleteTarget.id)}
                        >
                            Archive
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={Boolean(assignTarget)} onOpenChange={open => !open && setAssignTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Sales Representative</DialogTitle>
                        <DialogDescription>Select a sales rep to assign to {assignTarget?.name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Sales Representative</Label>
                            <Select value={selectedRep} onValueChange={setSelectedRep}>
                                <SelectTrigger><SelectValue placeholder="Select sales rep" /></SelectTrigger>
                                <SelectContent>
                                    {salesReps.map(rep => (
                                        <SelectItem key={rep.id} value={rep.id}>{rep.full_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setAssignTarget(null)}>Cancel</Button>
                            {selectedRep && (
                                <Button
                                    variant="outline"
                                    onClick={() => assignTarget && void assignSalesRep(assignTarget.id, '')}
                                >
                                    Unassign
                                </Button>
                            )}
                            <Button
                                onClick={() => assignTarget && void assignSalesRep(assignTarget.id, selectedRep)}
                                disabled={!selectedRep}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                Assign
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
