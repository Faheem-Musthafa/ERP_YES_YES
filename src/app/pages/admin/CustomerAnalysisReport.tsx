import React, { useState, useEffect } from 'react';
import { supabase } from '@/app/supabase';
import { Button } from '@/app/components/ui/button';
import { AlertTriangle, Download, MapPin, TrendingUp, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { fmt, downloadCSV, isCollectedReceiptStatus } from '@/app/utils';
import {
    PageHeader, DataCard, StyledThead, StyledTh, StyledTr, StyledTd,
    SearchBar, Spinner, EmptyState, TablePagination, FilterBar, FilterField, StatusBadge
} from '@/app/components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CustomerAnalysis {
    id: string;
    name: string;
    phone: string;
    location: string | null;
    place: string | null;
    openingBalance: number;
    totalOrders: number;
    totalRevenue: number;
    totalCollected: number;
    outstanding: number;
    averageOrderValue: number;
    lastOrderDate: string | null;
    status: string;
}

interface CustomerRow {
    id: string;
    name: string;
    phone: string;
    location: string | null;
    place: string | null;
    opening_balance: number | null;
    is_active: boolean;
}

interface OrderRow {
    customer_id: string | null;
    grand_total: number | null;
    created_at: string;
    status: string;
}

interface ReceiptRow {
    customer_id: string | null;
    amount: number | null;
    payment_status: string | null;
}

