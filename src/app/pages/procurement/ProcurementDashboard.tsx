import React from 'react';
import { Card } from '@/app/components/ui/card';
import { ShoppingCart, Truck, ClipboardList, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

export const ProcurementDashboard = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Procurement Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage purchase orders and supplier relationships</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="p-6 border-l-4 border-teal-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active POs</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">18</p>
              <p className="text-xs text-teal-600 mt-1">In progress</p>
            </div>
            <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center">
              <ShoppingCart size={28} className="text-teal-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed POs</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">142</p>
              <p className="text-xs text-green-600 mt-1">This month: 28</p>
            </div>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 size={28} className="text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-teal-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending GRNs</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">7</p>
              <p className="text-xs text-teal-600 mt-1">Awaiting receipt</p>
            </div>
            <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center">
              <ClipboardList size={28} className="text-teal-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Suppliers</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">24</p>
              <p className="text-xs text-gray-600 mt-1">Verified vendors</p>
            </div>
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
              <Truck size={28} className="text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Purchase Orders Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingCart size={20} className="text-teal-600" />
            Purchase Order Status
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-teal-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock size={20} className="text-teal-600" />
                <span className="text-sm font-medium text-gray-700">Pending Approval</span>
              </div>
              <span className="font-semibold text-gray-900">5 POs</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Truck size={20} className="text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">In Transit</span>
              </div>
              <span className="font-semibold text-gray-900">13 POs</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-600" />
                <span className="text-sm font-medium text-gray-700">Delivered</span>
              </div>
              <span className="font-semibold text-gray-900">142 POs</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-teal-600" />
            Recent Activity
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 border-l-2 border-green-500 bg-gray-50 rounded">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">GRN Completed</p>
                <p className="text-xs text-gray-600 mt-1">PO-2024-156 - 500 units received from Supplier A</p>
                <p className="text-xs text-gray-500 mt-1">1 hour ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border-l-2 border-teal-500 bg-gray-50 rounded">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">New Purchase Order</p>
                <p className="text-xs text-gray-600 mt-1">PO-2024-178 created for Brand A products</p>
                <p className="text-xs text-gray-500 mt-1">3 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border-l-2 border-teal-500 bg-gray-50 rounded">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Delivery Expected</p>
                <p className="text-xs text-gray-600 mt-1">PO-2024-165 scheduled for delivery tomorrow</p>
                <p className="text-xs text-gray-500 mt-1">5 hours ago</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Purchase Orders Table */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Purchase Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-700 p-3">PO Number</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3">Supplier</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3">Items</th>
                <th className="text-right text-xs font-semibold text-gray-700 p-3">Total Amount</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3">Expected Date</th>
                <th className="text-center text-xs font-semibold text-gray-700 p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm font-medium text-teal-600">PO-2024-175</td>
                <td className="p-3 text-sm">Supplier A</td>
                <td className="p-3 text-sm">15 items</td>
                <td className="p-3 text-sm text-right font-semibold">â‚¹ 2,45,000</td>
                <td className="p-3 text-sm">Feb 25, 2026</td>
                <td className="p-3 text-center">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">In Transit</span>
                </td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm font-medium text-teal-600">PO-2024-176</td>
                <td className="p-3 text-sm">Supplier B</td>
                <td className="p-3 text-sm">8 items</td>
                <td className="p-3 text-sm text-right font-semibold">â‚¹ 1,82,500</td>
                <td className="p-3 text-sm">Feb 26, 2026</td>
                <td className="p-3 text-center">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">Pending</span>
                </td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm font-medium text-teal-600">PO-2024-177</td>
                <td className="p-3 text-sm">Supplier C</td>
                <td className="p-3 text-sm">22 items</td>
                <td className="p-3 text-sm text-right font-semibold">â‚¹ 3,95,000</td>
                <td className="p-3 text-sm">Feb 28, 2026</td>
                <td className="p-3 text-center">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">In Transit</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
