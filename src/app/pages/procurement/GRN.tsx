import React, { useState } from 'react';
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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Goods Receipt Note (GRN)</h1>
        <p className="text-gray-500 mt-1 text-sm">Record received goods and update stock levels</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">Create New GRN</h2>
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

            <Button type="submit" className="w-full bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl">
              <Plus size={16} className="mr-2" />
              Create GRN & Update Stock
            </Button>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">Pending Deliveries</h2>
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-[#34b0a7]/5 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[#34b0a7]">PO-2024-175</span>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-100 text-amber-700">In Transit</span>
              </div>
              <p className="text-xs text-gray-600">Supplier A - 15 items</p>
              <p className="text-xs text-gray-500 mt-1">Expected: Feb 25, 2026</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-[#34b0a7]/5 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[#34b0a7]">PO-2024-177</span>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-100 text-amber-700">In Transit</span>
              </div>
              <p className="text-xs text-gray-600">Supplier C - 22 items</p>
              <p className="text-xs text-gray-500 mt-1">Expected: Feb 28, 2026</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Recent GRNs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">GRN Number</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">PO Number</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Supplier</th>
                <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Items</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Received Date</th>
                <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentGRNs.map((grn, index) => (
                <tr key={index} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900">{grn.grnNumber}</td>
                  <td className="px-4 py-3 text-[#34b0a7] font-medium">{grn.poNumber}</td>
                  <td className="px-4 py-3">{grn.supplier}</td>
                  <td className="px-4 py-3 text-center">{grn.items}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(grn.receivedDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                      {grn.status}
                    </span>
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
