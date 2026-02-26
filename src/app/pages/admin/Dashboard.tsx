import React from 'react';
import { Card } from '@/app/components/ui/card';
import { Package, ShoppingCart, DollarSign, AlertTriangle } from 'lucide-react';

export const AdminDashboard = () => {
  const stats = [
    {
      title: 'Total Orders',
      value: '245',
      icon: <ShoppingCart className="text-blue-600" size={24} />,
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Pending Orders',
      value: '32',
      icon: <Package className="text-orange-600" size={24} />,
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Total Sales',
      value: '₹12,45,890',
      icon: <DollarSign className="text-green-600" size={24} />,
      bgColor: 'bg-green-50',
    },
    {
      title: 'Low Stock Alerts',
      value: '8',
      icon: <AlertTriangle className="text-red-600" size={24} />,
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your business performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                {stat.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Order #{1000 + item}</p>
                  <p className="text-sm text-gray-600">Customer Name</p>
                </div>
                <span className="text-sm font-medium text-orange-600">Pending</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Low Stock Items</h3>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Product Name {item}</p>
                  <p className="text-sm text-gray-600">SKU-{1000 + item}</p>
                </div>
                <span className="text-sm font-medium text-red-600">{item + 2} units</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
