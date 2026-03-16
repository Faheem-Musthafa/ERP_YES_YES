import React from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Eye, Download, FileSearch } from 'lucide-react';
import {
  PageHeader, SearchBar, FilterBar, FilterField, DataCard,
  StyledThead, StyledTh, StyledTr, StyledTd,
  StatusBadge, IconBtn, TablePagination,
} from '@/app/components/ui/primitives';

export const PurchaseHistory = () => {
  const [search, setSearch] = React.useState('');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 8;

  const history = [
    { poNumber: 'PO-2024-172', supplier: 'Supplier A', items: 18, amount: 285000, orderDate: '2026-02-15', deliveryDate: '2026-02-18', status: 'Completed' },
    { poNumber: 'PO-2024-168', supplier: 'Supplier C', items: 25, amount: 425000, orderDate: '2026-02-12', deliveryDate: '2026-02-17', status: 'Completed' },
    { poNumber: 'PO-2024-165', supplier: 'Supplier B', items: 12, amount: 195000, orderDate: '2026-02-10', deliveryDate: '2026-02-15', status: 'Completed' },
    { poNumber: 'PO-2024-162', supplier: 'Supplier B', items: 8, amount: 145000, orderDate: '2026-02-08', deliveryDate: '2026-02-12', status: 'Completed' },
    { poNumber: 'PO-2024-156', supplier: 'Supplier A', items: 15, amount: 235000, orderDate: '2026-02-05', deliveryDate: '2026-02-10', status: 'Completed' },
  ];
  const filtered = history.filter((record) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || record.poNumber.toLowerCase().includes(q) || record.supplier.toLowerCase().includes(q);
    const matchesFrom = !fromDate || record.orderDate >= fromDate;
    const matchesTo = !toDate || record.orderDate <= toDate;
    return matchesSearch && matchesFrom && matchesTo;
  });
  React.useEffect(() => { setCurrentPage(1); }, [search, fromDate, toDate]);
  const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase History"
        subtitle="View completed purchase orders"
        actions={
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Download size={15} />
            Export History
          </Button>
        }
      />

      <FilterBar>
        <SearchBar
          placeholder="Search by PO number, supplier..."
          value={search}
          onChange={setSearch}
          className="w-full md:max-w-md"
        />
        <div className="flex flex-wrap items-end gap-3">
          <FilterField label="From Date">
            <Input type="date" className="h-10 w-40" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </FilterField>
          <FilterField label="To Date">
            <Input type="date" className="h-10 w-40" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </FilterField>
        </div>
      </FilterBar>

      <DataCard>
        {filtered.length === 0 ? (
          <div className="py-14 text-center">
            <FileSearch size={34} className="mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No purchase orders match current filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <StyledThead>
              <tr>
                <StyledTh>PO Number</StyledTh>
                <StyledTh>Supplier</StyledTh>
                <StyledTh center>Items</StyledTh>
                <StyledTh right>Total Amount</StyledTh>
                <StyledTh>Order Date</StyledTh>
                <StyledTh>Delivery Date</StyledTh>
                <StyledTh center>Status</StyledTh>
                <StyledTh center>Actions</StyledTh>
              </tr>
            </StyledThead>
            <tbody>
              {paginated.map((record, index) => (
                <StyledTr key={`${record.poNumber}-${index}`}>
                  <StyledTd className="font-semibold text-primary">{record.poNumber}</StyledTd>
                  <StyledTd>{record.supplier}</StyledTd>
                  <StyledTd center mono>{record.items}</StyledTd>
                  <StyledTd right mono className="font-bold">₹ {record.amount.toLocaleString('en-IN')}</StyledTd>
                  <StyledTd mono className="text-xs text-muted-foreground">{new Date(record.orderDate).toLocaleDateString()}</StyledTd>
                  <StyledTd mono className="text-xs text-muted-foreground">{new Date(record.deliveryDate).toLocaleDateString()}</StyledTd>
                  <StyledTd center><StatusBadge status={record.status} /></StyledTd>
                  <StyledTd center>
                    <div className="flex items-center justify-center">
                      <IconBtn title="View purchase order"><Eye size={14} /></IconBtn>
                    </div>
                  </StyledTd>
                </StyledTr>
              ))}
            </tbody>
          </table>
            </div>
            <TablePagination
              totalItems={filtered.length}
              currentPage={page}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="purchase orders"
            />
          </>
        )}
      </DataCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DataCard className="p-5 border-l-4 border-l-teal-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total POs Completed</p>
          <p className="text-2xl font-bold text-foreground mt-1">142</p>
          <p className="text-xs text-muted-foreground mt-0.5">This month: 28</p>
        </DataCard>
        <DataCard className="p-5 border-l-4 border-l-emerald-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Value</p>
          <p className="text-2xl font-bold text-foreground mt-1">₹ 52.8L</p>
          <p className="text-xs text-muted-foreground mt-0.5">This month</p>
        </DataCard>
        <DataCard className="p-5 border-l-4 border-l-purple-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. Delivery Time</p>
          <p className="text-2xl font-bold text-foreground mt-1">4.5 days</p>
          <p className="text-xs text-muted-foreground mt-0.5">This month</p>
        </DataCard>
      </div>
    </div>
  );
};
