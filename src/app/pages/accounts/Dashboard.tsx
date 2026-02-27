import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { ClipboardList, CheckCircle, DollarSign, Clock } from 'lucide-react';
import { supabase } from '@/app/supabase';

export const AccountsDashboard = () => {
  const [stats, setStats] = useState({ pending: 0, approved: 0, totalSales: 0, receipts: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [{ data: orders }, { data: receipts }] = await Promise.all([
        supabase.from('orders').select('id, status, grand_total'),
        supabase.from('receipts').select('id, amount'),
      ]);
      if (orders) {
        setStats({
          pending: orders.filter(o => o.status === 'Pending').length,
          approved: orders.filter(o => o.status === 'Approved').length,
          totalSales: orders.filter(o => ['Approved', 'Billed', 'Delivered'].includes(o.status)).reduce((s, o) => s + (o.grand_total ?? 0), 0),
          receipts: (receipts ?? []).reduce((s, r) => s + (r.amount ?? 0), 0),
        });
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { title: 'Pending Orders', value: stats.pending, icon: <Clock className="text-orange-600" size={24} />, bg: 'bg-orange-50' },
    { title: 'Approved Orders', value: stats.approved, icon: <CheckCircle className="text-green-600" size={24} />, bg: 'bg-green-50' },
    { title: 'Total Sales (₹)', value: `₹ ${stats.totalSales.toLocaleString('en-IN')}`, icon: <ClipboardList className="text-blue-600" size={24} />, bg: 'bg-blue-50' },
    { title: 'Total Receipts (₹)', value: `₹ ${stats.receipts.toLocaleString('en-IN')}`, icon: <DollarSign className="text-purple-600" size={24} />, bg: 'bg-purple-50' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Accounts Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of orders and financial activity</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-start justify-between">
              <div><p className="text-sm text-gray-600 mb-1">{c.title}</p><p className="text-2xl font-bold text-gray-900">{c.value}</p></div>
              <div className={`p-3 rounded-lg ${c.bg}`}>{c.icon}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};