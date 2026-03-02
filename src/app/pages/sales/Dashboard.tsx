import React, { useState, useEffect } from 'react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  ShoppingCart, TrendingUp, Clock, CheckCircle, Package,
  DollarSign, Target, Award, Activity, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router';

const fmt = (n: number) => `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtK = (n: number) => n >= 100000 ? `₹ ${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹ ${(n / 1000).toFixed(1)}K` : fmt(n);

const STATUS_COLOR: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Billed: 'bg-teal-100 text-teal-700',
  Delivered: 'bg-purple-100 text-purple-700',
};

// Monthly target (can be made configurable later)
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

  useEffect(() => {
    if (user?.id) fetchAll();
  }, [user?.id]);

  const fetchAll = async () => {
    setLoading(true);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      { data: allMyOrders },
      { data: myMonthOrders },
      { data: myReceipts },
      { data: myMonthReceipts },
    ] = await Promise.all([
      supabase.from('orders').select('id, order_number, status, grand_total, created_at, customers(name)').eq('created_by', user!.id).order('created_at', { ascending: false }),
      supabase.from('orders').select('id, status, grand_total, created_at').eq('created_by', user!.id).gte('created_at', monthStart),
      supabase.from('receipts').select('id, amount').eq('recorded_by', user!.id),
      supabase.from('receipts').select('id, amount').eq('recorded_by', user!.id).gte('created_at', monthStart),
    ]);

    const validated = (allMyOrders ?? []).filter(o => ['Approved', 'Billed', 'Delivered'].includes(o.status));
    const myMonthSalesOrders = (myMonthOrders ?? []).filter(o => ['Approved', 'Billed', 'Delivered'].includes(o.status));

    // Weekly breakdown for this month
    const weeks: Record<string, number> = { 'Week 1': 0, 'Week 2': 0, 'Week 3': 0, 'Week 4': 0 };
    myMonthSalesOrders.forEach(o => {
      const day = new Date(o.created_at).getDate();
      const wk = day <= 7 ? 'Week 1' : day <= 14 ? 'Week 2' : day <= 21 ? 'Week 3' : 'Week 4';
      weeks[wk] += o.grand_total ?? 0;
    });
    setMonthlyData(Object.entries(weeks).map(([week, sales]) => ({ week, sales })));
    setRecentOrders((allMyOrders ?? []).slice(0, 6));

    setStats({
      myOrdersTotal: validated.reduce((s, o) => s + (o.grand_total ?? 0), 0),
      myMonthSales: myMonthSalesOrders.reduce((s, o) => s + (o.grand_total ?? 0), 0),
      myMonthOrders: (myMonthOrders ?? []).length,
      myPending: (allMyOrders ?? []).filter(o => o.status === 'Pending').length,
      myApproved: (allMyOrders ?? []).filter(o => o.status === 'Approved').length,
      myCollected: (myReceipts ?? []).reduce((s, r) => s + (r.amount ?? 0), 0),
      myMonthCollected: (myMonthReceipts ?? []).reduce((s, r) => s + (r.amount ?? 0), 0),
      totalOrders: (allMyOrders ?? []).length,
    });
    setLoading(false);
  };

  const targetPct = Math.min((stats.myMonthSales / MONTHLY_TARGET) * 100, 100);
  const monthName = new Date().toLocaleString('en-IN', { month: 'long' });
  const maxWeekSales = Math.max(...monthlyData.map(d => d.sales), 1);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#34b0a7] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.full_name}. Here's your performance overview.</p>
        </div>
        <Link to="/sales/create-order">
          <button className="bg-[#34b0a7] hover:bg-[#2a9d94] text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors">
            <ShoppingCart size={16} /> New Order
          </button>
        </Link>
      </div>

      {/* Target Card */}
      <div className="bg-gradient-to-br from-[#34b0a7] via-[#2da89f] to-[#2a9d94] rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-teal-200 text-sm font-medium">{monthName} Target</p>
            <p className="text-3xl font-bold mt-1">{fmtK(stats.myMonthSales)}</p>
            <p className="text-teal-200 text-sm mt-1">of {fmtK(MONTHLY_TARGET)} target</p>
          </div>
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
              <circle cx="40" cy="40" r="32" fill="none" stroke="white" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - targetPct / 100)}`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold">{Math.round(targetPct)}%</span>
            </div>
          </div>
        </div>
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${targetPct}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-teal-200">
          <span>₹0</span>
          <span>{fmtK(MONTHLY_TARGET)}</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total My Sales', value: fmtK(stats.myOrdersTotal), sub: `${stats.totalOrders} orders total`, icon: <TrendingUp size={20} />, color: 'bg-emerald-100 text-emerald-600', border: 'border-l-4 border-l-emerald-500' },
          { label: 'This Month Orders', value: stats.myMonthOrders, sub: `${stats.myPending} pending`, icon: <ShoppingCart size={20} />, color: 'bg-teal-100 text-teal-600', border: 'border-l-4 border-l-teal-500' },
          { label: 'Month Collection', value: fmtK(stats.myMonthCollected), sub: `Total: ${fmtK(stats.myCollected)}`, icon: <DollarSign size={20} />, color: 'bg-blue-100 text-blue-600', border: 'border-l-4 border-l-blue-500' },
          { label: 'Approved Orders', value: stats.myApproved, sub: `${stats.myPending} pending approval`, icon: <CheckCircle size={20} />, color: 'bg-purple-100 text-purple-600', border: 'border-l-4 border-l-purple-500' },
        ].map((c, i) => (
          <div key={i} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${c.border}`}>
            <div className={`p-2.5 rounded-xl inline-flex mb-3 ${c.color}`}>{c.icon}</div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5 uppercase tracking-wide">{c.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Weekly Bar Chart + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Performance */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <Activity size={18} className="text-[#34b0a7]" /> {monthName} Weekly Performance
          </h2>
          <div className="flex items-end gap-3 h-32">
            {monthlyData.map((d, i) => {
              const pct = (d.sales / maxWeekSales) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">{fmtK(d.sales)}</span>
                  <div className="w-full flex items-end" style={{ height: '80px' }}>
                    <div
                      className="w-full rounded-t-lg bg-[#34b0a7] transition-all duration-700 hover:bg-[#2a9d94]"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{d.week}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Clock size={18} className="text-[#34b0a7]" /> My Recent Orders
            </h2>
            <Link to="/sales/my-orders" className="text-xs text-[#34b0a7] font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No orders yet. Create your first order!</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{(order.customers as any)?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{order.order_number} · {new Date(order.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">{fmt(order.grand_total ?? 0)}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'}`}>{order.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Create Order', icon: <ShoppingCart size={20} />, to: '/sales/create-order', color: 'bg-[#34b0a7] text-white' },
          { label: 'Add Receipt', icon: <DollarSign size={20} />, to: '/sales/receipt', color: 'bg-green-600 text-white' },
          { label: 'My Collection', icon: <Package size={20} />, to: '/sales/my-collection', color: 'bg-teal-600 text-white' },
        ].map((a, i) => (
          <Link key={i} to={a.to}>
            <div className={`${a.color} rounded-xl p-4 flex flex-col items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer`}>
              {a.icon}
              <span className="text-sm font-medium">{a.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
