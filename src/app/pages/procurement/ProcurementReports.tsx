import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Download, FileText, Truck, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/app/supabase';
import { downloadCSV } from '@/app/utils';
import {
  DataCard,
  EmptyState,
  FilterBar,
  FilterField,
  PageHeader,
  SearchBar,
  Spinner,
  StatusBadge,
  StyledTd,
  StyledTh,
  StyledThead,
  StyledTr,
  TablePagination,
} from '@/app/components/ui/primitives';

type PoRow = {
  id: string;
  po_number: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Received' | 'Cancelled';
  total_amount: number;
  created_at: string;
  suppliers: {
    name: string;
  } | null;
};

type GrnRow = {
  id: string;
  purchase_order_id: string;
  expected_qty: number;
  received_qty: number;
  status: 'Pending' | 'Verified' | 'Completed';
  received_date: string | null;
};

export const ProcurementReports = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<PoRow[]>([]);
  const [grnItems, setGrnItems] = useState<GrnRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PoRow['status']>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const fetchData = async () => {
    setLoading(true);
    const [{ data: poData, error: poError }, { data: grnData, error: grnError }] = await Promise.all([
      supabase
        .from('purchase_orders')
        .select('id, po_number, status, total_amount, created_at, suppliers(name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('grn_items')
        .select('id, purchase_order_id, expected_qty, received_qty, status, received_date')
        .order('created_at', { ascending: false }),
    ]);

    if (poError || grnError) {
      toast.error(poError?.message ?? grnError?.message ?? 'Failed to load procurement reports');
      setOrders([]);
      setGrnItems([]);
    } else {
      setOrders((poData ?? []) as PoRow[]);
      setGrnItems((grnData ?? []) as GrnRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(order => {
      const orderDate = order.created_at.slice(0, 10);
      const matchSearch = !q || order.po_number.toLowerCase().includes(q) || (order.suppliers?.name ?? '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchFrom = !fromDate || orderDate >= fromDate;
      const matchTo = !toDate || orderDate <= toDate;
      return matchSearch && matchStatus && matchFrom && matchTo;
    });
  }, [orders, search, statusFilter, fromDate, toDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, fromDate, toDate]);

  const page = Math.min(currentPage, Math.max(1, Math.ceil(filteredOrders.length / pageSize)));
  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  const totalSpend = filteredOrders.reduce((sum, row) => sum + (row.total_amount ?? 0), 0);
  const pendingCount = orders.filter(row => row.status === 'Pending' || row.status === 'Approved').length;
  const receivedCount = orders.filter(row => row.status === 'Received').length;

  const supplierPerformance = useMemo(() => {
    const aggregate = new Map<string, { orders: number; value: number; received: number; pending: number }>();
    for (const order of orders) {
      const key = order.suppliers?.name ?? 'Unknown Supplier';
      if (!aggregate.has(key)) aggregate.set(key, { orders: 0, value: 0, received: 0, pending: 0 });
      const entry = aggregate.get(key)!;
      entry.orders += 1;
      entry.value += order.total_amount ?? 0;
      if (order.status === 'Received') entry.received += 1;
      if (order.status === 'Pending' || order.status === 'Approved') entry.pending += 1;
    }
    return Array.from(aggregate.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [orders]);

  const pendingDeliveries = useMemo(
    () => orders.filter(order => order.status === 'Pending' || order.status === 'Approved').slice(0, 8),
    [orders]
  );

  const onExportSummary = () => {
    downloadCSV(
      ['PO Number', 'Supplier', 'Status', 'Order Date', 'Amount'],
      filteredOrders.map(row => [
        row.po_number,
        row.suppliers?.name ?? 'Unknown Supplier',
        row.status,
        new Date(row.created_at).toLocaleDateString('en-IN'),
        row.total_amount,
      ]),
      `procurement-summary-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Procurement Reports"
        subtitle="Supplier performance, spend analysis, pending deliveries and PO summary"
        actions={
          <Button size="sm" className="gap-2" onClick={onExportSummary}>
            <Download size={15} />
            Export Summary CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DataCard className="p-4 border-l-4 border-l-primary">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Spend</p>
          <p className="mt-1 text-2xl font-bold font-mono">₹{totalSpend.toLocaleString('en-IN')}</p>
          <p className="text-xs text-muted-foreground mt-1">Across filtered purchase orders</p>
        </DataCard>
        <DataCard className="p-4 border-l-4 border-l-amber-500">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending Deliveries</p>
          <p className="mt-1 text-2xl font-bold">{pendingCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending + Approved purchase orders</p>
        </DataCard>
        <DataCard className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Completed Receipts</p>
          <p className="mt-1 text-2xl font-bold">{receivedCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Purchase orders marked as Received</p>
        </DataCard>
      </div>

      <FilterBar>
        <SearchBar
          placeholder="Search by PO number or supplier..."
          value={search}
          onChange={setSearch}
          className="w-full md:max-w-md"
        />
        <div className="flex flex-wrap items-end gap-3">
          <FilterField label="Status">
            <Select value={statusFilter} onValueChange={(value: 'all' | PoRow['status']) => setStatusFilter(value)}>
              <SelectTrigger className="h-10 w-40 text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Received">Received</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="From Date">
            <Input type="date" className="h-10 w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </FilterField>
          <FilterField label="To Date">
            <Input type="date" className="h-10 w-36" value={toDate} onChange={e => setToDate(e.target.value)} />
          </FilterField>
        </div>
      </FilterBar>

      <DataCard>
        {loading ? <Spinner /> : filteredOrders.length === 0 ? (
          <EmptyState icon={FileText} message="No purchase orders found" sub="Try changing filters or date range." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <StyledThead>
                  <tr>
                    <StyledTh>PO Number</StyledTh>
                    <StyledTh>Supplier</StyledTh>
                    <StyledTh>Status</StyledTh>
                    <StyledTh>Order Date</StyledTh>
                    <StyledTh right>Amount</StyledTh>
                  </tr>
                </StyledThead>
                <tbody>
                  {paginatedOrders.map(order => (
                    <StyledTr key={order.id}>
                      <StyledTd mono className="font-semibold text-primary">{order.po_number}</StyledTd>
                      <StyledTd>{order.suppliers?.name ?? 'Unknown Supplier'}</StyledTd>
                      <StyledTd><StatusBadge status={order.status} /></StyledTd>
                      <StyledTd mono className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString('en-IN')}</StyledTd>
                      <StyledTd right mono className="font-semibold">₹{order.total_amount.toLocaleString('en-IN')}</StyledTd>
                    </StyledTr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              totalItems={filteredOrders.length}
              currentPage={page}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="purchase orders"
            />
          </>
        )}
      </DataCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DataCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-muted-foreground" />
            <h3 className="text-sm font-bold">Supplier Performance</h3>
          </div>
          {supplierPerformance.length === 0 ? (
            <EmptyState icon={TrendingUp} message="No supplier data" sub="Supplier report will appear once POs are created." />
          ) : (
            <div className="space-y-2">
              {supplierPerformance.map(row => (
                <div key={row.name} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{row.name}</p>
                    <p className="text-sm font-mono font-bold">₹{row.value.toLocaleString('en-IN')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {row.orders} orders · {row.received} received · {row.pending} pending
                  </p>
                </div>
              ))}
            </div>
          )}
        </DataCard>

        <DataCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={16} className="text-muted-foreground" />
            <h3 className="text-sm font-bold">Pending Deliveries</h3>
          </div>
          {pendingDeliveries.length === 0 ? (
            <EmptyState icon={Truck} message="No pending deliveries" sub="All active purchase orders are completed." />
          ) : (
            <div className="space-y-2">
              {pendingDeliveries.map(row => (
                <div key={row.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-primary">{row.po_number}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{row.suppliers?.name ?? 'Unknown Supplier'}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-3">GRN rows loaded: {grnItems.length}</p>
        </DataCard>
      </div>
    </div>
  );
};
