import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/app/supabase';
import { Button } from '@/app/components/ui/button';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Plus, Phone, MapPin, Edit2, UserCircle, Archive, RotateCcw, Receipt, ShoppingBag, FileText, IndianRupee, Download } from 'lucide-react';
import { toast } from 'sonner';
import { archiveRecoverableRecord, restoreRecoverableRecord } from '@/app/recovery';
import { downloadCSV } from '@/app/utils';
import {
    PageHeader, SearchBar, DataCard,
    StyledThead, StyledTh, StyledTr, StyledTd,
    EmptyState, Spinner, StatusBadge, IconBtn, TablePagination,
    CustomTooltip,
} from '@/app/components/ui/primitives';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';

interface Customer {
    id: string;
    name: string;
    place: string | null;
    address: string | null;
    phone: string;
    pincode: string | null;
    gst_pan: string | null;
    location: string | null;
    is_active: boolean;
    created_at: string;
}

interface CustomerOrderHistory {
    id: string;
    order_number: string | null;
    invoice_number: string | null;
    status: string | null;
    company: string | null;
    grand_total: number | null;
    created_at: string;
    delivery_date: string | null;
}

interface CustomerReceiptHistory {
    id: string;
    receipt_number: string | null;
    amount: number | null;
    payment_mode: string | null;
    payment_status: string | null;
    on_account_of: string | null;
    received_date: string | null;
    created_at: string;
    orders: {
        order_number: string | null;
        invoice_number: string | null;
    } | null;
}

