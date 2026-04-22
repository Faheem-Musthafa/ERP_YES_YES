import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { useNavigate } from 'react-router';
import { Plus, ClipboardCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { toast } from 'sonner';
import type { PaymentModeEnum } from '@/app/types/database';
import {
  PageHeader, SearchBar, FilterBar, FilterField, DataCard,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, StatusBadge, TablePagination, ErrorState,
} from '@/app/components/ui/primitives';
import { DEFAULT_RECEIPT_STATUS, RECEIPT_STATUS_OPTIONS_BY_MODE } from '@/app/utils';
import { LIMITS, sanitizeMultilineText, validateRequired } from '@/app/validation';

interface ReceiptRow {
  id: string;
  receipt_number: string;
  amount: number | null;
  payment_mode: PaymentModeEnum;
  payment_status: string | null;
  bounce_reason: string | null;
  received_date: string | null;
  created_at: string;
  customers: { name: string } | null;
  orders: {
    id: string;
    order_number: string;
    invoice_number: string | null;
    status: string;
    customers: { name: string } | null;
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  'Not Collected': 'Not Collected',
  Received: 'Received',
  Credited: 'Credited',
  Cleared: 'Cleared',
  'Not Received': 'Not Received',
  Bounced: 'Bounced',
};

const MODE_COLORS: Record<string, string> = {
  Cash: 'bg-emerald-100 text-emerald-700',
  Cheque: 'bg-blue-100 text-blue-700',
  UPI: 'bg-purple-100 text-purple-700',
  'Bank Transfer': 'bg-teal-100 text-teal-700',
};

export const CollectionStatus = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Bounce reason dialog state
  const [bounceDialog, setBounceDialog] = useState(false);
  const [bounceTargetId, setBounceTargetId] = useState('');
  const [bounceReason, setBounceReason] = useState('');
  const [savingStatus, setSavingStatus] = useState('');

  const fetchReceipts = async () => {
    setLoading(true);
    setError('');
    const { data, error: fetchError } = await supabase
      .from('receipts')
      .select('id, receipt_number, amount, payment_mode, payment_status, bounce_reason, company, brand, on_account_of, received_date, created_at, customers(name), orders(id, order_number, invoice_number, status, customers(name))')
      .or('payment_status.is.null,payment_status.neq.Voided')
      .order('created_at', { ascending: false });
    if (fetchError) setError(fetchError.message);
    else setReceipts((data ?? []) as ReceiptRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchReceipts(); }, []);

  const filtered = receipts.filter(r => {
    const invoiceNo = r.orders?.invoice_number ?? r.orders?.order_number ?? '';
    const currentStatus = r.payment_status ?? DEFAULT_RECEIPT_STATUS;
    const match = !search ||
      r.receipt_number.toLowerCase().includes(search.toLowerCase()) ||
      invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      (r.orders?.customers?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchMode = !modeFilter || modeFilter === 'all' || r.payment_mode === modeFilter;
    const matchStatus = !statusFilter || statusFilter === 'all' || currentStatus === statusFilter;
    return match && matchMode && matchStatus;
  });
  useEffect(() => { setCurrentPage(1); }, [search, modeFilter, statusFilter, receipts.length]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const updateStatus = async (receiptId: string, status: string) => {
    if (status === 'Bounced') {
      setBounceTargetId(receiptId);
      setBounceReason('');
      setBounceDialog(true);
      return;
    }
    setSavingStatus(receiptId);
    const { error } = await supabase.from('receipts').update({ payment_status: status, bounce_reason: null }).eq('id', receiptId);
    if (error) toast.error('Failed to update status');
    else { toast.success('Status updated'); fetchReceipts(); }
    setSavingStatus('');
  };

  const confirmBounce = async () => {
    let normalizedReason = '';
    try {
      normalizedReason = sanitizeMultilineText(bounceReason, LIMITS.reason);
      validateRequired(normalizedReason, 'Bounce reason');
    } catch (err: any) {
      toast.error(err?.message || 'Please enter a reason'); return;
    }
    setSavingStatus(bounceTargetId);
    const { error } = await supabase.from('receipts').update({ payment_status: 'Bounced', bounce_reason: normalizedReason }).eq('id', bounceTargetId);
    if (error) toast.error('Failed to update');
    else { toast.success('Marked as Bounced'); fetchReceipts(); }
    setBounceDialog(false);
    setSavingStatus('');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Collection Status"
        subtitle="Monitor all receipts and payment clearance"
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
          <FilterField label="Mode">
            <Select value={modeFilter} onValueChange={setModeFilter}>
              <SelectTrigger className="h-10 w-[150px]"><SelectValue placeholder="All Modes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Bank Transfer">Bank</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Payment Status">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-[170px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Not Collected">Not Collected</SelectItem>
                <SelectItem value="Received">Received</SelectItem>
                <SelectItem value="Not Received">Not Received</SelectItem>
                <SelectItem value="Cleared">Cleared</SelectItem>
                <SelectItem value="Bounced">Bounced</SelectItem>
                <SelectItem value="Credited">Credited</SelectItem>
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
            icon={ClipboardCheck}
            message="No collection records found"
            action={<Button onClick={() => navigate('/sales/receipt')} size="sm" variant="outline">Add Receipt</Button>}
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
                  <StyledTh center>Payment Status</StyledTh>
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
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${MODE_COLORS[r.payment_mode] ?? 'bg-gray-100 text-gray-700'}`}>
                          {r.payment_mode}
                        </span>
                      </StyledTd>
                      <StyledTd center>
                        <div className="flex flex-col items-center gap-1">
                          {currentStatus ? (
                            <div className="flex items-center gap-1.5">
                              <StatusBadge status={STATUS_COLORS[currentStatus] ?? currentStatus} />
                              {currentStatus === 'Bounced' && r.bounce_reason && (
                                <span title={r.bounce_reason} className="cursor-help">
                                  <AlertCircle size={14} className="text-orange-500" />
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Not set</span>
                          )}
                          {statusOptions.length > 0 && (
                            <Select
                              value={currentStatus}
                              onValueChange={(v: string) => updateStatus(r.id, v)}
                              disabled={savingStatus === r.id}
                            >
                              <SelectTrigger className="h-6 text-[10px] w-28 rounded-md border-gray-200">
                                <SelectValue placeholder="Update…" />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((s: string) => (
                                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
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

      {/* Bounce reason dialog */}
      <Dialog open={bounceDialog} onOpenChange={setBounceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle size={18} /> Cheque Bounced — Enter Reason
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Reason for Bounce *</Label>
            <Textarea
              value={bounceReason}
              onChange={e => setBounceReason(sanitizeMultilineText(e.target.value, LIMITS.reason))}
              placeholder="e.g. Insufficient funds, Signature mismatch..."
              rows={3}
              maxLength={LIMITS.reason}
              className="rounded-xl resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBounceDialog(false)}>Cancel</Button>
            <Button onClick={confirmBounce} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
              Confirm Bounce
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