export const CustomerAnalysisReport = () => {
    const [data, setData] = useState<CustomerAnalysis[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [locationFilter, setLocationFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: customers, error: custErr } = await supabase
                .from('customers')
                .select('id, name, phone, location, place, opening_balance, is_active');

            if (custErr) throw custErr;

            const { data: orders, error: ordErr } = await supabase
                .from('orders')
                .select('customer_id, grand_total, created_at, status');

            if (ordErr) throw ordErr;

            const { data: receipts, error: receiptErr } = await supabase
                .from('receipts')
                .select('customer_id, amount, payment_status');

            if (receiptErr) throw receiptErr;

            const validOrderStatuses = ['Approved', 'Billed', 'Delivered'];
            const orderMap = new Map<string, { count: number; revenue: number; lastDate: string }>();
            (orders as OrderRow[] | null)?.forEach(o => {
                if (!o.customer_id) return;
                if (!validOrderStatuses.includes(o.status)) return;
                const existing = orderMap.get(o.customer_id) || { count: 0, revenue: 0, lastDate: '' };
                orderMap.set(o.customer_id, {
                    count: existing.count + 1,
                    revenue: existing.revenue + (o.grand_total || 0),
                    lastDate: !existing.lastDate || o.created_at > existing.lastDate ? o.created_at : existing.lastDate,
                });
            });

            const receiptsMap = new Map<string, number>();
            (receipts as ReceiptRow[] | null)?.forEach(r => {
                if (!r.customer_id) return;
                if (!isCollectedReceiptStatus(r.payment_status)) return;
                receiptsMap.set(r.customer_id, (receiptsMap.get(r.customer_id) ?? 0) + (r.amount ?? 0));
            });

            const analysis = (customers as CustomerRow[] | null)?.map(c => {
                const orderInfo = orderMap.get(c.id) || { count: 0, revenue: 0, lastDate: null };
                const openingBalance = c.opening_balance ?? 0;
                const totalCollected = receiptsMap.get(c.id) ?? 0;
                return {
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    location: c.location,
                    place: c.place,
                    openingBalance,
                    totalOrders: orderInfo.count,
                    totalRevenue: orderInfo.revenue,
                    totalCollected,
                    outstanding: openingBalance + orderInfo.revenue - totalCollected,
                    averageOrderValue: orderInfo.count > 0 ? orderInfo.revenue / orderInfo.count : 0,
                    lastOrderDate: orderInfo.lastDate,
                    status: c.is_active ? 'Active' : 'Inactive',
                } as CustomerAnalysis;
            }) || [];

            setData(analysis.sort((a, b) => b.totalRevenue - a.totalRevenue));
        } catch (err: any) {
            toast.error(err.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void fetchData(); }, []);

    const filtered = data.filter(c => {
        const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
        const matchLocation = locationFilter === 'all' || c.location === locationFilter;
        return matchSearch && matchLocation;
    });

    useEffect(() => { setCurrentPage(1); }, [search, locationFilter]);
    const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const locationOptions = Array.from(
        new Set(data.map(c => c.location).filter((location): location is string => Boolean(location)))
    ).sort((a, b) => a.localeCompare(b));

    const locationData = locationOptions.map(loc => ({
        name: loc,
        customers: filtered.filter(c => c.location === loc).length,
        revenue: filtered.filter(c => c.location === loc).reduce((s, c) => s + c.totalRevenue, 0),
    })).filter(item => item.customers > 0 || item.revenue > 0);

    const totalOpeningBalance = filtered.reduce((s, c) => s + c.openingBalance, 0);
    const totalDue = totalOpeningBalance + filtered.reduce((s, c) => s + c.totalRevenue, 0);
    const collectionRate = totalDue > 0 ? Math.min((filtered.reduce((s, c) => s + c.totalCollected, 0) / totalDue) * 100, 100) : 0;
    const topCustomers = filtered.slice(0, 5);
    const topLocation = [...locationData].sort((a, b) => b.revenue - a.revenue)[0] ?? null;
    const atRiskCustomers = filtered.filter(c => c.outstanding > 0).length;
    const stats = {
        totalCustomers: filtered.length,
        totalRevenue: filtered.reduce((s, c) => s + c.totalRevenue, 0),
        totalCollected: filtered.reduce((s, c) => s + c.totalCollected, 0),
        totalOutstanding: filtered.reduce((s, c) => s + c.outstanding, 0),
        avgOrderValue: filtered.length > 0 ? filtered.reduce((s, c) => s + c.averageOrderValue, 0) / filtered.length : 0,
        activeCustomers: filtered.filter(c => c.status === 'Active').length,
    };

    const COLORS = ['#00bdb4', '#ff6b6b', '#4ecdc4', '#ffe66d'];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Customer Analysis Report"
                subtitle="Customer health, district spread, revenue and outstanding movement"
                actions={
                    <Button
                        size="sm"
                        onClick={() => downloadCSV(
                            ['Name', 'Phone', 'Location', 'Place', 'Opening Balance', 'Total Orders', 'Total Revenue', 'Collected', 'Outstanding', 'Avg Order Value', 'Last Order', 'Status'],
                            paginated.map(c => [
                                c.name,
                                c.phone,
                                c.location || '-',
                                c.place || '-',
                                c.openingBalance,
                                c.totalOrders,
                                c.totalRevenue,
                                c.totalCollected,
                                c.outstanding,
                                c.averageOrderValue.toFixed(0),
                                c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : '-',
                                c.status,
                            ]),
                            'customer_analysis_report.csv'
                        )}
                        className="gap-2"
                    >
                        <Download size={15} /> Export
                    </Button>
                }
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Customers', value: stats.totalCustomers, sub: `${stats.activeCustomers} active accounts`, icon: Users, tone: 'bg-sky-50 text-sky-700 border-sky-100' },
                    { label: 'Total Revenue', value: fmt(stats.totalRevenue), sub: `Opening due ${fmt(totalOpeningBalance)}`, icon: TrendingUp, tone: 'bg-teal-50 text-teal-700 border-teal-100' },
                    { label: 'Collected', value: fmt(stats.totalCollected), sub: `${collectionRate.toFixed(1)}% of total due`, icon: Wallet, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                    { label: 'Outstanding', value: fmt(stats.totalOutstanding), sub: `${atRiskCustomers} customers pending`, icon: AlertTriangle, tone: 'bg-amber-50 text-amber-700 border-amber-100' },
                ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <DataCard key={i} className="p-4 border-border/70">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">{stat.label}</p>
                                    <p className="text-2xl font-bold mt-2 leading-none">{stat.value}</p>
                                    <p className="text-xs text-muted-foreground mt-2">{stat.sub}</p>
                                </div>
                                <div className={`rounded-2xl border px-3 py-3 ${stat.tone}`}>
                                    <Icon size={20} />
                                </div>
                            </div>
                        </DataCard>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
                <DataCard className="p-5 border-border/70 overflow-hidden">
                    <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Analysis Lens</p>
                                <h3 className="text-2xl font-semibold text-foreground">Customer portfolio is centered around {topLocation?.name ?? 'active districts'}</h3>
                                <p className="max-w-2xl text-sm text-muted-foreground">
                                    This view blends opening dues, realized collections, and district concentration so you can spot which accounts need follow-up first.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-cyan-50 px-4 py-3">
                                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">Top District</p>
                                <div className="mt-2 flex items-center gap-2 text-teal-900">
                                    <MapPin size={16} />
                                    <span className="text-lg font-semibold">{topLocation?.name ?? 'Not Set'}</span>
                                </div>
                                <p className="mt-1 text-xs text-teal-700">
                                    {topLocation ? `${topLocation.customers} customers • ${fmt(topLocation.revenue)}` : 'No district data yet'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Selected Scope</p>
                                <p className="mt-2 text-sm font-medium text-foreground">{locationFilter === 'all' ? 'All districts' : locationFilter}</p>
                                <p className="text-xs text-muted-foreground mt-1">{filtered.length} visible customers</p>
                            </div>
                            <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Average Ticket</p>
                                <p className="mt-2 text-sm font-medium text-foreground">{fmt(stats.avgOrderValue)}</p>
                                <p className="text-xs text-muted-foreground mt-1">Across valid sales orders only</p>
                            </div>
                            <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Collection Efficiency</p>
                                    <span className="text-sm font-semibold text-foreground">{collectionRate.toFixed(1)}%</span>
                                </div>
                                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-border/60">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all"
                                        style={{ width: `${collectionRate}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">Collected versus opening balance plus revenue</p>
                            </div>
                        </div>
                    </div>
                </DataCard>

                <DataCard className="p-5 border-border/70">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Top Customers</p>
                            <h3 className="mt-1 text-lg font-semibold text-foreground">Highest revenue accounts in view</h3>
                        </div>
                        <StatusBadge status={atRiskCustomers > 0 ? 'Pending' : 'Completed'} />
                    </div>
                    <div className="mt-4 space-y-3">
                        {topCustomers.length === 0 ? (
                            <EmptyState icon={Users} message="No customer data in this filter" />
                        ) : topCustomers.map((customer, index) => (
                            <div key={customer.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                                            {index + 1}
                                        </span>
                                        <p className="truncate text-sm font-semibold text-foreground">{customer.name}</p>
                                    </div>
                                    <p className="mt-1 truncate text-xs text-muted-foreground">
                                        {customer.location ?? 'No district'} • {customer.totalOrders} orders
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-sm font-semibold text-foreground">{fmt(customer.totalRevenue)}</p>
                                    <p className="mt-1 text-xs text-amber-600">Due {fmt(customer.outstanding)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </DataCard>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DataCard className="p-5 border-border/70">
                    <div className="mb-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Coverage</p>
                        <h3 className="mt-1 text-lg font-semibold text-foreground">Customers by District</h3>
                    </div>
                    {locationData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={locationData} dataKey="customers" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                    {locationData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <EmptyState icon={MapPin} message="No district distribution available" sub="Add customer locations to populate this chart." />}
                </DataCard>

                <DataCard className="p-5 border-border/70">
                    <div className="mb-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Revenue Mix</p>
                        <h3 className="mt-1 text-lg font-semibold text-foreground">Revenue by District</h3>
                    </div>
                    {locationData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={locationData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="revenue" fill="#00bdb4" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <EmptyState icon={TrendingUp} message="No revenue distribution available" sub="Orders with customer districts will appear here." />}
                </DataCard>
            </div>

            {/* Filter & Search */}
            <FilterBar className="border-border/70">
                <SearchBar
                    placeholder="Search by name or phone..."
                    value={search}
                    onChange={setSearch}
                    className="w-full md:max-w-md"
                />
                <div className="flex flex-wrap items-end gap-3">
                    <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Visible Revenue</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-foreground">{fmt(stats.totalRevenue)}</p>
                    </div>
                    <FilterField label="Location">
                        <Select value={locationFilter} onValueChange={setLocationFilter}>
                            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Locations</SelectItem>
                                {locationOptions.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </FilterField>
                </div>
            </FilterBar>

            {/* Table */}
            <DataCard className="border-border/70">
                {loading ? <Spinner /> : filtered.length === 0 ? (
                    <EmptyState icon={Users} message="No customers found" />
                ) : (
                    <>
                        <div className="flex flex-col gap-3 border-b border-border/70 bg-muted/10 px-4 py-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Customer Ledger View</p>
                                <p className="mt-1 text-sm text-foreground">
                                    Opening due, realized collections and outstanding balance for each customer.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                                    {filtered.length} customers
                                </span>
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                                    Collected {fmt(stats.totalCollected)}
                                </span>
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                                    Due {fmt(stats.totalOutstanding)}
                                </span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <StyledThead>
                                    <tr>
                                        <StyledTh>Customer Name</StyledTh>
                                        <StyledTh>Phone</StyledTh>
                                        <StyledTh>Location</StyledTh>
                                        <StyledTh right>Opening</StyledTh>
                                        <StyledTh right>Orders</StyledTh>
                                        <StyledTh right>Revenue</StyledTh>
                                        <StyledTh right>Collected</StyledTh>
                                        <StyledTh right>Outstanding</StyledTh>
                                        <StyledTh right>Avg Order</StyledTh>
                                        <StyledTh>Last Order</StyledTh>
                                        <StyledTh>Status</StyledTh>
                                    </tr>
                                </StyledThead>
                                <tbody>
                                    {paginated.map(c => (
                                        <StyledTr key={c.id}>
                                            <StyledTd className="font-medium">{c.name}</StyledTd>
                                            <StyledTd mono className="text-muted-foreground">{c.phone}</StyledTd>
                                            <StyledTd>
                                                {c.location ? (
                                                    <span className="px-2 py-1 rounded text-xs font-medium bg-violet-100 text-violet-900">{c.location}</span>
                                                ) : '—'}
                                            </StyledTd>
                                            <StyledTd right mono>₹ {c.openingBalance.toLocaleString('en-IN')}</StyledTd>
                                            <StyledTd right className="font-semibold">{c.totalOrders}</StyledTd>
                                            <StyledTd right mono>₹ {c.totalRevenue.toLocaleString('en-IN')}</StyledTd>
                                            <StyledTd right mono className="text-emerald-600">₹ {c.totalCollected.toLocaleString('en-IN')}</StyledTd>
                                            <StyledTd right mono className="font-semibold text-amber-600">₹ {c.outstanding.toLocaleString('en-IN')}</StyledTd>
                                            <StyledTd right mono>₹ {Math.round(c.averageOrderValue).toLocaleString('en-IN')}</StyledTd>
                                            <StyledTd className="text-xs text-muted-foreground">
                                                {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('en-IN') : '—'}
                                            </StyledTd>
                                            <StyledTd>
                                                <StatusBadge status={c.status} />
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
        </div>
    );
};
