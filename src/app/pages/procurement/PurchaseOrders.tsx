import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Plus, Eye, Truck } from 'lucide-react';
import { supabase } from '@/app/supabase';
import {
  PageHeader, SearchBar, DataCard,
  StyledThead, StyledTh, StyledTr, StyledTd,
  StatusBadge, EmptyState, Spinner
} from '@/app/components/ui/primitives';

interface PurchaseOrderRow {
  id: string;
  po_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  expected_delivery_date: string | null;
  suppliers: { name: string } | null;
  purchase_order_items: { quantity: number }[] | null;
}

export const PurchaseOrders = () => {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRow[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('purchase_orders')
        .select('id, po_number, status, total_amount, created_at, expected_delivery_date, suppliers(name), purchase_order_items(quantity)')
        .order('created_at', { ascending: false });
      setPurchaseOrders((data ?? []) as PurchaseOrderRow[]);
      setLoading(false);
    })();
  }, []);

  const filteredOrders = useMemo(() => purchaseOrders.filter(po =>
    !search.trim() ||
    po.po_number.toLowerCase().includes(search.toLowerCase()) ||
    (po.suppliers?.name ?? '').toLowerCase().includes(search.toLowerCase())
  ), [purchaseOrders, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage and track purchase orders"
        actions={
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            disabled
            title="Create PO flow is coming soon"
          >
            <Plus size={15} /> Create PO
          </Button>
        }
      />

      <SearchBar
        placeholder="Search by PO number, supplier..."
        value={search}
        onChange={setSearch}
        className="max-w-sm"
      />

      <DataCard>
        {loading ? <Spinner /> : filteredOrders.length === 0 ? (
          <EmptyState icon={Truck} message="No purchase orders found" sub="Create a new PO to get started" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <StyledThead>
                <tr>
                  <StyledTh>PO Number</StyledTh>
                  <StyledTh>Supplier</StyledTh>
                  <StyledTh right>Items</StyledTh>
                  <StyledTh right>Total Amount</StyledTh>
                  <StyledTh>PO Date</StyledTh>
                  <StyledTh>Expected</StyledTh>
                  <StyledTh>Status</StyledTh>
                  <StyledTh right>Actions</StyledTh>
                </tr>
              </StyledThead>
              <tbody>
                {filteredOrders.map((po) => (
                  <StyledTr key={po.id}>
                    <StyledTd className="font-semibold text-primary">{po.po_number}</StyledTd>
                    <StyledTd className="text-foreground">{po.suppliers?.name ?? 'Unknown Supplier'}</StyledTd>
                    <StyledTd right mono>{(po.purchase_order_items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0)}</StyledTd>
                    <StyledTd right mono className="font-bold">₹{(po.total_amount ?? 0).toLocaleString('en-IN')}</StyledTd>
                    <StyledTd mono className="text-xs text-muted-foreground">{new Date(po.created_at).toLocaleDateString()}</StyledTd>
                    <StyledTd mono className="text-xs text-muted-foreground">{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : '—'}</StyledTd>
                    <StyledTd><StatusBadge status={po.status === 'Approved' ? 'In Transit' : po.status} /></StyledTd>
                    <StyledTd right>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon" disabled title={`Details for ${po.po_number} coming soon`} aria-label={`Details for ${po.po_number} coming soon`}>
                          <Eye size={14} />
                        </Button>
                      </div>
                    </StyledTd>
                  </StyledTr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>
    </div>
  );
};
