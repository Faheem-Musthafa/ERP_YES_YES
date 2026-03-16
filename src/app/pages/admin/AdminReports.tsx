import React, { useState, useEffect } from 'react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { fmt, downloadCSV } from '@/app/utils';
import {
    PageHeader, DataCard, StyledThead, StyledTh, StyledTr, StyledTd,
    StatusBadge, SearchBar, Spinner, EmptyState, FilterBar, FilterField, TablePagination
} from '@/app/components/ui/primitives';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Download, FileText, TrendingUp, Users, ShoppingCart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────

interface ReportItem {
    id: string;
    quantity: number;
    dealer_price: number;
    discount_pct: number;
    amount: number;
    products: { name: string; sku: string; brands: { name: string } | null } | null;
    orders: { order_number: string; status: string; company: string; created_at: string; customers: { name: string } | null } | null;
}

interface RevenueRow {
    month: string;
    totalOrders: number;
    approvedRevenue: number;
    billedRevenue: number;
    deliveredRevenue: number;
    totalRevenue: number;
}

interface StaffRow {
    name: string;
    totalOrders: number;
    approved: number;
    rejected: number;
    revenue: number;
    avgOrderValue: number;
}

interface CustomerRow {
    name: string;
    place: string;
    totalOrders: number;
    revenue: number;
    lastOrderDate: string;
}

// ── Main Component ───────────────────────────────────────────────────────────

