import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { FileText } from 'lucide-react';
import { supabase } from '@/app/supabase';
import {
  PageHeader, SearchBar, DataCard, FilterBar, FilterField,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, StatusBadge, TablePagination,
} from '@/app/components/ui/primitives';

export const SalesRecords = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, status, company, invoice_type, grand_total, approved_at, created_at, customers(name)')
        .in('status', ['Approved', 'Billed', 'Delivered'])
        .order('approved_at', { ascending: false });
      setOrders(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.customers?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, orders.length]);
  const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const total = filtered.reduce((s, o) => s + (o.grand_total ?? 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales Records"
        subtitle="All approved, billed, and delivered orders"
      />

      <FilterBar>
        <SearchBar
          placeholder="Search by order no / customer..."
          value={search}
          onChange={setSearch}
          className="w-full md:max-w-md"
        />
        <FilterField label="Status">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-10 text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Billed">Billed</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
      </FilterBar>

      <DataCard>
        {loading ? <Spinner /> :
          filtered.length === 0 ? (
            <EmptyState icon={FileText} message="No sales records found" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <StyledThead>
                    <tr>
                      <StyledTh>Order No</StyledTh>
                      <StyledTh>Customer</StyledTh>
                      <StyledTh>Company</StyledTh>
                      <StyledTh>Invoice Type</StyledTh>
                      <StyledTh>Status</StyledTh>
                      <StyledTh right>Grand Total</StyledTh>
                      <StyledTh>Approved Date</StyledTh>
                    </tr>
                  </StyledThead>
                  <tbody>
                    {paginated.map(o => (
                      <StyledTr key={o.id}>
                        <StyledTd mono className="text-primary font-semibold">{o.order_number}</StyledTd>
                        <StyledTd className="text-foreground">{o.customers?.name ?? '—'}</StyledTd>
                        <StyledTd className="text-muted-foreground">{o.company}</StyledTd>
                        <StyledTd className="text-muted-foreground">{o.invoice_type}</StyledTd>
                        <StyledTd><StatusBadge status={o.status} /></StyledTd>
                        <StyledTd right mono className="font-semibold text-foreground">
                          ₹{o.grand_total?.toLocaleString('en-IN')}
                        </StyledTd>
                        <StyledTd mono className="text-xs text-muted-foreground">
                          {o.approved_at ? new Date(o.approved_at).toLocaleDateString() : '—'}
                        </StyledTd>
                      </StyledTr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{filtered.length} records</span>
                <span className="text-sm font-bold font-mono text-foreground">
                  Total: ₹{total.toLocaleString('en-IN')}
                </span>
              </div>
              <TablePagination
                totalItems={filtered.length}
                currentPage={page}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                itemLabel="records"
              />
            </>
          )
        }
      </DataCard>
    </div>
  );
};
