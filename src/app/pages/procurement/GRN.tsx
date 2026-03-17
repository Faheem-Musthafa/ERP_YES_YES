import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Plus, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/app/supabase';
import { DataCard, EmptyState, FormSection, PageHeader, SearchBar, StyledThead, StyledTh, StyledTr, StyledTd, StatusBadge } from '@/app/components/ui/primitives';

interface PendingDelivery {
  id: string;
  po_number: string;
  status: string;
  expected_delivery_date: string | null;
  suppliers: { name: string } | null;
  purchase_order_items: { quantity: number }[] | null;
}

interface RecentGrn {
  id: string;
  purchase_order_id: string | null;
  expected_qty: number;
  received_qty: number;
  received_date: string | null;
  status: string;
  created_at: string;
  purchase_orders: { po_number: string; suppliers: { name: string } | null } | null;
}

export const GRN = () => {
  const [poSearch, setPoSearch] = useState('');
  const [pendingDeliveries, setPendingDeliveries] = useState<PendingDelivery[]>([]);
  const [recentGRNs, setRecentGRNs] = useState<RecentGrn[]>([]);
  const [selectedPOId, setSelectedPOId] = useState('');

  const handleCreateGRN = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('GRN created successfully - Stock updated');
  };

  useEffect(() => {
    (async () => {
      const [{ data: pendingData }, { data: grnData }] = await Promise.all([
        supabase
          .from('purchase_orders')
          .select('id, po_number, status, expected_delivery_date, suppliers(name), purchase_order_items(quantity)')
          .in('status', ['Pending', 'Approved'])
          .order('expected_delivery_date', { ascending: true }),
        supabase
          .from('grn_items')
          .select('id, purchase_order_id, expected_qty, received_qty, received_date, status, created_at, purchase_orders(po_number, suppliers(name))')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      setPendingDeliveries((pendingData ?? []) as PendingDelivery[]);
      setRecentGRNs((grnData ?? []) as RecentGrn[]);
    })();
  }, []);

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
                  <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>

                <div>
                  <Label>Total Items</Label>
                  <Input type="number" value={selectedPO ? (selectedPO.purchase_order_items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0) : ''} placeholder="0" disabled />
                </div>

                <div>
                  <Label>Delivery Challan Number</Label>
                  <Input placeholder="Enter challan number" />
                </div>

                <div>
                  <Label>Remarks</Label>
                  <Input placeholder="Any additional notes" />
                </div>

                <Button type="submit" disabled className="w-full bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl" title="GRN posting flow will be enabled in next iteration">
                  <Plus size={16} className="mr-2" />
                  Create GRN & Update Stock
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
                    <p className="text-xs text-gray-600">{delivery.suppliers?.name ?? 'Unknown Supplier'} - {(delivery.purchase_order_items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0)} items</p>
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
                      <StyledTd className="font-semibold">{`GRN-${grn.id.slice(0, 8).toUpperCase()}`}</StyledTd>
                      <StyledTd className="text-primary font-medium">{grn.purchase_orders?.po_number ?? '—'}</StyledTd>
                      <StyledTd>{grn.purchase_orders?.suppliers?.name ?? 'Unknown Supplier'}</StyledTd>
                      <StyledTd center mono>{grn.received_qty}</StyledTd>
                      <StyledTd mono className="text-xs text-muted-foreground">{new Date(grn.received_date ?? grn.created_at).toLocaleDateString()}</StyledTd>
                      <StyledTd center><StatusBadge status={grn.status === 'Completed' ? 'Completed' : 'Pending'} /></StyledTd>
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
