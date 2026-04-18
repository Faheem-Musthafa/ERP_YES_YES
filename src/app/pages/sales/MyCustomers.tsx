import React, { useState, useEffect } from 'react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Download, Users, TrendingUp, Phone, MapPin, Receipt, ShoppingBag, FileText, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { fmt, downloadCSV } from '@/app/utils';
import { loadMasterDataSettings } from '@/app/settings';
import {
    PageHeader, DataCard, StyledThead, StyledTh, StyledTr, StyledTd,
    SearchBar, Spinner, EmptyState, TablePagination, FilterBar, FilterField, StatusBadge,
    CustomTooltip
} from '@/app/components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';

interface CustomerData {
    id: string;
    name: string;
    phone: string;
    location: string | null;
    place: string | null;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    lastOrderDate: string | null;
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
    received_date: string | null;
    created_at: string;
    orders: {
        order_number: string | null;
        invoice_number: string | null;
    } | null;
}

export const MyCustomers = () => {
    const { user } = useAuth();
    const [customers, setCustomers] = useState<CustomerData[]>([]);
    const [locationOptions, setLocationOptions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [locationFilter, setLocationFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
    const [customerOrders, setCustomerOrders] = useState<CustomerOrderHistory[]>([]);
    const [customerBills, setCustomerBills] = useState<CustomerOrderHistory[]>([]);
    const [customerTransactions, setCustomerTransactions] = useState<CustomerReceiptHistory[]>([]);
    const pageSize = 10;

    const fetchData = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            // Fetch active customers
            const { data: custData, error: custErr } = await supabase
                .from('customers')
                .select('id, name, phone, location, place, is_active')
                .eq('is_active', true);

            if (custErr) throw custErr;

            // Fetch all orders to calculate metrics
            const { data: orderData, error: ordErr } = await supabase
                .from('orders')
                .select('customer_id, grand_total, created_at');

            if (ordErr) throw ordErr;

            // Build order map
            const orderMap = new Map<string, { count: number; revenue: number; lastDate: string }>();
            orderData?.forEach(o => {
                if (!o.customer_id) return;
                const existing = orderMap.get(o.customer_id) || { count: 0, revenue: 0, lastDate: '' };
                orderMap.set(o.customer_id, {
                    count: existing.count + 1,
                    revenue: existing.revenue + (o.grand_total || 0),
                    lastDate: !existing.lastDate || o.created_at > existing.lastDate ? o.created_at : existing.lastDate,
                });
            });

            // Transform to customer data
            const data = custData?.map(c => {
                const orderInfo = orderMap.get(c.id) || { count: 0, revenue: 0, lastDate: '' };
                return {
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    location: c.location,
                    place: c.place,
                    totalOrders: orderInfo.count,
                    totalRevenue: orderInfo.revenue,
                    averageOrderValue: orderInfo.count > 0 ? orderInfo.revenue / orderInfo.count : 0,
                    lastOrderDate: orderInfo.lastDate,
                } as CustomerData;
            }) || [];

            setCustomers(data.sort((a, b) => b.totalRevenue - a.totalRevenue));

                        const settings = await loadMasterDataSettings().catch(() => null);
                        const configured = settings?.districts ?? [];
                        const discovered = Array.from(
                            new Set(
                                data
                                    .map((row) => row.location)
                                    .filter((row): row is string => typeof row === 'string' && row.trim().length > 0),
                            ),
                        );

                        const merged = [...configured];
                        discovered.forEach((value) => {
                            if (!merged.includes(value)) {
                                merged.push(value);
                            }
                        });
                        setLocationOptions(merged);
        } catch (err: any) {
            toast.error(err.message || 'Failed to fetch customers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void fetchData(); }, [user?.id]);

    const filtered = customers.filter(c => {
        const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
        const matchLocation = locationFilter === 'all' || c.location === locationFilter;
        return matchSearch && matchLocation;
    });

    useEffect(() => { setCurrentPage(1); }, [search, locationFilter]);
        useEffect(() => {
            if (locationFilter !== 'all' && !locationOptions.includes(locationFilter)) {
                setLocationFilter('all');
            }
        }, [locationFilter, locationOptions]);

    const openHistory = (customer: CustomerData) => {
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
                    .select('id, receipt_number, amount, payment_mode, payment_status, received_date, created_at, orders(order_number, invoice_number)')
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

    const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const locationData = locationOptions.map(loc => ({
        name: loc,
        customers: customers.filter(c => c.location === loc).length,
        revenue: customers.filter(c => c.location === loc).reduce((s, c) => s + c.totalRevenue, 0),
    }));

    const stats = {
        totalCustomers: customers.length,
        totalRevenue: customers.reduce((s, c) => s + c.totalRevenue, 0),
        avgOrderValue: customers.length > 0 ? customers.reduce((s, c) => s + c.averageOrderValue, 0) / customers.length : 0,
        totalOrders: customers.reduce((s, c) => s + c.totalOrders, 0),
    };

    const COLORS = ['#00bdb4', '#ff6b6b', '#4ecdc4', '#ffe66d'];

    return (
        <div className="space-y-6">
            <PageHeader
                title="My Customers"
                subtitle="Active customer portfolio"
                actions={
                    <CustomTooltip content="Download customer data as CSV file" side="bottom">
                        <Button
                            size="sm"
                            onClick={() => {
                              const headers = ['Name', 'Phone', 'Location', 'Place', 'Orders Count', 'Total Revenue', 'Avg Order Value', 'Last Order'];
                              const rows = paginated.map(c => [
                                c.name,
                                c.phone,
                                c.location || '-',
                                c.place || '-',
                                c.totalOrders,
                                c.totalRevenue,
                                c.averageOrderValue.toFixed(0),
                                c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : '-',
                              ]);
                              downloadCSV(headers, rows, 'my_customers.csv');
                            }}
                            className="gap-2"
                        >
                            <Download size={15} /> Export
                        </Button>
                    </CustomTooltip>
                }
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Customers', value: stats.totalCustomers, icon: Users },
                    { label: 'Total Orders', value: stats.totalOrders, icon: TrendingUp },
                    { label: 'Total Revenue', value: `₹ ${fmt(stats.totalRevenue)}`, icon: TrendingUp },
                    { label: 'Avg Order Value', value: `₹ ${fmt(stats.avgOrderValue)}`, icon: TrendingUp },
                ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <DataCard key={i} className="p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                                    <p className="text-lg font-bold mt-1">{stat.value}</p>
                                </div>
                                <Icon size={20} className="text-primary opacity-50" />
                            </div>
                        </DataCard>
                    );
                })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DataCard className="p-4">
                    <h3 className="text-sm font-semibold mb-4">Customers by Location</h3>
                    {locationData.filter(l => l.customers > 0).length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={locationData.filter(l => l.customers > 0)} dataKey="customers" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                    {locationData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p className="text-muted-foreground text-sm">No location data</p>}
                </DataCard>

                <DataCard className="p-4">
                    <h3 className="text-sm font-semibold mb-4">Revenue by Location</h3>
                    {locationData.filter(l => l.revenue > 0).length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={locationData.filter(l => l.revenue > 0)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="revenue" fill="#00bdb4" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-muted-foreground text-sm">No revenue data</p>}
                </DataCard>
            </div>

            {/* Filter & Search */}
            <FilterBar>
                <SearchBar
                    placeholder="Search by name or phone..."
                    value={search}
                    onChange={setSearch}
                    className="max-w-md"
                />
                <FilterField label="Location">
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                        <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Locations</SelectItem>
                            {locationOptions.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </FilterField>
            </FilterBar>

            {/* Table */}
            <DataCard>
                {loading ? <Spinner /> : customers.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        message="No customers assigned yet"
                        sub="Your admin will assign customers to you"
                    />
                ) : filtered.length === 0 ? (
                    <EmptyState icon={Users} message="No customers found for selected filters" />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <StyledThead>
                                    <tr>
                                        <StyledTh>Customer Name</StyledTh>
                                        <StyledTh>Phone</StyledTh>
                                        <StyledTh>Location</StyledTh>
                                        <StyledTh right>Orders</StyledTh>
                                        <StyledTh right>Revenue</StyledTh>
                                        <StyledTh right>Avg Order</StyledTh>
                                        <StyledTh>Last Order</StyledTh>
                                    </tr>
                                </StyledThead>
                                <tbody>
                                    {paginated.map((c, i) => (
                                        <StyledTr
                                            key={i}
                                            onClick={() => openHistory(c)}
                                            className="cursor-pointer"
                                            title={`Open history for ${c.name}`}
                                        >
                                            <StyledTd className="font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => openHistory(c)}
                                                    className="hover:text-primary hover:underline text-left"
                                                >
                                                    {c.name}
                                                </button>
                                            </StyledTd>
                                            <StyledTd mono className="text-muted-foreground">{c.phone}</StyledTd>
                                            <StyledTd>
                                                {c.location ? (
                                                    <span className="px-2 py-1 rounded text-xs font-medium bg-violet-100 text-violet-900">{c.location}</span>
                                                ) : '—'}
                                            </StyledTd>
                                            <StyledTd right className="font-semibold">{c.totalOrders}</StyledTd>
                                            <StyledTd right mono>₹ {c.totalRevenue.toLocaleString('en-IN')}</StyledTd>
                                            <StyledTd right mono>₹ {Math.round(c.averageOrderValue).toLocaleString('en-IN')}</StyledTd>
                                            <StyledTd className="text-xs text-muted-foreground">
                                                {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('en-IN') : '—'}
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
                )}
            </DataCard>

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
                                     {selectedCustomer?.location && (
                                        <>
                                            <span className="text-muted-foreground/30">•</span>
                                            <span className="flex items-center gap-1.5 opacity-90"><MapPin size={14} className="text-primary/70"/> {selectedCustomer.location}</span>
                                        </>
                                     )}
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
