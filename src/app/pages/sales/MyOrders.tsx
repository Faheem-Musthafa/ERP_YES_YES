import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useNavigate } from 'react-router';
import { Search, FileText, Plus } from 'lucide-react';
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
    Pending: 'bg-amber-100 text-amber-700',
    Approved: 'bg-emerald-100 text-emerald-700',
    Rejected: 'bg-red-100 text-red-700',
    Billed: 'bg-blue-100 text-blue-700',
    Delivered: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Orders</h1>
          <p className="text-gray-500 mt-1 text-sm">Track all your submitted orders</p>
        </div>
        <Button className="bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl" onClick={() => navigate('/sales/create-order')}>
          <Plus size={16} className="mr-2" />Create Order
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
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
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-[#34b0a7] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No orders found.</p>
            <Button className="mt-4 bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl" onClick={() => navigate('/sales/create-order')}>Create Order</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Order No</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Company</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Invoice Type</th>
                  <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Grand Total</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Delivery Date</th>
                  <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#34b0a7]">{order.order_number}</td>
                    <td className="px-4 py-3 text-gray-700">{order.customers?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{order.company}</td>
                    <td className="px-4 py-3 text-gray-700">{order.invoice_type}</td>
                    <td className="px-4 py-3 text-right font-bold">₹ {order.grand_total?.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[order.status] ?? 'bg-gray-100 text-gray-700'}`}>{order.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
