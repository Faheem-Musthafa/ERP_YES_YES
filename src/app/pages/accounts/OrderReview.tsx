import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { useNavigate } from 'react-router';
import { CheckCircle, XCircle, ArrowLeft, FileText, ChevronRight, Download, PackageOpen } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/app/types/database';
import { downloadCSV } from '@/app/utils';
import { cloneCompanyProfiles, getCompanyDisplayName, loadCompanyProfiles } from '@/app/companyProfiles';
import {
  PageHeader, DataCard,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, StatusBadge, TablePagination,
} from '@/app/components/ui/primitives';
import { CustomerNameLink } from '@/app/components/CustomerNameLink';
import { sanitizeNonNegativeDecimal } from '@/app/validation';
import { DEFAULT_ORDER_FORM_SETTINGS, loadOrderFormSettings } from '@/app/settings';
import { computeLineAmount, toNumber } from '@/app/money';

interface OrderItem {
  id: string; product_id: string; quantity: number; dealer_price: number;
  discount_pct: number; amount: number;
  approvedDP: number; approvedDiscount: number; approvedAmount: number;
  approvedQty: number;
  productName?: string;
}

export const OrderReview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [companyProfiles, setCompanyProfiles] = useState(cloneCompanyProfiles());
  const [maxDiscountPercentage, setMaxDiscountPercentage] = useState(DEFAULT_ORDER_FORM_SETTINGS.maxDiscountPercentage);
  const [backOrderModalOpen, setBackOrderModalOpen] = useState(false);
  const pageSize = 8;

  useEffect(() => { fetchPendingOrders(); }, []);

  useEffect(() => {
    void loadCompanyProfiles()
      .then(setCompanyProfiles)
      .catch(() => undefined);
    // Accounts-side approval must obey the same discount cap as Sales.
    void loadOrderFormSettings()
      .then((s) => setMaxDiscountPercentage(s.maxDiscountPercentage))
      .catch(() => undefined);
  }, []);

  const fetchPendingOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('id, order_number, status, company, invoice_type, grand_total, created_at, customer_id, customers(name, phone, address, gst_pan)')
      .eq('status', 'Pending')
      .order('created_at', { ascending: true });
    setPendingOrders(data ?? []);
    setLoading(false);
  };

  const selectOrder = async (order: any) => {
    setSelectedOrder(order);
    const { data } = await supabase
      .from('order_items')
      .select('id, product_id, quantity, dealer_price, discount_pct, amount, products(name)')
      .eq('order_id', order.id);
    if (data) {
      setItems(data.map((i: any) => ({
        ...i, productName: i.products?.name,
        approvedDP: i.dealer_price, approvedDiscount: i.discount_pct, approvedAmount: i.amount,
        approvedQty: i.quantity,
      })));
    }
  };

  const updateApprovedField = (id: string, field: 'approvedDP' | 'approvedDiscount' | 'approvedAmount', val: number) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      if (field === 'approvedDP' || field === 'approvedDiscount') {
        const nextValue = field === 'approvedDP'
          ? Math.max(0, val)
          : Math.max(0, Math.min(maxDiscountPercentage, val));
        const dp = field === 'approvedDP' ? nextValue : i.approvedDP;
        const disc = field === 'approvedDiscount' ? nextValue : i.approvedDiscount;
        return { ...i, [field]: nextValue, approvedAmount: toNumber(computeLineAmount(dp, i.quantity, disc)) };
      }
      return { ...i, [field]: Math.max(0, val) };
    }));
  };

  const approvedTotal = items.reduce((s, i) => s + i.approvedAmount, 0);
  const requestedTotal = items.reduce((s, i) => s + i.amount, 0);
  useEffect(() => { setCurrentPage(1); }, [pendingOrders.length]);
  const page = Math.min(currentPage, Math.max(1, Math.ceil(pendingOrders.length / pageSize)));
  const paginatedOrders = pendingOrders.slice((page - 1) * pageSize, page * pageSize);
  const exportPendingOrders = () => {
    downloadCSV(
      ['Order No', 'Customer', 'Phone', 'Company', 'Invoice Type', 'Grand Total', 'Created Date', 'Status'],
      pendingOrders.map((order) => [
        order.order_number,
        order.customers?.name ?? '—',
        order.customers?.phone ?? '—',
        getCompanyDisplayName(order.company, companyProfiles),
        order.invoice_type ?? '—',
        order.grand_total ?? 0,
        order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : '—',
        order.status ?? 'Pending',
      ]),
      `pending-order-reviews-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };
  const resetReviewContext = async () => {
    setSelectedOrder(null);
    setItems([]);
    await fetchPendingOrders();
    navigate('/accounts/pending-orders', { replace: true });
  };

  // Normalize approvedDP/Discount/Amount whenever a new order is selected.
  // Was previously useEffect([]) which only ran with empty items at mount.
  useEffect(() => {
    if (items.length === 0) return;
    setItems((prev) => prev.map((item) => {
      const approvedDP = Math.max(0, item.approvedDP);
      const approvedDiscount = Math.max(0, Math.min(maxDiscountPercentage, item.approvedDiscount));
      const approvedAmount = toNumber(computeLineAmount(approvedDP, item.quantity, approvedDiscount));
      if (approvedDP === item.approvedDP && approvedDiscount === item.approvedDiscount && approvedAmount === item.approvedAmount) {
        return item;
      }
      return { ...item, approvedDP, approvedDiscount, approvedAmount };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder?.id, maxDiscountPercentage]);

  const updateApprovedQty = (id: string, val: number) => {
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      const clamped = Math.max(0, Math.min(i.quantity, Math.floor(val)));
      const amount = toNumber(computeLineAmount(i.approvedDP, clamped, i.approvedDiscount));
      return { ...i, approvedQty: clamped, approvedAmount: amount };
    }));
  };

  const openApproveAndReturn = () => {
    if (!selectedOrder || !user) return;
    const invalidItem = items.find((item) =>
      !Number.isFinite(item.approvedDP)
      || item.approvedDP < 0
      || !Number.isFinite(item.approvedDiscount)
      || item.approvedDiscount < 0
      || item.approvedDiscount > 100
      || !Number.isFinite(item.approvedAmount)
      || item.approvedAmount < 0,
    );
    if (invalidItem) {
      toast.error('Approved pricing contains invalid values');
      return;
    }
    setBackOrderModalOpen(true);
  };

  const confirmApproveWithBackorders = async () => {
    if (!selectedOrder || !user) return;

    const totalApprovedQty = items.reduce((s, i) => s + i.approvedQty, 0);
    if (totalApprovedQty === 0) {
      toast.error('At least one product must keep some quantity for billing');
      return;
    }

    setSubmitting(true);
    try {
      const payload = items.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        approved_qty: item.approvedQty,
        dealer_price: item.approvedDP,
        discount_pct: item.approvedDiscount,
      }));

      const { data, error } = await supabase.rpc('approve_order_with_backorders', {
        p_order_id: selectedOrder.id,
        p_approved_by: user.id,
        p_items: payload as unknown as Json,
      });
      if (error) throw error;

      const result = data as { back_orders?: Array<{ qty: number }> } | null;
      const backOrderCount = result?.back_orders?.length ?? 0;
      const backOrderQty = result?.back_orders?.reduce((s, b) => s + (b.qty ?? 0), 0) ?? 0;
      if (backOrderCount > 0) {
        toast.success(`Order ${selectedOrder.order_number} approved. ${backOrderCount} back-order line${backOrderCount === 1 ? '' : 's'} created (${backOrderQty} units pending).`);
      } else {
        toast.success(`Order ${selectedOrder.order_number} approved in full.`);
      }
      setBackOrderModalOpen(false);
      await resetReviewContext();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOrder || !user) return;
    setSubmitting(true);
    try {
      const { data: ok, error } = await supabase.rpc('reject_order', {
        p_order_id: selectedOrder.id,
        p_rejected_by: user.id,
        p_reason: null,
      });
      if (error) {
        const rpcMissing = error.code === 'PGRST202' || error.message?.toLowerCase().includes('could not find the function');
        if (!rpcMissing) throw error;

        // Backward-compatible fallback if reject_order RPC is not deployed.
        const { error: orderErr } = await supabase
          .from('orders')
          .update({ status: 'Rejected' })
          .eq('id', selectedOrder.id);
        if (orderErr) throw orderErr;
      } else if (!ok) {
        throw new Error('Order could not be rejected');
      }
      toast.success(`Order ${selectedOrder.order_number} rejected.`);
      await resetReviewContext();
    } catch (err: any) { toast.error(err.message || 'Failed to reject order'); }
    finally { setSubmitting(false); }
  };

  // ── Order detail view ──────────────────────────────────────────────────────
  if (selectedOrder) {
    return (
      <div className="space-y-5">
        <PageHeader
          title={`Reviewing: ${selectedOrder.order_number}`}
          subtitle="Adjust pricing below and approve or reject"
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedOrder(null); setItems([]); }}
              className="gap-2"
              disabled={submitting}
            >
              <ArrowLeft size={15} /> Back to Queue
            </Button>
          }
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Order details */}
          <DataCard className="p-5">
            <h2 className="text-sm font-bold text-primary mb-4 uppercase tracking-wide">Order Details</h2>
            <dl className="space-y-2 text-sm mb-5">
              {[
                ['Order No', selectedOrder.order_number],
                ['Company', getCompanyDisplayName(selectedOrder.company, companyProfiles)],
                ['Invoice Type', selectedOrder.invoice_type],
                ['Customer', selectedOrder.customers?.name ?? '—'],
                ['Phone', selectedOrder.customers?.phone ?? '—'],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-foreground">{val}</dd>
                </div>
              ))}
            </dl>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <StyledThead>
                  <tr>
                    <StyledTh>Product</StyledTh>
                    <StyledTh right>Qty</StyledTh>
                    <StyledTh right>DP</StyledTh>
                    <StyledTh right>Disc%</StyledTh>
                    <StyledTh right>Amount</StyledTh>
                  </tr>
                </StyledThead>
                <tbody>
                  {items.map(i => (
                    <StyledTr key={i.id}>
                      <StyledTd>{i.productName}</StyledTd>
                      <StyledTd right mono>{i.quantity}</StyledTd>
                      <StyledTd right mono>₹{i.dealer_price.toLocaleString('en-IN')}</StyledTd>
                      <StyledTd right mono>{i.discount_pct}%</StyledTd>
                      <StyledTd right mono className="font-semibold">₹{i.amount.toLocaleString('en-IN')}</StyledTd>
                    </StyledTr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border">
                    <td colSpan={4} className="px-4 py-2.5 text-right text-xs font-bold text-muted-foreground uppercase tracking-wide">Requested Total</td>
                    <td className="px-4 py-2.5 text-right font-bold font-mono text-foreground">₹{requestedTotal.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </DataCard>

          {/* Pricing approval */}
          <DataCard className="p-5">
            <h2 className="text-sm font-bold text-primary mb-4 uppercase tracking-wide">Pricing Approval</h2>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <StyledThead>
                  <tr>
                    <StyledTh>Product</StyledTh>
                    <StyledTh right>Appr. DP</StyledTh>
                    <StyledTh right>Disc%</StyledTh>
                    <StyledTh right>Amount</StyledTh>
                  </tr>
                </StyledThead>
                <tbody>
                  {items.map(i => (
                    <StyledTr key={i.id}>
                      <StyledTd className="text-xs">{i.productName}</StyledTd>
                      <StyledTd right>
                        <input
                          type="number" min="0" value={i.approvedDP}
                          onChange={e => updateApprovedField(i.id, 'approvedDP', Number(sanitizeNonNegativeDecimal(e.target.value)) || 0)}
                          className="w-24 text-right border border-border rounded-lg px-2 py-1 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                        />
                      </StyledTd>
                      <StyledTd right>
                        <input
                          type="number" min="0" max={maxDiscountPercentage} value={i.approvedDiscount}
                          onChange={e => updateApprovedField(i.id, 'approvedDiscount', Number(sanitizeNonNegativeDecimal(e.target.value, 6)) || 0)}
                          className="w-16 text-right border border-border rounded-lg px-2 py-1 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                        />
                      </StyledTd>
                      <StyledTd right mono className="font-semibold text-emerald-600">
                        ₹{i.approvedAmount.toLocaleString('en-IN')}
                      </StyledTd>
                    </StyledTr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border">
                    <td colSpan={3} className="px-4 py-2.5 text-right text-xs font-bold text-muted-foreground uppercase tracking-wide">Approved Total</td>
                    <td className="px-4 py-2.5 text-right font-bold font-mono text-emerald-600">
                      ₹{approvedTotal.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex gap-3 pt-2 border-t border-border">
              <Button
                onClick={openApproveAndReturn}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                disabled={submitting}
              >
                <CheckCircle size={15} />
                {submitting ? 'Processing...' : 'Approve & Return'}
              </Button>
              <Button
                onClick={handleReject}
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 gap-2"
                disabled={submitting}
              >
                <XCircle size={15} />Reject
              </Button>
            </div>
          </DataCard>
        </div>

        <Dialog open={backOrderModalOpen} onOpenChange={setBackOrderModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PackageOpen size={18} className="text-amber-600" />
                Back-Order Confirmation
              </DialogTitle>
              <DialogDescription>
                Set how many units of each product to bill now. Anything short of the ordered quantity moves to the back-order queue for later release.
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Product</th>
                    <th className="text-right px-3 py-2 font-semibold">Ordered</th>
                    <th className="text-right px-3 py-2 font-semibold">Bill Now</th>
                    <th className="text-right px-3 py-2 font-semibold">Back-Order</th>
                    <th className="text-right px-3 py-2 font-semibold">Bill Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {items.map((i) => {
                    const back = i.quantity - i.approvedQty;
                    return (
                      <tr key={i.id} className={back > 0 ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}>
                        <td className="px-3 py-2 font-medium">{i.productName}</td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">{i.quantity}</td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            type="number"
                            min={0}
                            max={i.quantity}
                            value={i.approvedQty}
                            onChange={(e) => updateApprovedQty(i.id, Number(e.target.value) || 0)}
                            className="h-9 w-24 ml-auto rounded-lg font-mono text-right"
                          />
                        </td>
                        <td className={`px-3 py-2 text-right font-mono font-semibold ${back > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>
                          {back > 0 ? back : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">₹{i.approvedAmount.toLocaleString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/20">
                    <td colSpan={4} className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wide text-muted-foreground">Bill Total</td>
                    <td className="px-3 py-2 text-right font-bold font-mono text-emerald-700 dark:text-emerald-400">₹{items.reduce((s, i) => s + i.approvedAmount, 0).toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {(() => {
              const totalBackQty = items.reduce((s, i) => s + (i.quantity - i.approvedQty), 0);
              if (totalBackQty === 0) {
                return (
                  <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle size={14} /> No back-orders. Order will be approved in full.
                  </div>
                );
              }
              return (
                <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-400 flex items-center gap-2">
                  <PackageOpen size={14} /> {totalBackQty} unit{totalBackQty === 1 ? '' : 's'} will be moved to the back-order queue and remain available for later release.
                </div>
              );
            })()}

            <DialogFooter>
              <Button variant="outline" onClick={() => setBackOrderModalOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                onClick={confirmApproveWithBackorders}
                disabled={submitting}
              >
                <CheckCircle size={15} />
                {submitting ? 'Processing…' : 'Confirm Approval'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Pending orders queue ───────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <PageHeader
        title="Pending Order Reviews"
        subtitle="Select an order to review and approve pricing"
        actions={
          <Button size="sm" variant="outline" onClick={exportPendingOrders} className="gap-2">
            <Download size={15} />
            Export Orders
          </Button>
        }
      />
      {loading ? <Spinner /> :
        pendingOrders.length === 0 ? (
          <DataCard>
            <EmptyState icon={FileText} message="No Pending Orders" sub="All orders have been reviewed" />
          </DataCard>
        ) : (
          <div className="space-y-3">
            {paginatedOrders.map(order => (
              <div
                key={order.id}
                onClick={() => selectOrder(order)}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-primary font-mono text-sm">{order.order_number}</p>
                    <p className="text-sm text-foreground mt-0.5">
                      {order.customers?.name
                        ? <CustomerNameLink customerId={order.customer_id}>{order.customers.name}</CustomerNameLink>
                        : 'Unknown'} · {getCompanyDisplayName(order.company, companyProfiles)} · {order.invoice_type}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold font-mono text-foreground">₹{order.grand_total?.toLocaleString('en-IN')}</p>
                      <StatusBadge status="Pending" className="mt-1" />
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            ))}
            <TablePagination
              totalItems={pendingOrders.length}
              currentPage={page}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="orders"
            />
          </div>
        )
      }
    </div>
  );
};
