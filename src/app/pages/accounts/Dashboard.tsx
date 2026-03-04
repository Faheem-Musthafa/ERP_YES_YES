import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { fmtK } from '@/app/utils';
import {
  DollarSign, CheckCircle, FileText, AlertCircle,
  TrendingUp, Wallet, Receipt
} from 'lucide-react';
import { Link } from 'react-router';
import { useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import {
  PageHeader, DataCard, StatusBadge, Spinner
} from '@/app/components/ui/primitives';

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

  const fetchAll = useCallback(async () => {
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

    setPendingOrders(pending.slice(0, 5));
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
  }, []);

  useEffect(() => { if (user?.id) fetchAll(); }, [user?.id, fetchAll]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Spinner size={32} />
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Accounts Overview"
        subtitle="Manage pending approvals and collections"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/accounts/sales-records')}>
              Sales Records
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" onClick={() => navigate('/accounts/order-review')}>
              <AlertCircle size={15} /> Pending Approvals ({stats.pendingOrders > 0 ? stats.pendingOrders : '0'})
            </Button>
          </div>
        }
      />

      {/* Main Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DataCard className="p-5 bg-primary/5 border-primary/20 cursor-default">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary text-primary-foreground"><DollarSign size={20} /></div>
            <div>
              <p className="text-[10px] text-primary uppercase font-bold tracking-widest mb-0.5">Today's Collection</p>
              <p className="text-2xl font-bold font-mono text-primary">{fmtK(stats.todayCollected)}</p>
            </div>
          </div>
        </DataCard>

        {[
          { label: 'Month Collection', value: fmtK(stats.monthCollected), sub: `${stats.monthReceipts} receipts`, icon: <Wallet size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-200' },
          { label: 'Pending Approvals', value: stats.pendingOrders, sub: `Value: ${fmtK(stats.pendingValue)}`, icon: <AlertCircle size={18} />, color: 'text-amber-600', bg: 'bg-amber-50 text-amber-600', border: 'border-amber-200' },
          { label: 'Approved Orders', value: stats.approvedOrders, sub: 'Total checked', icon: <CheckCircle size={18} />, color: 'text-blue-600', bg: 'bg-blue-50 text-blue-600', border: 'border-blue-200' },
        ].map((s, i) => (
          <DataCard key={i} className={`p-4 transition-colors group cursor-default hover:border-border`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{s.value}</p>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mt-1">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-2">{s.sub}</p>
              </div>
              <div className={`p-2 rounded-xl ${s.bg} transition-transform group-hover:scale-110`}>{s.icon}</div>
            </div>
          </DataCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Orders List */}
        <DataCard className="flex flex-col">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-muted-foreground" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">Awaiting Approval</h3>
            </div>
            {stats.pendingOrders > 0 && (
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {stats.pendingOrders} Orders
              </span>
            )}
          </div>
          <div className="p-0">
            {pendingOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <CheckCircle className="mx-auto mb-2 opacity-20 text-emerald-500" size={32} />
                <p className="text-sm">No pending approvals</p>
                <p className="text-[10px] uppercase tracking-widest mt-1">All caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pendingOrders.map(o => (
                  <div key={o.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group" onClick={() => navigate('/accounts/order-review')}>
                    <div className="flex flex-col gap-1.5 w-1/2">
                      <span className="text-sm font-semibold text-primary leading-none group-hover:underline">{o.order_number}</span>
                      <span className="text-xs text-muted-foreground truncate">{o.customers?.name ?? '—'}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 w-1/2">
                      <span className="text-sm font-bold font-mono text-foreground leading-none">₹{o.grand_total?.toLocaleString('en-IN') ?? '0'}</span>
                      <span className="text-[10px] text-muted-foreground uppercase opacity-70">by {o.users?.full_name?.split(' ')[0] ?? 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {pendingOrders.length > 0 && (
            <div className="p-3 border-t border-border mt-auto">
              <Button variant="ghost" className="w-full text-xs" onClick={() => navigate('/accounts/order-review')}>View All Approvals</Button>
            </div>
          )}
        </DataCard>

        {/* Recent Collections */}
        <DataCard className="flex flex-col">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-muted-foreground" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">Recent Collections</h3>
            </div>
          </div>
          <div className="p-0">
            {recentReceipts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Wallet className="mx-auto mb-2 opacity-20" size={32} />
                <p className="text-sm">No receipts recorded</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentReceipts.map(r => (
                  <div key={r.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col gap-1.5 w-[50%]">
                      <span className="text-sm font-semibold text-foreground leading-none truncate">{r.orders?.customers?.name ?? '—'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded leading-none">{r.payment_mode}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{r.orders?.order_number}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-sm font-bold font-mono text-primary leading-none">+ ₹{r.amount?.toLocaleString('en-IN') ?? '0'}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DataCard>
      </div>
    </div>
  );
};
