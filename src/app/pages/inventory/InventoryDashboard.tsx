import React from 'react';
import { Card } from '@/app/components/ui/card';
import { Package, Boxes, Tags, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

export const InventoryDashboard = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Inventory Dashboard</h1>
        <p className="text-gray-600 mt-1">Monitor stock levels and inventory status</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">248</p>
              <p className="text-xs text-green-600 mt-1">+12 this month</p>
            </div>
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <Boxes size={28} className="text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Stock Items</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">186</p>
              <p className="text-xs text-gray-600 mt-1">75% of total</p>
            </div>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={28} className="text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock Alerts</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">23</p>
              <p className="text-xs text-orange-600 mt-1">Needs attention</p>
            </div>
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={28} className="text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Brands</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">32</p>
              <p className="text-xs text-gray-600 mt-1">Active brands</p>
            </div>
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
              <Tags size={28} className="text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Stock Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package size={20} className="text-blue-600" />
            Stock Status Overview
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-gray-700">In Stock (50+ units)</span>
              </div>
              <span className="font-semibold text-gray-900">186 items</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-sm font-medium text-gray-700">Medium Stock (10-49 units)</span>
              </div>
              <span className="font-semibold text-gray-900">39 items</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium text-gray-700">Low Stock (&lt;10 units)</span>
              </div>
              <span className="font-semibold text-gray-900">23 items</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-600" />
            Recent Activity
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 border-l-2 border-blue-500 bg-gray-50 rounded">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Stock Updated</p>
                <p className="text-xs text-gray-600 mt-1">Product SKU-1045 quantity updated to 150 units</p>
                <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border-l-2 border-green-500 bg-gray-50 rounded">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">New Product Added</p>
                <p className="text-xs text-gray-600 mt-1">Brand C - Product 15 added to inventory</p>
                <p className="text-xs text-gray-500 mt-1">5 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border-l-2 border-orange-500 bg-gray-50 rounded">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Low Stock Alert</p>
                <p className="text-xs text-gray-600 mt-1">Product SKU-1008 has only 3 units remaining</p>
                <p className="text-xs text-gray-500 mt-1">1 day ago</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Low Stock Alert Table */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Items Requiring Attention</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-700 p-3">SKU</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3">Product Name</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3">Brand</th>
                <th className="text-right text-xs font-semibold text-gray-700 p-3">Current Stock</th>
                <th className="text-center text-xs font-semibold text-gray-700 p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm font-mono">SKU-1008</td>
                <td className="p-3 text-sm">Product 8</td>
                <td className="p-3 text-sm">Brand D</td>
                <td className="p-3 text-sm text-right font-semibold text-red-600">3 units</td>
                <td className="p-3 text-center">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Critical</span>
                </td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm font-mono">SKU-1003</td>
                <td className="p-3 text-sm">Product 3</td>
                <td className="p-3 text-sm">Brand B</td>
                <td className="p-3 text-sm text-right font-semibold text-red-600">5 units</td>
                <td className="p-3 text-center">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Critical</span>
                </td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm font-mono">SKU-1006</td>
                <td className="p-3 text-sm">Product 6</td>
                <td className="p-3 text-sm">Brand C</td>
                <td className="p-3 text-sm text-right font-semibold text-red-600">8 units</td>
                <td className="p-3 text-center">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Critical</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
