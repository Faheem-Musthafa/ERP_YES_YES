import React from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Search, Plus, Eye } from 'lucide-react';

export const PurchaseOrders = () => {
  const purchaseOrders = [
    { poNumber: 'PO-2024-175', supplier: 'Supplier A', items: 15, amount: 245000, date: '2026-02-20', expectedDate: '2026-02-25', status: 'In Transit' },
    { poNumber: 'PO-2024-176', supplier: 'Supplier B', items: 8, amount: 182500, date: '2026-02-19', expectedDate: '2026-02-26', status: 'Pending' },
    { poNumber: 'PO-2024-177', supplier: 'Supplier C', items: 22, amount: 395000, date: '2026-02-18', expectedDate: '2026-02-28', status: 'In Transit' },
    { poNumber: 'PO-2024-178', supplier: 'Supplier A', items: 12, amount: 156000, date: '2026-02-17', expectedDate: '2026-02-22', status: 'Approved' },
  ];

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'Pending': 'bg-amber-100 text-amber-700',
      'Approved': 'bg-emerald-100 text-emerald-700',
      'In Transit': 'bg-blue-100 text-blue-700',
      'Delivered': 'bg-purple-100 text-purple-700',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Purchase Orders</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage and track purchase orders</p>
        </div>
        <Button className="bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl">
          <Plus size={16} className="mr-2" />
          Create PO
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input
          placeholder="Search by PO number, supplier..."
          className="pl-10 rounded-xl"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">PO Number</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Supplier</th>
                <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Items</th>
                <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Total Amount</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">PO Date</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Expected Date</th>
                <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Status</th>
                <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {purchaseOrders.map((po, index) => (
                <tr key={index} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#34b0a7]">{po.poNumber}</td>
                  <td className="px-4 py-3">{po.supplier}</td>
                  <td className="px-4 py-3 text-center">{po.items}</td>
                  <td className="px-4 py-3 text-right font-bold">₹ {po.amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(po.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(po.expectedDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(po.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm" className="h-8">
                        <Eye size={14} />
                      </Button>
                    </div>
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
