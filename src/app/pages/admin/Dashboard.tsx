import React, { useState, useEffect } from 'react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  TrendingUp, ShoppingCart, Clock, AlertTriangle, Users,
  Package, BarChart3, CheckCircle, XCircle, Truck, ArrowUp, ArrowDown,
  DollarSign, Activity
} from 'lucide-react';

const fmt = (n: number) => `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtK = (n: number) => n >= 100000 ? `₹ ${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹ ${(n / 1000).toFixed(1)}K` : fmt(n);

const STATUS_COLOR: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Billed: 'bg-teal-100 text-teal-700',
  Delivered: 'bg-purple-100 text-purple-700',
};

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0, monthSales: 0, prevMonthSales: 0,
    totalOrders: 0, pendingOrders: 0, approvedOrders: 0,
    totalCollected: 0, monthCollected: 0,
    totalStaff: 0, activeStaff: 0,
    lowStock: 0, totalProducts: 0, totalCustomers: 0,
  });
  const [topSalesmen, setTopSalesmen] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

    const [
      { data: allOrders },
      { data: monthOrders },
      { data: prevMonthOrdersData },
      { data: allReceipts },
      { data: monthReceipts },
      { data: allUsers },
      { data: products },
      { data: customers },
    ] = await Promise.all([
      supabase.from('orders').select('id, status, grand_total, created_by, created_at, customers(name), order_number').order('created_at', { ascending: false }),
      supabase.from('orders').select('id, status, grand_total, created_by').gte('created_at', monthStart),
      supabase.from('orders').select('id, status, grand_total').gte('created_at', prevMonthStart).lte('created_at', prevMonthEnd),
      supabase.from('receipts').select('id, amount'),
      supabase.from('receipts').select('id, amount').gte('created_at', monthStart),
      supabase.from('users').select('id, full_name, role, is_active'),
      supabase.from('products').select('id, name, stock_qty, brands(name)').eq('is_active', true),
      supabase.from('customers').select('id', { count: 'exact' }),
    ]);

    const salesOrders = (allOrders ?? []).filter(o => ['Approved', 'Billed', 'Delivered'].includes(o.status));
    const totalSales = salesOrders.reduce((s, o) => s + (o.grand_total ?? 0), 0);
    const monthSalesOrders = (monthOrders ?? []).filter(o => ['Approved', 'Billed', 'Delivered'].includes(o.status));
    const monthSales = monthSalesOrders.reduce((s, o) => s + (o.grand_total ?? 0), 0);
    const prevMonthSales = (prevMonthOrdersData ?? []).filter(o => ['Approved', 'Billed', 'Delivered'].includes(o.status)).reduce((s, o) => s + (o.grand_total ?? 0), 0);
    const totalCollected = (allReceipts ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
    const monthCollected = (monthReceipts ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);

    // Orders by status breakdown
    const statusBreakdown: Record<string, number> = {};
    (allOrders ?? []).forEach(o => { statusBreakdown[o.status] = (statusBreakdown[o.status] ?? 0) + 1; });
    setOrdersByStatus(Object.entries(statusBreakdown).map(([status, count]) => ({ status, count })));

    // Top salesmen this month
    const salesByUser: Record<string, { name: string; total: number; orders: number }> = {};
    const salesUsers = (allUsers ?? []).filter(u => u.role === 'sales');
    salesUsers.forEach(u => { salesByUser[u.id] = { name: u.full_name, total: 0, orders: 0 }; });
    (monthOrders ?? []).filter(o => ['Approved', 'Billed', 'Delivered'].includes(o.status)).forEach(o => {
      if (o.created_by && salesByUser[o.created_by]) {
        salesByUser[o.created_by].total += o.grand_total ?? 0;
        salesByUser[o.created_by].orders += 1;
      }
    });
    setTopSalesmen(Object.values(salesByUser).sort((a, b) => b.total - a.total).slice(0, 5));

    const lowStockProds = (products ?? []).filter(p => p.stock_qty <= 5);
    setLowStockItems(lowStockProds.slice(0, 5));
    setRecentOrders((allOrders ?? []).slice(0, 6));

    setStats({
      totalSales, monthSales, prevMonthSales,
      totalOrders: (allOrders ?? []).length,
      pendingOrders: (allOrders ?? []).filter(o => o.status === 'Pending').length,
      approvedOrders: (allOrders ?? []).filter(o => o.status === 'Approved').length,
      totalCollected, monthCollected,
      totalStaff: (allUsers ?? []).length,
      activeStaff: (allUsers ?? []).filter(u => u.is_active).length,
      lowStock: lowStockProds.length,
      totalProducts: (products ?? []).length,
      totalCustomers: customers?.length ?? 0,
    });
    setLoading(false);
  };

  const monthGrowth = stats.prevMonthSales > 0
    ? ((stats.monthSales - stats.prevMonthSales) / stats.prevMonthSales * 100).toFixed(1)
    : null;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-[#34b0a7] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Overview</h1>
          <p className="text-gray-500 mt-1 text-sm">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, <span className="font-medium text-gray-700">{user?.full_name}</span>. Here's your business snapshot.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-white border border-gray-100 px-3 py-2 rounded-xl shadow-sm">
          <Activity size={14} className="text-[#34b0a7]" />
          Live data · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Revenue', value: fmtK(stats.totalSales),
            sub: `This month: ${fmtK(stats.monthSales)}`,
            icon: <DollarSign size={20} />, iconBg: 'bg-emerald-100 text-emerald-600',
            border: 'border-l-4 border-l-emerald-500',
            badge: monthGrowth ? { val: `${parseFloat(monthGrowth) >= 0 ? '+' : ''}${monthGrowth}%`, up: parseFloat(monthGrowth) >= 0 } : null,
          },
          {
            label: 'Total Collected', value: fmtK(stats.totalCollected),
            sub: `This month: ${fmtK(stats.monthCollected)}`,
            icon: <TrendingUp size={20} />, iconBg: 'bg-teal-100 text-teal-600',
            border: 'border-l-4 border-l-teal-500',
          },
          {
            label: 'Total Orders', value: stats.totalOrders,
            sub: `${stats.pendingOrders} pending approval`,
            icon: <ShoppingCart size={20} />, iconBg: 'bg-blue-100 text-blue-600',
            border: 'border-l-4 border-l-blue-500',
          },
          {
            label: 'Active Staff', value: `${stats.activeStaff}/${stats.totalStaff}`,
            sub: `${stats.totalCustomers} customers`,
            icon: <Users size={20} />, iconBg: 'bg-purple-100 text-purple-600',
            border: 'border-l-4 border-l-purple-500',
          },
        ].map((card, i) => (
          <div key={i} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${card.border}`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${card.iconBg}`}>{card.icon}</div>
              {(card as any).badge && (
                <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${ (card as any).badge.up ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {(card as any).badge.up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}{(card as any).badge.val}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{card.value}</p>
            <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wide">{card.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Middle row: Order Status Breakdown + Top Salesmen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Order Status */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <BarChart3 size={16} className="text-[#34b0a7]" /> Orders by Status
          </h2>
          <div className="space-y-3">
            {ordersByStatus.map(({ status, count }) => {
              const pct = stats.totalOrders > 0 ? (count / stats.totalOrders * 100).toFixed(0) : 0;
              const colors: Record<string, string> = { Pending: '#f59e0b', Approved: '#10b981', Rejected: '#ef4444', Billed: '#3b82f6', Delivered: '#8b5cf6' };
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600'}`}>{status}</span>
                    <span className="font-bold text-gray-800">{count} <span className="text-gray-400 font-normal text-xs">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: colors[status] ?? '#6b7280' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Salesmen */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <TrendingUp size={16} className="text-[#34b0a7]" /> Top Salespeople This Month
          </h2>
          {topSalesmen.length === 0 ? (
            <div className="text-center py-8">
              <Users size={36} className="text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No sales data this month</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topSalesmen.map((s, i) => {
                const maxSale = topSalesmen[0]?.total || 1;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-[#34b0a7]'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                        <span className="text-xs font-bold text-[#34b0a7] shrink-0 ml-2">{fmtK(s.total)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full bg-[#34b0a7] rounded-full" style={{ width: `${(s.total / maxSale) * 100}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{s.orders} orders</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Recent Orders + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <Activity size={16} className="text-[#34b0a7]" /> Recent Orders
          </h2>
          <div className="space-y-2">
            {recentOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{(order.customers as any)?.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{order.order_number} · {new Date(order.created_at).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-sm font-bold text-gray-700">{fmt(order.grand_total ?? 0)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'}`}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <AlertTriangle size={16} className="text-red-500" /> Low Stock Alerts
            {stats.lowStock > 0 && <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{stats.lowStock}</span>}
          </h2>
          {lowStockItems.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={32} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">All stock levels are healthy</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockItems.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{(p.brands as any)?.name ?? 'Unknown brand'}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ml-2 ${p.stock_qty === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {p.stock_qty === 0 ? 'Out of stock' : `${p.stock_qty} left`}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between text-xs text-gray-400">
            <span>Products: {stats.totalProducts}</span>
            <span className="text-red-400 font-medium">Low stock: {stats.lowStock}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
