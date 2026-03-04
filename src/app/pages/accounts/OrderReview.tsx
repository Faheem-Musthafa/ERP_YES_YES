import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { useNavigate } from 'react-router';
import { CheckCircle, XCircle, ArrowLeft, FileText, ChevronRight } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import {
  PageHeader, DataCard,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, StatusBadge,
} from '@/app/components/ui/primitives';

interface OrderItem {
  id: string; product_id: string; quantity: number; dealer_price: number;
  discount_pct: number; amount: number;
  approvedDP: number; approvedDiscount: number; approvedAmount: number;
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

  useEffect(() => { fetchPendingOrders(); }, []);

  const fetchPendingOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('id, order_number, status, company, invoice_type, grand_total, created_at, customers(name, phone, address, gst_pan)')
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
      })));
    }
  };

  const updateApprovedField = (id: string, field: 'approvedDP' | 'approvedDiscount' | 'approvedAmount', val: number) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      if (field === 'approvedDP' || field === 'approvedDiscount') {
        const dp = field === 'approvedDP' ? val : i.approvedDP;
        const disc = field === 'approvedDiscount' ? val : i.approvedDiscount;
        return { ...i, [field]: val, approvedAmount: parseFloat((dp * i.quantity * (1 - disc / 100)).toFixed(2)) };
      }
      return { ...i, [field]: val };
    }));
  };

  const approvedTotal = items.reduce((s, i) => s + i.approvedAmount, 0);
  const requestedTotal = items.reduce((s, i) => s + i.amount, 0);

  const handleApprove = async () => {
    if (!selectedOrder || !user) return;
    setSubmitting(true);
    try {
      for (const item of items) {
        await supabase.from('order_items').update({
          dealer_price: item.approvedDP, discount_pct: item.approvedDiscount, amount: item.approvedAmount,
        }).eq('id', item.id);
      }
      const { error } = await supabase.from('orders').update({
        status: 'Approved', approved_by: user.id,
        approved_at: new Date().toISOString(), grand_total: approvedTotal,
      }).eq('id', selectedOrder.id);
      if (error) throw error;
      toast.success(`Order ${selectedOrder.order_number} approved!`);
      setSelectedOrder(null); setItems([]); fetchPendingOrders();
    } catch (err: any) { toast.error(err.message || 'Failed to approve order'); }
    finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('orders').update({ status: 'Rejected' }).eq('id', selectedOrder.id);
      if (error) throw error;
      toast.success(`Order ${selectedOrder.order_number} rejected.`);
      setSelectedOrder(null); setItems([]); fetchPendingOrders();
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
            <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(null); setItems([]); }} className="gap-2">
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
                ['Company', selectedOrder.company],
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
                          type="number" value={i.approvedDP}
                          onChange={e => updateApprovedField(i.id, 'approvedDP', Number(e.target.value))}
                          className="w-24 text-right border border-border rounded-lg px-2 py-1 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                        />
                      </StyledTd>
                      <StyledTd right>
                        <input
                          type="number" min="0" max="100" value={i.approvedDiscount}
                          onChange={e => updateApprovedField(i.id, 'approvedDiscount', Number(e.target.value))}
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
                onClick={handleApprove}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                disabled={submitting}
              >
                <CheckCircle size={15} />
                {submitting ? 'Processing...' : 'Approve & Convert'}
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
      </div>
    );
  }

  // ── Pending orders queue ───────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <PageHeader
        title="Pending Order Reviews"
        subtitle="Select an order to review and approve pricing"
      />
      {loading ? <Spinner /> :
        pendingOrders.length === 0 ? (
          <DataCard>
            <EmptyState icon={FileText} message="No Pending Orders" sub="All orders have been reviewed" />
          </DataCard>
        ) : (
          <div className="space-y-3">
            {pendingOrders.map(order => (
              <div
                key={order.id}
                onClick={() => selectOrder(order)}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-primary font-mono text-sm">{order.order_number}</p>
                    <p className="text-sm text-foreground mt-0.5">
                      {order.customers?.name ?? 'Unknown'} · {order.company} · {order.invoice_type}
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
          </div>
        )
      }
    </div>
  );
};
