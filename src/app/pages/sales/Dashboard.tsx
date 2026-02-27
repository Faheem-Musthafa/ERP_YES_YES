import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Link } from 'react-router';
import { ShoppingCart, CheckCircle, Clock, Plus } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';

export const SalesDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, status, grand_total, created_at, customers(name)')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setRecentOrders(data.slice(0, 5));
        setStats({
          total: data.length,
          pending: data.filter(o => o.status === 'Pending').length,
          approved: data.filter(o => ['Approved', 'Billed', 'Delivered'].includes(o.status)).length,
        });
      }
    };
    fetchData();
  }, [user]);

  const statCards = [
    { title: 'Total Orders', value: stats.total, icon: <ShoppingCart className="text-blue-600" size={24} />, bgColor: 'bg-blue-50' },
    { title: 'Pending Orders', value: stats.pending, icon: <Clock className="text-orange-600" size={24} />, bgColor: 'bg-orange-50' },
    { title: 'Approved Orders', value: stats.approved, icon: <CheckCircle className="text-green-600" size={24} />, bgColor: 'bg-green-50' },
  ];

  const statusColor: Record<string, string> = {
    Pending: 'text-orange-600 bg-orange-50',
    Approved: 'text-green-600 bg-green-50',
    Rejected: 'text-red-600 bg-red-50',
    Billed: 'text-blue-600 bg-blue-50',
    Delivered: 'text-purple-600 bg-purple-50',
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sales Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your orders and track performance</p>
        </div>
        <Link to="/sales/create-order">
          <Button className="bg-[#f97316] hover:bg-[#f97316]/90"><Plus size={20} className="mr-2" />Create New Order</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {statCards.map((stat, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-start justify-between">
              <div><p className="text-sm text-gray-600 mb-1">{stat.title}</p><p className="text-3xl font-semibold text-gray-900">{stat.value}</p></div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>{stat.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
        {recentOrders.length === 0 ? (
          <p className="text-gray-500 text-sm">No orders yet. <Link to="/sales/create-order" className="text-blue-600 underline">Create your first order.</Link></p>
        ) : (
          <div className="space-y-3">
            {recentOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{order.order_number}</p>
                  <p className="text-sm text-gray-600 mt-1">{(order.customers as any)?.name ?? 'New Customer'} • ₹{order.grand_total?.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-sm font-medium px-3 py-1 rounded ${statusColor[order.status] ?? 'bg-gray-100 text-gray-600'}`}>{order.status}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};