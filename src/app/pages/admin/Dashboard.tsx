import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { fmt, fmtK, isCollectedReceiptStatus } from '@/app/utils';
import { Link } from 'react-router';
import { PageHeader, DataCard, Spinner, StatusBadge, EmptyState, ErrorState } from '@/app/components/ui/primitives';

// Shadcn UI components
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter,
} from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/app/components/ui/table';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
} from '@/app/components/ui/chart';

// Recharts
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';

// Lucide icons
import {
  TrendingUp, ShoppingCart, Users,
  DollarSign, ArrowUpRight, ArrowDownRight, Activity,
  AlertTriangle, CheckCircle2, BarChart3, Calendar,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type DateRange = '7d' | '30d' | '90d' | '6m' | '1y' | 'all';
const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
];

const getRangeStart = (range: DateRange): Date | null => {
  const now = new Date();
  switch (range) {
    case '7d': return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    case '30d': return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    case '90d': return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
    case '6m': return new Date(now.getFullYear(), now.getMonth() - 6, 1);
    case '1y': return new Date(now.getFullYear() - 1, now.getMonth(), 1);
    case 'all': return null;
  }
};

const getChartMonthCount = (range: DateRange): number => {
  switch (range) {
    case '7d': case '30d': return 1;
    case '90d': return 3;
    case '6m': return 6;
    case '1y': return 12;
    case 'all': return 6;
  }
};

interface DashboardStats {
  totalRevenue: number;
  monthRevenue: number;
  prevMonthRevenue: number;
  totalCollected: number;
  monthCollected: number;
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  billedOrders: number;
  deliveredOrders: number;
  rejectedOrders: number;
  totalStaff: number;
  activeStaff: number;
  totalProducts: number;
  lowStockCount: number;
  totalCustomers: number;
}

const EMPTY_STATS: DashboardStats = {
  totalRevenue: 0, monthRevenue: 0, prevMonthRevenue: 0,
  totalCollected: 0, monthCollected: 0,
  totalOrders: 0, pendingOrders: 0, approvedOrders: 0,
  billedOrders: 0, deliveredOrders: 0, rejectedOrders: 0,
  totalStaff: 0, activeStaff: 0,
  totalProducts: 0, lowStockCount: 0, totalCustomers: 0,
};

interface RecentOrder {
  id: string;
  order_number: string;
  status: string;
  grand_total: number;
  created_at: string;
  created_by: string | null;
  customers: { name: string } | null;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock_qty: number;
  brands: { name: string } | null;
}

// ── Chart configs ─────────────────────────────────────────────────────────────

const revenueChartConfig = {
  revenue: { label: 'Revenue', color: '#0d9488' },
  collected: { label: 'Collected', color: '#7c3aed' },
};

