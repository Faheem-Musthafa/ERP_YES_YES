import React from 'react';
import { Card } from '@/app/components/ui/card';
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
      'Pending': 'bg-blue-100 text-blue-700',
      'Approved': 'bg-green-100 text-green-700',
      'In Transit': 'bg-yellow-100 text-yellow-700',
      'Delivered': 'bg-purple-100 text-purple-700',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">Manage and track purchase orders</p>
        </div>
        <Button className="bg-[#f97316] hover:bg-orange-600">
          <Plus size={16} className="mr-2" />
          Create PO
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
                <th className="text-left text-xs font-semibold text-gray-700 p-3">PO Date</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3">Expected Date</th>
                <th className="text-center text-xs font-semibold text-gray-700 p-3">Status</th>
                <th className="text-center text-xs font-semibold text-gray-700 p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map((po, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-sm font-medium text-blue-600">{po.poNumber}</td>
                  <td className="p-3 text-sm">{po.supplier}</td>
                  <td className="p-3 text-sm text-center">{po.items}</td>
                  <td className="p-3 text-sm text-right font-semibold">₹ {po.amount.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-sm">{new Date(po.date).toLocaleDateString()}</td>
                  <td className="p-3 text-sm">{new Date(po.expectedDate).toLocaleDateString()}</td>
                  <td className="p-3 text-center">{getStatusBadge(po.status)}</td>
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
    </div>
  );
};
