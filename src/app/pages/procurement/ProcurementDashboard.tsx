import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Truck, ClipboardList, Clock, CheckCircle2, Activity } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { toast } from 'sonner';
import {
  PageHeader, DataCard, StyledThead, StyledTh, StyledTr, StyledTd, EmptyState, Spinner,
} from '@/app/components/ui/primitives';

interface DashboardPO {
  id: string;
  po_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  expected_delivery_date: string | null;
  delivered_at: string | null;
  suppliers: { name: string } | null;
  po_items: { quantity: number }[] | null;
}

interface DashboardGRN {
  id: string;
  grn_number: string;
  received_date: string;
  created_at: string;
  purchase_orders: { po_number: string | null } | null;
  grn_items: { received_qty: number; status: string }[] | null;
}

export const ProcurementDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<DashboardPO[]>([]);
  const [grnRows, setGrnRows] = useState<DashboardGRN[]>([]);
  const [activeSuppliers, setActiveSuppliers] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: poData, error: poError }, { data: grnData, error: grnError }, { data: supplierData, error: supplierError }] = await Promise.all([
          supabase
            .from('purchase_orders')
            .select('id, po_number, status, total_amount, created_at, expected_delivery_date, delivered_at, suppliers(name), po_items(quantity)')
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('grn')
            .select('id, grn_number, received_date, created_at, purchase_orders:purchase_orders!grn_po_id_fkey(po_number), grn_items(received_qty, status)')
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('suppliers')
            .select('id')
            .eq('status', 'Active'),
        ]);

        if (poError) throw poError;
        if (grnError) throw grnError;
        if (supplierError) throw supplierError;

        setOrders((poData ?? []) as DashboardPO[]);
        setGrnRows((grnData ?? []) as DashboardGRN[]);
        setActiveSuppliers((supplierData ?? []).length);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const activePOs = orders.filter(po => po.status === 'Pending' || po.status === 'Approved').length;
  const completedPOs = orders.filter(po => po.status === 'Received').length;
  const completedThisMonth = orders.filter(po => po.status === 'Received' && (po.delivered_at ?? po.created_at).startsWith(thisMonthKey)).length;
  const pendingGRNs = grnRows.filter(grn => (grn.grn_items ?? []).some(item => item.status !== 'Completed')).length;

  const kpis = [
    { label: 'Active POs', value: activePOs, sub: 'In progress', icon: <ShoppingCart size={20} />, iconBg: 'bg-teal-100 text-teal-600' },
    { label: 'Completed POs', value: completedPOs, sub: `This month: ${completedThisMonth}`, icon: <CheckCircle2 size={20} />, iconBg: 'bg-emerald-100 text-emerald-600' },
    { label: 'Pending GRNs', value: pendingGRNs, sub: 'Awaiting receipt', icon: <ClipboardList size={20} />, iconBg: 'bg-amber-100 text-amber-600' },
    { label: 'Active Suppliers', value: activeSuppliers, sub: 'Verified vendors', icon: <Truck size={20} />, iconBg: 'bg-purple-100 text-purple-600' },
  ];

  const statusItems = [
    { label: 'Back Order', count: `${orders.filter(po => po.status === 'Draft' || po.status === 'Pending').length} POs`, icon: <Clock size={18} className="text-amber-600" />, bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'In Transit', count: `${orders.filter(po => po.status === 'Approved').length} POs`, icon: <Truck size={18} className="text-blue-600" />, bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Delivered', count: `${completedPOs} POs`, icon: <CheckCircle2 size={18} className="text-emerald-600" />, bg: 'bg-emerald-50', border: 'border-emerald-100' },
  ];

  const recentActivity = useMemo(() => {
    const poActivity = orders.slice(0, 4).map(po => ({
      title: po.status === 'Received' ? 'PO Received' : 'Purchase Order Updated',
      desc: `${po.po_number} • ${(po.po_items ?? []).reduce((sum, row) => sum + (row.quantity ?? 0), 0)} units • ${po.suppliers?.name ?? 'Unknown Supplier'}`,
      time: new Date(po.delivered_at ?? po.created_at).toLocaleString(),
      dot: po.status === 'Received' ? 'bg-emerald-500' : 'bg-teal-500',
    }));
    const grnActivity = grnRows.slice(0, 4).map(grn => ({
      title: (grn.grn_items ?? []).every(item => item.status === 'Completed') ? 'GRN Completed' : 'GRN Updated',
      desc: `${grn.purchase_orders?.po_number ?? 'No PO'} • Received ${(grn.grn_items ?? []).reduce((sum, item) => sum + (item.received_qty ?? 0), 0)} units`,
      time: new Date(grn.received_date ?? grn.created_at).toLocaleString(),
      dot: (grn.grn_items ?? []).every(item => item.status === 'Completed') ? 'bg-emerald-500' : 'bg-blue-500',
    }));
    return [...grnActivity, ...poActivity].slice(0, 6);
  }, [orders, grnRows]);

  const pendingPOs = orders.filter(po => po.status === 'Pending' || po.status === 'Approved').slice(0, 8);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Procurement Dashboard"
        subtitle="Manage purchase orders and supplier relationships"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <DataCard key={i} className="p-5"><Spinner className="py-5" size={20} /></DataCard>
        )) : kpis.map((k, i) => (
          <DataCard key={i} className="p-5 transition-colors group cursor-default">
            <div className={`p-2 rounded-xl inline-flex mb-3 ${k.iconBg} transition-transform group-hover:scale-110`}>{k.icon}</div>
            <p className="text-2xl font-bold text-foreground">{k.value}</p>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mt-1">{k.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
          </DataCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DataCard className="p-5">
          <h2 className="text-xs font-bold text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-widest">
            <ShoppingCart size={15} className="text-primary" /> Purchase Order Status
          </h2>
          <div className="space-y-3">
            {statusItems.map((s, i) => (
              <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${s.bg} ${s.border} dark:bg-muted/40 dark:border-border/80`}>
                <div className="flex items-center gap-3">
                  {s.icon}
                  <span className="text-sm font-medium text-foreground">{s.label}</span>
                </div>
                <span className="font-bold text-foreground text-sm">{s.count}</span>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard className="p-5">
          <h2 className="text-xs font-bold text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-widest">
            <Activity size={15} className="text-primary" /> Recent Activity
          </h2>
          {loading ? <Spinner /> : recentActivity.length === 0 ? <EmptyState icon={Activity} message="No recent activity" /> : <div className="space-y-3">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                  <p className="text-xs text-muted-foreground/80 mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>}
        </DataCard>
      </div>

      <DataCard className="flex flex-col">
        <div className="p-5 border-b border-border">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pending Purchase Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <StyledThead>
              <tr>
                <StyledTh>PO Number</StyledTh>
                <StyledTh>Supplier</StyledTh>
                <StyledTh className="text-center">Items</StyledTh>
                <StyledTh right>Total Amount</StyledTh>
                <StyledTh>Expected Date</StyledTh>
                <StyledTh className="text-center">Status</StyledTh>
              </tr>
            </StyledThead>
            <tbody>
              {pendingPOs.map((po) => (
                <StyledTr key={po.id}>
                  <StyledTd className="font-semibold text-primary">{po.po_number}</StyledTd>
                  <StyledTd>{po.suppliers?.name ?? 'Unknown Supplier'}</StyledTd>
                  <StyledTd className="text-center text-muted-foreground">{(po.po_items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0)} items</StyledTd>
                  <StyledTd right className="font-bold">₹ {po.total_amount.toLocaleString('en-IN')}</StyledTd>
                  <StyledTd className="text-muted-foreground">{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : '—'}</StyledTd>
                  <StyledTd className="text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${po.status === 'Approved' ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'}`}>{po.status === 'Approved' ? 'In Transit' : po.status}</span>
                  </StyledTd>
                </StyledTr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>
    </div>
  );
};