// ── Main Dashboard ────────────────────────────────────────────────────────────

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [topSalesmen, setTopSalesmen] = useState<{ name: string; total: number; orders: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockProduct[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; revenue: number; collected: number }[]>([]);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
    const chartMonths = getChartMonthCount(dateRange);
    const chartStart = new Date(now.getFullYear(), now.getMonth() - (chartMonths - 1), 1).toISOString();
    const rangeStart = getRangeStart(dateRange);

    try {
      // Build order query with optional date range filter
      let ordersQuery = supabase.from('orders').select('id, status, grand_total, created_by, created_at, order_number, customers(name)').order('created_at', { ascending: false });
      if (rangeStart) ordersQuery = ordersQuery.gte('created_at', rangeStart.toISOString());

      let receiptsQuery = supabase.from('receipts').select('id, amount, payment_status');
      if (rangeStart) receiptsQuery = receiptsQuery.gte('created_at', rangeStart.toISOString());

      const [
        { data: allOrders, error: allOrdersError },
        { data: monthOrders, error: monthOrdersError },
        { data: prevMonthOrders, error: prevMonthOrdersError },
        { data: allReceipts, error: allReceiptsError },
        { data: monthReceipts, error: monthReceiptsError },
        { data: chartReceipts, error: chartReceiptsError },
        { data: allUsers, error: allUsersError },
        { data: products, error: productsError },
        { data: customers, error: customersError },
      ] = await Promise.all([
        ordersQuery,
        supabase.from('orders').select('id, status, grand_total, created_by').gte('created_at', monthStart),
        supabase.from('orders').select('id, status, grand_total').gte('created_at', prevMonthStart).lte('created_at', prevMonthEnd),
        receiptsQuery,
        supabase.from('receipts').select('id, amount, payment_status').gte('created_at', monthStart),
        supabase.from('receipts').select('id, amount, payment_status, created_at').gte('created_at', chartStart),
        supabase.from('users').select('id, full_name, role, is_active'),
        supabase.from('products').select('id, name, stock_qty, brands(name)').eq('is_active', true),
        supabase.from('customers').select('id', { count: 'exact' }),
      ]);
      const fetchError = allOrdersError || monthOrdersError || prevMonthOrdersError || allReceiptsError || monthReceiptsError || chartReceiptsError || allUsersError || productsError || customersError;
      if (fetchError) throw new Error(fetchError.message);

      const validStatuses = ['Approved', 'Billed', 'Delivered'];
      const salesOrders = (allOrders ?? []).filter(o => validStatuses.includes(o.status));
      const collectedReceipts = (allReceipts ?? []).filter(r => isCollectedReceiptStatus(r.payment_status));
      const monthCollectedReceipts = (monthReceipts ?? []).filter(r => isCollectedReceiptStatus(r.payment_status));
      const chartCollectedReceipts = (chartReceipts ?? []).filter(r => isCollectedReceiptStatus(r.payment_status));
      const totalRevenue = salesOrders.reduce((s, o) => s + (o.grand_total ?? 0), 0);
      const monthRevenue = (monthOrders ?? []).filter(o => validStatuses.includes(o.status)).reduce((s, o) => s + (o.grand_total ?? 0), 0);
      const prevMonthRevenue = (prevMonthOrders ?? []).filter(o => validStatuses.includes(o.status)).reduce((s, o) => s + (o.grand_total ?? 0), 0);
      const totalCollected = collectedReceipts.reduce((s, r) => s + (r.amount ?? 0), 0);
      const monthCollected = monthCollectedReceipts.reduce((s, r) => s + (r.amount ?? 0), 0);

      // Chart data - dynamic based on range
      const monthBuckets: Record<string, { revenue: number; collected: number }> = {};
      for (let i = chartMonths - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
        monthBuckets[key] = { revenue: 0, collected: 0 };
      }
      (allOrders ?? []).filter(o => validStatuses.includes(o.status)).forEach(o => {
        const d = new Date(o.created_at);
        if (d >= new Date(chartStart)) {
          const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
          if (monthBuckets[key]) monthBuckets[key].revenue += o.grand_total ?? 0;
        }
      });
      chartCollectedReceipts.forEach((r) => {
        const d = new Date(r.created_at);
        const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
        if (monthBuckets[key]) monthBuckets[key].collected += r.amount ?? 0;
      });
      setMonthlyRevenue(Object.entries(monthBuckets).map(([month, v]) => ({ month, ...v })));

      // Top salesmen this month
      const salesByUser: Record<string, { name: string; total: number; orders: number }> = {};
      (allUsers ?? []).filter(u => u.role === 'sales').forEach(u => {
        salesByUser[u.id] = { name: u.full_name, total: 0, orders: 0 };
      });
      (monthOrders ?? []).filter(o => validStatuses.includes(o.status)).forEach(o => {
        if (o.created_by && salesByUser[o.created_by]) {
          salesByUser[o.created_by].total += o.grand_total ?? 0;
          salesByUser[o.created_by].orders += 1;
        }
      });
      setTopSalesmen(Object.values(salesByUser).sort((a, b) => b.total - a.total).slice(0, 5));

      const lowStockProds = (products ?? []).filter(p => p.stock_qty <= 5);
      setLowStockItems(lowStockProds.slice(0, 6) as LowStockProduct[]);
      setRecentOrders((allOrders ?? []).slice(0, 8) as RecentOrder[]);

      const all = allOrders ?? [];
      setStats({
        totalRevenue, monthRevenue, prevMonthRevenue,
        totalCollected, monthCollected,
        totalOrders: all.length,
        pendingOrders: all.filter(o => o.status === 'Pending').length,
        approvedOrders: all.filter(o => o.status === 'Approved').length,
        billedOrders: all.filter(o => o.status === 'Billed').length,
        deliveredOrders: all.filter(o => o.status === 'Delivered').length,
        rejectedOrders: all.filter(o => o.status === 'Rejected').length,
        totalStaff: (allUsers ?? []).length,
        activeStaff: (allUsers ?? []).filter(u => u.is_active).length,
        totalProducts: (products ?? []).length,
        lowStockCount: lowStockProds.length,
        totalCustomers: customers?.length ?? 0,
      });
    } catch (err: any) {
      setError(err?.message || 'Unable to load admin dashboard');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Derived values
  const revenueGrowth = stats.prevMonthRevenue > 0
    ? ((stats.monthRevenue - stats.prevMonthRevenue) / stats.prevMonthRevenue * 100)
    : null;

  const collectionRate = stats.totalRevenue > 0
    ? Math.min((stats.totalCollected / stats.totalRevenue) * 100, 100)
    : 0;

  const orderStatusData = useMemo(() => [
    { name: 'Pending', value: stats.pendingOrders, fill: '#f59e0b' },
    { name: 'Approved', value: stats.approvedOrders, fill: '#10b981' },
    { name: 'Billed', value: stats.billedOrders, fill: '#3b82f6' },
    { name: 'Delivered', value: stats.deliveredOrders, fill: '#8b5cf6' },
    { name: 'Rejected', value: stats.rejectedOrders, fill: '#ef4444' },
  ].filter(d => d.value > 0), [stats]);

  const greetHour = new Date().getHours();
  const greeting = greetHour < 12 ? 'Good morning' : greetHour < 17 ? 'Good afternoon' : 'Good evening';
  const monthName = new Date().toLocaleString('en-IN', { month: 'long' });

  if (loading) return <Spinner size={32} />;
  if (error) return <ErrorState message={error} onRetry={() => void fetchAll()} />;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`${greeting}, ${user?.full_name ?? 'Admin'}`}
        subtitle={`Here's your business overview${dateRange === 'all' ? '' : ` for the last ${DATE_RANGE_OPTIONS.find(o => o.value === dateRange)?.label ?? ''}`}`}
        actions={(
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-muted/60 border border-border rounded-lg p-0.5">
              {DATE_RANGE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDateRange(opt.value)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                    dateRange === opt.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 border border-border px-2.5 py-1.5 rounded-lg">
              <Calendar size={12} className="text-primary" />
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        )}
      />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Revenue',
            value: fmtK(stats.totalRevenue),
            icon: <DollarSign size={18} />,
            color: 'text-teal-600',
            bg: 'bg-teal-50',
            border: 'border-teal-200 hover:border-teal-300',
            footer: (
              <div className="flex items-center gap-1.5 mt-2">
                {revenueGrowth !== null ? (
                  revenueGrowth >= 0 ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      <ArrowUpRight size={10} /> +{revenueGrowth.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                      <ArrowDownRight size={10} /> {revenueGrowth.toFixed(1)}%
                    </span>
                  )
                ) : null}
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">vs last month</span>
              </div>
            ),
          },
          {
            label: 'Collected',
            value: fmtK(stats.totalCollected),
            icon: <TrendingUp size={18} />,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
            border: 'border-violet-200 hover:border-violet-300',
            footer: (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>Collection Rate</span>
                  <span className="font-semibold text-foreground">{collectionRate.toFixed(0)}%</span>
                </div>
                <Progress value={collectionRate} className="h-1.5" />
              </div>
            ),
          },
          {
            label: 'Orders',
            value: stats.totalOrders.toString(),
            icon: <ShoppingCart size={18} />,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'border-blue-200 hover:border-blue-300',
            footer: (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{stats.pendingOrders} pending</span>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{stats.approvedOrders} approved</span>
              </div>
            ),
          },
          {
            label: 'People',
            value: `${stats.activeStaff}/${stats.totalStaff}`,
            icon: <Users size={18} />,
            color: 'text-orange-600',
            bg: 'bg-orange-50',
            border: 'border-orange-200 hover:border-orange-300',
            footer: (
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-muted-foreground">{stats.totalCustomers} customers</span>
                {stats.lowStockCount > 0 ? (
                  <span className="flex items-center gap-0.5 text-red-600 font-semibold text-[10px] uppercase tracking-widest">
                    <AlertTriangle size={10} /> {stats.lowStockCount} low stock
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-emerald-600 font-semibold text-[10px] uppercase tracking-widest">
                    <CheckCircle2 size={10} /> Stock ok
                  </span>
                )}
              </div>
            ),
          },
        ].map((kpi, i) => (
          <DataCard key={i} className={`p-5 transition-colors group cursor-default ${kpi.border}`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-xl ${kpi.bg} ${kpi.color} transition-transform group-hover:scale-110`}>{kpi.icon}</div>
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">{kpi.value}</p>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mt-1">{kpi.label}</p>
            {kpi.footer}
          </DataCard>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area chart — Revenue vs Collected (last 6 months) */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Revenue & Collections</CardTitle>
                <CardDescription className="text-xs mt-0.5">{dateRange === 'all' ? 'All time' : `Last ${DATE_RANGE_OPTIONS.find(o => o.value === dateRange)?.label}`} trend</CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px] font-semibold">{DATE_RANGE_OPTIONS.find(o => o.value === dateRange)?.label}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="h-52 w-full">
              <AreaChart data={monthlyRevenue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => fmtK(v)} width={60} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v: any) => fmtK(Number(v))} />} />
                <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} fill="url(#revGrad)" name="Revenue" />
                <Area type="monotone" dataKey="collected" stroke="#7c3aed" strokeWidth={2} fill="url(#colGrad)" name="Collected" />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Donut — Order status breakdown */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Order Status</CardTitle>
            <CardDescription className="text-xs">Breakdown by status</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {orderStatusData.length > 0 ? (
              <>
                <div className="relative w-40 h-40">
                  <PieChart width={160} height={160}>
                    <Pie
                      data={orderStatusData}
                      cx={75} cy={75}
                      innerRadius={44} outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {orderStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} strokeWidth={0} />
                      ))}
                    </Pie>
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold font-mono">{stats.totalOrders}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</span>
                  </div>
                </div>
                <div className="w-full space-y-1.5">
                  {orderStatusData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                        <span className="text-muted-foreground">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{d.value}</span>
                        <span className="text-muted-foreground w-8 text-right">
                          {((d.value / stats.totalOrders) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon={BarChart3} message="No order data" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom tabs section ── */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="h-9 bg-muted/60">
          <TabsTrigger value="orders" className="text-xs font-semibold">Recent Orders</TabsTrigger>
          <TabsTrigger value="salesmen" className="text-xs font-semibold">Top Salespeople</TabsTrigger>
          <TabsTrigger value="stock" className="text-xs font-semibold">
            Low Stock
            {stats.lowStockCount > 0 && (
              <span className="ml-1.5 bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {stats.lowStockCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Recent Orders table */}
        <TabsContent value="orders">
          <Card className="shadow-sm">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Recent Orders</CardTitle>
                <Link
                  to="/admin/sales"
                  className="text-xs text-teal-600 font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
                  aria-label="View all recent orders"
                >
                  View all →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <caption className="sr-only">Recent orders with customer, status, amount and date</caption>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs pl-6">Order #</TableHead>
                    <TableHead className="text-xs">Customer</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right pr-6">Amount</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-0">
                        <EmptyState icon={ShoppingCart} message="No orders yet" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentOrders.map(order => (
                      <TableRow key={order.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-semibold text-teal-600 pl-6">
                          {order.order_number}
                        </TableCell>
                        <TableCell className="text-sm font-medium max-w-[140px] truncate">
                          {(order.customers as { name: string } | null)?.name ?? '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={order.status} className="h-5 px-1.5" />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold pr-6">
                          {fmt(order.grand_total ?? 0)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Salespeople */}
        <TabsContent value="salesmen">
          <Card className="shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">Top Salespeople — {monthName}</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              {topSalesmen.length === 0 ? (
                <EmptyState icon={Users} message="No sales data this month" />
              ) : (
                <div className="space-y-4">
                  {topSalesmen.map((s, i) => {
                    const maxTotal = topSalesmen[0]?.total || 1;
                    const pct = (s.total / maxTotal) * 100;
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-8 text-center">
                          {i < 3 ? (
                            <span className="text-lg">{medals[i]}</span>
                          ) : (
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="text-[10px] bg-muted">
                                {s.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-sm font-semibold truncate">{s.name}</p>
                            <div className="shrink-0 ml-3 text-right">
                              <p className="text-sm font-bold font-mono text-teal-600">{fmtK(s.total)}</p>
                              <p className="text-[10px] text-muted-foreground">{s.orders} orders</p>
                            </div>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Low Stock */}
        <TabsContent value="stock">
          <Card className="shadow-sm">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Low Stock Alerts</CardTitle>
                <Link to="/inventory/stock" className="text-xs text-teal-600 font-semibold hover:underline">
                  Manage inventory →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {lowStockItems.length === 0 ? (
                <EmptyState icon={CheckCircle2} message="All stock levels healthy" sub={`${stats.totalProducts} products tracked`} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs pl-6">Product</TableHead>
                      <TableHead className="text-xs">Brand</TableHead>
                      <TableHead className="text-xs text-right pr-6">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((p) => (
                      <TableRow key={p.id} className="hover:bg-muted/30">
                        <TableCell className="text-sm font-medium pl-6 max-w-[200px] truncate">
                          {p.name}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {(p.brands as { name: string } | null)?.name ?? '—'}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge
                            variant={p.stock_qty === 0 ? 'destructive' : 'secondary'}
                            className={`text-[10px] font-bold ${p.stock_qty > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border-0' : ''}`}
                          >
                            {p.stock_qty === 0 ? 'Out of stock' : `${p.stock_qty} left`}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            {lowStockItems.length > 0 && (
              <CardFooter className="border-t pt-4 text-xs text-muted-foreground justify-between">
                <span>{stats.totalProducts} products total</span>
                <span className="text-red-500 font-semibold">{stats.lowStockCount} items low/out</span>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
};
