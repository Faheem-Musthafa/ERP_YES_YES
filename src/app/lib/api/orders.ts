/**
 * Orders data-access layer. Centralizes every supabase call that reads or
 * writes the `orders` table. Pages should import from here rather than
 * touching `supabase.from('orders')` directly so a column rename / RLS rule
 * change is a one-file edit.
 */
import { supabase } from '@/app/supabase';
import { escapePostgrestLike } from '@/app/utils';

const ORDER_LIST_COLUMNS =
  'id, order_number, invoice_number, status, company, invoice_type, grand_total, created_at, delivery_date, customer_id, customers(name)';

const ORDER_LIST_COLUMNS_WITH_APPROVED =
  'id, order_number, invoice_number, status, company, invoice_type, grand_total, approved_at, created_at, customer_id, customers(name)';

export interface OrderListRow {
  id: string;
  order_number: string;
  invoice_number: string | null;
  status: string;
  company: string | null;
  invoice_type: string | null;
  grand_total: number | null;
  created_at: string;
  delivery_date?: string | null;
  approved_at?: string | null;
  customer_id: string | null;
  customers: { name: string } | null;
}

export interface OrderListFilters {
  createdBy?: string;          // sales-rep scope
  status?: string | string[];
  search?: string;             // matches order_number / invoice_number
  dateFromUTC?: string | null; // ISO timestamptz
  dateToUTC?: string | null;
  /** Sort column. Defaults to created_at desc. */
  orderBy?: 'created_at' | 'approved_at';
}

/** Returns a builder pre-loaded with shared filters. Callers add `.range()` or
 *  await directly. */
export function ordersQuery(filters: OrderListFilters = {}) {
  const cols = filters.orderBy === 'approved_at'
    ? ORDER_LIST_COLUMNS_WITH_APPROVED
    : ORDER_LIST_COLUMNS;
  let q = supabase
    .from('orders')
    .select(cols, { count: 'exact' })
    .order(filters.orderBy ?? 'created_at', { ascending: false, nullsFirst: false });
  if (filters.createdBy) q = q.eq('created_by', filters.createdBy);
  if (filters.status) {
    if (Array.isArray(filters.status)) q = q.in('status', filters.status as never);
    else q = q.eq('status', filters.status as never);
  }
  if (filters.dateFromUTC) q = q.gte(filters.orderBy ?? 'created_at', filters.dateFromUTC);
  if (filters.dateToUTC) q = q.lt(filters.orderBy ?? 'created_at', filters.dateToUTC);
  if (filters.search) {
    const safe = escapePostgrestLike(filters.search);
    q = q.or(`order_number.ilike.%${safe}%,invoice_number.ilike.%${safe}%`);
  }
  return q;
}
