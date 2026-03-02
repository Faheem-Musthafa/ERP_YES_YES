import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useNavigate } from 'react-router';
import { Search, Plus, Wallet } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';

export const MyCollection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchReceipts = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('receipts')
        .select('id, receipt_number, amount, payment_mode, created_at, orders(order_number, grand_total, customers(name))')
        .eq('recorded_by', user.id)
        .order('created_at', { ascending: false });
      setReceipts(data ?? []);
      setLoading(false);
    };
    fetchReceipts();
  }, [user]);

  const filtered = receipts.filter(r => {
    const matchSearch = !search ||
      r.receipt_number.toLowerCase().includes(search.toLowerCase()) ||
      (r.orders?.order_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.orders?.customers?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchMode = !modeFilter || modeFilter === 'all' || r.payment_mode === modeFilter;
    return matchSearch && matchMode;
  });

  const modeColor: Record<string, string> = {
    Cash: 'bg-emerald-100 text-emerald-700',
    Cheque: 'bg-blue-100 text-blue-700',
    UPI: 'bg-purple-100 text-purple-700',
    'Bank Transfer': 'bg-teal-100 text-teal-700',
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Collection</h1>
          <p className="text-gray-500 mt-1 text-sm">View all saved receipt entries</p>
        </div>
        <Button onClick={() => navigate('/sales/receipt')} className="bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl">
          <Plus size={16} className="mr-2" />New Receipt
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input placeholder="Search by receipt / order / customer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={modeFilter} onValueChange={setModeFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by mode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
              <SelectItem value="UPI">UPI</SelectItem>
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
            <Wallet size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No receipts recorded yet</p>
            <Button onClick={() => navigate('/sales/receipt')} className="mt-4 bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl">
              <Plus size={16} className="mr-2" />Create First Receipt
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Receipt No</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Order No</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Customer</th>
                  <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Mode</th>
                  <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Amount (₹)</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#34b0a7]">{r.receipt_number}</td>
                    <td className="px-4 py-3 text-gray-700">{r.orders?.order_number ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{r.orders?.customers?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${modeColor[r.payment_mode] ?? 'bg-gray-100 text-gray-700'}`}>{r.payment_mode}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">₹ {r.amount?.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
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
