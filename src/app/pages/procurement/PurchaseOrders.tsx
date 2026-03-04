import React from 'react';
import { Button } from '@/app/components/ui/button';
import { Plus, Eye, Truck } from 'lucide-react';
import {
  PageHeader, SearchBar, DataCard,
  StyledThead, StyledTh, StyledTr, StyledTd,
  StatusBadge, IconBtn, EmptyState
} from '@/app/components/ui/primitives';

export const PurchaseOrders = () => {
  const purchaseOrders = [
    { poNumber: 'PO-2024-175', supplier: 'Supplier A', items: 15, amount: 245000, date: '2026-02-20', expectedDate: '2026-02-25', status: 'In Transit' },
    { poNumber: 'PO-2024-176', supplier: 'Supplier B', items: 8, amount: 182500, date: '2026-02-19', expectedDate: '2026-02-26', status: 'Pending' },
    { poNumber: 'PO-2024-177', supplier: 'Supplier C', items: 22, amount: 395000, date: '2026-02-18', expectedDate: '2026-02-28', status: 'In Transit' },
    { poNumber: 'PO-2024-178', supplier: 'Supplier A', items: 12, amount: 156000, date: '2026-02-17', expectedDate: '2026-02-22', status: 'Approved' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage and track purchase orders"
        actions={
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus size={15} /> Create PO
          </Button>
        }
      />

      <SearchBar
        placeholder="Search by PO number, supplier..."
        value="" onChange={() => { }}
        className="max-w-sm"
      />

      <DataCard>
        {purchaseOrders.length === 0 ? (
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
                {purchaseOrders.map((po, index) => (
                  <StyledTr key={index}>
                    <StyledTd className="font-semibold text-primary">{po.poNumber}</StyledTd>
                    <StyledTd className="text-foreground">{po.supplier}</StyledTd>
                    <StyledTd right mono>{po.items}</StyledTd>
                    <StyledTd right mono className="font-bold">₹{po.amount.toLocaleString('en-IN')}</StyledTd>
                    <StyledTd mono className="text-xs text-muted-foreground">{new Date(po.date).toLocaleDateString()}</StyledTd>
                    <StyledTd mono className="text-xs text-muted-foreground">{new Date(po.expectedDate).toLocaleDateString()}</StyledTd>
                    <StyledTd><StatusBadge status={po.status} /></StyledTd>
                    <StyledTd right>
                      <div className="flex justify-end">
                        <IconBtn title="View PO details"><Eye size={14} /></IconBtn>
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
