import React, { useState, useEffect } from 'react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  DollarSign, Clock, CheckCircle, FileText, AlertCircle,
  TrendingUp, ArrowRight, Wallet, Receipt
} from 'lucide-react';
import { Link } from 'react-router';
import { useNavigate } from 'react-router';

const fmt = (n: number) => `â‚¹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtK = (n: number) => n >= 100000 ? `â‚¹ ${(n / 100000).toFixed(1)}L` : n >= 1000 ? `â‚¹ ${(n / 1000).toFixed(1)}K` : fmt(n);

const STATUS_COLOR: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Billed: 'bg-teal-100 text-teal-700',
  Delivered: 'bg-purple-100 text-purple-700',
};

export const AccountsDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingOrders: 0, pendingValue: 0,
    approvedOrders: 0,
    totalCollected: 0, monthCollected: 0, todayCollected: 0,
    totalReceipts: 0, monthReceipts: 0,
  });
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<any[]>([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [
      { data: orders },
      { data: receipts },
      { data: monthReceipts },
      { data: todayReceiptsData },
      { data: recentReceiptsData },
    ] = await Promise.all([
      supabase.from('orders').select('id, order_number, status, grand_total, created_at, customers(name), users!orders_created_by_fkey(full_name)').order('created_at', { ascending: false }).limit(100),
      supabase.from('receipts').select('id, amount, payment_mode, created_at, orders(order_number, customers(name))'),
      supabase.from('receipts').select('id, amount').gte('created_at', monthStart),
      supabase.from('receipts').select('id, amount').gte('created_at', todayStart),
      supabase.from('receipts').select('id, amount, payment_mode, created_at, orders(order_number, customers(name))').order('created_at', { ascending: false }).limit(6),
    ]);

    const pending = (orders ?? []).filter(o => o.status === 'Pending');
    const approved = (orders ?? []).filter(o => o.status === 'Approved');

    setPendingOrders(pending.slice(0, 6));
    setRecentReceipts(recentReceiptsData ?? []);

    setStats({
      pendingOrders: pending.length,
      pendingValue: pending.reduce((s, o) => s + (o.grand_total ?? 0), 0),
      approvedOrders: approved.length,
      totalCollected: (receipts ?? []).reduce((s, r) => s + (r.amount ?? 0), 0),
      monthCollected: (monthReceipts ?? []).reduce((s, r) => s + (r.amount ?? 0), 0),
      todayCollected: (todayReceiptsData ?? []).reduce((s, r) => s + (r.amount ?? 0), 0),
      totalReceipts: (receipts ?? []).length,
      monthReceipts: (monthReceipts ?? []).length,
    });
    setLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#34b0a7] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const monthName = new Date().toLocaleString('en-IN', { month: 'long' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accounts Dashboard</h1>
        <p className="text-gray-500 mt-1">Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.full_name}. Here's the financial overview.</p>
      </div>

      {/* Alert Banner â€” if there are pending orders */}
      {stats.pendingOrders > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertCircle size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">{stats.pendingOrders} orders awaiting your approval</p>
              <p className="text-xs text-amber-600">Total value: {fmt(stats.pendingValue)}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/accounts/pending-orders')}
            className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
          >
            Review Now <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Today's Collection", value: fmtK(stats.todayCollected),
            sub: `${monthName}: ${fmtK(stats.monthCollected)}`,
            icon: <Wallet size={20} />, color: 'bg-green-50 text-green-600',
          },
          {
            label: 'Total Collected', value: fmtK(stats.totalCollected),
            sub: `${stats.totalReceipts} receipts total`,
            icon: <DollarSign size={20} />, color: 'bg-teal-50 text-teal-600',
          },
          {
            label: 'Pending Approval', value: stats.pendingOrders,
            sub: `Value: ${fmtK(stats.pendingValue)}`,
            icon: <Clock size={20} />, color: 'bg-amber-50 text-amber-600',
          },
          {
            label: 'Approved Orders', value: stats.approvedOrders,
            sub: `Ready for billing`,
            icon: <CheckCircle size={20} />, color: 'bg-purple-50 text-purple-600',
          },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className={`p-2.5 rounded-xl inline-flex mb-3 ${c.color}`}>{c.icon}</div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{c.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Pending Orders Table + Recent Receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Clock size={18} className="text-amber-500" /> Pending Orders
              {stats.pendingOrders > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{stats.pendingOrders}</span>
              )}
            </h2>
            <Link to="/accounts/pending-orders" className="text-xs text-[#34b0a7] font-medium hover:underline flex items-center gap-1">
              Review all <ArrowRight size={12} />
            </Link>
          </div>
          {pendingOrders.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No pending orders â€” all clear!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{(order.customers as any)?.name ?? 'â€”'}</p>
                    <p className="text-xs text-gray-400">
                      {order.order_number} Â· by {(order.users as any)?.full_name ?? 'Unknown'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800">{fmt(order.grand_total ?? 0)}</p>
                    <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Receipts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Receipt size={18} className="text-[#34b0a7]" /> Recent Collections
            </h2>
            <Link to="/accounts/collection-status" className="text-xs text-[#34b0a7] font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recentReceipts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No receipts recorded yet</p>
          ) : (
            <div className="space-y-3">
              {recentReceipts.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{(r.orders as any)?.customers?.name ?? 'â€”'}</p>
                    <p className="text-xs text-gray-400">
                      {(r.orders as any)?.order_number ?? 'â€”'} Â· {r.payment_mode ?? 'Cash'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">+{fmt(r.amount ?? 0)}</p>
                    <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('en-IN')}</p>
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
          { label: 'Review Orders', icon: <FileText size={20} />, to: '/accounts/pending-orders', color: 'bg-[#34b0a7] text-white' },
          { label: 'Collection Status', icon: <TrendingUp size={20} />, to: '/accounts/collection-status', color: 'bg-green-600 text-white' },
          { label: 'Sales Records', icon: <Receipt size={20} />, to: '/accounts/sales', color: 'bg-teal-600 text-white' },
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
