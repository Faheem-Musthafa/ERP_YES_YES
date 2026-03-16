import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useNavigate } from 'react-router';
import { Plus, Wallet } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  PageHeader, SearchBar, FilterBar, FilterField, DataCard,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, StatusBadge, TablePagination, ErrorState,
} from '@/app/components/ui/primitives';

const MODE_COLORS: Record<string, string> = {
  Cash: 'bg-emerald-100 text-emerald-700',
  Cheque: 'bg-blue-100 text-blue-700',
  UPI: 'bg-purple-100 text-purple-700',
  'Bank Transfer': 'bg-teal-100 text-teal-700',
};

const STATUS_COLORS: Record<string, string> = {
  Received: 'Received',
  Credited: 'Credited',
  Cleared: 'Cleared',
  'Not Received': 'Not Received',
  Bounced: 'Bounced',
};

export const MyCollection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (!user) return;
    const fetchReceipts = async () => {
      setLoading(true);
      setError('');
      const { data, error: fetchError } = await supabase
        .from('receipts')
        .select('id, receipt_number, amount, payment_mode, payment_status, created_at, orders(order_number, invoice_number, grand_total, customers(name))')
        .eq('recorded_by', user.id)
        .order('created_at', { ascending: false });
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setReceipts(data ?? []);
      }
      setLoading(false);
    };
    fetchReceipts();
  }, [user]);

  const filtered = receipts.filter(r => {
    const invoiceNo = r.orders?.invoice_number ?? r.orders?.order_number ?? '';
    const matchSearch = !search ||
      r.receipt_number.toLowerCase().includes(search.toLowerCase()) ||
      invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      (r.orders?.customers?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchMode = !modeFilter || modeFilter === 'all' || r.payment_mode === modeFilter;
    return matchSearch && matchMode;
  });
  useEffect(() => { setCurrentPage(1); }, [search, modeFilter, receipts.length]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Collection"
        subtitle="View all your recorded receipt entries"
        actions={
          <Button size="sm" onClick={() => navigate('/sales/receipt')} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus size={15} /> New Receipt
          </Button>
        }
      />

      <FilterBar>
        <SearchBar
          placeholder="Search by receipt / invoice / customer..."
          value={search}
          onChange={setSearch}
          className="w-full md:max-w-md"
        />
        <div className="flex flex-wrap items-end gap-3">
          <FilterField label="Payment Mode">
            <Select value={modeFilter} onValueChange={setModeFilter}>
              <SelectTrigger className="h-10 w-[180px]"><SelectValue placeholder="All Modes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </div>
      </FilterBar>

      <DataCard>
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={`Failed to load receipts: ${error}`} onRetry={() => user && void (async () => {
            setLoading(true);
            const { data, error: fetchError } = await supabase
              .from('receipts')
              .select('id, receipt_number, amount, payment_mode, payment_status, created_at, orders(order_number, invoice_number, grand_total, customers(name))')
              .eq('recorded_by', user.id)
              .order('created_at', { ascending: false });
            if (fetchError) setError(fetchError.message);
            else { setError(''); setReceipts(data ?? []); }
            setLoading(false);
          })()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Wallet}
            message="No receipts recorded yet"
            action={<Button onClick={() => navigate('/sales/receipt')} size="sm" variant="outline">Create First Receipt</Button>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <StyledThead>
                <tr>
                  <StyledTh>Receipt No</StyledTh>
                  <StyledTh>Invoice No</StyledTh>
                  <StyledTh>Customer</StyledTh>
                  <StyledTh center>Mode</StyledTh>
                  <StyledTh center>Status</StyledTh>
                  <StyledTh right>Amount (₹)</StyledTh>
                  <StyledTh>Date</StyledTh>
                </tr>
              </StyledThead>
              <tbody>
                {paginated.map(r => {
                  const invoiceNo = r.orders?.invoice_number ?? r.orders?.order_number ?? '—';
                  return (
                    <StyledTr key={r.id}>
                      <StyledTd className="font-semibold text-primary">{r.receipt_number}</StyledTd>
                      <StyledTd className="font-medium text-foreground">{invoiceNo}</StyledTd>
                      <StyledTd className="text-muted-foreground">{r.orders?.customers?.name ?? '—'}</StyledTd>
                      <StyledTd center>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${MODE_COLORS[r.payment_mode] ?? 'bg-muted text-muted-foreground'}`}>
                          {r.payment_mode}
                        </span>
                      </StyledTd>
                      <StyledTd center>
                        {r.payment_status ? (
                          <StatusBadge status={STATUS_COLORS[r.payment_status] ?? r.payment_status} />
                        ) : (
                          <span className="text-xs text-gray-400 italic">Pending</span>
                        )}
                      </StyledTd>
                      <StyledTd right mono className="font-bold">₹ {r.amount?.toLocaleString('en-IN')}</StyledTd>
                      <StyledTd mono className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</StyledTd>
                    </StyledTr>
                  );
                })}
              </tbody>
            </table>
            </div>
            <TablePagination
              totalItems={filtered.length}
              currentPage={page}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="receipts"
            />
          </>
        )}
      </DataCard>
    </div>
  );
};
