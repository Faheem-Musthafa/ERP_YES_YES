import React from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Search, Eye, Download } from 'lucide-react';

export const PurchaseHistory = () => {
  const history = [
    { poNumber: 'PO-2024-172', supplier: 'Supplier A', items: 18, amount: 285000, orderDate: '2026-02-15', deliveryDate: '2026-02-18', status: 'Completed' },
    { poNumber: 'PO-2024-168', supplier: 'Supplier C', items: 25, amount: 425000, orderDate: '2026-02-12', deliveryDate: '2026-02-17', status: 'Completed' },
    { poNumber: 'PO-2024-165', supplier: 'Supplier B', items: 12, amount: 195000, orderDate: '2026-02-10', deliveryDate: '2026-02-15', status: 'Completed' },
    { poNumber: 'PO-2024-162', supplier: 'Supplier B', items: 8, amount: 145000, orderDate: '2026-02-08', deliveryDate: '2026-02-12', status: 'Completed' },
    { poNumber: 'PO-2024-156', supplier: 'Supplier A', items: 15, amount: 235000, orderDate: '2026-02-05', deliveryDate: '2026-02-10', status: 'Completed' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Purchase History</h1>
          <p className="text-gray-500 mt-1 text-sm">View completed purchase orders</p>
        </div>
        <Button className="bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl">
          <Download size={16} className="mr-2" />
          Export History
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search by PO number, supplier..."
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Input type="date" className="w-40" placeholder="From Date" />
            <Input type="date" className="w-40" placeholder="To Date" />
          </div>
        </div>
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
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Order Date</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Delivery Date</th>
                <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Status</th>
                <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#34b0a7]">{record.poNumber}</td>
                  <td className="px-4 py-3">{record.supplier}</td>
                  <td className="px-4 py-3 text-center">{record.items}</td>
                  <td className="px-4 py-3 text-right font-bold">₹ {record.amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(record.orderDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(record.deliveryDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                      {record.status}
                    </span>
                  </td>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-teal-500">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total POs Completed</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">142</p>
          <p className="text-xs text-gray-400 mt-0.5">This month: 28</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-emerald-500">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">₹ 52.8L</p>
          <p className="text-xs text-gray-400 mt-0.5">This month</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-purple-500">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Avg. Delivery Time</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">4.5 days</p>
          <p className="text-xs text-gray-400 mt-0.5">This month</p>
        </div>
      </div>
    </div>
  );
};
