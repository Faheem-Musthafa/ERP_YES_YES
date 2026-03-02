import React, { useState, useEffect } from 'react';
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
    Approved: 'bg-emerald-100 text-emerald-700',
    Billed: 'bg-blue-100 text-blue-700',
    Delivered: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sales Records</h1>
        <p className="text-gray-500 mt-1 text-sm">All approved, billed, and delivered orders</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
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
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-[#34b0a7] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No sales records found</p>
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
                  <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Status</th>
                  <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Grand Total</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Approved Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#34b0a7]">{o.order_number}</td>
                    <td className="px-4 py-3 text-gray-700">{o.customers?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{o.company}</td>
                    <td className="px-4 py-3 text-gray-700">{o.invoice_type}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[o.status] ?? 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">₹ {o.grand_total?.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{o.approved_at ? new Date(o.approved_at).toLocaleDateString() : '-'}</td>
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
