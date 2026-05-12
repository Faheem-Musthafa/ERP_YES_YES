import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { PackageOpen, ArrowRight, AlertCircle, CheckCircle, ChevronRight, Filter } from 'lucide-react';
import {
  PageHeader, SearchBar, DataCard,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, StatusBadge,
} from '@/app/components/ui/primitives';
import { CustomerNameLink } from '@/app/components/CustomerNameLink';
import type { BackOrderStatusEnum, Json } from '@/app/types/database';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';

interface BackOrderRow {
  id: string;
  order_id: string;
  product_id: string;
  pending_qty: number;
  dealer_price: number;
  discount_pct: number;
  status: BackOrderStatusEnum;
  created_at: string;
  released_order_id: string | null;
  released_at: string | null;
  products: { name: string; sku: string } | null;
  orders: {
    order_number: string;
    company: string | null;
    invoice_type: string | null;
    customer_id: string | null;
    customers: { name: string } | null;
  } | null;
}

interface OrderGroup {
  orderId: string;
  orderNumber: string;
  company: string | null;
  invoiceType: string | null;
  customerId: string | null;
  customerName: string;
  rows: BackOrderRow[];
}

const formatCurrency = (n: number) => `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const BackOrders = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<BackOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BackOrderStatusEnum | 'all'>('Pending');

  const [modalOrderId, setModalOrderId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, { checked: boolean; qty: number }>>({});
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('back_orders')
      .select(`
        id, order_id, product_id, pending_qty, dealer_price, discount_pct, status, created_at, released_order_id, released_at,
        products(name, sku),
        orders:orders!back_orders_order_id_fkey(order_number, company, invoice_type, customer_id, customers(name))
      `)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error(error.message || 'Failed to load back-orders');
    } else {
      setRows((data ?? []) as unknown as BackOrderRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { void fetchRows(); }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!s) return true;
      const hay = [
        r.orders?.order_number,
        r.orders?.customers?.name,
        r.products?.name,
        r.products?.sku,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(s);
    });
  }, [rows, search, statusFilter]);

  const groups = useMemo<OrderGroup[]>(() => {
    const map = new Map<string, OrderGroup>();
    for (const r of filtered) {
      if (!map.has(r.order_id)) {
        map.set(r.order_id, {
          orderId: r.order_id,
          orderNumber: r.orders?.order_number ?? '—',
          company: r.orders?.company ?? null,
          invoiceType: r.orders?.invoice_type ?? null,
          customerId: r.orders?.customer_id ?? null,
          customerName: r.orders?.customers?.name ?? 'Unknown',
          rows: [],
        });
      }
      map.get(r.order_id)!.rows.push(r);
    }
    return [...map.values()];
  }, [filtered]);

  const openModal = (orderId: string) => {
    const group = groups.find((g) => g.orderId === orderId);
    if (!group) return;
    const initial: Record<string, { checked: boolean; qty: number }> = {};
    for (const r of group.rows) {
      if (r.status === 'Pending') {
        initial[r.id] = { checked: true, qty: r.pending_qty };
      }
    }
    setSelected(initial);
    setRemarks('');
    setModalOrderId(orderId);
  };

  const closeModal = () => {
    setModalOrderId(null);
    setSelected({});
    setRemarks('');
  };

  const modalGroup = groups.find((g) => g.orderId === modalOrderId) ?? null;
  const modalPendingRows = modalGroup?.rows.filter((r) => r.status === 'Pending') ?? [];

  const totalSelectedQty = modalPendingRows.reduce((s, r) => {
    const sel = selected[r.id];
    if (!sel?.checked) return s;
    return s + (sel.qty || 0);
  }, 0);
  const totalSelectedAmount = modalPendingRows.reduce((s, r) => {
    const sel = selected[r.id];
    if (!sel?.checked) return s;
    const qty = sel.qty || 0;
    const lineAmt = qty * r.dealer_price * (1 - (r.discount_pct || 0) / 100);
    return s + lineAmt;
  }, 0);

  const handleSubmit = async () => {
    if (!user || !modalGroup) return;

    const items: Array<{ back_order_id: string; qty: number }> = [];
    const ids: string[] = [];
    for (const r of modalPendingRows) {
      const sel = selected[r.id];
      if (!sel?.checked) continue;
      const qty = Math.floor(sel.qty || 0);
      if (qty <= 0) {
        toast.error(`Set a positive release qty for ${r.products?.name ?? 'product'}`);
        return;
      }
      if (qty > r.pending_qty) {
        toast.error(`${r.products?.name ?? 'Product'} release qty (${qty}) exceeds pending ${r.pending_qty}`);
        return;
      }
      ids.push(r.id);
      items.push({ back_order_id: r.id, qty });
    }
    if (ids.length === 0) {
      toast.error('Select at least one back-order line to release');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('release_back_orders', {
        p_back_order_ids: ids,
        p_released_by: user.id,
        p_items: items as unknown as Json,
        p_remarks: remarks || null,
      });
      if (error) throw error;
      const result = data as { new_order_id?: string } | null;
      toast.success(`Released. New order created${result?.new_order_id ? ` (id: ${result.new_order_id.slice(0, 8)}…)` : ''}.`);
      closeModal();
      await fetchRows();
    } catch (err: any) {
      toast.error(err.message || 'Failed to release back-orders');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Back-Orders"
        subtitle={`${rows.filter((r) => r.status === 'Pending').length} pending lines awaiting release`}
      />

      <div className="flex flex-col md:flex-row gap-3">
        <SearchBar
          placeholder="Search by order, customer, product…"
          value={search}
          onChange={setSearch}
          className="flex-1 max-w-md"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BackOrderStatusEnum | 'all')}>
          <SelectTrigger className="h-10 w-44 rounded-xl"><Filter size={14} className="mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Released">Released</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Spinner />
      ) : groups.length === 0 ? (
        <DataCard>
          <EmptyState icon={PackageOpen} message="No back-orders" sub="Partial-approval shortfalls and short fulfillments land here" />
        </DataCard>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const pendingTotal = g.rows.filter((r) => r.status === 'Pending').reduce((s, r) => s + r.pending_qty, 0);
            const pendingAmount = g.rows.filter((r) => r.status === 'Pending').reduce((s, r) => s + r.pending_qty * r.dealer_price * (1 - (r.discount_pct || 0) / 100), 0);
            const hasPending = pendingTotal > 0;
            return (
              <DataCard key={g.orderId} className="p-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-border/60 bg-muted/30 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-primary text-sm">{g.orderNumber}</p>
                    <p className="text-sm text-foreground mt-0.5 truncate">
                      <CustomerNameLink customerId={g.customerId}>{g.customerName}</CustomerNameLink>
                      <span className="text-muted-foreground"> · {g.invoiceType ?? '—'}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {hasPending && (
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending value</p>
                        <p className="font-mono font-bold text-amber-700 dark:text-amber-400">{formatCurrency(pendingAmount)}</p>
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 disabled:opacity-50"
                      disabled={!hasPending}
                      onClick={() => openModal(g.orderId)}
                    >
                      <CheckCircle size={14} /> Approve &amp; Return
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <StyledThead>
                      <tr>
                        <StyledTh>Product</StyledTh>
                        <StyledTh right>Pending Qty</StyledTh>
                        <StyledTh right>DP</StyledTh>
                        <StyledTh right>Disc%</StyledTh>
                        <StyledTh right>Line Value</StyledTh>
                        <StyledTh>Status</StyledTh>
                        <StyledTh>Created</StyledTh>
                      </tr>
                    </StyledThead>
                    <tbody>
                      {g.rows.map((r) => (
                        <StyledTr key={r.id}>
                          <StyledTd>
                            <div className="font-medium">{r.products?.name ?? '—'}</div>
                            {r.products?.sku && <div className="text-xs text-muted-foreground font-mono mt-0.5">{r.products.sku}</div>}
                          </StyledTd>
                          <StyledTd right mono className="font-semibold">{r.pending_qty}</StyledTd>
                          <StyledTd right mono className="text-muted-foreground">{formatCurrency(r.dealer_price)}</StyledTd>
                          <StyledTd right mono className="text-muted-foreground">{r.discount_pct}%</StyledTd>
                          <StyledTd right mono className="font-semibold">{formatCurrency(r.pending_qty * r.dealer_price * (1 - (r.discount_pct || 0) / 100))}</StyledTd>
                          <StyledTd><StatusBadge status={r.status} /></StyledTd>
                          <StyledTd mono className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('en-IN')}</StyledTd>
                        </StyledTr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DataCard>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(modalOrderId)} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageOpen size={18} className="text-amber-600" />
              Approve &amp; Return — {modalGroup?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              Pick which back-ordered products to push back into billing and the quantity to release for each. Selected lines move into a fresh Pending order.
            </DialogDescription>
          </DialogHeader>

          {modalGroup && (
            <>
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold w-10"></th>
                      <th className="text-left px-3 py-2 font-semibold">Product</th>
                      <th className="text-right px-3 py-2 font-semibold">Pending</th>
                      <th className="text-right px-3 py-2 font-semibold">Release Qty</th>
                      <th className="text-right px-3 py-2 font-semibold">Line Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {modalPendingRows.map((r) => {
                      const sel = selected[r.id] ?? { checked: false, qty: r.pending_qty };
                      const lineAmt = (sel.qty || 0) * r.dealer_price * (1 - (r.discount_pct || 0) / 100);
                      return (
                        <tr key={r.id} className={sel.checked ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={sel.checked}
                              onChange={(e) => setSelected((prev) => ({ ...prev, [r.id]: { checked: e.target.checked, qty: prev[r.id]?.qty ?? r.pending_qty } }))}
                              className="h-4 w-4 accent-emerald-600"
                            />
                          </td>
                          <td className="px-3 py-2 font-medium">{r.products?.name ?? '—'}</td>
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground">{r.pending_qty}</td>
                          <td className="px-3 py-2 text-right">
                            <Input
                              type="number"
                              min={1}
                              max={r.pending_qty}
                              value={sel.qty}
                              disabled={!sel.checked}
                              onChange={(e) => setSelected((prev) => ({ ...prev, [r.id]: { checked: prev[r.id]?.checked ?? true, qty: Math.max(0, Math.min(r.pending_qty, Math.floor(Number(e.target.value) || 0))) } }))}
                              className="h-9 w-24 ml-auto rounded-lg font-mono text-right"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{sel.checked ? formatCurrency(lineAmt) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/20">
                      <td colSpan={3} className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wide text-muted-foreground">Total</td>
                      <td className="px-3 py-2 text-right font-bold font-mono">{totalSelectedQty}</td>
                      <td className="px-3 py-2 text-right font-bold font-mono text-emerald-700 dark:text-emerald-400">{formatCurrency(totalSelectedAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Remarks (optional)</Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Stock arrived for back-ordered items"
                  rows={2}
                  maxLength={500}
                  className="rounded-xl resize-none"
                />
              </div>

              <div className="rounded-lg border border-blue-200/70 bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2 text-xs font-medium text-blue-700 dark:text-blue-400 flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                A new Pending order will be created with the selected products and quantities. Source back-orders reduce by the released quantity; lines reaching zero are marked Released.
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={submitting}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={handleSubmit}
              disabled={submitting || totalSelectedQty === 0}
            >
              <ArrowRight size={14} />
              {submitting ? 'Releasing…' : 'Release to Rebilling'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
