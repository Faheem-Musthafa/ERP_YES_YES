import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Plus, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/app/supabase';
import { DataCard, EmptyState, FormSection, PageHeader, SearchBar, StyledThead, StyledTh, StyledTr, StyledTd, StatusBadge } from '@/app/components/ui/primitives';
import type { GodownEnum } from '@/app/types/database';
import { DEFAULT_MASTER_DATA_SETTINGS, loadMasterDataSettings } from '@/app/settings';

interface PendingDelivery {
  id: string;
  po_number: string;
  supplier_id: string | null;
  status: string;
  expected_delivery_date: string | null;
  suppliers: { name: string } | null;
  po_items: { product_id: string; quantity: number }[] | null;
}

interface RecentGrn {
  id: string;
  grn_number: string;
  received_date: string;
  created_at: string;
  purchase_orders: { po_number: string; suppliers: { name: string } | null } | null;
  grn_items: { received_qty: number; status: string }[] | null;
}

export const GRN = () => {
  const [poSearch, setPoSearch] = useState('');
  const [pendingDeliveries, setPendingDeliveries] = useState<PendingDelivery[]>([]);
  const [recentGRNs, setRecentGRNs] = useState<RecentGrn[]>([]);
  const [selectedPOId, setSelectedPOId] = useState('');
  const [receivingLocation, setReceivingLocation] = useState('');
  const [GodownOptions, setGodownOptions] = useState<string[]>(DEFAULT_MASTER_DATA_SETTINGS.Godowns);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [challanNumber, setChallanNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [receivedQty, setReceivedQty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreateGRN = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPO) {
      toast.error('Please select a purchase order');
      return;
    }

    if (!receivingLocation) {
      toast.error('Please select receiving location');
      return;
    }

    if (!receivedDate) {
      toast.error('Please enter received date');
      return;
    }

    if (!receivedQty || Number(receivedQty) <= 0) {
      toast.error('Please enter received quantity');
      return;
    }

    const poItems = selectedPO.po_items ?? [];
    const expectedQty = poItems.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    if (Number(receivedQty) > expectedQty) {
      toast.error(`Received quantity cannot exceed expected quantity (${expectedQty})`);
      return;
    }
    if (poItems.length === 0) {
      toast.error('Selected purchase order has no items');
      return;
    }

    setSubmitting(true);
    try {
      const requestedQty = Number(receivedQty);
      const proportionalItems = poItems.map((item) => ({
        product_id: item.product_id,
        expected_qty: item.quantity,
        received_qty: expectedQty === 0 ? 0 : Math.floor((item.quantity / expectedQty) * requestedQty),
        damaged_qty: 0,
        location: receivingLocation as GodownEnum,
      }));
      let assignedQty = proportionalItems.reduce((sum, item) => sum + item.received_qty, 0);
      for (const item of proportionalItems) {
        while (assignedQty < requestedQty && item.received_qty < item.expected_qty) {
          item.received_qty += 1;
          assignedQty += 1;
        }
      }
      const grnItems = proportionalItems.filter((item) => item.received_qty > 0);
      const remarksText = [
        challanNumber.trim() ? `Challan: ${challanNumber.trim()}` : null,
        remarks.trim() || null,
        receivedDate ? `Received Date: ${receivedDate}` : null,
      ].filter(Boolean).join(' | ');

      const idempotencyKey = `grn:${selectedPOId}:${receivingLocation}:${receivedDate}:${requestedQty}:${challanNumber.trim() || 'na'}`;

      let grnId: string | null = null;
      const { data: idempotentGrnId, error: idempotentErr } = await supabase.rpc('create_grn_idempotent', {
        p_items: grnItems,
        p_po_id: selectedPOId,
        p_supplier_id: selectedPO.supplier_id,
        p_received_by: null,
        p_remarks: remarksText || null,
        p_idempotency_key: idempotencyKey,
      });

      if (idempotentErr) {
        const rpcMissing = idempotentErr.code === 'PGRST202' || idempotentErr.message?.toLowerCase().includes('could not find the function');
        if (!rpcMissing) throw idempotentErr;

        const { data: legacyGrnId, error: legacyErr } = await supabase.rpc('create_grn', {
          p_items: grnItems,
          p_po_id: selectedPOId,
          p_supplier_id: selectedPO.supplier_id,
          p_received_by: null,
          p_remarks: remarksText || null,
        });
        if (legacyErr) throw legacyErr;
        grnId = legacyGrnId;
      } else {
        grnId = idempotentGrnId;
      }

      if (grnId) {
        const { error: headerUpdateError } = await supabase
          .from('grn')
          .update({ received_date: receivedDate })
          .eq('id', grnId);

        if (headerUpdateError) throw headerUpdateError;
      }

      toast.success(`GRN created successfully! Stock updated at ${receivingLocation}`);
      setReceivedDate(new Date().toISOString().split('T')[0]);
      setChallanNumber('');
      setRemarks('');
      setReceivedQty('');
      setSelectedPOId('');
      setReceivingLocation((prev) => prev || GodownOptions[0] || '');

      // Refresh GRN list
      await loadGRNData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create GRN');
    } finally {
      setSubmitting(false);
    }
  };

  const loadGRNData = async () => {
    try {
      const [settings, { data: pendingData, error: pendingError }, { data: grnData, error: grnError }, { data: stockLocations }] = await Promise.all([
        loadMasterDataSettings().catch(() => DEFAULT_MASTER_DATA_SETTINGS),
        supabase
          .from('purchase_orders')
          .select('id, po_number, supplier_id, status, expected_delivery_date, suppliers(name), po_items(product_id, quantity)')
          .in('status', ['Pending', 'Approved'])
          .order('expected_delivery_date', { ascending: true }),
        supabase
          .from('grn')
          .select('id, grn_number, received_date, created_at, purchase_orders:purchase_orders!grn_po_id_fkey(po_number, suppliers(name)), grn_items(received_qty, status)')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('product_stock_locations')
          .select('location')
          .limit(200),
      ]);

      const detectedOperationalGodowns = Array.from(
        new Set(
          (stockLocations ?? [])
            .map((row: any) => (typeof row.location === 'string' ? row.location.trim() : ''))
            .filter((value: string) => value.length > 0),
        ),
      );
      const configuredGodowns = Array.from(
        new Set(
          settings.Godowns
            .map((location) => location.trim())
            .filter((location) => location.length > 0),
        ),
      );
      const nextGodownOptions = configuredGodowns.length > 0
        ? configuredGodowns
        : detectedOperationalGodowns;

      setGodownOptions(nextGodownOptions);
      setReceivingLocation((current) => {
        if (current && nextGodownOptions.includes(current)) return current;
        return nextGodownOptions[0]
          ?? '';
      });

      if (pendingError) {
        console.error('Failed to fetch pending POs:', pendingError);
        toast.error('Failed to load pending deliveries');
      } else {
        setPendingDeliveries((pendingData ?? []) as PendingDelivery[]);
      }

      if (grnError) {
        console.error('Failed to fetch GRNs:', grnError);
        toast.error('Failed to load recent GRNs');
      } else {
        setRecentGRNs((grnData ?? []) as RecentGrn[]);
      }
    } catch (err) {
      console.error('Error loading GRN data:', err);
      toast.error('Failed to load GRN data');
    }
  };

  useEffect(() => {
    loadGRNData();

    // Subscribe to real-time updates
    const purchaseOrdersSubscription = supabase
      .channel('purchase_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, () => {
        loadGRNData();
      })
      .subscribe();

    const grnItemsSubscription = supabase
      .channel('grn')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grn' }, () => {
        loadGRNData();
      })
      .subscribe();

    return () => {
      purchaseOrdersSubscription.unsubscribe();
      grnItemsSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (receivingLocation && !GodownOptions.includes(receivingLocation)) {
      setReceivingLocation('');
    }
  }, [receivingLocation, GodownOptions]);

  const selectedPO = useMemo(
    () => pendingDeliveries.find(delivery => delivery.id === selectedPOId) ?? null,
    [pendingDeliveries, selectedPOId]
  );

  const filteredPendingDeliveries = pendingDeliveries.filter(
    delivery =>
      !poSearch ||
      delivery.po_number.toLowerCase().includes(poSearch.toLowerCase()) ||
      (delivery.suppliers?.name ?? '').toLowerCase().includes(poSearch.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Goods Receipt Note (GRN)"
        subtitle="Record received goods and update stock levels"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DataCard className="p-6">
          <form onSubmit={handleCreateGRN} className="space-y-4">
            <FormSection title="Create New GRN" subtitle="Capture receipt details before updating stock records.">
              <div className="space-y-4">
                <div>
                  <Label>Purchase Order Number</Label>
                  <Input value={selectedPO?.po_number ?? ''} placeholder="Select a pending PO from the right panel" disabled />
                </div>

                <div>
                  <Label>Supplier Name</Label>
                  <Input value={selectedPO?.suppliers?.name ?? ''} placeholder="Auto-filled from PO" disabled />
                </div>

                <div>
                  <Label>Received Date</Label>
                  <Input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} required />
                </div>

                <div>
                  <Label>Receiving Location *</Label>
                  <Select value={receivingLocation} onValueChange={setReceivingLocation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GodownOptions.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Stock will be added to this location</p>
                </div>

                <div>
                  <Label>Total Items</Label>
                  <Input type="number" value={selectedPO ? (selectedPO.po_items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0) : ''} placeholder="0" disabled />
                </div>

                <div>
                  <Label>Received Quantity</Label>
                  <Input type="number" value={receivedQty} onChange={(e) => setReceivedQty(e.target.value)} placeholder="Enter quantity received" min="1" required />
                </div>

                <div>
                  <Label>Delivery Challan Number</Label>
                  <Input value={challanNumber} onChange={(e) => setChallanNumber(e.target.value)} placeholder="Enter challan number" />
                </div>

                <div>
                  <Label>Remarks</Label>
                  <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any additional notes" />
                </div>

                <Button type="submit" disabled={submitting || !selectedPO} className="w-full bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl">
                  <Plus size={16} className="mr-2" />
                  {submitting ? 'Creating GRN...' : 'Create GRN & Update Stock'}
                </Button>
              </div>
            </FormSection>
          </form>
        </DataCard>

        <DataCard className="p-6">
          <FormSection title="Pending Deliveries" subtitle="Open purchase orders awaiting inbound goods.">
            {filteredPendingDeliveries.length === 0 ? (
              <EmptyState
                icon={Truck}
                message="No pending deliveries found"
                sub="Try a different purchase order or supplier search."
              />
            ) : (
              <div className="space-y-3">
                {filteredPendingDeliveries.map(delivery => (
                  <button type="button" onClick={() => setSelectedPOId(delivery.id)} key={delivery.id} className="w-full text-left p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-[#34b0a7]/5 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[#34b0a7]">{delivery.po_number}</span>
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-100 text-amber-700">{delivery.status === 'Approved' ? 'In Transit' : delivery.status}</span>
                    </div>
                    <p className="text-xs text-gray-600">{delivery.suppliers?.name ?? 'Unknown Supplier'} - {(delivery.po_items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0)} items</p>
                    <p className="text-xs text-gray-500 mt-1">Expected: {delivery.expected_delivery_date ? new Date(delivery.expected_delivery_date).toLocaleDateString() : '—'}</p>
                  </button>
                ))}
              </div>
            )}
          </FormSection>
        </DataCard>
      </div>

      <DataCard className="p-5">
        <FormSection title="Recent GRNs">
          {recentGRNs.length === 0 ? (
            <EmptyState
              icon={Truck}
              message="No GRNs recorded yet"
              sub="Newly created GRNs will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <StyledThead>
                  <tr>
                    <StyledTh>GRN Number</StyledTh>
                    <StyledTh>PO Number</StyledTh>
                    <StyledTh>Supplier</StyledTh>
                    <StyledTh center>Items</StyledTh>
                    <StyledTh>Received Date</StyledTh>
                    <StyledTh center>Status</StyledTh>
                  </tr>
                </StyledThead>
                <tbody>
                  {recentGRNs.map((grn) => (
                    <StyledTr key={grn.id}>
                      <StyledTd className="font-semibold">{grn.grn_number}</StyledTd>
                      <StyledTd className="text-primary font-medium">{grn.purchase_orders?.po_number ?? '—'}</StyledTd>
                      <StyledTd>{grn.purchase_orders?.suppliers?.name ?? 'Unknown Supplier'}</StyledTd>
                      <StyledTd center mono>{(grn.grn_items ?? []).reduce((sum, item) => sum + (item.received_qty ?? 0), 0)}</StyledTd>
                      <StyledTd mono className="text-xs text-muted-foreground">{new Date(grn.received_date ?? grn.created_at).toLocaleDateString()}</StyledTd>
                      <StyledTd center><StatusBadge status={(grn.grn_items ?? []).every((item) => item.status === 'Completed') ? 'Completed' : 'Pending'} /></StyledTd>
                    </StyledTr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FormSection>
      </DataCard>
    </div>
  );
};
