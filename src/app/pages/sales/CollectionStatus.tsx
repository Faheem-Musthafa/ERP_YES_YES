import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useNavigate } from 'react-router';
import { Search, Plus, ClipboardCheck } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { toast } from 'sonner';

export const CollectionStatus = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchReceipts = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('receipts')
        .select('id, receipt_number, amount, payment_mode, created_at, orders(id, order_number, status, customers(name))')
        .order('created_at', { ascending: false });
      setReceipts(data ?? []);
      setLoading(false);
    };
    fetchReceipts();
  }, []);

  const filtered = receipts.filter(r => {
    const match = !search ||
      r.receipt_number.toLowerCase().includes(search.toLowerCase()) ||
      (r.orders?.order_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.orders?.customers?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchMode = !modeFilter || modeFilter === 'all' || r.payment_mode === modeFilter;
    const matchStatus = !statusFilter || statusFilter === 'all' || r.orders?.status === statusFilter;
    return match && matchMode && matchStatus;
  });

  const modeColor: Record<string, string> = {
    Cash: 'bg-green-100 text-green-700',
    Cheque: 'bg-teal-100 text-teal-700',
    UPI: 'bg-purple-100 text-purple-700',
    'Bank Transfer': 'bg-teal-100 text-teal-700',
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Collection Status</h1>
          <p className="text-gray-600 mt-1">Monitor all receipts and payment clearance</p>
        </div>
        <Button onClick={() => navigate('/sales/receipt')} className="bg-[#34b0a7] hover:bg-[#115e59] text-white">
          <Plus size={18} className="mr-2" />New Receipt
        </Button>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input placeholder="Search by receipt / order / customer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={modeFilter} onValueChange={setModeFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Filter mode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Bank Transfer">Bank</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
              <SelectItem value="UPI">UPI</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Order status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
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
          <div className="text-center py-16">
            <ClipboardCheck size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">No collection records found</p>
            <Button onClick={() => navigate('/sales/receipt')} className="bg-[#34b0a7] hover:bg-[#115e59] text-white"><Plus size={18} className="mr-2" />Add Receipt</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">Receipt No</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">Order No</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">Customer</th>
                  <th className="text-center text-xs font-semibold text-gray-700 p-3">Mode</th>
                  <th className="text-right text-xs font-semibold text-gray-700 p-3">Amount (₹)</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm font-medium text-[#34b0a7]">{r.receipt_number}</td>
                    <td className="p-3 text-sm text-gray-700">{r.orders?.order_number ?? '-'}</td>
                    <td className="p-3 text-sm text-gray-700">{r.orders?.customers?.name ?? '-'}</td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${modeColor[r.payment_mode] ?? 'bg-gray-100 text-gray-700'}`}>{r.payment_mode}</span>
                    </td>
                    <td className="p-3 text-sm text-right font-semibold">₹ {r.amount?.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-sm text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
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
