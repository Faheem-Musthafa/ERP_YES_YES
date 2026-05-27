/**
 * Customer data-access layer. See lib/api/orders.ts for rationale.
 */
import { supabase } from '@/app/supabase';
import { escapePostgrestLike } from '@/app/utils';

const CUSTOMER_LIST_COLUMNS =
  'id, name, place, address, phone, pincode, gst_pan, location, company, opening_invoice, opening_delivery_challan, opening_balance, is_active, created_at';

export interface CustomerListRow {
  id: string;
  name: string;
  place: string | null;
  address: string | null;
  phone: string | null;
  pincode: string | null;
  gst_pan: string | null;
  location: string | null;
  company: string | null;
  opening_invoice: number | null;
  opening_delivery_challan: number | null;
  opening_balance: number | null;
  is_active: boolean;
  created_at: string;
}

export interface CustomerListFilters {
  search?: string;             // matches name / phone / place
  company?: string;            // 'all' | 'unassigned' | specific
  activeOnly?: boolean;
}

export function customersQuery(filters: CustomerListFilters = {}) {
  let q = supabase
    .from('customers')
    .select(CUSTOMER_LIST_COLUMNS, { count: 'exact' })
    .order('name');
  if (filters.activeOnly) q = q.eq('is_active', true);
  if (filters.company === 'unassigned') q = q.is('company', null);
  else if (filters.company && filters.company !== 'all') q = q.eq('company', filters.company as never);
  if (filters.search) {
    const safe = escapePostgrestLike(filters.search);
    q = q.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%,place.ilike.%${safe}%`);
  }
  return q;
}

/** Single customer by id. Throws on RLS denial or not-found. */
export async function fetchCustomerById(id: string) {
  const { data, error } = await supabase
    .from('customers')
    .select(CUSTOMER_LIST_COLUMNS)
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data as CustomerListRow;
}
