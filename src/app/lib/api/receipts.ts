/**
 * Receipt data-access layer. See lib/api/orders.ts for rationale.
 */
import { supabase } from '@/app/supabase';
import { escapePostgrestLike } from '@/app/utils';

const RECEIPT_LIST_COLUMNS =
  'id, receipt_number, amount, payment_mode, payment_status, bounce_reason, company, brand, on_account_of, received_date, created_at, customer_id, customers(name), orders(id, customer_id, order_number, invoice_number, status, grand_total, customers(name))';

export interface ReceiptListRow {
  id: string;
  receipt_number: string;
  amount: number | null;
  payment_mode: string;
  payment_status: string | null;
  bounce_reason: string | null;
  company: string | null;
  brand: string | null;
  on_account_of: string | null;
  received_date: string | null;
  created_at: string;
  customer_id: string | null;
  customers: { name: string } | null;
  orders: {
    id: string;
    customer_id: string | null;
    order_number: string | null;
    invoice_number: string | null;
    status: string | null;
    grand_total: number | null;
    customers: { name: string } | null;
  } | null;
}

export interface ReceiptListFilters {
  recordedBy?: string;
  search?: string;             // matches receipt_number / order_number
  mode?: string;               // 'all' or PaymentModeEnum
  status?: string;             // 'all' or status string
  excludeVoided?: boolean;     // default true
}

export function receiptsQuery(filters: ReceiptListFilters = {}) {
  let q = supabase
    .from('receipts')
    .select(RECEIPT_LIST_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false });
  if (filters.excludeVoided !== false) {
    q = q.or('payment_status.is.null,payment_status.neq.Voided');
  }
  if (filters.recordedBy) q = q.eq('recorded_by', filters.recordedBy);
  if (filters.mode && filters.mode !== 'all') q = q.eq('payment_mode', filters.mode as never);
  if (filters.status && filters.status !== 'all') q = q.eq('payment_status', filters.status);
  if (filters.search) {
    const safe = escapePostgrestLike(filters.search);
    q = q.or(`receipt_number.ilike.%${safe}%`);
  }
  return q;
}

/**
 * Update receipt status with RLS-safe `.select('id')` so callers detect silent
 * 0-row no-ops (RLS denied, stale id, concurrent update).
 */
export async function updateReceiptStatus(params: {
  receiptId: string;
  status: string;
  bounceReason?: string | null;
  recordedBy?: string;
}) {
  let q = supabase
    .from('receipts')
    .update({ payment_status: params.status, bounce_reason: params.bounceReason ?? null })
    .eq('id', params.receiptId);
  if (params.recordedBy) q = q.eq('recorded_by', params.recordedBy);
  const { data, error } = await q.select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error('Receipt not updated — it may have been changed by another user or RLS denied the write');
  }
  return data[0];
}
