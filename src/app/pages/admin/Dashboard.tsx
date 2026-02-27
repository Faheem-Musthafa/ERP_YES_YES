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
  Billed: 'bg-blue-100 text-blue-700',
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
      <div className="w-8 h-8 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
        <p className="text-gray-500 mt-1">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.full_name}. Here's the complete business snapshot.</p>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Revenue', value: fmtK(stats.totalSales),
            sub: `This month: ${fmtK(stats.monthSales)}`,
            icon: <DollarSign size={22} />, color: 'bg-green-600', light: 'bg-green-50 text-green-600',
            badge: monthGrowth ? { val: `${monthGrowth > '0' ? '+' : ''}${monthGrowth}%`, up: parseFloat(monthGrowth) >= 0 } : null,
          },
          {
            label: 'Total Collected', value: fmtK(stats.totalCollected),
            sub: `This month: ${fmtK(stats.monthCollected)}`,
            icon: <TrendingUp size={22} />, color: 'bg-blue-600', light: 'bg-blue-50 text-blue-600',
          },
          {
            label: 'Total Orders', value: stats.totalOrders,
            sub: `${stats.pendingOrders} pending approval`,
            icon: <ShoppingCart size={22} />, color: 'bg-orange-600', light: 'bg-orange-50 text-orange-600',
          },
          {
            label: 'Active Staff', value: `${stats.activeStaff}/${stats.totalStaff}`,
            sub: `${stats.totalCustomers} customers`,
            icon: <Users size={22} />, color: 'bg-purple-600', light: 'bg-purple-50 text-purple-600',
          },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${card.light}`}>{card.icon}</div>
              {card.badge && (
                <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${card.badge.up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {card.badge.up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}{card.badge.val}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Middle row: Order Status Breakdown + Top Salesmen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Order Status */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-[#1e3a8a]" /> Orders by Status
          </h2>
          <div className="space-y-3">
            {ordersByStatus.map(({ status, count }) => {
              const pct = stats.totalOrders > 0 ? (count / stats.totalOrders * 100).toFixed(0) : 0;
              const colors: Record<string, string> = { Pending: '#f59e0b', Approved: '#10b981', Rejected: '#ef4444', Billed: '#3b82f6', Delivered: '#8b5cf6' };
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600'}`}>{status}</span>
                    <span className="font-semibold text-gray-800">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colors[status] ?? '#6b7280' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Salesmen */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-[#1e3a8a]" /> Top Salespeople This Month
          </h2>
          {topSalesmen.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No sales data this month</p>
          ) : (
            <div className="space-y-3">
              {topSalesmen.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-500' : 'bg-[#1e3a8a]'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.orders} orders</p>
                  </div>
                  <span className="text-sm font-bold text-[#1e3a8a]">{fmtK(s.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Recent Orders + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-[#1e3a8a]" /> Recent Orders
          </h2>
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
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Low Stock Alerts
            {stats.lowStock > 0 && <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{stats.lowStock} items</span>}
          </h2>
          {lowStockItems.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">All stock levels are healthy</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockItems.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400">{(p.brands as any)?.name ?? 'Unknown brand'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.stock_qty === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {p.stock_qty === 0 ? 'Out of stock' : `${p.stock_qty} left`}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between text-xs text-gray-400">
            <span>Total Products: {stats.totalProducts}</span>
            <span>Low Stock: {stats.lowStock}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
