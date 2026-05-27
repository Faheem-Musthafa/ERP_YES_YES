import React, { useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/app/supabase';
import { Button } from '@/app/components/ui/button';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Plus, Phone, MapPin, Edit2, UserCircle, Archive, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { archiveRecoverableRecord, restoreRecoverableRecord } from '@/app/recovery';
import {
    PageHeader, SearchBar, DataCard,
    StyledThead, StyledTh, StyledTr, StyledTd,
    EmptyState, Spinner, StatusBadge, IconBtn, TablePagination,
    CustomTooltip,
} from '@/app/components/ui/primitives';
import { useCustomerDialog } from '@/app/components/CustomerDialogProvider';
import { CustomerNameLink } from '@/app/components/CustomerNameLink';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { COMPANY_LIST } from '@/app/companyProfiles';
import { usePagedQuery } from '@/app/lib/queries/usePagedQuery';
import { useQueryClient } from '@tanstack/react-query';
import { escapePostgrestLike } from '@/app/utils';
import { useDebounced } from '@/app/hooks/useDebounced';

interface Customer {
    id: string;
    name: string;
    place: string | null;
    address: string | null;
    phone: string | null;
    pincode: string | null;
    gst_pan: string | null;
    location: string | null;
    company: string | null;
    opening_invoice: number | null;
    opening_delivery_challan: number | null;
    opening_balance: number | null;
    is_active: boolean;
    created_at: string;
}

export const Customers = () => {
    const [search, setSearch] = useState('');
    const [companyFilter, setCompanyFilter] = useState<string>('all');
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const pageSize = 10;
    const { openCustomer } = useCustomerDialog();
    const queryClient = useQueryClient();
    const debouncedSearch = useDebounced(search, 250);

    const { rows: paginated, totalItems, isLoading: loading, page, setPage } = usePagedQuery<Customer>({
        key: ['customers', debouncedSearch, companyFilter],
        pageSize,
        buildQuery: () => {
            let q = supabase
                .from('customers')
                .select('id, name, place, address, phone, pincode, gst_pan, location, company, opening_invoice, opening_delivery_challan, opening_balance, is_active, created_at', { count: 'exact' })
                .order('name');
            if (companyFilter === 'unassigned') q = q.is('company', null);
            else if (companyFilter !== 'all') q = q.eq('company', companyFilter as never);
            if (debouncedSearch) {
                const safe = escapePostgrestLike(debouncedSearch);
                q = q.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%,place.ilike.%${safe}%`);
            }
            return q;
        },
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['customers'] });

    const restoreCustomer = async (id: string, name: string) => {
        try {
            await restoreRecoverableRecord({
                table: 'customers',
                id,
                entityLabel: name,
            });
            toast.success('Customer restored');
            await invalidate();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to restore customer');
        }
    };

    const deleteCustomer = async (id: string) => {
        const target = paginated.find((customer) => customer.id === id);
        if (!target) return;

        try {
            await archiveRecoverableRecord({
                table: 'customers',
                id,
                entityLabel: target.name,
                reason: 'Archived from Customers management',
                metadata: { phone: target.phone },
            });
            toast.success('Customer archived');
            setDeleteTarget(null);
            await invalidate();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to archive customer');
        }
    };

    return (
        <div className="space-y-5">
            <PageHeader
                title="Customers"
                subtitle={`${totalItems} total customers`}
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

            <div className="flex flex-col sm:flex-row gap-3">
                <SearchBar
                    placeholder="Search by name, phone, or place..."
                    value={search}
                    onChange={setSearch}
                    className="flex-1 max-w-sm"
                />
                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger className="h-10 w-full sm:w-56 rounded-xl">
                        <SelectValue placeholder="Filter by company" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All companies</SelectItem>
                        {COMPANY_LIST.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <DataCard>
                {loading ? <Spinner /> :
                    totalItems === 0 ? (
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
                                            <StyledTh>Company</StyledTh>
                                            <StyledTh>Place</StyledTh>
                                            <StyledTh>Location</StyledTh>
                                            <StyledTh>Phone</StyledTh>
                                            <StyledTh>Pincode</StyledTh>
                                            <StyledTh>GSTIN/PAN</StyledTh>
                                            <StyledTh right>Opening Balance</StyledTh>
                                            <StyledTh>Status</StyledTh>
                                            <StyledTh right>Actions</StyledTh>
                                        </tr>
                                    </StyledThead>
                                    <tbody>
                                        {paginated.map(c => (
                                            <StyledTr
                                                key={c.id}
                                                onClick={() => openCustomer(c.id)}
                                                className="cursor-pointer"
                                                title={`Open history for ${c.name}`}
                                            >
                                                <StyledTd>
                                                    <div>
                                                        <CustomerNameLink customerId={c.id} className="font-semibold text-foreground">
                                                            {c.name}
                                                        </CustomerNameLink>
                                                        {c.address && <p className="text-xs text-muted-foreground truncate max-w-[180px]" title={c.address}>{c.address}</p>}
                                                    </div>
                                                </StyledTd>
                                                <StyledTd>
                                                    {c.company ? (
                                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                                            {c.company}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-amber-600 italic">unassigned</span>
                                                    )}
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
                                                <StyledTd right>
                                                    {(() => {
                                                        const invoiceOb = c.opening_invoice ?? 0;
                                                        const dcOb = c.opening_delivery_challan ?? 0;
                                                        const total = invoiceOb + dcOb;
                                                        const toneFor = (amount: number) => amount > 0
                                                            ? 'text-rose-600 dark:text-rose-400'
                                                            : amount < 0
                                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                                : 'text-muted-foreground';
                                                        const formatAmount = (n: number) => `${n < 0 ? '-' : ''}₹ ${Math.abs(n).toLocaleString('en-IN')}`;
                                                        return (
                                                            <div className="font-mono text-xs leading-relaxed inline-block text-left min-w-[170px]">
                                                                <div className={`font-bold text-sm ${toneFor(total)}`}>{formatAmount(total)}</div>
                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                    <span className="text-muted-foreground/60 select-none">├─</span>
                                                                    <span className="flex-1 text-muted-foreground">Invoice</span>
                                                                    <span className={`font-semibold ${toneFor(invoiceOb)}`}>{formatAmount(invoiceOb)}</span>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <span className="text-muted-foreground/60 select-none">└─</span>
                                                                    <span className="flex-1 text-muted-foreground">Delivery Challan</span>
                                                                    <span className={`font-semibold ${toneFor(dcOb)}`}>{formatAmount(dcOb)}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </StyledTd>
                                                <StyledTd>
                                                    <StatusBadge status={c.is_active ? 'Active' : 'Archived'} />
                                                </StyledTd>
                                                <StyledTd right>
                                                    <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
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
                                totalItems={totalItems}
                                currentPage={page}
                                pageSize={pageSize}
                                onPageChange={setPage}
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
        </div>
    );
};
