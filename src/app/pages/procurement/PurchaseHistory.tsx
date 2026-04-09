import React from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Eye, Download, FileSearch } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { downloadCSV } from '@/app/utils';
import {
  PageHeader, SearchBar, FilterBar, FilterField, DataCard,
  StyledThead, StyledTh, StyledTr, StyledTd,
  StatusBadge, IconBtn, TablePagination, Spinner,
} from '@/app/components/ui/primitives';

interface HistoryRow {
  id: string;
  po_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  delivered_at: string | null;
  suppliers: { name: string } | null;
  po_items: { quantity: number }[] | null;
}

export const PurchaseHistory = () => {
  const [search, setSearch] = React.useState('');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [history, setHistory] = React.useState<HistoryRow[]>([]);
  const pageSize = 8;

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('purchase_orders')
        .select('id, po_number, status, total_amount, created_at, delivered_at, suppliers(name), po_items(quantity)')
        .eq('status', 'Received')
        .order('delivered_at', { ascending: false });
      setHistory((data ?? []) as HistoryRow[]);
      setLoading(false);
    })();
  }, []);

  const filtered = history.filter((record) => {
    const q = search.toLowerCase();
    const orderDate = record.created_at.slice(0, 10);
    const matchesSearch = !q || record.po_number.toLowerCase().includes(q) || (record.suppliers?.name ?? '').toLowerCase().includes(q);
    const matchesFrom = !fromDate || orderDate >= fromDate;
    const matchesTo = !toDate || orderDate <= toDate;
    return matchesSearch && matchesFrom && matchesTo;
  });
  React.useEffect(() => { setCurrentPage(1); }, [search, fromDate, toDate]);
  const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthly = history.filter(r => (r.delivered_at ?? r.created_at).startsWith(thisMonth));
  const monthlyValue = monthly.reduce((sum, row) => sum + (row.total_amount ?? 0), 0);
  const avgDeliveryDays = monthly.length === 0 ? 0 : monthly.reduce((sum, row) => {
    const end = row.delivered_at ? new Date(row.delivered_at).getTime() : new Date(row.created_at).getTime();
    const start = new Date(row.created_at).getTime();
    const days = Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0) / monthly.length;

  const exportHistory = () => {
    downloadCSV(
      ['PO Number', 'Supplier', 'Items', 'Amount', 'Order Date', 'Delivery Date', 'Status'],
      filtered.map(row => [
        row.po_number,
        row.suppliers?.name ?? 'Unknown Supplier',
        (row.po_items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0),
        row.total_amount,
        new Date(row.created_at).toLocaleDateString('en-IN'),
        row.delivered_at ? new Date(row.delivered_at).toLocaleDateString('en-IN') : '—',
        row.status,
      ]),
      `purchase-history-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase History"
        subtitle="View completed purchase orders"
        actions={
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" onClick={exportHistory}>
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
        {loading ? <Spinner /> : filtered.length === 0 ? (
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
              {paginated.map((record) => (
                <StyledTr key={record.id}>
                  <StyledTd className="font-semibold text-primary">{record.po_number}</StyledTd>
                  <StyledTd>{record.suppliers?.name ?? 'Unknown Supplier'}</StyledTd>
                  <StyledTd center mono>{(record.po_items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0)}</StyledTd>
                  <StyledTd right mono className="font-bold">₹ {record.total_amount.toLocaleString('en-IN')}</StyledTd>
                  <StyledTd mono className="text-xs text-muted-foreground">{new Date(record.created_at).toLocaleDateString()}</StyledTd>
                  <StyledTd mono className="text-xs text-muted-foreground">{record.delivered_at ? new Date(record.delivered_at).toLocaleDateString() : '—'}</StyledTd>
                  <StyledTd center><StatusBadge status="Completed" /></StyledTd>
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
          <p className="text-2xl font-bold text-foreground mt-1">{history.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">This month: {monthly.length}</p>
        </DataCard>
        <DataCard className="p-5 border-l-4 border-l-emerald-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Value</p>
          <p className="text-2xl font-bold text-foreground mt-1">₹ {monthlyValue.toLocaleString('en-IN')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">This month</p>
        </DataCard>
        <DataCard className="p-5 border-l-4 border-l-purple-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. Delivery Time</p>
          <p className="text-2xl font-bold text-foreground mt-1">{avgDeliveryDays.toFixed(1)} days</p>
          <p className="text-xs text-muted-foreground mt-0.5">This month</p>
        </DataCard>
      </div>
    </div>
  );
};
