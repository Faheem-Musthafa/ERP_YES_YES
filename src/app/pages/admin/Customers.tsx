import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/app/supabase';
import { Button } from '@/app/components/ui/button';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Plus, Phone, MapPin, Edit2, ToggleLeft, ToggleRight, UserCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    PageHeader, SearchBar, DataCard,
    StyledThead, StyledTh, StyledTr, StyledTd,
    EmptyState, Spinner, StatusBadge, IconBtn, TablePagination,
} from '@/app/components/ui/primitives';

interface Customer {
    id: string;
    name: string;
    place: string | null;
    address: string | null;
    phone: string;
    pincode: string | null;
    gst_pan: string | null;
    is_active: boolean;
    created_at: string;
}

export const Customers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const fetchCustomers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('customers')
            .select('id, name, place, address, phone, pincode, gst_pan, is_active, created_at')
            .order('name');
        if (error) toast.error('Failed to load customers');
        else setCustomers(data ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchCustomers(); }, []);

    const toggleActive = async (id: string, current: boolean) => {
        const { error } = await supabase.from('customers').update({ is_active: !current }).eq('id', id);
        if (error) toast.error('Failed to update status');
        else { toast.success(`Customer ${current ? 'deactivated' : 'activated'}`); fetchCustomers(); }
    };

    const deleteCustomer = async (id: string) => {
        const { error } = await supabase.from('customers').update({ is_active: false }).eq('id', id);
        if (error) toast.error('Failed to deactivate customer');
        else {
            toast.success('Customer deactivated');
            setDeleteTarget(null);
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
                    <Link to="/admin/customers/new">
                        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                            <Plus size={15} /> Add Customer
                        </Button>
                    </Link>
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
                                            <StyledTh>Phone</StyledTh>
                                            <StyledTh>Pincode</StyledTh>
                                            <StyledTh>GSTIN/PAN</StyledTh>
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
                                                    <span className="flex items-center gap-1 text-muted-foreground">
                                                        <Phone size={11} className="text-primary" />{c.phone}
                                                    </span>
                                                </StyledTd>
                                                <StyledTd mono className="text-muted-foreground">{c.pincode || '—'}</StyledTd>
                                                <StyledTd mono className="text-xs text-muted-foreground">{c.gst_pan || '—'}</StyledTd>
                                                <StyledTd>
                                                    <StatusBadge status={c.is_active ? 'Active' : 'Inactive'} />
                                                </StyledTd>
                                                <StyledTd right>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Link to={`/admin/customers/${c.id}/edit`}>
                                                            <IconBtn title={`Edit customer ${c.name}`}><Edit2 size={14} /></IconBtn>
                                                        </Link>
                                                        <IconBtn
                                                            onClick={() => toggleActive(c.id, c.is_active)}
                                                            title={c.is_active ? `Deactivate customer ${c.name}` : `Activate customer ${c.name}`}
                                                        >
                                                            {c.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                                        </IconBtn>
                                                        <IconBtn
                                                            onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                                                            title={`Delete customer ${c.name}`}
                                                            danger
                                                        >
                                                            <Trash2 size={14} />
                                                        </IconBtn>
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
                        <AlertDialogTitle>Delete customer permanently?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget ? `Delete "${deleteTarget.name}" permanently? This action cannot be undone.` : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteTarget && void deleteCustomer(deleteTarget.id)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
