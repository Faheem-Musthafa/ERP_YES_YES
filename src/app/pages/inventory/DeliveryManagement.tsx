import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Plus, Truck, Search, MapPin, AlertCircle } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';

export const DeliveryManagement = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // New delivery dialog
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ order_id: '', driver_name: '', vehicle_number: '' });

  // Failure reason dialog
  const [failOpen, setFailOpen] = useState(false);
  const [failTargetId, setFailTargetId] = useState<string | null>(null);
  const [failReason, setFailReason] = useState('');
  const [failSaving, setFailSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: del }, { data: ord }, { data: staff }] = await Promise.all([
      supabase
        .from('deliveries')
        .select(`
          id, delivery_number, status, driver_name, vehicle_number,
          dispatched_at, delivered_at, failure_reason,
          orders(id, order_number, invoice_number, site_address, customers(name, address))
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('orders')
        .select('id, order_number, invoice_number, customers(name)')
        .in('status', ['Approved', 'Billed']),
      supabase.from('users').select('id, full_name, role').eq('is_active', true).order('full_name'),
    ]);
    setDeliveries(del ?? []);
    setOrders(ord ?? []);
    setStaffList(staff ?? []);
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
    // Intercept "Failed" — show reason dialog instead
    if (status === 'Failed') {
      setFailTargetId(id);
      setFailReason('');
      setFailOpen(true);
      return;
    }
    const updateData: any = { status };
    if (status === 'In Transit') updateData.dispatched_at = new Date().toISOString();
    if (status === 'Delivered') updateData.delivered_at = new Date().toISOString();
    const { error } = await supabase.from('deliveries').update(updateData).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Status updated'); fetchData(); }
  };

  const handleFailSubmit = async () => {
    if (!failReason.trim()) { toast.error('Please provide a reason for failure'); return; }
    setFailSaving(true);
    const { error } = await supabase
      .from('deliveries')
      .update({ status: 'Failed', failure_reason: failReason.trim() })
      .eq('id', failTargetId!);
    if (error) toast.error(error.message);
    else { toast.success('Marked as Failed'); setFailOpen(false); fetchData(); }
    setFailSaving(false);
  };

  const statusColor: Record<string, string> = {
    Pending: 'bg-amber-100 text-amber-700',
    'In Transit': 'bg-teal-100 text-teal-700',
    Delivered: 'bg-green-100 text-green-700',
    Failed: 'bg-red-100 text-red-700',
  };

  const filtered = deliveries.filter(d =>
    !search ||
    (d.delivery_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (d.orders?.invoice_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (d.orders?.customers?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Delivery Management</h1>
          <p className="text-gray-500 mt-1 text-sm">Track all deliveries for orders</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl">
          <Plus size={18} className="mr-2" />New Delivery
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <Input
          placeholder="Search by delivery no, invoice no, or customer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-[#34b0a7] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Truck size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No deliveries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Delivery No</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Invoice No</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Delivery Address</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Delivered By</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Vehicle</th>
                  <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Status</th>
                  <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(d => {
                  const deliveryAddr = d.orders?.site_address?.trim() || d.orders?.customers?.address;
                  const isSite = Boolean(d.orders?.site_address?.trim());
                  return (
                    <tr key={d.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#34b0a7] whitespace-nowrap">{d.delivery_number}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{d.orders?.invoice_number || '—'}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{d.orders?.customers?.name ?? '—'}</td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {deliveryAddr ? (
                          <span className="flex items-start gap-1 text-xs text-gray-600">
                            <MapPin size={12} className={`shrink-0 mt-0.5 ${isSite ? 'text-amber-500' : 'text-teal-500'}`} />
                            <span className="truncate" title={deliveryAddr}>{deliveryAddr}</span>
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                        {isSite && <span className="text-[10px] text-amber-600 font-medium ml-4">Site</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{d.driver_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{d.vehicle_number ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[d.status] ?? 'bg-gray-100 text-gray-700'}`}>
                            {d.status}
                          </span>
                          {d.status === 'Failed' && d.failure_reason && (
                            <p className="text-[10px] text-red-500 mt-1 max-w-[140px] mx-auto truncate" title={d.failure_reason}>
                              <AlertCircle size={10} className="inline mr-0.5" />{d.failure_reason}
                            </p>
                          )}
                        </div>
                      </td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Delivery Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Delivery</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Invoice / Order *</Label>
              <Select value={form.order_id} onValueChange={v => setForm(f => ({ ...f, order_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                <SelectContent>
                  {orders.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.invoice_number ? `${o.invoice_number} (${o.order_number})` : o.order_number} — {o.customers?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Delivered By (Staff) *</Label>
              <Select value={form.driver_name} onValueChange={v => setForm(f => ({ ...f, driver_name: v }))}>
                <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                <SelectContent>
                  {staffList.map(s => <SelectItem key={s.id} value={s.full_name}>{s.full_name} ({s.role})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vehicle Number</Label>
              <Input value={form.vehicle_number} onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl" disabled={saving}>
              {saving ? 'Creating...' : 'Create Delivery'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Failure Reason Dialog */}
      <Dialog open={failOpen} onOpenChange={open => { if (!open) { setFailOpen(false); setFailTargetId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle size={18} /> Mark as Failed
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">Please provide a reason for the delivery failure. This will be recorded against the delivery.</p>
            <div className="space-y-2">
              <Label>Reason for Failure *</Label>
              <Textarea
                value={failReason}
                onChange={e => setFailReason(e.target.value)}
                placeholder="e.g. Customer not available, Address not found, Vehicle breakdown..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFailOpen(false)}>Cancel</Button>
            <Button
              onClick={handleFailSubmit}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
              disabled={failSaving}
            >
              {failSaving ? 'Saving...' : 'Confirm Failure'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
