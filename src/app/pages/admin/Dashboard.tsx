import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { ClipboardList, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { supabase } from '@/app/supabase';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalOrders: 0, pendingOrders: 0, totalSales: 0, lowStock: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: orders }, { data: products }] = await Promise.all([
        supabase.from('orders').select('id, order_number, status, grand_total, created_at, customers(name)').order('created_at', { ascending: false }).limit(50),
        supabase.from('products').select('id, name, stock_qty, brands(name)').eq('is_active', true).lte('stock_qty', 5),
      ]);
      if (orders) {
        setRecentOrders(orders.slice(0, 5));
        setStats({
          totalOrders: orders.length,
          pendingOrders: orders.filter(o => o.status === 'Pending').length,
          totalSales: orders.filter(o => ['Approved', 'Billed', 'Delivered'].includes(o.status)).reduce((s, o) => s + (o.grand_total ?? 0), 0),
          lowStock: (products ?? []).length,
        });
      }
      setLowStockItems((products ?? []).slice(0, 5));
    };
    fetchData();
  }, []);

  const statCards = [
    { title: 'Total Orders', value: stats.totalOrders, icon: <ClipboardList className="text-blue-600" size={24} />, bg: 'bg-blue-50' },
    { title: 'Pending Orders', value: stats.pendingOrders, icon: <Clock className="text-orange-600" size={24} />, bg: 'bg-orange-50' },
    { title: 'Total Sales', value: `₹ ${stats.totalSales.toLocaleString('en-IN')}`, icon: <TrendingUp className="text-green-600" size={24} />, bg: 'bg-green-50' },
    { title: 'Low Stock Alerts', value: stats.lowStock, icon: <AlertTriangle className="text-red-600" size={24} />, bg: 'bg-red-50' },
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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of business performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {statCards.map((c, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-start justify-between">
              <div><p className="text-sm text-gray-600 mb-1">{c.title}</p><p className="text-2xl font-bold text-gray-900">{c.value}</p></div>
              <div className={`p-3 rounded-lg ${c.bg}`}>{c.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
          {recentOrders.length === 0 ? <p className="text-gray-500 text-sm">No orders yet.</p> : (
            <div className="space-y-3">
              {recentOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{o.order_number}</p>
                    <p className="text-xs text-gray-500">{o.customers?.name ?? 'New Customer'} • {new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">₹ {o.grand_total?.toLocaleString('en-IN')}</p>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColor[o.status] ?? 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-orange-500" />Low Stock Items</h3>
          {lowStockItems.length === 0 ? <p className="text-gray-500 text-sm">All items are well stocked!</p> : (
            <div className="space-y-3">
              {lowStockItems.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">{(p.brands as any)?.name ?? '-'}</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${p.stock_qty === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{p.stock_qty} units</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
