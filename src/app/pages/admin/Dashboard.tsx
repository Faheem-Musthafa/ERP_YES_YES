import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { fmt, fmtK, STATUS_COLOR } from '@/app/utils';
import { Link } from 'react-router';

// Shadcn UI components
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter, CardAction,
} from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Separator } from '@/app/components/ui/separator';
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
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';

// Lucide icons
import {
  TrendingUp, TrendingDown, ShoppingCart, Users, Package,
  DollarSign, ArrowUpRight, ArrowDownRight, Activity,
  AlertTriangle, CheckCircle2, Clock, Truck, BarChart3, Circle,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Chart configs ─────────────────────────────────────────────────────────────

const revenueChartConfig = {
  revenue: { label: 'Revenue', color: '#0d9488' },
  collected: { label: 'Collected', color: '#7c3aed' },
};

const statusChartConfig = {
  Pending: { label: 'Pending', color: '#f59e0b' },
  Approved: { label: 'Approved', color: '#10b981' },
  Billed: { label: 'Billed', color: '#3b82f6' },
  Delivered: { label: 'Delivered', color: '#8b5cf6' },
  Rejected: { label: 'Rejected', color: '#ef4444' },
};

// ── Status badge variant ──────────────────────────────────────────────────────

const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (s === 'Approved' || s === 'Delivered') return 'default';
  if (s === 'Rejected') return 'destructive';
  return 'secondary';
};

// Status dot color
const STATUS_DOT: Record<string, string> = {
  Pending: 'text-amber-500', Approved: 'text-emerald-500',
  Rejected: 'text-red-500', Billed: 'text-blue-500', Delivered: 'text-violet-500',
};

// ── Loading skeleton ──────────────────────────────────────────────────────────

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 bg-muted rounded w-64" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 bg-muted rounded-xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 h-64 bg-muted rounded-xl" />
      <div className="h-64 bg-muted rounded-xl" />
    </div>
  </div>
);

