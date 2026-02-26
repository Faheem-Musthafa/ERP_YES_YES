import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { FileCheck, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { useNavigate } from 'react-router';

export const AccountsDashboard = () => {
  const navigate = useNavigate();
  
  const stats = [
    {
      title: 'Pending Orders',
      value: '32',
      icon: <Clock className="text-orange-600" size={24} />,
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Approved Today',
      value: '15',
      icon: <FileCheck className="text-green-600" size={24} />,
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Sales',
      value: '₹12,45,890',
      icon: <TrendingUp className="text-blue-600" size={24} />,
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Pending Payments',
      value: '₹2,45,000',
      icon: <DollarSign className="text-red-600" size={24} />,
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Accounts Dashboard</h1>
        <p className="text-gray-600 mt-1">Review orders and manage finances</p>
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
          <h3 className="text-lg font-semibold mb-4">Orders Awaiting Review</h3>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <div 
                key={item} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => navigate('/accounts/pending-orders')}
              >
                <div>
                  <p className="font-medium text-gray-900">Order #{3000 + item}</p>
                  <p className="text-sm text-gray-600">ABC Corp • Product {item}</p>
                  <p className="text-xs text-gray-500 mt-1">Qty: {item * 10} units</p>
                </div>
                <span className="text-sm font-medium text-orange-600">Review →</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Sales</h3>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Sale #{5000 + item}</p>
                  <p className="text-sm text-gray-600">Customer Name</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(Date.now() - item * 86400000).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-sm font-medium text-green-600">₹{(item * 15000).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};