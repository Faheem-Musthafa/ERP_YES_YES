import React, { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Plus, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { DataCard, EmptyState, FormSection, PageHeader, SearchBar, StyledThead, StyledTh, StyledTr, StyledTd, StatusBadge } from '@/app/components/ui/primitives';

export const GRN = () => {
  const [poSearch, setPoSearch] = useState('');

  const handleCreateGRN = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('GRN created successfully - Stock updated');
  };

  const pendingDeliveries = [
    { poNumber: 'PO-2024-175', supplier: 'Supplier A', items: 15, expectedDate: '2026-02-25', status: 'In Transit' },
    { poNumber: 'PO-2024-177', supplier: 'Supplier C', items: 22, expectedDate: '2026-02-28', status: 'In Transit' },
  ];

  const recentGRNs = [
    { grnNumber: 'GRN-2024-089', poNumber: 'PO-2024-156', supplier: 'Supplier A', items: 12, receivedDate: '2026-02-19', status: 'Completed' },
    { grnNumber: 'GRN-2024-090', poNumber: 'PO-2024-162', supplier: 'Supplier B', items: 8, receivedDate: '2026-02-18', status: 'Completed' },
    { grnNumber: 'GRN-2024-091', poNumber: 'PO-2024-168', supplier: 'Supplier C', items: 15, receivedDate: '2026-02-17', status: 'Completed' },
  ];
  const filteredPendingDeliveries = pendingDeliveries.filter(
    delivery =>
      !poSearch ||
      delivery.poNumber.toLowerCase().includes(poSearch.toLowerCase()) ||
      delivery.supplier.toLowerCase().includes(poSearch.toLowerCase())
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
                  <SearchBar
                    placeholder="Search PO number..."
                    value={poSearch}
                    onChange={setPoSearch}
                  />
                </div>

                <div>
                  <Label>Supplier Name</Label>
                  <Input placeholder="Auto-filled from PO" disabled />
                </div>

                <div>
                  <Label>Received Date</Label>
                  <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>

                <div>
                  <Label>Total Items</Label>
                  <Input type="number" placeholder="0" disabled />
                </div>

                <div>
                  <Label>Delivery Challan Number</Label>
                  <Input placeholder="Enter challan number" />
                </div>

                <div>
                  <Label>Remarks</Label>
                  <Input placeholder="Any additional notes" />
                </div>

                <Button type="submit" disabled className="w-full bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl" title="GRN creation will be available once procurement is fully integrated">
                  <Plus size={16} className="mr-2" />
                  Create GRN & Update Stock (Coming Soon)
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
                  <div key={delivery.poNumber} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-[#34b0a7]/5 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[#34b0a7]">{delivery.poNumber}</span>
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-100 text-amber-700">{delivery.status}</span>
                    </div>
                    <p className="text-xs text-gray-600">{delivery.supplier} - {delivery.items} items</p>
                    <p className="text-xs text-gray-500 mt-1">Expected: {new Date(delivery.expectedDate).toLocaleDateString()}</p>
                  </div>
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
                  {recentGRNs.map((grn, index) => (
                    <StyledTr key={index}>
                      <StyledTd className="font-semibold">{grn.grnNumber}</StyledTd>
                      <StyledTd className="text-primary font-medium">{grn.poNumber}</StyledTd>
                      <StyledTd>{grn.supplier}</StyledTd>
                      <StyledTd center mono>{grn.items}</StyledTd>
                      <StyledTd mono className="text-xs text-muted-foreground">{new Date(grn.receivedDate).toLocaleDateString()}</StyledTd>
                      <StyledTd center><StatusBadge status={grn.status} /></StyledTd>
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
