import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { fmtK, isCollectedReceiptStatus } from '@/app/utils';
import {
  ShoppingCart, TrendingUp, CheckCircle,
  DollarSign, Activity, FileText
} from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import {
  PageHeader, DataCard, StatusBadge, EmptyState, Spinner, ErrorState
} from '@/app/components/ui/primitives';

const MONTHLY_TARGET = 500000;

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
      ] = await Promise.all([
        supabase.from('orders').select('id, order_number, status, grand_total, created_at, customers(name)').eq('created_by', user!.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('orders').select('id, status, grand_total, created_at').eq('created_by', user!.id).gte('created_at', monthStart),
        supabase.from('receipts').select('id, amount, payment_status').or('payment_status.is.null,payment_status.neq.Voided').eq('recorded_by', user!.id),
        supabase.from('receipts').select('id, amount, payment_status').or('payment_status.is.null,payment_status.neq.Voided').eq('recorded_by', user!.id).gte('created_at', monthStart),
      ]);
      const fetchError = allMyOrdersError || myMonthOrdersError || myReceiptsError || myMonthReceiptsError;
      if (fetchError) throw new Error(fetchError.message);

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

  const targetPct = Math.min((stats.myMonthSales / MONTHLY_TARGET) * 100, 100);
  const monthName = new Date().toLocaleString('en-IN', { month: 'long' });
  const maxWeekSales = Math.max(...monthlyData.map(d => d.sales), 1);

  if (loading) return <Spinner size={32} />;
  if (error) return <ErrorState message={error} onRetry={() => void fetchAll()} />;

  return (
    <div className="space-y-6 pb-12">
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
                  <p className="text-primary-foreground/70 text-sm font-medium">/ {fmtK(MONTHLY_TARGET)}</p>
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
                        <span className="text-sm font-bold font-mono text-foreground leading-none">₹{o.grand_total?.toLocaleString('en-IN') ?? '0'}</span>
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
  );
};
