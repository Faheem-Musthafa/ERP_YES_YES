import React, { useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Search, Plus } from 'lucide-react';
import { toast } from 'sonner';

export const GRN = () => {
  const handleCreateGRN = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('GRN created successfully - Stock updated');
  };

  const recentGRNs = [
    { grnNumber: 'GRN-2024-089', poNumber: 'PO-2024-156', supplier: 'Supplier A', items: 12, receivedDate: '2026-02-19', status: 'Completed' },
    { grnNumber: 'GRN-2024-090', poNumber: 'PO-2024-162', supplier: 'Supplier B', items: 8, receivedDate: '2026-02-18', status: 'Completed' },
    { grnNumber: 'GRN-2024-091', poNumber: 'PO-2024-168', supplier: 'Supplier C', items: 15, receivedDate: '2026-02-17', status: 'Completed' },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Goods Receipt Note (GRN)</h1>
          <p className="text-gray-600 mt-1">Record received goods and update stock levels</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New GRN</h2>
          <form onSubmit={handleCreateGRN} className="space-y-4">
            <div>
              <Label>Purchase Order Number</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input placeholder="Search PO number..." className="pl-10" />
              </div>
            </div>

            <div>
              <Label>Supplier Name</Label>
              <Input placeholder="Auto-filled from PO" disabled />
            </div>

            <div>
              <Label>Received Date</Label>
              <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>

            <div>
              <Label>Total Items</Label>
              <Input type="number" placeholder="0" disabled />
            </div>

            <div>
              <Label>Delivery Challan Number</Label>
              <Input placeholder="Enter challan number" />
            </div>

            <div>
              <Label>Remarks</Label>
              <Input placeholder="Any additional notes" />
            </div>

            <Button type="submit" className="w-full bg-[#1e3a8a] hover:bg-blue-900">
              <Plus size={16} className="mr-2" />
              Create GRN & Update Stock
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Deliveries</h2>
          <div className="space-y-3">
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-600">PO-2024-175</span>
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">In Transit</span>
              </div>
              <p className="text-xs text-gray-600">Supplier A - 15 items</p>
              <p className="text-xs text-gray-500 mt-1">Expected: Feb 25, 2026</p>
            </div>

            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-600">PO-2024-177</span>
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">In Transit</span>
              </div>
              <p className="text-xs text-gray-600">Supplier C - 22 items</p>
              <p className="text-xs text-gray-500 mt-1">Expected: Feb 28, 2026</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent GRNs</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-700 p-3">GRN Number</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3">PO Number</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3">Supplier</th>
                <th className="text-center text-xs font-semibold text-gray-700 p-3">Items</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3">Received Date</th>
                <th className="text-center text-xs font-semibold text-gray-700 p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentGRNs.map((grn, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-sm font-medium text-gray-900">{grn.grnNumber}</td>
                  <td className="p-3 text-sm text-blue-600">{grn.poNumber}</td>
                  <td className="p-3 text-sm">{grn.supplier}</td>
                  <td className="p-3 text-sm text-center">{grn.items}</td>
                  <td className="p-3 text-sm">{new Date(grn.receivedDate).toLocaleDateString()}</td>
                  <td className="p-3 text-center">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {grn.status}
                    </span>
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
