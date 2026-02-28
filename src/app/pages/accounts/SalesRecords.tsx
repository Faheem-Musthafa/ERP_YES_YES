import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Search, FileText } from 'lucide-react';
import { supabase } from '@/app/supabase';

export const SalesRecords = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, status, company, invoice_type, grand_total, approved_at, created_at, customers(name)')
        .in('status', ['Approved', 'Billed', 'Delivered'])
        .order('approved_at', { ascending: false });
      setOrders(data ?? []);
      setLoading(false);
    };
    fetchOrders();
  }, []);

  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.customers?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusColor: Record<string, string> = {
    Approved: 'bg-green-100 text-green-700',
    Billed: 'bg-teal-100 text-teal-700',
    Delivered: 'bg-purple-100 text-purple-700',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Sales Records</h1>
        <p className="text-gray-600 mt-1">All approved, billed, and delivered orders</p>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input placeholder="Search by order no / customer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Filter status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Billed">Billed</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No sales records found</p>
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
                  <th className="text-center text-xs font-semibold text-gray-700 p-3">Status</th>
                  <th className="text-right text-xs font-semibold text-gray-700 p-3">Grand Total</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">Approved Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm font-medium text-[#34b0a7]">{o.order_number}</td>
                    <td className="p-3 text-sm text-gray-700">{o.customers?.name ?? '-'}</td>
                    <td className="p-3 text-sm text-gray-700">{o.company}</td>
                    <td className="p-3 text-sm text-gray-700">{o.invoice_type}</td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[o.status] ?? 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                    </td>
                    <td className="p-3 text-sm text-right font-semibold">â‚¹ {o.grand_total?.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-sm text-gray-500">{o.approved_at ? new Date(o.approved_at).toLocaleDateString() : '-'}</td>
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
