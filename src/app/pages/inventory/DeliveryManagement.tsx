import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Plus, Truck, Search } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';

export const DeliveryManagement = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ order_id: '', driver_name: '', vehicle_number: '' });

  const fetchData = async () => {
    setLoading(true);
    const [{ data: del }, { data: ord }] = await Promise.all([
      supabase.from('deliveries').select('id, delivery_number, status, driver_name, vehicle_number, dispatched_at, delivered_at, orders(order_number, customers(name))').order('created_at', { ascending: false }),
      supabase.from('orders').select('id, order_number, customers(name)').in('status', ['Approved', 'Billed']),
    ]);
    setDeliveries(del ?? []);
    setOrders(ord ?? []);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!form.order_id) { toast.error('Select an order'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('deliveries').insert({
        delivery_number: `DEL-${Date.now()}`,
        order_id: form.order_id,
        driver_name: form.driver_name || null,
        vehicle_number: form.vehicle_number || null,
        status: 'Pending',
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      toast.success('Delivery created!');
      setOpen(false);
      setForm({ order_id: '', driver_name: '', vehicle_number: '' });
      fetchData();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    const updateData: any = { status };
    if (status === 'In Transit') updateData.dispatched_at = new Date().toISOString();
    if (status === 'Delivered') updateData.delivered_at = new Date().toISOString();
    const { error } = await supabase.from('deliveries').update(updateData).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Status updated'); fetchData(); }
  };

  const statusColor: Record<string, string> = {
    Pending: 'bg-teal-100 text-teal-700',
    'In Transit': 'bg-teal-100 text-teal-700',
    Delivered: 'bg-green-100 text-green-700',
    Failed: 'bg-red-100 text-red-700',
  };

  const filtered = deliveries.filter(d => !search || (d.delivery_number ?? '').toLowerCase().includes(search.toLowerCase()) || (d.orders?.order_number ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Delivery Management</h1>
          <p className="text-gray-500 mt-1 text-sm">Track all deliveries for orders</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl"><Plus size={18} className="mr-2" />New Delivery</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <Input placeholder="Search delivery / order..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-[#34b0a7] border-t-transparent rounded-full animate-spin" /></div> : filtered.length === 0 ? (
          <div className="text-center py-12"><Truck size={40} className="text-gray-200 mx-auto mb-3" /><p className="text-gray-400 text-sm">No deliveries found</p></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Delivery No</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Order</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Customer</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Driver</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Vehicle</th>
                <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Status</th>
                <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#34b0a7]">{d.delivery_number}</td>
                  <td className="px-4 py-3">{d.orders?.order_number}</td>
                  <td className="px-4 py-3 text-gray-600">{d.orders?.customers?.name ?? '-'}</td>
                  <td className="px-4 py-3">{d.driver_name ?? '-'}</td>
                  <td className="px-4 py-3">{d.vehicle_number ?? '-'}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[d.status] ?? 'bg-gray-100 text-gray-700'}`}>{d.status}</span></td>
                  <td className="px-4 py-3 text-center">
                    <Select value={d.status} onValueChange={v => updateStatus(d.id, v)}>
                      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Transit">In Transit</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Delivery</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Order *</Label>
              <Select value={form.order_id} onValueChange={v => setForm(f => ({ ...f, order_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                <SelectContent>{orders.map(o => <SelectItem key={o.id} value={o.id}>{o.order_number} — {o.customers?.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Driver Name</Label><Input value={form.driver_name} onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} placeholder="Optional" /></div>
            <div className="space-y-2"><Label>Vehicle Number</Label><Input value={form.vehicle_number} onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value }))} placeholder="Optional" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl" disabled={saving}>{saving ? 'Creating...' : 'Create Delivery'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