// ── Main Dashboard ────────────────────────────────────────────────────────────

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [topSalesmen, setTopSalesmen] = useState<{ name: string; total: number; orders: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; revenue: number; collected: number }[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
    // Last 6 months for area chart
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

    const [
      { data: allOrders },
      { data: monthOrders },
      { data: prevMonthOrders },
      { data: allReceipts },
      { data: monthReceipts },
      { data: recentReceipts6mo },
      { data: allUsers },
      { data: products },
      { data: customers },
    ] = await Promise.all([
      supabase.from('orders').select('id, status, grand_total, created_by, created_at, order_number, customers(name)').order('created_at', { ascending: false }),
      supabase.from('orders').select('id, status, grand_total, created_by').gte('created_at', monthStart),
      supabase.from('orders').select('id, status, grand_total').gte('created_at', prevMonthStart).lte('created_at', prevMonthEnd),
      supabase.from('receipts').select('id, amount'),
      supabase.from('receipts').select('id, amount').gte('created_at', monthStart),
      supabase.from('receipts').select('id, amount, created_at').gte('created_at', sixMonthsAgo),
      supabase.from('users').select('id, full_name, role, is_active'),
      supabase.from('products').select('id, name, stock_qty, brands(name)').eq('is_active', true),
      supabase.from('customers').select('id', { count: 'exact' }),
    ]);

    const validStatuses = ['Approved', 'Billed', 'Delivered'];
    const salesOrders = (allOrders ?? []).filter(o => validStatuses.includes(o.status));
    const totalRevenue = salesOrders.reduce((s, o) => s + (o.grand_total ?? 0), 0);
    const monthRevenue = (monthOrders ?? []).filter(o => validStatuses.includes(o.status)).reduce((s, o) => s + (o.grand_total ?? 0), 0);
    const prevMonthRevenue = (prevMonthOrders ?? []).filter(o => validStatuses.includes(o.status)).reduce((s, o) => s + (o.grand_total ?? 0), 0);
    const totalCollected = (allReceipts ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
    const monthCollected = (monthReceipts ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);

    // 6-month area chart data
    const months6: Record<string, { revenue: number; collected: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      months6[key] = { revenue: 0, collected: 0 };
    }
    (allOrders ?? []).filter(o => validStatuses.includes(o.status)).forEach(o => {
      const d = new Date(o.created_at);
      if (d >= new Date(sixMonthsAgo)) {
        const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
        if (months6[key]) months6[key].revenue += o.grand_total ?? 0;
      }
    });
    (recentReceipts6mo ?? []).forEach((r: any) => {
      const d = new Date(r.created_at);
      const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      if (months6[key]) months6[key].collected += r.amount ?? 0;
    });
    setMonthlyRevenue(Object.entries(months6).map(([month, v]) => ({ month, ...v })));

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

    const lowStockProds = (products ?? []).filter((p: any) => p.stock_qty <= 5);
    setLowStockItems(lowStockProds.slice(0, 6));
    setRecentOrders((allOrders ?? []).slice(0, 8));

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
    setLoading(false);
  }, []);

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

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 pb-8">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">{greeting},</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{user?.full_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's your business overview for{' '}
            <span className="font-semibold text-foreground">{monthName} {new Date().getFullYear()}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 border border-border px-3 py-2 rounded-lg">
          <Activity size={13} className="text-teal-600" />
          Live · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Revenue */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase tracking-widest">
                Total Revenue
              </CardDescription>
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center">
                <DollarSign size={15} className="text-teal-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold tracking-tight font-mono">{fmtK(stats.totalRevenue)}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              {revenueGrowth !== null ? (
                revenueGrowth >= 0 ? (
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded-full">
                    <ArrowUpRight size={11} /> +{revenueGrowth.toFixed(1)}%
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950 px-1.5 py-0.5 rounded-full">
                    <ArrowDownRight size={11} /> {revenueGrowth.toFixed(1)}%
                  </span>
                )
              ) : null}
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This month: <span className="font-semibold text-foreground">{fmtK(stats.monthRevenue)}</span>
            </p>
          </CardContent>
        </Card>

        {/* Collected */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase tracking-widest">
                Collected
              </CardDescription>
              <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
                <TrendingUp size={15} className="text-violet-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold tracking-tight font-mono">{fmtK(stats.totalCollected)}</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Collection rate</span>
                <span className="font-semibold">{collectionRate.toFixed(0)}%</span>
              </div>
              <Progress value={collectionRate} className="h-1.5" />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              This month: <span className="font-semibold text-foreground">{fmtK(stats.monthCollected)}</span>
            </p>
          </CardContent>
        </Card>

        {/* Orders */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase tracking-widest">
                Orders
              </CardDescription>
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                <ShoppingCart size={15} className="text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold tracking-tight font-mono">{stats.totalOrders}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                {stats.pendingOrders} pending
              </span>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                {stats.approvedOrders} approved
              </span>
            </div>
          </CardContent>
        </Card>

        {/* People & Stock */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold uppercase tracking-widest">
                People
              </CardDescription>
              <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950 flex items-center justify-center">
                <Users size={15} className="text-orange-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold tracking-tight font-mono">
              {stats.activeStaff}
              <span className="text-base font-normal text-muted-foreground">/{stats.totalStaff}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Active staff</p>
            <Separator className="my-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{stats.totalCustomers} customers</span>
              {stats.lowStockCount > 0 ? (
                <span className="flex items-center gap-0.5 text-red-600 font-semibold">
                  <AlertTriangle size={10} /> {stats.lowStockCount} low stock
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-emerald-600 font-semibold">
                  <CheckCircle2 size={10} /> Stock OK
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area chart — Revenue vs Collected (last 6 months) */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Revenue & Collections</CardTitle>
                <CardDescription className="text-xs mt-0.5">Last 6 months trend</CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px] font-semibold">6M</Badge>
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
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <BarChart3 size={32} className="mb-2 opacity-30" />
                <p className="text-xs">No order data</p>
              </div>
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
                  to="/admin/orders"
                  className="text-xs text-teal-600 font-semibold hover:underline"
                >
                  View all →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
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
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                        No orders yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentOrders.map(order => (
                      <TableRow key={order.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-semibold text-teal-600 pl-6">
                          {order.order_number}
                        </TableCell>
                        <TableCell className="text-sm font-medium max-w-[140px] truncate">
                          {(order.customers as any)?.name ?? '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Circle
                              size={6}
                              className={`fill-current ${STATUS_DOT[order.status] ?? 'text-gray-400'}`}
                            />
                            <Badge variant={statusVariant(order.status)} className="text-[10px] py-0 h-5">
                              {order.status}
                            </Badge>
                          </div>
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
                <div className="flex flex-col items-center py-10 text-muted-foreground">
                  <Users size={32} className="mb-2 opacity-20" />
                  <p className="text-sm">No sales data this month</p>
                </div>
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
                <div className="flex flex-col items-center py-12 text-muted-foreground">
                  <CheckCircle2 size={36} className="text-emerald-400 mb-3" />
                  <p className="text-sm font-medium">All stock levels healthy</p>
                  <p className="text-xs mt-0.5">{stats.totalProducts} products tracked</p>
                </div>
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
                    {lowStockItems.map((p: any) => (
                      <TableRow key={p.id} className="hover:bg-muted/30">
                        <TableCell className="text-sm font-medium pl-6 max-w-[200px] truncate">
                          {p.name}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {(p.brands as any)?.name ?? '—'}
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
