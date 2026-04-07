import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import {
  Plus, Truck, MapPin, AlertCircle, Settings2,
  UserCheck, Car, Pencil, PowerOff, Power,
} from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import { DataCard, EmptyState, PageHeader, SearchBar, Spinner } from '@/app/components/ui/primitives';

// ── Types ────────────────────────────────────────────────────────────────────

interface DeliveryAgent {
  id: string;
  name: string;
  vehicle_number: string | null;
  phone: string | null;
  is_active: boolean;
}

interface StaffUser {
  id: string;
  full_name: string;
  role: string;
}

// ── Main Component ────────────────────────────────────────────────────────────

export const DeliveryManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // New delivery dialog
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    order_id: '',
    initiated_by_id: '',       // user UUID or '__other__'
    initiated_by_other: '',    // free-text when '__other__'
    delivery_agent_id: '',     // agent UUID or '__other__'
    driver_other: '',          // free-text when '__other__'
    vehicle_number: '',
  });

  // Failure reason dialog
  const [failOpen, setFailOpen] = useState(false);
  const [failTargetId, setFailTargetId] = useState<string | null>(null);
  const [failReason, setFailReason] = useState('');
  const [failSaving, setFailSaving] = useState(false);

  // ── Derived: auto-fill vehicle number when agent selected
  const handleAgentSelect = (agentId: string) => {
    if (agentId === '__other__') {
      setForm(f => ({ ...f, delivery_agent_id: '__other__', vehicle_number: '', driver_other: '' }));
      return;
    }
    const agent = agents.find(a => a.id === agentId);
    setForm(f => ({
      ...f,
      delivery_agent_id: agentId,
      vehicle_number: agent?.vehicle_number ?? '',
      driver_other: '',
    }));
  };

  // ── Fetch data
  const fetchAgents = async () => {
    const { data } = await supabase
      .from('delivery_agents')
      .select('id, name, vehicle_number, phone, is_active')
      .order('name');
    setAgents(data ?? []);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: del, error: delError }, { data: ord, error: ordError }, { data: staff, error: staffError }] = await Promise.all([
        supabase
          .from('deliveries')
          .select(`
            id, delivery_number, status, driver_name, vehicle_number,
            initiated_by, initiated_by_name, delivery_agent_id,
            dispatched_at, delivered_at, failure_reason,
            orders(id, order_number, invoice_number, site_address, customers(name, address)),
            delivery_agents(id, name, vehicle_number),
            initiator:users!initiated_by(id, full_name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('id, order_number, invoice_number, customers(name)')
          .in('status', ['Approved', 'Billed']),
        supabase.from('users').select('id, full_name, role').eq('is_active', true).order('full_name'),
      ]);

      if (delError) throw delError;
      if (ordError) throw ordError;
      if (staffError) throw staffError;

      setDeliveries(del ?? []);
      setOrders(ord ?? []);
      setStaffList(staff ?? []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load delivery data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); fetchAgents(); }, []);

  // ── Create delivery
  const handleCreate = async () => {
    if (!form.order_id) { toast.error('Please select an order'); return; }
    if (!form.initiated_by_id) { toast.error('Initiated By is required'); return; }
    if (form.initiated_by_id === '__other__' && !form.initiated_by_other.trim()) {
      toast.error('Please enter the name for Initiated By'); return;
    }
    if (!form.delivery_agent_id) { toast.error('Delivered By is required'); return; }
    if (form.delivery_agent_id === '__other__' && !form.driver_other.trim()) {
      toast.error('Please enter the driver name'); return;
    }
    setSaving(true);
    try {
      const isOtherAgent = form.delivery_agent_id === '__other__';
      const isOtherInitiator = form.initiated_by_id === '__other__';
      const agent = !isOtherAgent ? agents.find(a => a.id === form.delivery_agent_id) : null;
      const { error } = await supabase.from('deliveries').insert({
        delivery_number: `DEL-${Date.now()}`,
        order_id: form.order_id,
        initiated_by: !isOtherInitiator ? form.initiated_by_id : null,
        initiated_by_name: isOtherInitiator ? form.initiated_by_other.trim() : null,
        delivery_agent_id: !isOtherAgent ? form.delivery_agent_id : null,
        driver_name: isOtherAgent ? form.driver_other.trim() : (agent?.name ?? null),
        vehicle_number: form.vehicle_number.trim() || null,
        status: 'Pending',
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      toast.success('Delivery created!');
      setOpen(false);
      setForm({ order_id: '', initiated_by_id: '', initiated_by_other: '', delivery_agent_id: '', driver_other: '', vehicle_number: '' });
      fetchData();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  // ── Update status
  const updateStatus = async (id: string, status: string) => {
    if (status === 'Failed') {
      setFailTargetId(id);
      setFailReason('');
      setFailOpen(true);
      return;
    }
    
    try {
      const updateData: any = { status };
      if (status === 'In Transit') updateData.dispatched_at = new Date().toISOString();
      if (status === 'Delivered') {
        updateData.delivered_at = new Date().toISOString();
        
        // Get delivery with order details including status
        const { data: delivery, error: deliveryError } = await supabase
          .from('deliveries')
          .select('order_id, orders(status, godown, order_items(product_id, quantity))')
          .eq('id', id)
          .single();
        
        if (deliveryError) throw deliveryError;
        
        const order = delivery?.orders as any;
        const orderStatus = order?.status;
        const godown = order?.godown || 'Kottakkal';
        const orderItems = order?.order_items || [];
        
        // Only deduct stock if order was NOT already billed (stock deducted at billing)
        const stockAlreadyDeducted = orderStatus === 'Billed';
        
        if (!stockAlreadyDeducted && orderItems.length > 0) {
          for (const item of orderItems) {
            // Get current stock at location
            const { data: stockData, error: stockFetchError } = await supabase
              .from('product_stock_locations')
              .select('stock_qty')
              .eq('product_id', item.product_id)
              .eq('location', godown)
              .maybeSingle();
            
            if (stockFetchError) throw stockFetchError;
            
            const currentStock = stockData?.stock_qty ?? 0;
            const newStock = Math.max(0, currentStock - item.quantity);
            
            // Update stock at location
            const { error: stockError } = await supabase
              .from('product_stock_locations')
              .upsert({
                product_id: item.product_id,
                location: godown,
                stock_qty: newStock,
              }, {
                onConflict: 'product_id,location'
              });
            
            if (stockError) throw stockError;
            
            // Log stock movement
            await supabase.from('stock_movements').insert({
              product_id: item.product_id,
              quantity: -item.quantity,
              movement_type: 'order_delivery',
              reference_type: 'delivery',
              reference_id: id,
              location: godown,
              created_by: null,
            });
          }
        }
        
        // Update order status to Delivered
        const { error: orderError } = await supabase
          .from('orders')
          .update({ status: 'Delivered' })
          .eq('id', delivery.order_id);
        
        if (orderError) throw orderError;
      }
      
      const { error } = await supabase.from('deliveries').update(updateData).eq('id', id);
      if (error) throw error;
      
      toast.success(status === 'Delivered' ? 'Delivered & stock updated!' : 'Status updated');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
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

  // ── Use joined data from Supabase — no client-side lookup needed
  const getInitiatorName = (delivery: any): string | null =>
    delivery.initiator?.full_name ?? delivery.initiated_by_name ?? null;

  const getDriverName = (delivery: any): string | null =>
    delivery.delivery_agents?.name ?? delivery.driver_name ?? null;

  const getVehicleNumber = (delivery: any): string | null =>
    delivery.delivery_agents?.vehicle_number ?? delivery.vehicle_number ?? null;

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
    (d.orders?.customers?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (d.delivery_agents?.name ?? d.driver_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (d.initiator?.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const activeAgents = agents.filter(a => a.is_active);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Delivery Management"
        subtitle="Track and manage all order deliveries"
        actions={(
          <>
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => navigate('/admin/drivers')}
                className="rounded-xl border-gray-200 text-gray-600 hover:border-[#34b0a7] hover:text-[#34b0a7]"
              >
                <Settings2 size={15} className="mr-2" />
                Manage Drivers
              </Button>
            )}
            <Button onClick={() => setOpen(true)} className="bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl">
              <Plus size={18} className="mr-2" />New Delivery
            </Button>
          </>
        )}
      />

      <SearchBar
        placeholder="Search by delivery no, invoice no, customer or driver..."
        value={search}
        onChange={setSearch}
      />

      {/* Table */}
      <DataCard className="overflow-hidden">
        {loading ? (
          <Spinner className="h-40 py-0" />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Truck} message="No deliveries found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Delivery No</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Invoice No</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Delivery Address</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Initiated By</th>
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
                  const initiatorName = getInitiatorName(d);
                  return (
                    <tr key={d.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#34b0a7] whitespace-nowrap">{d.delivery_number}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{d.orders?.invoice_number || '—'}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{d.orders?.customers?.name ?? '—'}</td>
                      <td className="px-4 py-3 max-w-[180px]">
                        {deliveryAddr ? (
                          <span className="flex items-start gap-1 text-xs text-gray-600">
                            <MapPin size={12} className={`shrink-0 mt-0.5 ${isSite ? 'text-amber-500' : 'text-teal-500'}`} />
                            <span className="truncate" title={deliveryAddr}>{deliveryAddr}</span>
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                        {isSite && <span className="text-[10px] text-amber-600 font-medium ml-4">Site</span>}
                      </td>
                      <td className="px-4 py-3">
                        {initiatorName ? (
                          <span className="flex items-center gap-1.5 text-xs text-gray-700">
                            <UserCheck size={12} className="text-[#34b0a7] shrink-0" />
                            {initiatorName}
                          </span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-sm">{getDriverName(d) ?? '—'}</td>
                      <td className="px-4 py-3">
                        {getVehicleNumber(d) ? (
                          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded whitespace-nowrap">
                            {getVehicleNumber(d)}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
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
      </DataCard>

      {/* ── New Delivery Dialog ─────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setForm({ order_id: '', initiated_by_id: '', initiated_by_other: '', delivery_agent_id: '', driver_other: '', vehicle_number: '' }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck size={18} className="text-[#34b0a7]" />
              New Delivery
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Verify order, initiator, and driver before creating. Delivery assignment updates operational tracking instantly.
            </div>

            {/* Order */}
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

            {/* Initiated By */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <UserCheck size={13} className="text-[#34b0a7]" />
                Initiated By *
              </Label>
              <Select value={form.initiated_by_id} onValueChange={v => setForm(f => ({ ...f, initiated_by_id: v, initiated_by_other: '' }))}>
                <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                <SelectContent>
                  {staffList.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name}
                      <span className="ml-1 text-gray-400 text-xs capitalize">({s.role})</span>
                    </SelectItem>
                  ))}
                  <SelectItem value="__other__">
                    <span className="text-[#34b0a7] font-medium">+ Other (enter manually)</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {form.initiated_by_id === '__other__' && (
                <Input
                  value={form.initiated_by_other}
                  onChange={e => setForm(f => ({ ...f, initiated_by_other: e.target.value }))}
                  placeholder="Enter initiator name..."
                  className="mt-1.5"
                  autoFocus
                />
              )}
            </div>

            {/* Delivered By */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Car size={13} className="text-[#34b0a7]" />
                Delivered By (Driver) *
              </Label>
              <Select value={form.delivery_agent_id} onValueChange={handleAgentSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {activeAgents.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="font-medium">{a.name}</span>
                      {a.vehicle_number && (
                        <span className="ml-2 text-xs font-mono text-gray-500">{a.vehicle_number}</span>
                      )}
                    </SelectItem>
                  ))}
                  <SelectItem value="__other__">
                    <span className="text-[#34b0a7] font-medium">+ Other (enter manually)</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {form.delivery_agent_id === '__other__' && (
                <Input
                  value={form.driver_other}
                  onChange={e => setForm(f => ({ ...f, driver_other: e.target.value }))}
                  placeholder="Enter driver name..."
                  className="mt-1.5"
                  autoFocus
                />
              )}
              {activeAgents.length === 0 && form.delivery_agent_id !== '__other__' && (
                <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                  <AlertCircle size={11} />
                  {isAdmin ? 'No drivers added yet. Use "Manage Drivers" or select Other.' : 'No drivers added yet. Select Other to enter manually.'}
                </p>
              )}
            </div>

            {/* Auto-filled Vehicle Number */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                Vehicle Number
                {form.delivery_agent_id && form.delivery_agent_id !== '__other__' && (
                  <span className="text-[10px] text-[#34b0a7] bg-[#34b0a7]/10 px-1.5 py-0.5 rounded font-medium">
                    Auto-filled
                  </span>
                )}
              </Label>
              <Input
                value={form.vehicle_number}
                onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value.toUpperCase() }))}
                placeholder={
                  form.delivery_agent_id && form.delivery_agent_id !== '__other__'
                    ? 'Auto-populated from driver'
                    : 'e.g. MH12AB1234'
                }
                className="font-mono tracking-wider"
                readOnly={Boolean(form.delivery_agent_id) && form.delivery_agent_id !== '__other__'}
              />
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

      {/* ── Failure Reason Dialog ───────────────────────────────────────────── */}
      <Dialog open={failOpen} onOpenChange={v => { if (!v) { setFailOpen(false); setFailTargetId(null); } }}>
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
              {failSaving ? 'Saving...' : 'Confirm & Mark Failed'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
