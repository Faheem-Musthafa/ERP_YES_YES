import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { useNavigate } from 'react-router';
import { CheckCircle, XCircle, ArrowLeft, FileText } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  dealer_price: number;
  discount_pct: number;
  amount: number;
  approvedDP: number;
  approvedDiscount: number;
  approvedAmount: number;
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

  useEffect(() => {
    fetchPendingOrders();
  }, []);

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
        ...i,
        productName: i.products?.name,
        approvedDP: i.dealer_price,
        approvedDiscount: i.discount_pct,
        approvedAmount: i.amount,
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
      // Update each order item's approved pricing (using dealer_price as approved)
      for (const item of items) {
        await supabase.from('order_items').update({
          dealer_price: item.approvedDP,
          discount_pct: item.approvedDiscount,
          amount: item.approvedAmount,
        }).eq('id', item.id);
      }
      // Update order status
      const { error } = await supabase.from('orders').update({
        status: 'Approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        grand_total: approvedTotal,
      }).eq('id', selectedOrder.id);
      if (error) throw error;
      toast.success(`Order ${selectedOrder.order_number} approved!`);
      setSelectedOrder(null);
      setItems([]);
      fetchPendingOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('orders').update({ status: 'Rejected' }).eq('id', selectedOrder.id);
      if (error) throw error;
      toast.success(`Order ${selectedOrder.order_number} rejected.`);
      setSelectedOrder(null);
      setItems([]);
      fetchPendingOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject order');
    } finally {
      setSubmitting(false);
    }
  };

  if (selectedOrder) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" className="mb-4" onClick={() => { setSelectedOrder(null); setItems([]); }}>
            <ArrowLeft size={18} className="mr-2" />Back to Pending Orders
          </Button>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 text-[#1e3a8a]">Order Details</h2>
              <div className="space-y-2 text-sm text-gray-700 mb-6">
                <div className="flex justify-between"><span className="text-gray-500">Order No:</span><span className="font-semibold">{selectedOrder.order_number}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Company:</span><span>{selectedOrder.company}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Invoice Type:</span><span>{selectedOrder.invoice_type}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Customer:</span><span>{selectedOrder.customers?.name ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Phone:</span><span>{selectedOrder.customers?.phone ?? '-'}</span></div>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-2">Product</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-right p-2">DP</th>
                    <th className="text-right p-2">Disc%</th>
                    <th className="text-right p-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(i => (
                    <tr key={i.id} className="border-b">
                      <td className="p-2">{i.productName}</td>
                      <td className="p-2 text-right">{i.quantity}</td>
                      <td className="p-2 text-right">₹{i.dealer_price.toLocaleString('en-IN')}</td>
                      <td className="p-2 text-right">{i.discount_pct}%</td>
                      <td className="p-2 text-right font-medium">₹{i.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold border-t">
                    <td colSpan={4} className="p-2 text-right">Requested Total:</td>
                    <td className="p-2 text-right">₹{requestedTotal.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              </table>
            </Card>
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 text-[#1e3a8a]">Pricing Approval</h2>
              <table className="w-full text-sm mb-4">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-2">Product</th>
                    <th className="text-right p-2">Appr. DP</th>
                    <th className="text-right p-2">Appr. Disc%</th>
                    <th className="text-right p-2">Appr. Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(i => (
                    <tr key={i.id} className="border-b">
                      <td className="p-2 text-xs">{i.productName}</td>
                      <td className="p-2">
                        <input type="number" value={i.approvedDP} onChange={e => updateApprovedField(i.id, 'approvedDP', Number(e.target.value))} className="w-24 text-right border rounded px-2 py-1 text-sm" />
                      </td>
                      <td className="p-2">
                        <input type="number" min="0" max="100" value={i.approvedDiscount} onChange={e => updateApprovedField(i.id, 'approvedDiscount', Number(e.target.value))} className="w-20 text-right border rounded px-2 py-1 text-sm" />
                      </td>
                      <td className="p-2 text-right font-medium text-green-700">₹{i.approvedAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold border-t">
                    <td colSpan={3} className="p-2 text-right">Approved Total:</td>
                    <td className="p-2 text-right text-green-700">₹{approvedTotal.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              </table>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleApprove} className="flex-1 bg-green-600 hover:bg-green-700" disabled={submitting}>
                  <CheckCircle size={18} className="mr-2" />{submitting ? 'Processing...' : 'Approve & Convert to Sale'}
                </Button>
                <Button onClick={handleReject} variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50" disabled={submitting}>
                  <XCircle size={18} className="mr-2" />Reject Order
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Pending Order Reviews</h1>
        <p className="text-gray-600 mb-6">Select an order to review and approve pricing</p>
        {loading ? (
          <Card className="p-12 text-center text-gray-500">Loading pending orders...</Card>
        ) : pendingOrders.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No pending orders to review</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingOrders.map(order => (
              <Card key={order.id} className="p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => selectOrder(order)}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-[#1e3a8a]">{order.order_number}</p>
                    <p className="text-sm text-gray-600 mt-1">{order.customers?.name ?? 'Unknown Customer'} • {order.company} • {order.invoice_type}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">₹ {order.grand_total?.toLocaleString('en-IN')}</p>
                    <Badge className="mt-1 bg-orange-100 text-orange-700 border-0">Pending Review</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};