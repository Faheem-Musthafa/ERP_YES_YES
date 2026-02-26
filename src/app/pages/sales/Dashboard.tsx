import React from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Link } from 'react-router';
import { ShoppingCart, CheckCircle, Clock, Plus } from 'lucide-react';

export const SalesDashboard = () => {
  const stats = [
    {
      title: 'Total Orders',
      value: '47',
      icon: <ShoppingCart className="text-blue-600" size={24} />,
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Pending Orders',
      value: '12',
      icon: <Clock className="text-orange-600" size={24} />,
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Approved Orders',
      value: '35',
      icon: <CheckCircle className="text-green-600" size={24} />,
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sales Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your orders and track performance</p>
        </div>
        <Link to="/sales/create-order">
          <Button className="bg-[#f97316] hover:bg-[#f97316]/90">
            <Plus size={20} className="mr-2" />
            Create New Order
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Order #{2000 + item}</p>
                <p className="text-sm text-gray-600 mt-1">Customer Name • Product Name</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(Date.now() - item * 86400000).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded">
                  Pending
                </span>
                <Button size="sm" variant="outline">View</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};