export const Customers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerOrders, setCustomerOrders] = useState<CustomerOrderHistory[]>([]);
    const [customerBills, setCustomerBills] = useState<CustomerOrderHistory[]>([]);
    const [customerTransactions, setCustomerTransactions] = useState<CustomerReceiptHistory[]>([]);
    const pageSize = 10;

    const fetchCustomers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('customers')
            .select('id, name, place, address, phone, pincode, gst_pan, location, is_active, created_at')
            .order('name');
        if (error) toast.error('Failed to load customers');
        else setCustomers(data ?? []);
        setLoading(false);
    };

    useEffect(() => {
        void fetchCustomers();
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
                metadata: { phone: target.phone },
            });
            toast.success('Customer archived');
            setDeleteTarget(null);
            await fetchCustomers();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to archive customer');
        }
    };

    const openHistory = (customer: Customer) => {
        setSelectedCustomer(customer);
        setHistoryOpen(true);
    };

    const fetchCustomerHistory = async (customerId: string) => {
        setHistoryLoading(true);
        try {
            const [ordersResult, receiptsResult] = await Promise.allSettled([
                supabase
                    .from('orders')
                    .select('id, order_number, invoice_number, status, company, grand_total, created_at, delivery_date')
                    .eq('customer_id', customerId)
                    .order('created_at', { ascending: false })
                    .limit(150),
                supabase
                    .from('receipts')
                    .select('id, receipt_number, amount, payment_mode, payment_status, on_account_of, received_date, created_at, orders(order_number, invoice_number)')
                    .eq('customer_id', customerId)
                    .order('created_at', { ascending: false })
                    .limit(150),
            ]);

            if (ordersResult.status === 'fulfilled') {
                if (ordersResult.value.error) {
                    toast.error('Failed to load customer orders');
                    setCustomerOrders([]);
                    setCustomerBills([]);
                } else {
                    const orders = (ordersResult.value.data ?? []) as CustomerOrderHistory[];
                    setCustomerOrders(orders);
                    setCustomerBills(
                        orders.filter((order) =>
                            (order.status ?? '').toLowerCase() === 'billed'
                            || (order.status ?? '').toLowerCase() === 'delivered'
                            || Boolean(order.invoice_number),
                        ),
                    );
                }
            } else {
                toast.error('Failed to load customer orders');
                setCustomerOrders([]);
                setCustomerBills([]);
            }

            if (receiptsResult.status === 'fulfilled') {
                if (receiptsResult.value.error) {
                    toast.error('Failed to load customer transactions');
                    setCustomerTransactions([]);
                } else {
                    setCustomerTransactions((receiptsResult.value.data ?? []) as CustomerReceiptHistory[]);
                }
            } else {
                toast.error('Failed to load customer transactions');
                setCustomerTransactions([]);
            }
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (!historyOpen || !selectedCustomer?.id) return;
        void fetchCustomerHistory(selectedCustomer.id);
    }, [historyOpen, selectedCustomer?.id]);

    const exportCustomerStatement = () => {
        if (!selectedCustomer) return;

        const headers = ['Section', 'Date', 'Reference', 'Secondary Ref', 'Status', 'Mode/Company', 'Amount'];
        const rows = [
            ...customerTransactions.map((tx) => [
                'Transaction',
                tx.received_date ? new Date(tx.received_date).toLocaleDateString('en-IN') : '—',
                tx.receipt_number ?? '—',
                tx.orders?.invoice_number ?? tx.orders?.order_number ?? '—',
                tx.payment_status ?? 'Pending',
                tx.payment_mode ?? '—',
                (tx.amount ?? 0).toString(),
            ]),
            ...customerBills.map((bill) => [
                'Bill',
                new Date(bill.created_at).toLocaleDateString('en-IN'),
                bill.invoice_number ?? '—',
                bill.order_number ?? '—',
                bill.status ?? 'Pending',
                bill.company ?? '—',
                (bill.grand_total ?? 0).toString(),
            ]),
            ...customerOrders.map((order) => [
                'Order',
                new Date(order.created_at).toLocaleDateString('en-IN'),
                order.order_number ?? '—',
                order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN') : '—',
                order.status ?? 'Pending',
                order.company ?? '—',
                (order.grand_total ?? 0).toString(),
            ]),
        ];

        downloadCSV(
            headers,
            rows,
            `customer_statement_${selectedCustomer.name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`,
        );
    };

    const exportCustomerSection = (section: 'transactions' | 'bills' | 'orders') => {
        if (!selectedCustomer) return;

        if (section === 'transactions') {
            downloadCSV(
                ['Receipt No', 'Order No', 'Invoice No', 'Status', 'Mode', 'Received Date', 'Amount'],
                customerTransactions.map((tx) => [
                    tx.receipt_number ?? '—',
                    tx.orders?.order_number ?? '—',
                    tx.orders?.invoice_number ?? '—',
                    tx.payment_status ?? 'Pending',
                    tx.payment_mode ?? '—',
                    tx.received_date ? new Date(tx.received_date).toLocaleDateString('en-IN') : '—',
                    tx.amount ?? 0,
                ]),
                `customer_transactions_${selectedCustomer.name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`,
            );
            return;
        }

        if (section === 'bills') {
            downloadCSV(
                ['Invoice No', 'Order No', 'Status', 'Company', 'Bill Date', 'Amount'],
                customerBills.map((bill) => [
                    bill.invoice_number ?? '—',
                    bill.order_number ?? '—',
                    bill.status ?? 'Pending',
                    bill.company ?? '—',
                    new Date(bill.created_at).toLocaleDateString('en-IN'),
                    bill.grand_total ?? 0,
                ]),
                `customer_bills_${selectedCustomer.name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`,
            );
            return;
        }

        downloadCSV(
            ['Order No', 'Status', 'Company', 'Created Date', 'Delivery Date', 'Grand Total'],
            customerOrders.map((order) => [
                order.order_number ?? '—',
                order.status ?? 'Pending',
                order.company ?? '—',
                new Date(order.created_at).toLocaleDateString('en-IN'),
                order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN') : '—',
                order.grand_total ?? 0,
            ]),
            `customer_orders_${selectedCustomer.name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`,
        );
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
                                            <StyledTh>Status</StyledTh>
                                            <StyledTh right>Actions</StyledTh>
                                        </tr>
                                    </StyledThead>
                                    <tbody>
                                        {paginated.map(c => (
                                            <StyledTr
                                                key={c.id}
                                                onClick={() => openHistory(c)}
                                                className="cursor-pointer"
                                                title={`Open history for ${c.name}`}
                                            >
                                                <StyledTd>
                                                    <div>
                                                        <button
                                                            type="button"
                                                            onClick={() => openHistory(c)}
                                                            className="font-semibold text-foreground hover:text-primary hover:underline text-left"
                                                        >
                                                            {c.name}
                                                        </button>
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
            <Dialog
                open={historyOpen}
                onOpenChange={(open) => {
                    setHistoryOpen(open);
                    if (!open) {
                        setSelectedCustomer(null);
                        setCustomerOrders([]);
                        setCustomerBills([]);
                        setCustomerTransactions([]);
                    }
                }}
            >
                <DialogContent className="max-w-[95vw] xl:max-w-[1400px] h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0 bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl sm:rounded-2xl">
                    <DialogHeader className="p-6 pb-4 shrink-0 border-b border-border/50 bg-muted/20">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold ring-1 ring-primary/20 shadow-inner">
                                {selectedCustomer?.name?.charAt(0) || 'C'}
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold tracking-tight">
                                    {selectedCustomer?.name}
                                </DialogTitle>
                                <DialogDescription className="mt-1.5 flex items-center gap-3 text-sm">
                                     {selectedCustomer?.phone && (
                                        <span className="flex items-center gap-1.5 opacity-90"><Phone size={14} className="text-primary/70"/> {selectedCustomer.phone}</span>
                                     )}
                                     {selectedCustomer?.location ? (
                                        <>
                                            <span className="text-muted-foreground/30">•</span>
                                            <span className="flex items-center gap-1.5 opacity-90"><MapPin size={14} className="text-primary/70"/> {selectedCustomer.location}</span>
                                        </>
                                     ) : selectedCustomer?.place ? (
                                        <>
                                            <span className="text-muted-foreground/30">•</span>
                                            <span className="flex items-center gap-1.5 opacity-90"><MapPin size={14} className="text-primary/70"/> {selectedCustomer.place}</span>
                                        </>
                                     ) : null}
                                </DialogDescription>
                            </div>
                            <div className="ml-auto flex flex-wrap items-center gap-2">
                                <Button size="sm" variant="default" onClick={exportCustomerStatement} className="gap-2">
                                    <Download size={14} /> Export Statement
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => exportCustomerSection('transactions')} className="gap-2">
                                    <Receipt size={14} /> Transactions
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => exportCustomerSection('bills')} className="gap-2">
                                    <FileText size={14} /> Bills
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => exportCustomerSection('orders')} className="gap-2">
                                    <ShoppingBag size={14} /> Orders
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 pt-4">
                        {historyLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-4">
                                <Spinner />
                                <p className="text-sm text-muted-foreground animate-pulse">Loading history...</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm flex flex-col justify-between group hover:border-primary/20 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground font-medium">Total Orders</span>
                                            <div className="p-2 rounded-md bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20 transition-colors"><ShoppingBag size={16} /></div>
                                        </div>
                                        <span className="text-2xl font-bold mt-3">{customerOrders.length}</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm flex flex-col justify-between group hover:border-primary/20 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground font-medium">Billed Amount</span>
                                            <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20 transition-colors"><FileText size={16} /></div>
                                        </div>
                                        <span className="text-2xl font-bold mt-3 font-mono text-emerald-600 dark:text-emerald-400">
                                            ₹ {customerBills.reduce((acc, b) => acc + (b.grand_total || 0), 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm flex flex-col justify-between group hover:border-primary/20 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground font-medium">Transactions</span>
                                            <div className="p-2 rounded-md bg-violet-500/10 text-violet-500 group-hover:bg-violet-500/20 transition-colors"><Receipt size={16} /></div>
                                        </div>
                                        <span className="text-2xl font-bold mt-3">{customerTransactions.length}</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm flex flex-col justify-between group hover:border-primary/20 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground font-medium">Total Paid</span>
                                            <div className="p-2 rounded-md bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20 transition-colors"><IndianRupee size={16} /></div>
                                        </div>
                                        <span className="text-2xl font-bold mt-3 font-mono text-amber-600 dark:text-amber-400">
                                            ₹ {customerTransactions.reduce((acc, t) => acc + (t.amount || 0), 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <Tabs defaultValue="transactions" className="w-full">
                                    <div className="flex items-center mb-4">
                                        <TabsList className="h-11 bg-muted/50 p-1 rounded-lg">
                                            <TabsTrigger value="transactions" className="rounded-md px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                                Transactions <span className="ml-2 rounded-full bg-muted-foreground/10 px-2 py-0.5 text-xs">{customerTransactions.length}</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="bills" className="rounded-md px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                                Bills <span className="ml-2 rounded-full bg-muted-foreground/10 px-2 py-0.5 text-xs">{customerBills.length}</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="orders" className="rounded-md px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                                Orders <span className="ml-2 rounded-full bg-muted-foreground/10 px-2 py-0.5 text-xs">{customerOrders.length}</span>
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
                                        <TabsContent value="transactions" className="m-0 border-0 p-0">
                                            {customerTransactions.length === 0 ? (
                                                <div className="p-10"><EmptyState icon={Receipt} message="No transactions found" sub="Customer hasn't made any payments yet" /></div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <StyledThead>
                                                            <tr>
                                                                <StyledTh className="pl-6">Receipt</StyledTh>
                                                                <StyledTh>Order / Invoice</StyledTh>
                                                                <StyledTh>Mode</StyledTh>
                                                                <StyledTh>Status</StyledTh>
                                                                <StyledTh>Received Date</StyledTh>
                                                                <StyledTh right className="pr-6">Amount</StyledTh>
                                                            </tr>
                                                        </StyledThead>
                                                        <tbody className="divide-y divide-border/50">
                                                            {customerTransactions.map((tx) => (
                                                                <StyledTr key={tx.id} className="hover:bg-muted/30 transition-colors">
                                                                    <StyledTd className="font-medium pl-6">{tx.receipt_number ?? '—'}</StyledTd>
                                                                    <StyledTd>
                                                                        <p className="font-medium">{tx.orders?.order_number ?? '—'}</p>
                                                                        <p className="text-xs text-muted-foreground mt-0.5">{tx.orders?.invoice_number ?? 'No Invoice'}</p>
                                                                    </StyledTd>
                                                                    <StyledTd>
                                                                        <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs font-medium">{tx.payment_mode ?? '—'}</span>
                                                                    </StyledTd>
                                                                    <StyledTd><StatusBadge status={tx.payment_status ?? 'Pending'} /></StyledTd>
                                                                    <StyledTd mono className="text-muted-foreground">{tx.received_date ? new Date(tx.received_date).toLocaleDateString('en-IN') : '—'}</StyledTd>
                                                                    <StyledTd right mono className="font-bold text-base pr-6">₹ {(tx.amount ?? 0).toLocaleString('en-IN')}</StyledTd>
                                                                </StyledTr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="bills" className="m-0 border-0 p-0">
                                            {customerBills.length === 0 ? (
                                                <div className="p-10"><EmptyState icon={FileText} message="No billed invoices found" sub="Customer has no completed billing history" /></div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <StyledThead>
                                                            <tr>
                                                                <StyledTh className="pl-6">Order No</StyledTh>
                                                                <StyledTh>Invoice No</StyledTh>
                                                                <StyledTh>Status</StyledTh>
                                                                <StyledTh>Company</StyledTh>
                                                                <StyledTh>Bill Date</StyledTh>
                                                                <StyledTh right className="pr-6">Amount</StyledTh>
                                                            </tr>
                                                        </StyledThead>
                                                        <tbody className="divide-y divide-border/50">
                                                            {customerBills.map((bill) => (
                                                                <StyledTr key={bill.id} className="hover:bg-muted/30 transition-colors">
                                                                    <StyledTd className="font-medium pl-6">{bill.order_number ?? '—'}</StyledTd>
                                                                    <StyledTd mono className="text-muted-foreground">{bill.invoice_number ?? '—'}</StyledTd>
                                                                    <StyledTd><StatusBadge status={bill.status ?? 'Pending'} /></StyledTd>
                                                                    <StyledTd className="text-muted-foreground">{bill.company ?? '—'}</StyledTd>
                                                                    <StyledTd mono className="text-muted-foreground">{new Date(bill.created_at).toLocaleDateString('en-IN')}</StyledTd>
                                                                    <StyledTd right mono className="font-bold text-base pr-6">₹ {(bill.grand_total ?? 0).toLocaleString('en-IN')}</StyledTd>
                                                                </StyledTr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="orders" className="m-0 border-0 p-0">
                                            {customerOrders.length === 0 ? (
                                                <div className="p-10"><EmptyState icon={ShoppingBag} message="No orders found" sub="Customer hasn't placed any orders yet" /></div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <StyledThead>
                                                            <tr>
                                                                <StyledTh className="pl-6">Order No</StyledTh>
                                                                <StyledTh>Status</StyledTh>
                                                                <StyledTh>Company</StyledTh>
                                                                <StyledTh>Created</StyledTh>
                                                                <StyledTh>Delivery</StyledTh>
                                                                <StyledTh right className="pr-6">Grand Total</StyledTh>
                                                            </tr>
                                                        </StyledThead>
                                                        <tbody className="divide-y divide-border/50">
                                                            {customerOrders.map((order) => (
                                                                <StyledTr key={order.id} className="hover:bg-muted/30 transition-colors">
                                                                    <StyledTd className="font-medium pl-6">{order.order_number ?? '—'}</StyledTd>
                                                                    <StyledTd><StatusBadge status={order.status ?? 'Pending'} /></StyledTd>
                                                                    <StyledTd className="text-muted-foreground">{order.company ?? '—'}</StyledTd>
                                                                    <StyledTd mono className="text-muted-foreground">{new Date(order.created_at).toLocaleDateString('en-IN')}</StyledTd>
                                                                    <StyledTd mono className="text-muted-foreground">{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN') : '—'}</StyledTd>
                                                                    <StyledTd right mono className="font-bold text-base pr-6">₹ {(order.grand_total ?? 0).toLocaleString('en-IN')}</StyledTd>
                                                                </StyledTr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </TabsContent>
                                    </div>
                                </Tabs>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
