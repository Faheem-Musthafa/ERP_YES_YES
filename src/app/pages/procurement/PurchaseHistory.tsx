import React from 'react';
import { Card } from '@/app/components/ui/card';
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Purchase History</h1>
          <p className="text-gray-600 mt-1">View completed purchase orders</p>
        </div>
        <Button className="bg-[#34b0a7] hover:bg-teal-900">
          <Download size={16} className="mr-2" />
          Export History
        </Button>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
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
      </Card>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-700 p-3">PO Number</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3">Supplier</th>
                <th className="text-center text-xs font-semibold text-gray-700 p-3">Items</th>
                <th className="text-right text-xs font-semibold text-gray-700 p-3">Total Amount</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3">Order Date</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3">Delivery Date</th>
                <th className="text-center text-xs font-semibold text-gray-700 p-3">Status</th>
                <th className="text-center text-xs font-semibold text-gray-700 p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-sm font-medium text-teal-600">{record.poNumber}</td>
                  <td className="p-3 text-sm">{record.supplier}</td>
                  <td className="p-3 text-sm text-center">{record.items}</td>
                  <td className="p-3 text-sm text-right font-semibold">â‚¹ {record.amount.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-sm">{new Date(record.orderDate).toLocaleDateString()}</td>
                  <td className="p-3 text-sm">{new Date(record.deliveryDate).toLocaleDateString()}</td>
                  <td className="p-3 text-center">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {record.status}
                    </span>
                  </td>
                  <td className="p-3">
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
      </Card>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-l-4 border-teal-500">
          <p className="text-sm text-gray-600">Total POs Completed</p>
          <p className="text-3xl font-semibold text-gray-900 mt-2">142</p>
          <p className="text-xs text-gray-500 mt-1">This month: 28</p>
        </Card>

        <Card className="p-6 border-l-4 border-green-500">
          <p className="text-sm text-gray-600">Total Value</p>
          <p className="text-3xl font-semibold text-gray-900 mt-2">â‚¹ 52.8L</p>
          <p className="text-xs text-gray-500 mt-1">This month</p>
        </Card>

        <Card className="p-6 border-l-4 border-purple-500">
          <p className="text-sm text-gray-600">Avg. Delivery Time</p>
          <p className="text-3xl font-semibold text-gray-900 mt-2">4.5 days</p>
          <p className="text-xs text-gray-500 mt-1">This month</p>
        </Card>
      </div>
    </div>
  );
};
