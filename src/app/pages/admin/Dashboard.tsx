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
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';

// Lucide icons
import {
  TrendingUp, ShoppingCart, Users,
  DollarSign, ArrowUpRight, ArrowDownRight, Activity,
  AlertTriangle, CheckCircle2, BarChart3, Calendar, ShieldCheck, Wallet
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
    <div className="space-y-8 pb-12 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* Sleek Top Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-2xl py-4 border-b border-border/40 -mx-4 px-4 sm:-mx-6 sm:px-6 mb-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
             <ShieldCheck size={28} className="drop-shadow-md" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
              {greeting}, {user?.full_name?.split(' ')[0] ?? 'Leader'}
            </h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">
              Command Center Overview {dateRange === 'all' ? '' : `• Last ${DATE_RANGE_OPTIONS.find(o => o.value === dateRange)?.label}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800 backdrop-blur-md">
          {DATE_RANGE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDateRange(opt.value)}
              className={`px-4 py-2 text-[11px] font-bold rounded-xl transition-all ${
                dateRange === opt.value
                  ? 'bg-white dark:bg-slate-800 text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-100'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 scale-95'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Cards: High-fidelity layout ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: 'Gross Volume',
            metric: 'Total Revenue',
            value: fmtK(stats.totalRevenue),
            sub: revenueGrowth !== null ? (
                   revenueGrowth >= 0 ? `+${revenueGrowth.toFixed(1)}% vs strict baseline` : `${revenueGrowth.toFixed(1)}% vs strict baseline`
                 ) : 'Evaluating baseline...',
            icon: DollarSign,
            accent: 'teal',
            growth: revenueGrowth !== null ? revenueGrowth >= 0 : true
          },
          {
            label: 'Capital Realized',
            metric: 'Total Collected',
            value: fmtK(stats.totalCollected),
            sub: `${collectionRate.toFixed(1)}% portfolio resolution rate`,
            icon: Wallet,
            accent: 'violet',
            metaWidget: <div className="mt-3 h-1.5 w-full bg-violet-100 dark:bg-violet-900/40 rounded-full overflow-hidden"><div className="h-full bg-violet-500 rounded-full" style={{ width: `${collectionRate}%`}}></div></div>
          },
          {
            label: 'Pipeline Traffic',
            metric: 'Operations Logged',
            value: stats.totalOrders.toString(),
            sub: `${stats.pendingOrders} pending • ${stats.approvedOrders} approved`,
            icon: ShoppingCart,
            accent: 'blue'
          },
          {
            label: 'Network Load',
            metric: 'Active Clients',
            value: stats.totalCustomers.toString(),
            sub: stats.lowStockCount > 0 ? `${stats.lowStockCount} items hit minimum stock threshold` : `Inventory levels fully normalized`,
            icon: Users,
            accent: stats.lowStockCount > 0 ? 'rose' : 'emerald'
          },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          const isTeal = kpi.accent === 'teal';
          const isViolet = kpi.accent === 'violet';
          const isBlue = kpi.accent === 'blue';
          const isRose = kpi.accent === 'rose';
          const isEmerald = kpi.accent === 'emerald';
          
          const bgClass = isTeal ? 'bg-teal-50/50 dark:bg-teal-900/10 border-teal-200/50' : 
                         isViolet ? 'bg-violet-50/50 dark:bg-violet-900/10 border-violet-200/50' : 
                         isBlue ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50' : 
                         isRose ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-200/50' :
                         'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50';
                         
          const textClass = isTeal ? 'text-teal-600 dark:text-teal-400' :
                           isViolet ? 'text-violet-600 dark:text-violet-400' :
                           isBlue ? 'text-blue-600 dark:text-blue-400' :
                           isRose ? 'text-rose-600 dark:text-rose-400' :
                           'text-emerald-600 dark:text-emerald-400';

          return (
            <div key={i} className={`relative overflow-hidden rounded-[2rem] border p-6 ${bgClass} dark:border-slate-800 transition-all duration-300 hover:shadow-xl hover:shadow-${kpi.accent}-500/10 hover:-translate-y-1 group`}>
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-4">
                  <div className={`p-3 rounded-2xl inline-flex bg-white/80 dark:bg-slate-900/80 shadow-sm ${textClass}`}>
                    <Icon size={22} className="group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">{kpi.value}</h3>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2">{kpi.label}</p>
                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-500 leading-snug">{kpi.sub}</p>
                    {kpi.metaWidget}
                  </div>
                </div>
              </div>
              <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-40 bg-${kpi.accent}-500`} />
            </div>
          );
        })}
      </div>

      {/* ── Visual Analytics Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Primary Chart Area */}
        <div className="lg:col-span-2 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm p-6 lg:p-8 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-widest mb-3">
                 <Activity size={12} /> Velocity Engine
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Revenue vs Recovery</h3>
              <p className="text-sm text-slate-500 mt-1">Cross-referencing gross billing against realized collection liquidity.</p>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                 <div className="w-3 h-3 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]"></div> Gross
               </div>
               <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                 <div className="w-3 h-3 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div> Liquidity
               </div>
            </div>
          </div>
          
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenue} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.15)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600, fill: '#888' }} tickLine={false} axisLine={false} dy={10} />
                <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: '#888' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <ChartTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }} formatter={(v: any) => fmtK(Number(v))} />
                <Area type="monotone" dataKey="revenue" stroke="#14b8a6" strokeWidth={3} fill="url(#revGrad)" name="Gross Revenue" activeDot={{ r: 6, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="collected" stroke="#8b5cf6" strokeWidth={3} fill="url(#colGrad)" name="Collections" activeDot={{ r: 6, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart Sector */}
        <div className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm p-6 lg:p-8 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-widest mb-3">
             <BarChart3 size={12} /> Operation Nodes
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Status Composition</h3>
            
          {orderStatusData.length > 0 ? (
            <div className="flex-1 w-full flex flex-col items-center justify-center">
              <div className="relative w-48 h-48 mb-8 hover:scale-105 transition-transform duration-500 cursor-default">
                <PieChart width={192} height={192}>
                  <Pie
                    data={orderStatusData}
                    cx={96} cy={96}
                    innerRadius={64} outerRadius={88}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {orderStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} style={{ filter: `drop-shadow(0px 4px 6px ${entry.fill}40)` }} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{stats.totalOrders}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Total</span>
                </div>
              </div>
              
              <div className="w-full space-y-2.5">
                {orderStatusData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-sm px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: d.fill }} />
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{d.name}</span>
                    </div>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">{d.value} <span className="text-slate-400 font-sans text-xs ml-1">({((d.value / stats.totalOrders) * 100).toFixed(0)}%)</span></span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon={BarChart3} message="Awaiting network data" />
          )}
        </div>
      </div>

      {/* ── Sub-dashboard Tabs ── */}
      <Tabs defaultValue="orders" className="w-full mt-8">
        <TabsList className="h-14 w-full justify-start bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200/60 dark:border-slate-800 rounded-2xl p-1.5 shadow-inner">
          <TabsTrigger value="orders" className="rounded-xl px-6 h-full text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">Deep Dive: Orders</TabsTrigger>
          <TabsTrigger value="salesmen" className="rounded-xl px-6 h-full text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">Personnel Leaderboard</TabsTrigger>
          <TabsTrigger value="stock" className="rounded-xl px-6 h-full text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-rose-500 transition-all">
            Inventory Health
            {stats.lowStockCount > 0 && (
              <span className="ml-2 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm shadow-rose-500/40 animate-pulse">
                {stats.lowStockCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm overflow-hidden">
          
          <TabsContent value="orders" className="p-0 m-0 border-0 outline-none">
            <div className="p-6 md:p-8 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
                <p className="text-sm text-slate-500 mt-1">Latest confirmed network activity</p>
              </div>
              <Link to="/admin/sales" className="h-10 px-4 inline-flex items-center justify-center rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">
                Open Full Ledger
              </Link>
            </div>
            <div className="overflow-x-auto p-4 custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200/50 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="font-bold text-[10px] uppercase tracking-[0.15em] text-slate-500 pl-6">Identifier</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-[0.15em] text-slate-500">Beneficiary</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-[0.15em] text-slate-500">Status Vector</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-[0.15em] text-slate-500 text-right pr-6">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {recentOrders.length === 0 ? (
                    <TableRow><TableCell colSpan={4}><EmptyState icon={ShoppingCart} message="No recent operations to display" /></TableCell></TableRow>
                  ) : (
                    recentOrders.map(order => (
                      <TableRow key={order.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-0 group">
                        <TableCell className="pl-6 font-mono text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-primary transition-colors"></div>
                            {order.order_number}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {(order.customers as { name: string } | null)?.name ?? '—'}
                          <div className="text-[10px] font-medium text-slate-400 mt-0.5">{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={order.status} className="px-3 py-1 shadow-sm" />
                        </TableCell>
                        <TableCell className="text-right pr-6 font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                          {fmt(order.grand_total ?? 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="salesmen" className="p-0 m-0 border-0 outline-none">
            <div className="p-6 md:p-8 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Active Agents: {monthName}</h3>
                <p className="text-sm text-slate-500 mt-1">Ranking by cumulative operation value</p>
              </div>
            </div>
            <div className="p-6 md:p-8">
              {topSalesmen.length === 0 ? (
                <EmptyState icon={Users} message="No agent data for this cycle" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {topSalesmen.map((s, i) => {
                    const maxTotal = topSalesmen[0]?.total || 1;
                    const pct = (s.total / maxTotal) * 100;
                    const ranks = [
                       'bg-amber-100 text-amber-600 border-amber-200', 
                       'bg-slate-100 text-slate-500 border-slate-200',
                       'bg-orange-100 text-orange-600 border-orange-200'
                    ];
                    
                    return (
                      <div key={i} className="flex items-center gap-5 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
                        <div className={`w-12 h-12 flex items-center justify-center rounded-[1rem] shadow-sm border font-black text-xl ${i < 3 ? ranks[i] : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                           {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                             <div>
                                <p className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{s.name}</p>
                                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{s.orders} deployments logged</p>
                             </div>
                             <p className="text-lg font-black font-mono text-primary">{fmtK(s.total)}</p>
                          </div>
                          <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                             <div className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full relative" style={{ width: `${pct}%` }}>
                                <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)'}}></div>
                             </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="stock" className="p-0 m-0 border-0 outline-none">
             <div className="p-6 md:p-8 flex items-center justify-between border-b border-rose-200/60 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-950/20">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                   <AlertTriangle className="text-rose-500" size={24} /> Supply Constraints
                </h3>
                <p className="text-sm text-slate-500 mt-1">Physical inventory approaching zero bound</p>
              </div>
              <Link to="/inventory/stock" className="h-10 px-4 inline-flex items-center justify-center rounded-xl font-bold text-xs bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900 dark:text-rose-100 transition-colors">
                Resolve Blockers
              </Link>
            </div>
             <div className="overflow-x-auto p-4 custom-scrollbar">
              {lowStockItems.length === 0 ? (
                <EmptyState icon={CheckCircle2} message="System optimally stocked" sub={`All ${stats.totalProducts} units are operating above minimum thresholds.`} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-200/50 dark:border-slate-800">
                      <TableHead className="font-bold text-[10px] uppercase tracking-[0.15em] text-slate-500 pl-6">Asset Nomenclature</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-[0.15em] text-slate-500 text-right pr-6">Remaining Mass</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {lowStockItems.map((p) => (
                      <TableRow key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-0 group">
                        <TableCell className="pl-6">
                           <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{p.name}</p>
                           <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{(p.brands as { name: string } | null)?.name ?? '—'}</p>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                           <div className={`inline-flex px-3 py-1.5 rounded-lg text-sm font-black font-mono shadow-sm ${p.stock_qty === 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                             {p.stock_qty === 0 ? 'DEPLETED' : `${p.stock_qty}x`}
                           </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
             </div>
          </TabsContent>

        </div>
      </Tabs>

    </div>
  );
};
