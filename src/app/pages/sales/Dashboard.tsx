import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { fmtK, isCollectedReceiptStatus } from '@/app/utils';
import { DEFAULT_SALES_TARGET_SETTINGS, loadSalesTargetSettings } from '@/app/settings';
import {
  ShoppingCart, TrendingUp, TrendingDown, CheckCircle, CheckCircle2,
  DollarSign, Activity, FileText, Wallet, Boxes, Sparkles, ChevronRight,
  ArrowUpRight, Hourglass, Plus, Flame, Zap, Receipt,
} from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import {
  PageHeader, DataCard, StatusBadge, EmptyState, Spinner, ErrorState
} from '@/app/components/ui/primitives';

const FALLBACK_MONTHLY_TARGET = DEFAULT_SALES_TARGET_SETTINGS.defaultMonthlyTarget;

export const SalesDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    myOrdersTotal: 0, myMonthSales: 0, myMonthOrders: 0,
    myPending: 0, myApproved: 0, myCollected: 0, myMonthCollected: 0,
    totalOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ week: string; sales: number }[]>([]);
  const [monthlyTarget, setMonthlyTarget] = useState(FALLBACK_MONTHLY_TARGET);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    try {
      const [
        { data: allMyOrders, error: allMyOrdersError },
        { data: myMonthOrders, error: myMonthOrdersError },
        { data: myReceipts, error: myReceiptsError },
        { data: myMonthReceipts, error: myMonthReceiptsError },
        targetSettings,
      ] = await Promise.all([
        supabase.from('orders').select('id, order_number, status, grand_total, created_at, customers(name)').eq('created_by', user!.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('orders').select('id, status, grand_total, created_at').eq('created_by', user!.id).gte('created_at', monthStart),
        supabase.from('receipts').select('id, amount, payment_status').or('payment_status.is.null,payment_status.neq.Voided').eq('recorded_by', user!.id),
        supabase.from('receipts').select('id, amount, payment_status').or('payment_status.is.null,payment_status.neq.Voided').eq('recorded_by', user!.id).gte('created_at', monthStart),
        loadSalesTargetSettings().catch(() => DEFAULT_SALES_TARGET_SETTINGS),
      ]);
      const fetchError = allMyOrdersError || myMonthOrdersError || myReceiptsError || myMonthReceiptsError;
      if (fetchError) throw new Error(fetchError.message);

      const resolvedTarget = targetSettings.perUserMonthlyTargets[user!.id] ?? targetSettings.defaultMonthlyTarget;
      setMonthlyTarget(Math.max(0, resolvedTarget));

      const collectedReceipts = (myReceipts ?? []).filter(r => isCollectedReceiptStatus(r.payment_status));
      const monthCollectedReceipts = (myMonthReceipts ?? []).filter(r => isCollectedReceiptStatus(r.payment_status));
      const validated = (allMyOrders ?? []).filter(o => ['Approved', 'Billed', 'Delivered'].includes(o.status));
      const myMonthSalesOrders = (myMonthOrders ?? []).filter(o => ['Approved', 'Billed', 'Delivered'].includes(o.status));

      const weeks: Record<string, number> = { 'W1': 0, 'W2': 0, 'W3': 0, 'W4': 0 };
      myMonthSalesOrders.forEach(o => {
        const day = new Date(o.created_at).getDate();
        const wk = day <= 7 ? 'W1' : day <= 14 ? 'W2' : day <= 21 ? 'W3' : 'W4';
        weeks[wk] += o.grand_total ?? 0;
      });

      setMonthlyData(Object.entries(weeks).map(([week, sales]) => ({ week, sales })));
      setRecentOrders((allMyOrders ?? []).slice(0, 5));

      setStats({
        myOrdersTotal: validated.reduce((s, o) => s + (o.grand_total ?? 0), 0),
        myMonthSales: myMonthSalesOrders.reduce((s, o) => s + (o.grand_total ?? 0), 0),
        myMonthOrders: (myMonthOrders ?? []).length,
        myPending: (allMyOrders ?? []).filter(o => o.status === 'Pending').length,
        myApproved: (allMyOrders ?? []).filter(o => o.status === 'Approved').length,
        myCollected: collectedReceipts.reduce((s, r) => s + (r.amount ?? 0), 0),
        myMonthCollected: monthCollectedReceipts.reduce((s, r) => s + (r.amount ?? 0), 0),
        totalOrders: (allMyOrders ?? []).length,
      });
    } catch (err: any) {
      setError(err?.message || 'Unable to load sales dashboard');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (user?.id) fetchAll(); }, [user?.id, fetchAll]);

  const targetPct = monthlyTarget > 0 ? Math.min((stats.myMonthSales / monthlyTarget) * 100, 100) : 0;
  const monthName = new Date().toLocaleString('en-IN', { month: 'long' });
  const maxWeekSales = Math.max(...monthlyData.map(d => d.sales), 1);

  const pace = useMemo(() => {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const expectedPct = (dayOfMonth / daysInMonth) * 100;
    const delta = targetPct - expectedPct;
    return { dayOfMonth, daysInMonth, expectedPct, delta };
  }, [targetPct]);

  if (loading) return <Spinner size={32} />;
  if (error) return <ErrorState message={error} onRetry={() => void fetchAll()} />;

  const firstName = user?.full_name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const isAhead = pace.delta >= 0;

  return (
    <>
      {/* ════════════════════════════════════════════════════════
         MOBILE — Enterprise SaaS Mobile aesthetic.
         Indigo→Violet gradient hero, pill CTAs, 16px cards,
         spring tap, Plus Jakarta Sans. Hidden ≥ lg.
         ════════════════════════════════════════════════════════ */}
      <SalesDashboardMobile
        firstName={firstName}
        greeting={greeting}
        monthName={monthName}
        stats={stats}
        monthlyTarget={monthlyTarget}
        targetPct={targetPct}
        pace={pace}
        isAhead={isAhead}
        monthlyData={monthlyData}
        maxWeekSales={maxWeekSales}
        recentOrders={recentOrders}
      />

      {/* Desktop preserved verbatim */}
      <div className="hidden lg:block space-y-6 pb-12">
      <PageHeader
        title="My Dashboard"
        subtitle={`Welcome back, ${user?.full_name?.split(' ')[0]}. Here's your performance overview.`}
        actions={
          <Link to="/sales/create-order">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <ShoppingCart size={15} /> New Order
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Target + Stats) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Target Card */}
          <div className="bg-primary rounded-2xl p-6 text-primary-foreground relative overflow-hidden shadow-lg border-none">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -z-0 -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-2xl -z-0 -ml-10 -mb-10" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="text-primary-foreground/80 text-xs uppercase tracking-widest font-semibold mb-1">{monthName} Target</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold font-mono tracking-tight">{fmtK(stats.myMonthSales)}</p>
                  <p className="text-primary-foreground/70 text-sm font-medium">/ {fmtK(monthlyTarget)}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="flex flex-col text-right">
                  <span className="text-2xl font-bold font-mono">{Math.round(targetPct)}%</span>
                  <span className="text-[10px] text-primary-foreground/70 uppercase tracking-widest font-semibold">Achieved</span>
                </div>
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke="white" strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - targetPct / 100)}`}
                      strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-6 pt-5 border-t border-white/10 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[10px] uppercase text-primary-foreground/70 font-semibold mb-1 tracking-widest">Total Sales</p>
                <p className="font-bold font-mono">{fmtK(stats.myOrdersTotal)}</p>
              </div>
              <div className="border-l border-r border-white/10">
                <p className="text-[10px] uppercase text-primary-foreground/70 font-semibold mb-1 tracking-widest">Total Coll.</p>
                <p className="font-bold font-mono">{fmtK(stats.myCollected)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-primary-foreground/70 font-semibold mb-1 tracking-widest">Orders</p>
                <p className="font-bold font-mono">{stats.totalOrders}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Pending Orders', value: stats.myPending, icon: <Activity size={18} />, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200 hover:border-amber-300' },
              { label: 'Approved', value: stats.myApproved, icon: <CheckCircle size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200 hover:border-emerald-300' },
              { label: 'Month Orders', value: stats.myMonthOrders, icon: <ShoppingCart size={18} />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200 hover:border-blue-300' },
              { label: 'Mtd. Collection', value: fmtK(stats.myMonthCollected), icon: <DollarSign size={18} />, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200 hover:border-purple-300', mono: true },
            ].map((s, i) => (
              <DataCard key={i} className={`p-5 transition-colors group cursor-default ${s.border}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-xl ${s.bg} ${s.color} transition-transform group-hover:scale-110`}>{s.icon}</div>
                </div>
                <div>
                  <p className={`text-2xl font-bold text-foreground ${s.mono ? 'font-mono' : ''}`}>{s.value}</p>
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mt-1">{s.label}</p>
                </div>
              </DataCard>
            ))}
          </div>
        </div>

        {/* Right Column (Weekly Bars + Recent) */}
        <div className="space-y-6">
          <DataCard className="p-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">Weekly Performance</h3>
            <div className="flex items-end justify-between h-32 gap-3 mb-2">
              {monthlyData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full bg-muted rounded-md relative flex items-end overflow-hidden">
                    <div
                      className="w-full bg-primary rounded-md transition-all duration-700 ease-out group-hover:opacity-80"
                      style={{ height: `${Math.max((d.sales / maxWeekSales) * 100, 4)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground">{d.week}</span>
                </div>
              ))}
            </div>
          </DataCard>

          <DataCard className="flex flex-col h-full min-h-[300px]">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Recent Orders</h3>
              <Link
                to="/sales/my-orders"
                className="text-[10px] text-primary font-bold uppercase tracking-widest hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
                aria-label="View all recent orders"
              >
                View All
              </Link>
            </div>
            <div className="p-0">
              {recentOrders.length === 0 ? (
                <EmptyState icon={FileText} message="No recent orders" />
              ) : (
                <ul className="divide-y divide-border" aria-label="Recent orders list">
                  {recentOrders.map(o => (
                    <li key={o.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-foreground leading-none">{o.order_number}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">{o.customers?.name ?? '—'}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-sm font-bold font-mono text-foreground leading-none">{o.grand_total?.toLocaleString('en-IN') ?? '0'}</span>
                        <StatusBadge status={o.status} className="h-5 text-[9px] px-1.5" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </DataCard>
        </div>
      </div>
      </div>
    </>
  );
};

// ════════════════════════════════════════════════════════════════
// Mobile-only sales dashboard. Plus Jakarta Sans + Indigo→Violet
// gradient + 16px radii + spring tap (sm-tap). Engagement signals:
// pace-vs-month, active days, status tiles, recent activity feed.
// ════════════════════════════════════════════════════════════════
interface SalesDashboardMobileProps {
  firstName: string;
  greeting: string;
  monthName: string;
  stats: {
    myMonthSales: number;
    myMonthOrders: number;
    myPending: number;
    myApproved: number;
    myCollected: number;
    myMonthCollected: number;
    totalOrders: number;
    myOrdersTotal: number;
  };
  monthlyTarget: number;
  targetPct: number;
  pace: { dayOfMonth: number; daysInMonth: number; expectedPct: number; delta: number };
  isAhead: boolean;
  monthlyData: { week: string; sales: number }[];
  maxWeekSales: number;
  recentOrders: any[];
}

const STATUS_STRIPE: Record<string, string> = {
  Pending:   'bg-amber-400',
  Approved:  'bg-emerald-500',
  Billed:    'bg-blue-500',
  Delivered: 'bg-violet-500',
  Rejected:  'bg-rose-500',
  Voided:    'bg-slate-400',
};

const SalesDashboardMobile = ({
  firstName, greeting, monthName, stats, monthlyTarget, targetPct, pace,
  isAhead, monthlyData, maxWeekSales, recentOrders,
}: SalesDashboardMobileProps) => {
  const paceLabel = isAhead
    ? `${pace.delta.toFixed(0)}% ahead of pace`
    : `${Math.abs(pace.delta).toFixed(0)}% behind pace`;
  const ringStroke = 10;
  const ringSize = 116;
  const ringR = (ringSize - ringStroke) / 2;
  const ringC = 2 * Math.PI * ringR;

  return (
    <div className="lg:hidden sm-font sm-surface -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 min-h-[calc(100vh-4rem)]">
      <div className="space-y-5 px-4 pt-5 pb-4 max-w-2xl mx-auto">
        {/* Greeting + day chip */}
        <header className="flex items-center justify-between sm-rise">
          <div>
            <p className="sm-eyebrow text-[var(--sm-muted)]">{greeting}</p>
            <h1 className="sm-headline text-[26px] text-[var(--sm-text)] mt-0.5">{firstName}.</h1>
          </div>
          <div className="inline-flex items-center gap-2 sm-pill border border-[var(--sm-border)] bg-white px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 sm-pulse-dot" />
            <span className="text-[11px] font-bold text-[var(--sm-text)]">
              Day {pace.dayOfMonth}/{pace.daysInMonth}
            </span>
          </div>
        </header>

        {/* Hero — gradient target card */}
        <section className="sm-rise sm-rise-1 relative overflow-hidden sm-gradient rounded-[20px] p-5 shadow-[0_18px_40px_-20px_rgba(79,70,229,0.55)]">
          <div
            className="absolute -top-16 -right-16 h-44 w-44 rounded-full"
            style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.22), transparent 70%)' }}
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="sm-eyebrow text-white/80">{monthName} · Target</p>
              <p className="sm-headline text-[40px] text-white mt-2">
                {fmtK(stats.myMonthSales)}
              </p>
              <p className="mt-0.5 text-sm text-white/75">
                of <span className="font-bold text-white">{fmtK(monthlyTarget)}</span>
              </p>
            </div>
            <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
              <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} className="-rotate-90">
                <circle cx={ringSize/2} cy={ringSize/2} r={ringR} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={ringStroke} />
                <circle
                  cx={ringSize/2} cy={ringSize/2} r={ringR} fill="none"
                  stroke="#FFFFFF" strokeWidth={ringStroke}
                  strokeDasharray={ringC}
                  strokeDashoffset={ringC * (1 - Math.min(Math.max(targetPct, 0), 100) / 100)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.22,.61,.36,1)' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <span className="sm-headline text-[28px] leading-none">{Math.round(targetPct)}</span>
                <span className="sm-eyebrow mt-1 text-white/70">PERCENT</span>
              </div>
            </div>
          </div>

          {/* Pace chip */}
          <div
            className={`relative mt-5 inline-flex items-center gap-1.5 sm-pill px-3 py-1.5 text-[11px] font-bold ${
              isAhead
                ? 'bg-white text-[var(--sm-primary)]'
                : 'bg-white/15 text-white border border-white/20'
            }`}
          >
            {isAhead ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {paceLabel}
          </div>

          {/* Mini stats */}
          <div className="relative mt-5 grid grid-cols-3 gap-2.5">
            <MobileMiniStat label="Collected" value={`${fmtK(stats.myMonthCollected)}`} icon={<Wallet size={13} />} />
            <MobileMiniStat label="Orders" value={stats.myMonthOrders.toString()} icon={<Receipt size={13} />} />
            <MobileMiniStat label="Total Sales" value={`${fmtK(stats.myOrdersTotal)}`} icon={<Sparkles size={13} />} />
          </div>
        </section>

        {/* Quick actions grid */}
        <section className="sm-rise sm-rise-2" aria-label="Quick actions">
          <div className="grid grid-cols-4 gap-3">
            <QuickAction to="/sales/create-order" label="New Order" icon={<Plus size={20} strokeWidth={2.6} />} primary />
            <QuickAction to="/sales/receipt" label="Collect" icon={<Wallet size={20} />} />
            <QuickAction to="/sales/price-list" label="Prices" icon={<Sparkles size={20} />} />
            <QuickAction to="/stock" label="Stock" icon={<Boxes size={20} />} />
          </div>
        </section>

        {/* Status tiles */}
        <section className="sm-rise sm-rise-3 grid grid-cols-2 gap-3">
          <StatusTile
            to="/sales/my-orders?status=Pending"
            label="Pending"
            value={stats.myPending}
            tone="amber"
            icon={<Hourglass size={18} />}
          />
          <StatusTile
            to="/sales/my-orders?status=Approved"
            label="Approved"
            value={stats.myApproved}
            tone="emerald"
            icon={<CheckCircle2 size={18} />}
          />
        </section>

        {/* Weekly velocity */}
        <section className="sm-rise sm-rise-4 sm-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="sm-eyebrow text-[var(--sm-muted)]">Weekly Velocity</p>
              <p className="text-sm font-bold text-[var(--sm-text)] mt-0.5">This month by week</p>
            </div>
            <Zap size={14} className="text-[var(--sm-muted)]" />
          </div>
          <div className="flex items-end justify-between h-24 gap-3">
            {monthlyData.map((d) => {
              const heightPct = Math.max((d.sales / maxWeekSales) * 100, 4);
              return (
                <div key={d.week} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full sm-gradient rounded-md"
                      style={{
                        height: `${heightPct}%`,
                        transition: 'height 0.9s cubic-bezier(.22,.61,.36,1)',
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-[var(--sm-muted)]">{d.week}</span>
                  <span className="text-[10px] text-[var(--sm-muted)]/80 font-mono">
                    {d.sales > 0 ? fmtK(d.sales) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent orders */}
        <section className="sm-rise sm-card overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div>
              <p className="sm-eyebrow text-[var(--sm-muted)]">Recent</p>
              <p className="text-sm font-bold text-[var(--sm-text)] mt-0.5">Your latest orders</p>
            </div>
            <Link
              to="/sales/my-orders"
              className="text-[11px] font-bold tracking-wider text-[var(--sm-primary)] inline-flex items-center gap-0.5"
            >
              ALL <ArrowUpRight size={12} />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="px-4 pb-5">
              <div className="rounded-xl border border-dashed border-[var(--sm-border)] p-5 text-center">
                <ShoppingCart size={20} className="mx-auto text-[var(--sm-muted)]" />
                <p className="mt-2 text-sm font-semibold text-[var(--sm-text)]">No orders yet</p>
                <p className="text-xs text-[var(--sm-muted)]">Tap + to start one.</p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--sm-border)]">
              {recentOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    to={`/sales/my-orders?focus=${o.id}`}
                    className="sm-tap flex items-stretch gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100"
                  >
                    <span className={`w-1 rounded-full ${STATUS_STRIPE[o.status] ?? 'bg-slate-300'}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[var(--sm-text)] truncate">{o.order_number}</p>
                      <p className="text-xs text-[var(--sm-muted)] truncate">{o.customers?.name ?? '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-sm text-[var(--sm-text)]">
                        ₹{(o.grand_total ?? 0).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-[var(--sm-muted)] font-bold">
                        {o.status}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-[var(--sm-muted)] self-center shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

const MobileMiniStat = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
  <div className="rounded-xl bg-white/12 backdrop-blur px-2.5 py-2 border border-white/10">
    <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-white/80">
      {icon}<span className="truncate">{label}</span>
    </div>
    <p className="mt-1 font-mono font-bold text-sm text-white truncate">{value}</p>
  </div>
);

const QuickAction = ({ to, label, icon, primary }: { to: string; label: string; icon: React.ReactNode; primary?: boolean }) => (
  <Link
    to={to}
    className={`sm-tap flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 border ${
      primary
        ? 'sm-gradient border-transparent shadow-[0_10px_22px_-12px_rgba(79,70,229,0.5)] text-white'
        : 'bg-white border-[var(--sm-border)] text-[var(--sm-text)]'
    }`}
  >
    <span
      className={`h-10 w-10 sm-pill flex items-center justify-center ${
        primary ? 'bg-white/20 text-white' : 'sm-gradient-soft text-[var(--sm-primary)]'
      }`}
    >
      {icon}
    </span>
    <span className="text-[10px] font-bold tracking-wider uppercase">{label}</span>
  </Link>
);

const TONE_TILE: Record<'amber' | 'emerald', { chip: string }> = {
  amber:   { chip: 'bg-amber-100 text-amber-700' },
  emerald: { chip: 'bg-emerald-100 text-emerald-700' },
};

const StatusTile = ({ to, label, value, tone, icon }: { to: string; label: string; value: number; tone: 'amber' | 'emerald'; icon: React.ReactNode }) => (
  <Link
    to={to}
    className="sm-tap relative sm-card p-4 flex items-start justify-between overflow-hidden hover:shadow-[0_12px_28px_-12px_rgba(79,70,229,0.18)]"
  >
    <div>
      <p className="sm-eyebrow text-[var(--sm-muted)]">{label}</p>
      <p className="sm-headline text-[34px] text-[var(--sm-text)] mt-1">{value}</p>
    </div>
    <div className={`shrink-0 h-9 w-9 sm-pill flex items-center justify-center ${TONE_TILE[tone].chip}`}>
      {icon}
    </div>
    <ChevronRight size={14} className="absolute bottom-3 right-3 text-[var(--sm-muted)]" />
  </Link>
);
