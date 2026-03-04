import React from 'react';
import { ShoppingCart, Truck, ClipboardList, TrendingUp, Clock, CheckCircle2, Package, Activity } from 'lucide-react';

export const ProcurementDashboard = () => {
  const kpis = [
    { label: 'Active POs', value: 18, sub: 'In progress', icon: <ShoppingCart size={20} />, iconBg: 'bg-teal-100 text-teal-600', border: 'border-l-4 border-l-teal-500' },
    { label: 'Completed POs', value: 142, sub: 'This month: 28', icon: <CheckCircle2 size={20} />, iconBg: 'bg-emerald-100 text-emerald-600', border: 'border-l-4 border-l-emerald-500' },
    { label: 'Pending GRNs', value: 7, sub: 'Awaiting receipt', icon: <ClipboardList size={20} />, iconBg: 'bg-amber-100 text-amber-600', border: 'border-l-4 border-l-amber-500' },
    { label: 'Active Suppliers', value: 24, sub: 'Verified vendors', icon: <Truck size={20} />, iconBg: 'bg-purple-100 text-purple-600', border: 'border-l-4 border-l-purple-500' },
  ];

  const statusItems = [
    { label: 'Back Order', count: '5 POs', icon: <Clock size={18} className="text-amber-600" />, bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'In Transit', count: '13 POs', icon: <Truck size={18} className="text-blue-600" />, bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Delivered', count: '142 POs', icon: <CheckCircle2 size={18} className="text-emerald-600" />, bg: 'bg-emerald-50', border: 'border-emerald-100' },
  ];

  const recentActivity = [
    { title: 'GRN Completed', desc: 'PO-2024-156 � 500 units received from Supplier A', time: '1 hour ago', dot: 'bg-emerald-500' },
    { title: 'New Purchase Order', desc: 'PO-2024-178 created for Brand A products', time: '3 hours ago', dot: 'bg-teal-500' },
    { title: 'Delivery Expected', desc: 'PO-2024-165 scheduled for delivery tomorrow', time: '5 hours ago', dot: 'bg-blue-500' },
    { title: 'Supplier Confirmed', desc: 'Supplier B confirmed dispatch of PO-2024-177', time: '1 day ago', dot: 'bg-purple-500' },
  ];

  const pendingPOs = [
    { po: 'PO-2024-175', supplier: 'Supplier A', items: '15 items', amount: '? 2,45,000', expected: 'Feb 25, 2026', status: 'In Transit', statusCls: 'bg-amber-100 text-amber-700' },
    { po: 'PO-2024-176', supplier: 'Supplier B', items: '8 items', amount: '? 1,82,500', expected: 'Feb 26, 2026', status: 'Pending', statusCls: 'bg-teal-100 text-teal-700' },
    { po: 'PO-2024-177', supplier: 'Supplier C', items: '22 items', amount: '? 3,95,000', expected: 'Feb 28, 2026', status: 'In Transit', statusCls: 'bg-amber-100 text-amber-700' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Procurement Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">Manage purchase orders and supplier relationships</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${k.border}`}>
            <div className={`p-2.5 rounded-xl inline-flex mb-3 ${k.iconBg}`}>{k.icon}</div>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wide">{k.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PO Status */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <ShoppingCart size={15} className="text-[#34b0a7]" /> Purchase Order Status
          </h2>
          <div className="space-y-3">
            {statusItems.map((s, i) => (
              <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${s.bg} ${s.border}`}>
                <div className="flex items-center gap-3">
                  {s.icon}
                  <span className="text-sm font-medium text-gray-700">{s.label}</span>
                </div>
                <span className="font-bold text-gray-900 text-sm">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <Activity size={15} className="text-[#34b0a7]" /> Recent Activity
          </h2>
          <div className="space-y-3">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending POs Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Pending Purchase Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">PO Number</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Supplier</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Items</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Total Amount</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Expected Date</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pendingPOs.map((po, i) => (
                <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#34b0a7]">{po.po}</td>
                  <td className="px-4 py-3 text-gray-700">{po.supplier}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{po.items}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">{po.amount}</td>
                  <td className="px-4 py-3 text-gray-500">{po.expected}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${po.statusCls}`}>{po.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

