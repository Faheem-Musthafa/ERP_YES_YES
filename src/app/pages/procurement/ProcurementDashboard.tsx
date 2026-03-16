import React from 'react';
import { ShoppingCart, Truck, ClipboardList, Clock, CheckCircle2, Activity } from 'lucide-react';
import {
  PageHeader, DataCard, StyledThead, StyledTh, StyledTr, StyledTd,
} from '@/app/components/ui/primitives';

export const ProcurementDashboard = () => {
  const kpis = [
    { label: 'Active POs', value: 18, sub: 'In progress', icon: <ShoppingCart size={20} />, iconBg: 'bg-teal-100 text-teal-600' },
    { label: 'Completed POs', value: 142, sub: 'This month: 28', icon: <CheckCircle2 size={20} />, iconBg: 'bg-emerald-100 text-emerald-600' },
    { label: 'Pending GRNs', value: 7, sub: 'Awaiting receipt', icon: <ClipboardList size={20} />, iconBg: 'bg-amber-100 text-amber-600' },
    { label: 'Active Suppliers', value: 24, sub: 'Verified vendors', icon: <Truck size={20} />, iconBg: 'bg-purple-100 text-purple-600' },
  ];

  const statusItems = [
    { label: 'Back Order', count: '5 POs', icon: <Clock size={18} className="text-amber-600" />, bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'In Transit', count: '13 POs', icon: <Truck size={18} className="text-blue-600" />, bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Delivered', count: '142 POs', icon: <CheckCircle2 size={18} className="text-emerald-600" />, bg: 'bg-emerald-50', border: 'border-emerald-100' },
  ];

  const recentActivity = [
    { title: 'GRN Completed', desc: 'PO-2024-156 • 500 units received from Supplier A', time: '1 hour ago', dot: 'bg-emerald-500' },
    { title: 'New Purchase Order', desc: 'PO-2024-178 created for Brand A products', time: '3 hours ago', dot: 'bg-teal-500' },
    { title: 'Delivery Expected', desc: 'PO-2024-165 scheduled for delivery tomorrow', time: '5 hours ago', dot: 'bg-blue-500' },
    { title: 'Supplier Confirmed', desc: 'Supplier B confirmed dispatch of PO-2024-177', time: '1 day ago', dot: 'bg-purple-500' },
  ];

  const pendingPOs = [
    { po: 'PO-2024-175', supplier: 'Supplier A', items: '15 items', amount: '₹ 2,45,000', expected: 'Feb 25, 2026', status: 'In Transit', statusCls: 'bg-amber-100 text-amber-700' },
    { po: 'PO-2024-176', supplier: 'Supplier B', items: '8 items', amount: '₹ 1,82,500', expected: 'Feb 26, 2026', status: 'Pending', statusCls: 'bg-teal-100 text-teal-700' },
    { po: 'PO-2024-177', supplier: 'Supplier C', items: '22 items', amount: '₹ 3,95,000', expected: 'Feb 28, 2026', status: 'In Transit', statusCls: 'bg-amber-100 text-amber-700' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Procurement Dashboard"
        subtitle="Manage purchase orders and supplier relationships"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
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
          <div className="space-y-3">
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
          </div>
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
              {pendingPOs.map((po, i) => (
                <StyledTr key={i}>
                  <StyledTd className="font-semibold text-primary">{po.po}</StyledTd>
                  <StyledTd>{po.supplier}</StyledTd>
                  <StyledTd className="text-center text-muted-foreground">{po.items}</StyledTd>
                  <StyledTd right className="font-bold">{po.amount}</StyledTd>
                  <StyledTd className="text-muted-foreground">{po.expected}</StyledTd>
                  <StyledTd className="text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${po.statusCls}`}>{po.status}</span>
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
