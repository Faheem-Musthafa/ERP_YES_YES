import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useNavigate } from 'react-router';
import { Search, FileText } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';

export const MyOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, status, company, invoice_type, grand_total, delivery_date, created_at, customers(name)')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      setOrders(data ?? []);
      setLoading(false);
    };
    fetchOrders();
  }, [user]);

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.order_number.toLowerCase().includes(search.toLowerCase()) || (o.customers?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusColor: Record<string, string> = {
    Pending: 'bg-teal-100 text-teal-700',
    Approved: 'bg-green-100 text-green-700',
    Rejected: 'bg-red-100 text-red-700',
    Billed: 'bg-teal-100 text-teal-700',
    Delivered: 'bg-purple-100 text-purple-700',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My Orders</h1>
        <p className="text-gray-600 mt-1">Track all your submitted orders</p>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input placeholder="Search by order no / customer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Billed">Billed</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading orders...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No orders found.</p>
            <Button className="mt-4 bg-[#34b0a7] hover:bg-[#34b0a7]/90" onClick={() => navigate('/sales/create-order')}>Create Order</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">Order No</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">Company</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">Invoice Type</th>
                  <th className="text-right text-xs font-semibold text-gray-700 p-3">Grand Total</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">Delivery Date</th>
                  <th className="text-center text-xs font-semibold text-gray-700 p-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm font-medium text-[#34b0a7]">{order.order_number}</td>
                    <td className="p-3 text-sm text-gray-700">{order.customers?.name ?? '-'}</td>
                    <td className="p-3 text-sm text-gray-700">{order.company}</td>
                    <td className="p-3 text-sm text-gray-700">{order.invoice_type}</td>
                    <td className="p-3 text-sm text-right font-semibold">₹ {order.grand_total?.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-sm text-gray-700">{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '-'}</td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[order.status] ?? 'bg-gray-100 text-gray-700'}`}>{order.status}</span>
                    </td>
                    <td className="p-3 text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
