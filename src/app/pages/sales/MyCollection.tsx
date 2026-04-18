import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { useNavigate } from 'react-router';
import { Plus, Wallet, AlertCircle } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import type { PaymentModeEnum } from '@/app/types/database';
import { DEFAULT_RECEIPT_STATUS, RECEIPT_STATUS_OPTIONS_BY_MODE } from '@/app/utils';
import {
  PageHeader, SearchBar, FilterBar, FilterField, DataCard,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, StatusBadge, TablePagination, ErrorState,
} from '@/app/components/ui/primitives';

interface ReceiptRow {
  id: string;
  receipt_number: string;
  amount: number | null;
  payment_mode: PaymentModeEnum;
  payment_status: string | null;
  bounce_reason: string | null;
  company: string | null;
  brand: string | null;
  on_account_of: string | null;
  received_date: string | null;
  created_at: string;
  customers: { name: string } | null;
  orders: {
    order_number: string;
    invoice_number: string | null;
    grand_total: number | null;
    customers: { name: string } | null;
  } | null;
}

const MODE_COLORS: Record<string, string> = {
  Cash: 'bg-emerald-100 text-emerald-700',
  Cheque: 'bg-blue-100 text-blue-700',
  UPI: 'bg-purple-100 text-purple-700',
  'Bank Transfer': 'bg-teal-100 text-teal-700',
};

const STATUS_COLORS: Record<string, string> = {
  'Not Collected': 'Not Collected',
  Received: 'Received',
  Credited: 'Credited',
  Cleared: 'Cleared',
  'Not Received': 'Not Received',
  Bounced: 'Bounced',
};

export const MyCollection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [bounceDialog, setBounceDialog] = useState(false);
  const [bounceTargetId, setBounceTargetId] = useState('');
  const [bounceReason, setBounceReason] = useState('');
  const [savingStatus, setSavingStatus] = useState('');
  const pageSize = 10;

  const fetchReceipts = async () => {
    if (!user) return;

    setLoading(true);
    setError('');
    const { data, error: fetchError } = await supabase
      .from('receipts')
      .select('id, receipt_number, amount, payment_mode, payment_status, bounce_reason, company, brand, on_account_of, received_date, created_at, customers(name), orders(order_number, invoice_number, grand_total, customers(name))')
      .or('payment_status.is.null,payment_status.neq.Voided')
      .eq('recorded_by', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setReceipts((data ?? []) as ReceiptRow[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    void fetchReceipts();
  }, [user]);

  const updateStatus = async (receiptId: string, status: string) => {
    if (status === 'Bounced') {
      setBounceTargetId(receiptId);
      setBounceReason('');
      setBounceDialog(true);
      return;
    }

    setSavingStatus(receiptId);
    const { error: updateError } = await supabase
      .from('receipts')
      .update({ payment_status: status, bounce_reason: null })
      .eq('id', receiptId)
      .eq('recorded_by', user?.id ?? '');

    if (updateError) {
      toast.error(updateError.message || 'Failed to update status');
    } else {
      toast.success('Status updated');
      await fetchReceipts();
    }

    setSavingStatus('');
  };

  const confirmBounce = async () => {
    if (!bounceReason.trim()) {
      toast.error('Please enter a reason');
      return;
    }

    setSavingStatus(bounceTargetId);
    const { error: updateError } = await supabase
      .from('receipts')
      .update({ payment_status: 'Bounced', bounce_reason: bounceReason.trim() })
      .eq('id', bounceTargetId)
      .eq('recorded_by', user?.id ?? '');

    if (updateError) {
      toast.error(updateError.message || 'Failed to update status');
    } else {
      toast.success('Marked as Bounced');
      await fetchReceipts();
      setBounceDialog(false);
    }

    setSavingStatus('');
  };

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
          <ErrorState message={`Failed to load receipts: ${error}`} onRetry={() => void fetchReceipts()} />
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
                  const statusOptions = RECEIPT_STATUS_OPTIONS_BY_MODE[r.payment_mode] ?? [];
                  const currentStatus = r.payment_status ?? DEFAULT_RECEIPT_STATUS;
                  return (
                    <StyledTr key={r.id}>
                      <StyledTd className="font-semibold text-primary">{r.receipt_number}</StyledTd>
                      <StyledTd className="font-medium text-foreground">{invoiceNo}</StyledTd>
                      <StyledTd className="text-muted-foreground">{r.orders?.customers?.name ?? r.customers?.name ?? '—'}</StyledTd>
                      <StyledTd center>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${MODE_COLORS[r.payment_mode] ?? 'bg-muted text-muted-foreground'}`}>
                          {r.payment_mode}
                        </span>
                      </StyledTd>
                      <StyledTd center>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <StatusBadge status={STATUS_COLORS[currentStatus] ?? currentStatus} />
                            {currentStatus === 'Bounced' && r.bounce_reason && (
                              <span title={r.bounce_reason} className="cursor-help">
                                <AlertCircle size={14} className="text-orange-500" />
                              </span>
                            )}
                          </div>
                          {statusOptions.length > 0 && (
                            <Select
                              value={currentStatus}
                              onValueChange={(v: string) => void updateStatus(r.id, v)}
                              disabled={savingStatus === r.id}
                            >
                              <SelectTrigger className="h-6 text-[10px] w-28 rounded-md border-gray-200">
                                <SelectValue placeholder="Update…" />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((statusOption: string) => (
                                  <SelectItem key={statusOption} value={statusOption} className="text-xs">{statusOption}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </StyledTd>
                      <StyledTd right mono className="font-bold">₹ {r.amount?.toLocaleString('en-IN')}</StyledTd>
                      <StyledTd mono className="text-xs text-muted-foreground">{new Date(r.received_date ?? r.created_at).toLocaleDateString()}</StyledTd>
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

      <Dialog open={bounceDialog} onOpenChange={setBounceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle size={18} /> Cheque Bounced - Enter Reason
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Reason for Bounce *</Label>
            <Textarea
              value={bounceReason}
              onChange={e => setBounceReason(e.target.value)}
              placeholder="e.g. Insufficient funds, Signature mismatch..."
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBounceDialog(false)}>Cancel</Button>
            <Button onClick={() => void confirmBounce()} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
              Confirm Bounce
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