export const AdminReports = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('itemwise');

    // ── Item-wise state ──
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<ReportItem[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // ── Revenue summary state ──
    const [revenueLoading, setRevenueLoading] = useState(false);
    const [revenueData, setRevenueData] = useState<RevenueRow[]>([]);
    const [revPage, setRevPage] = useState(1);

    // ── Staff performance state ──
    const [staffLoading, setStaffLoading] = useState(false);
    const [staffData, setStaffData] = useState<StaffRow[]>([]);
    const [staffPage, setStaffPage] = useState(1);

    // ── Customer-wise state ──
    const [custLoading, setCustLoading] = useState(false);
    const [custData, setCustData] = useState<CustomerRow[]>([]);
    const [custSearch, setCustSearch] = useState('');
    const [custPage, setCustPage] = useState(1);

    // ── Item-wise fetch ──
    useEffect(() => { fetchItemData(); }, [statusFilter, dateFrom, dateTo]);

    const fetchItemData = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('order_items')
                .select(`id, quantity, dealer_price, discount_pct, amount,
                    products (name, sku, brands(name)),
                    orders!inner (order_number, status, company, created_at, customers (name))`)
                .order('id', { ascending: false });

            if (statusFilter !== 'all') query = query.eq('orders.status', statusFilter);
            if (dateFrom) { const from = new Date(dateFrom); from.setHours(0, 0, 0, 0); query = query.gte('orders.created_at', from.toISOString()); }
            if (dateTo) { const to = new Date(dateTo); to.setHours(23, 59, 59, 999); query = query.lte('orders.created_at', to.toISOString()); }

            const { data, error } = await query;
            if (error) throw error;
            setItems(data ?? []);
        } catch (err: any) {
            toast.error('Failed to fetch report data: ' + err.message);
        } finally { setLoading(false); }
    };

    // ── Revenue summary fetch ──
    const fetchRevenueData = async () => {
        setRevenueLoading(true);
        try {
            const { data: orders, error } = await supabase
                .from('orders')
                .select('id, status, grand_total, created_at')
                .in('status', ['Approved', 'Billed', 'Delivered'])
                .order('created_at', { ascending: false });
            if (error) throw error;

            const months: Record<string, RevenueRow> = {};
            (orders ?? []).forEach(o => {
                const d = new Date(o.created_at);
                const key = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
                if (!months[key]) months[key] = { month: key, totalOrders: 0, approvedRevenue: 0, billedRevenue: 0, deliveredRevenue: 0, totalRevenue: 0 };
                months[key].totalOrders += 1;
                months[key].totalRevenue += o.grand_total ?? 0;
                if (o.status === 'Approved') months[key].approvedRevenue += o.grand_total ?? 0;
                if (o.status === 'Billed') months[key].billedRevenue += o.grand_total ?? 0;
                if (o.status === 'Delivered') months[key].deliveredRevenue += o.grand_total ?? 0;
            });
            setRevenueData(Object.values(months));
        } catch (err: any) {
            toast.error('Failed to fetch revenue data: ' + err.message);
        } finally { setRevenueLoading(false); }
    };

    // ── Staff performance fetch ──
    const fetchStaffData = async () => {
        setStaffLoading(true);
        try {
            const [{ data: orders, error: oErr }, { data: users, error: uErr }] = await Promise.all([
                supabase.from('orders').select('id, status, grand_total, created_by'),
                supabase.from('users').select('id, full_name, role').eq('role', 'sales'),
            ]);
            if (oErr || uErr) throw new Error(oErr?.message || uErr?.message || 'Failed');

            const userMap: Record<string, string> = {};
            (users ?? []).forEach(u => { userMap[u.id] = u.full_name; });

            const staff: Record<string, StaffRow> = {};
            (orders ?? []).forEach(o => {
                if (!o.created_by || !userMap[o.created_by]) return;
                if (!staff[o.created_by]) staff[o.created_by] = { name: userMap[o.created_by], totalOrders: 0, approved: 0, rejected: 0, revenue: 0, avgOrderValue: 0 };
                staff[o.created_by].totalOrders += 1;
                if (['Approved', 'Billed', 'Delivered'].includes(o.status)) {
                    staff[o.created_by].approved += 1;
                    staff[o.created_by].revenue += o.grand_total ?? 0;
                }
                if (o.status === 'Rejected') staff[o.created_by].rejected += 1;
            });
            const rows = Object.values(staff).map(s => ({
                ...s, avgOrderValue: s.approved > 0 ? Math.round(s.revenue / s.approved) : 0,
            })).sort((a, b) => b.revenue - a.revenue);
            setStaffData(rows);
        } catch (err: any) {
            toast.error('Failed to fetch staff data: ' + err.message);
        } finally { setStaffLoading(false); }
    };

    // ── Customer-wise fetch ──
    const fetchCustData = async () => {
        setCustLoading(true);
        try {
            const { data: orders, error } = await supabase
                .from('orders')
                .select('id, customer_id, grand_total, status, created_at, customers(name, place)')
                .in('status', ['Approved', 'Billed', 'Delivered'])
                .order('created_at', { ascending: false });
            if (error) throw error;

            const custs: Record<string, CustomerRow> = {};
            (orders ?? []).forEach(o => {
                const cid = o.customer_id;
                if (!cid) return;
                const cust = o.customers as { name: string; place: string } | null;
                if (!custs[cid]) custs[cid] = { name: cust?.name ?? '—', place: cust?.place ?? '—', totalOrders: 0, revenue: 0, lastOrderDate: o.created_at };
                custs[cid].totalOrders += 1;
                custs[cid].revenue += o.grand_total ?? 0;
                if (o.created_at > custs[cid].lastOrderDate) custs[cid].lastOrderDate = o.created_at;
            });
            setCustData(Object.values(custs).sort((a, b) => b.revenue - a.revenue));
        } catch (err: any) {
            toast.error('Failed to fetch customer data: ' + err.message);
        } finally { setCustLoading(false); }
    };

    // Fetch on tab change
    useEffect(() => {
        if (activeTab === 'revenue' && revenueData.length === 0) fetchRevenueData();
        if (activeTab === 'staff' && staffData.length === 0) fetchStaffData();
        if (activeTab === 'customer' && custData.length === 0) fetchCustData();
    }, [activeTab]);

    // ── Item-wise filtering ──
    const filteredItems = items.filter(item => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (item.orders?.order_number?.toLowerCase() || '').includes(s) ||
            (item.orders?.customers?.name?.toLowerCase() || '').includes(s) ||
            (item.products?.name?.toLowerCase() || '').includes(s);
    });
    useEffect(() => { setCurrentPage(1); }, [search, statusFilter, dateFrom, dateTo, items.length]);
    const page = Math.min(currentPage, Math.max(1, Math.ceil(filteredItems.length / pageSize)));
    const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

    // ── Customer-wise filtering ──
    const filteredCusts = custData.filter(c => !custSearch || c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.place.toLowerCase().includes(custSearch.toLowerCase()));
    useEffect(() => { setCustPage(1); }, [custSearch]);
    const cPage = Math.min(custPage, Math.max(1, Math.ceil(filteredCusts.length / pageSize)));
    const paginatedCusts = filteredCusts.slice((cPage - 1) * pageSize, cPage * pageSize);

    // ── CSV exports ──
    const exportItemCSV = () => {
        downloadCSV(
            ['Date', 'Order No', 'Customer', 'Company', 'Product', 'Brand', 'Qty', 'DP', 'Discount %', 'Amount', 'Status'],
            filteredItems.map(item => [
                new Date(item.orders?.created_at ?? '').toLocaleDateString(), item.orders?.order_number ?? '',
                item.orders?.customers?.name ?? '', item.orders?.company ?? '',
                item.products?.name ?? '', item.products?.brands?.name ?? '',
                item.quantity, item.dealer_price, item.discount_pct, item.amount, item.orders?.status ?? '',
            ]),
            `Sales_Item_Report_${new Date().toISOString().split('T')[0]}.csv`
        );
    };

    const exportRevenueCSV = () => {
        downloadCSV(
            ['Month', 'Total Orders', 'Approved Revenue', 'Billed Revenue', 'Delivered Revenue', 'Total Revenue'],
            revenueData.map(r => [r.month, r.totalOrders, r.approvedRevenue, r.billedRevenue, r.deliveredRevenue, r.totalRevenue]),
            `Revenue_Summary_${new Date().toISOString().split('T')[0]}.csv`
        );
    };

    const exportStaffCSV = () => {
        downloadCSV(
            ['Salesperson', 'Total Orders', 'Approved', 'Rejected', 'Revenue', 'Avg Order Value'],
            staffData.map(s => [s.name, s.totalOrders, s.approved, s.rejected, s.revenue, s.avgOrderValue]),
            `Staff_Performance_${new Date().toISOString().split('T')[0]}.csv`
        );
    };

    const exportCustCSV = () => {
        downloadCSV(
            ['Customer', 'Place', 'Total Orders', 'Revenue', 'Last Order'],
            filteredCusts.map(c => [c.name, c.place, c.totalOrders, c.revenue, new Date(c.lastOrderDate).toLocaleDateString()]),
            `Customer_Report_${new Date().toISOString().split('T')[0]}.csv`
        );
    };

    const csvExporters: Record<string, () => void> = { itemwise: exportItemCSV, revenue: exportRevenueCSV, staff: exportStaffCSV, customer: exportCustCSV };

    return (
        <div className="space-y-6 pb-12">
            <PageHeader
                title="Reports"
                subtitle="Comprehensive sales and performance analytics"
                actions={
                    <Button onClick={() => csvExporters[activeTab]?.()} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                        <Download size={16} /> Export CSV
                    </Button>
                }
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
                <TabsList className="h-9 bg-muted/60">
                    <TabsTrigger value="itemwise" className="text-xs font-semibold gap-1.5"><FileText size={13} /> Item-wise</TabsTrigger>
                    <TabsTrigger value="revenue" className="text-xs font-semibold gap-1.5"><TrendingUp size={13} /> Revenue</TabsTrigger>
                    <TabsTrigger value="staff" className="text-xs font-semibold gap-1.5"><Users size={13} /> Staff</TabsTrigger>
                    <TabsTrigger value="customer" className="text-xs font-semibold gap-1.5"><ShoppingCart size={13} /> Customer</TabsTrigger>
                </TabsList>

                {/* ── Item-wise Tab ── */}
                <TabsContent value="itemwise" className="space-y-5">
                    <FilterBar>
                        <SearchBar placeholder="Search product, customer, or order no..." value={search} onChange={setSearch} className="w-full md:max-w-md" />
                        <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                            <FilterField label="Status" className="shrink-0">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-36 h-10"><SelectValue placeholder="All Status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Approved">Approved</SelectItem>
                                        <SelectItem value="Billed">Billed</SelectItem>
                                        <SelectItem value="Delivered">Delivered</SelectItem>
                                        <SelectItem value="Rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FilterField>
                            <FilterField label="From" className="shrink-0">
                                <Input type="date" value={dateFrom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)} className="h-10 text-sm w-36" />
                            </FilterField>
                            <FilterField label="To" className="shrink-0">
                                <Input type="date" value={dateTo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)} className="h-10 text-sm w-36" />
                            </FilterField>
                        </div>
                    </FilterBar>

                    <DataCard>
                        {loading ? <div className="flex justify-center py-20"><Spinner size={32} /></div> : filteredItems.length === 0 ? (
                            <EmptyState icon={FileText} message="No sales data found" sub="Try adjusting your filters." />
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <StyledThead>
                                            <tr>
                                                <StyledTh>Date</StyledTh>
                                                <StyledTh>Order No</StyledTh>
                                                <StyledTh>Customer</StyledTh>
                                                <StyledTh>Product</StyledTh>
                                                <StyledTh>Brand</StyledTh>
                                                <StyledTh right>Qty</StyledTh>
                                                <StyledTh right>DP (₹)</StyledTh>
                                                <StyledTh right>Disc %</StyledTh>
                                                <StyledTh right>Amount (₹)</StyledTh>
                                                <StyledTh center>Status</StyledTh>
                                            </tr>
                                        </StyledThead>
                                        <tbody>
                                            {paginatedItems.map(item => (
                                                <StyledTr key={item.id}>
                                                    <StyledTd mono className="text-xs text-muted-foreground whitespace-nowrap">{new Date(item.orders?.created_at ?? '').toLocaleDateString()}</StyledTd>
                                                    <StyledTd className="font-semibold text-primary whitespace-nowrap">{item.orders?.order_number}</StyledTd>
                                                    <StyledTd className="font-medium truncate max-w-[150px]">{item.orders?.customers?.name ?? '—'}</StyledTd>
                                                    <StyledTd className="text-foreground font-medium truncate max-w-[200px]">{item.products?.name ?? '—'}</StyledTd>
                                                    <StyledTd className="text-muted-foreground text-xs uppercase tracking-wider">{item.products?.brands?.name ?? '—'}</StyledTd>
                                                    <StyledTd right mono className="font-bold">{item.quantity}</StyledTd>
                                                    <StyledTd right mono className="text-muted-foreground">{item.dealer_price?.toLocaleString('en-IN') ?? '0'}</StyledTd>
                                                    <StyledTd right mono className="text-red-600/80">{item.discount_pct}%</StyledTd>
                                                    <StyledTd right mono className="font-bold text-emerald-600">₹{item.amount?.toLocaleString('en-IN') ?? '0'}</StyledTd>
                                                    <StyledTd center><StatusBadge status={item.orders?.status} /></StyledTd>
                                                </StyledTr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <TablePagination totalItems={filteredItems.length} currentPage={page} pageSize={pageSize} onPageChange={setCurrentPage} itemLabel="items" />
                            </>
                        )}
                    </DataCard>
                </TabsContent>

                {/* ── Revenue Summary Tab ── */}
                <TabsContent value="revenue" className="space-y-5">
                    <DataCard>
                        {revenueLoading ? <div className="flex justify-center py-20"><Spinner size={32} /></div> : revenueData.length === 0 ? (
                            <EmptyState icon={TrendingUp} message="No revenue data" sub="Revenue data will appear once orders are processed." />
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <StyledThead>
                                            <tr>
                                                <StyledTh>Month</StyledTh>
                                                <StyledTh right>Total Orders</StyledTh>
                                                <StyledTh right>Approved (₹)</StyledTh>
                                                <StyledTh right>Billed (₹)</StyledTh>
                                                <StyledTh right>Delivered (₹)</StyledTh>
                                                <StyledTh right>Total Revenue (₹)</StyledTh>
                                            </tr>
                                        </StyledThead>
                                        <tbody>
                                            {revenueData.slice((revPage - 1) * pageSize, revPage * pageSize).map(r => (
                                                <StyledTr key={r.month}>
                                                    <StyledTd className="font-semibold">{r.month}</StyledTd>
                                                    <StyledTd right mono>{r.totalOrders}</StyledTd>
                                                    <StyledTd right mono className="text-emerald-600">{fmt(r.approvedRevenue)}</StyledTd>
                                                    <StyledTd right mono className="text-blue-600">{fmt(r.billedRevenue)}</StyledTd>
                                                    <StyledTd right mono className="text-purple-600">{fmt(r.deliveredRevenue)}</StyledTd>
                                                    <StyledTd right mono className="font-bold text-foreground">{fmt(r.totalRevenue)}</StyledTd>
                                                </StyledTr>
                                            ))}
                                            <StyledTr className="bg-muted/50 font-bold">
                                                <StyledTd className="font-bold">Total</StyledTd>
                                                <StyledTd right mono>{revenueData.reduce((s, r) => s + r.totalOrders, 0)}</StyledTd>
                                                <StyledTd right mono className="text-emerald-600">{fmt(revenueData.reduce((s, r) => s + r.approvedRevenue, 0))}</StyledTd>
                                                <StyledTd right mono className="text-blue-600">{fmt(revenueData.reduce((s, r) => s + r.billedRevenue, 0))}</StyledTd>
                                                <StyledTd right mono className="text-purple-600">{fmt(revenueData.reduce((s, r) => s + r.deliveredRevenue, 0))}</StyledTd>
                                                <StyledTd right mono className="font-bold">{fmt(revenueData.reduce((s, r) => s + r.totalRevenue, 0))}</StyledTd>
                                            </StyledTr>
                                        </tbody>
                                    </table>
                                </div>
                                <TablePagination totalItems={revenueData.length} currentPage={revPage} pageSize={pageSize} onPageChange={setRevPage} itemLabel="months" />
                            </>
                        )}
                    </DataCard>
                </TabsContent>

                {/* ── Staff Performance Tab ── */}
                <TabsContent value="staff" className="space-y-5">
                    <DataCard>
                        {staffLoading ? <div className="flex justify-center py-20"><Spinner size={32} /></div> : staffData.length === 0 ? (
                            <EmptyState icon={Users} message="No staff performance data" sub="Staff performance will appear once sales orders are created." />
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <StyledThead>
                                            <tr>
                                                <StyledTh>#</StyledTh>
                                                <StyledTh>Salesperson</StyledTh>
                                                <StyledTh right>Total Orders</StyledTh>
                                                <StyledTh right>Approved</StyledTh>
                                                <StyledTh right>Rejected</StyledTh>
                                                <StyledTh right>Revenue (₹)</StyledTh>
                                                <StyledTh right>Avg Order (₹)</StyledTh>
                                            </tr>
                                        </StyledThead>
                                        <tbody>
                                            {staffData.slice((staffPage - 1) * pageSize, staffPage * pageSize).map((s, i) => (
                                                <StyledTr key={s.name}>
                                                    <StyledTd mono className="text-muted-foreground">{(staffPage - 1) * pageSize + i + 1}</StyledTd>
                                                    <StyledTd className="font-semibold">{s.name}</StyledTd>
                                                    <StyledTd right mono>{s.totalOrders}</StyledTd>
                                                    <StyledTd right mono className="text-emerald-600">{s.approved}</StyledTd>
                                                    <StyledTd right mono className="text-red-600">{s.rejected}</StyledTd>
                                                    <StyledTd right mono className="font-bold text-foreground">{fmt(s.revenue)}</StyledTd>
                                                    <StyledTd right mono className="text-muted-foreground">{fmt(s.avgOrderValue)}</StyledTd>
                                                </StyledTr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <TablePagination totalItems={staffData.length} currentPage={staffPage} pageSize={pageSize} onPageChange={setStaffPage} itemLabel="salespeople" />
                            </>
                        )}
                    </DataCard>
                </TabsContent>

                {/* ── Customer-wise Tab ── */}
                <TabsContent value="customer" className="space-y-5">
                    <SearchBar
                        placeholder="Search by customer name or place..."
                        value={custSearch}
                        onChange={setCustSearch}
                        className="max-w-sm"
                    />
                    <DataCard>
                        {custLoading ? <div className="flex justify-center py-20"><Spinner size={32} /></div> : filteredCusts.length === 0 ? (
                            <EmptyState icon={ShoppingCart} message="No customer data" sub="Customer data will appear once orders are placed." />
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <StyledThead>
                                            <tr>
                                                <StyledTh>#</StyledTh>
                                                <StyledTh>Customer</StyledTh>
                                                <StyledTh>Place</StyledTh>
                                                <StyledTh right>Orders</StyledTh>
                                                <StyledTh right>Revenue (₹)</StyledTh>
                                                <StyledTh>Last Order</StyledTh>
                                            </tr>
                                        </StyledThead>
                                        <tbody>
                                            {paginatedCusts.map((c, i) => (
                                                <StyledTr key={c.name + i}>
                                                    <StyledTd mono className="text-muted-foreground">{(cPage - 1) * pageSize + i + 1}</StyledTd>
                                                    <StyledTd className="font-semibold">{c.name}</StyledTd>
                                                    <StyledTd className="text-muted-foreground">{c.place}</StyledTd>
                                                    <StyledTd right mono>{c.totalOrders}</StyledTd>
                                                    <StyledTd right mono className="font-bold text-foreground">{fmt(c.revenue)}</StyledTd>
                                                    <StyledTd mono className="text-xs text-muted-foreground">{new Date(c.lastOrderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</StyledTd>
                                                </StyledTr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <TablePagination totalItems={filteredCusts.length} currentPage={custPage} pageSize={pageSize} onPageChange={setCustPage} itemLabel="customers" />
                            </>
                        )}
                    </DataCard>
                </TabsContent>
            </Tabs>
        </div>
    );
};
