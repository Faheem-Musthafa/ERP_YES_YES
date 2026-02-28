import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { useNavigate } from 'react-router';
import { ArrowLeft, Plus, Trash2, Info } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import type { CompanyEnum, InvoiceTypeEnum } from '@/app/types/database';

interface OrderItem {
  id: string;
  productId: string;
  product: string;
  brand: string;
  sku: string;
  stock: number;
  quantity: string;
  dp: number;
  discount: string;
  amount: string;
  lastEdited?: 'discount' | 'amount' | 'quantity' | 'dp';
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  gst_pan: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  dealer_price: number;
  stock_qty: number;
  brand_name: string;
}

export const CreateOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const [company, setCompany] = useState<CompanyEnum | ''>('');
  const [invoiceType, setInvoiceType] = useState<InvoiceTypeEnum | ''>('');
  const [customerType, setCustomerType] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGst, setCustomerGst] = useState('');
  const [phoneAutoFilled, setPhoneAutoFilled] = useState(false);
  const [addressAutoFilled, setAddressAutoFilled] = useState(false);
  const [gstAutoFilled, setGstAutoFilled] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { id: '1', productId: '', product: '', brand: '', sku: '', stock: 0, quantity: '', dp: 0, discount: '', amount: '' }
  ]);
  const [siteAddress, setSiteAddress] = useState('');
  const [remarks, setRemarks] = useState('');
  const [deliveryOption, setDeliveryOption] = useState('today');
  const [customDate, setCustomDate] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: custData }, { data: prodData }] = await Promise.all([
        supabase.from('customers').select('id, name, phone, address, gst_pan').eq('is_active', true).order('name'),
        supabase.from('products').select('id, name, sku, dealer_price, stock_qty, brands(name)').eq('is_active', true).order('name'),
      ]);
      if (custData) setCustomers(custData);
      if (prodData) {
        setProducts(prodData.map((p: any) => ({
          id: p.id, name: p.name, sku: p.sku, dealer_price: p.dealer_price,
          stock_qty: p.stock_qty, brand_name: p.brands?.name ?? '',
        })));
      }
    };
    fetchData();
  }, []);

  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    const cust = customers.find(c => c.id === custId);
    if (cust) {
      setCustomerPhone(cust.phone);
      setCustomerAddress(cust.address);
      setPhoneAutoFilled(true);
      setAddressAutoFilled(true);
      if (cust.gst_pan) { setCustomerGst(cust.gst_pan); setGstAutoFilled(true); }
      else { setCustomerGst(''); setGstAutoFilled(false); }
    }
  };

  const handleCustomerTypeChange = (type: string) => {
    setCustomerType(type);
    setSelectedCustomerId(''); setCustomerName(''); setCustomerPhone('');
    setCustomerAddress(''); setCustomerGst('');
    setPhoneAutoFilled(false); setAddressAutoFilled(false); setGstAutoFilled(false);
  };

  const handleProductChange = (id: string, productId: string) => {
    const p = products.find(pr => pr.id === productId);
    setOrderItems(items => items.map(item =>
      item.id === id ? { ...item, productId, product: p?.name ?? '', brand: p?.brand_name ?? '', sku: p?.sku ?? '', stock: p?.stock_qty ?? 0, dp: p?.dealer_price ?? 0, amount: '', discount: '' } : item
    ));
  };

  const handleAddItem = () => {
    const newId = String(Date.now());
    setOrderItems(prev => [...prev, { id: newId, productId: '', product: '', brand: '', sku: '', stock: 0, quantity: '', dp: 0, discount: '', amount: '' }]);
  };

  const handleRemoveItem = (id: string) => setOrderItems(prev => prev.filter(i => i.id !== id));

  // Auto-calculate amount/discount
  useEffect(() => {
    setOrderItems(prev => prev.map(item => {
      const qty = Number(item.quantity) || 0;
      const dp = item.dp || 0;
      if (!qty || !dp) return item;
      if (item.lastEdited === 'amount' && item.amount !== '') {
        const amount = Number(item.amount) || 0;
        const maxAmount = dp * qty;
        if (maxAmount > 0) {
          const disc = Math.max(0, Math.min(100, ((maxAmount - amount) / maxAmount) * 100)).toFixed(2);
          return { ...item, discount: disc, lastEdited: undefined };
        }
      }
      if (item.lastEdited === 'discount' || item.lastEdited === 'quantity' || item.lastEdited === 'dp') {
        const disc = Number(item.discount) || 0;
        return { ...item, amount: (dp * qty * (1 - disc / 100)).toFixed(2), lastEdited: undefined };
      }
      return item;
    }));
  }, [orderItems.map(i => `${i.id}-${i.quantity}-${i.discount}-${i.amount}-${i.dp}-${i.lastEdited}`).join(',')]);

  const subtotal = orderItems.reduce((s, i) => s + (i.dp * (Number(i.quantity) || 0)), 0);
  const totalDiscount = orderItems.reduce((s, i) => s + (i.dp * (Number(i.quantity) || 0) * (Number(i.discount) || 0) / 100), 0);
  const grandTotal = orderItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const getDeliveryDate = (): string => {
    const today = new Date();
    if (deliveryOption === 'today') return today.toISOString().split('T')[0];
    if (deliveryOption === 'tomorrow') { today.setDate(today.getDate() + 1); return today.toISOString().split('T')[0]; }
    return customDate;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !invoiceType) { toast.error('Please select company and invoice type'); return; }
    const validItems = orderItems.filter(i => i.productId && i.quantity);
    if (validItems.length === 0) { toast.error('Please add at least one product'); return; }
    setLoading(true);
    try {
      const orderNumber = `ORD-${Date.now()}`;
      let customerId: string | null = null;

      // If new customer, create first
      if (customerType === 'new' && customerName) {
        const { data: newCust, error: custErr } = await supabase.from('customers').insert({
          name: customerName, phone: customerPhone, address: customerAddress, gst_pan: customerGst || null, is_active: true,
        }).select('id').single();
        if (custErr) throw custErr;
        customerId = newCust.id;
      } else if (customerType === 'existing') {
        customerId = selectedCustomerId;
      }

      const { data: order, error: orderErr } = await supabase.from('orders').insert({
        order_number: orderNumber,
        company: company as CompanyEnum,
        invoice_type: invoiceType as InvoiceTypeEnum,
        customer_id: customerId,
        site_address: siteAddress,
        remarks: remarks || null,
        delivery_date: getDeliveryDate(),
        subtotal,
        total_discount: totalDiscount,
        grand_total: grandTotal,
        status: 'Pending',
        created_by: user?.id ?? null,
      }).select('id').single();
      if (orderErr) throw orderErr;

      const items = validItems.map(i => ({
        order_id: order.id,
        product_id: i.productId,
        quantity: Number(i.quantity),
        dealer_price: i.dp,
        discount_pct: Number(i.discount) || 0,
        amount: Number(i.amount) || 0,
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(items);
      if (itemsErr) throw itemsErr;

      toast.success(`Order ${orderNumber} created successfully!`);
      navigate('/sales/my-orders');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/sales')} className="mb-4"><ArrowLeft size={20} className="mr-2" />Back to Dashboard</Button>
        <h1 className="text-2xl font-semibold text-gray-900">Create Sales Order</h1>
        <p className="text-gray-600 mt-1">Fill in the details to create a new order</p>
      </div>

      <Card className="p-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Invoice Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Company *</Label>
                <Select value={company} onValueChange={v => setCompany(v as CompanyEnum)}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LLP">LLP</SelectItem>
                    <SelectItem value="YES YES">YES YES</SelectItem>
                    <SelectItem value="Zekon">Zekon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Invoice Type *</Label>
                <Select value={invoiceType} onValueChange={v => setInvoiceType(v as InvoiceTypeEnum)}>
                  <SelectTrigger><SelectValue placeholder="Select invoice type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GST">GST</SelectItem>
                    <SelectItem value="NGST">NGST</SelectItem>
                    <SelectItem value="IGST">IGST</SelectItem>
                    <SelectItem value="Delivery Challan Out">Delivery Challan Out</SelectItem>
                    <SelectItem value="Delivery Challan In">Delivery Challan In</SelectItem>
                    <SelectItem value="Stock Transfer">Stock Transfer</SelectItem>
                    <SelectItem value="Credit Note">Credit Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Customer Type *</Label>
              <Select value={customerType} onValueChange={handleCustomerTypeChange}>
                <SelectTrigger><SelectValue placeholder="Select customer type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">Existing</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {customerType === 'existing' && (
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Select value={selectedCustomerId} onValueChange={handleCustomerSelect}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {customerType === 'new' && (
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Enter customer name" required />
              </div>
            )}
          </div>

          {customerType && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Phone *</Label>
                <div className="relative">
                  <Input type="tel" value={customerPhone} onChange={e => { setCustomerPhone(e.target.value); setPhoneAutoFilled(false); }} placeholder="Enter phone" required className={phoneAutoFilled ? 'bg-teal-50 pr-10' : ''} />
                  {phoneAutoFilled && <Info className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />}
                </div>
                {phoneAutoFilled && <p className="text-xs text-gray-500">Auto-filled â€” editable</p>}
              </div>
              <div className="space-y-2">
                <Label>GST / PAN No.</Label>
                <div className="relative">
                  <Input value={customerGst} onChange={e => { setCustomerGst(e.target.value); setGstAutoFilled(false); }} placeholder="Optional" className={gstAutoFilled ? 'bg-teal-50 pr-10' : ''} />
                  {gstAutoFilled && <Info className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address *</Label>
                <div className="relative">
                  <Textarea value={customerAddress} onChange={e => { setCustomerAddress(e.target.value); setAddressAutoFilled(false); }} placeholder="Customer address" required rows={3} className={addressAutoFilled ? 'bg-teal-50' : ''} />
                  {addressAutoFilled && <Info className="absolute right-3 top-3 h-4 w-4 text-teal-600" />}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Order Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left text-sm font-semibold text-gray-700 p-3">Product</th>
                    <th className="text-left text-sm font-semibold text-gray-700 p-3">Brand</th>
                    <th className="text-left text-sm font-semibold text-gray-700 p-3">SKU</th>
                    <th className="text-right text-sm font-semibold text-gray-700 p-3">Stock</th>
                    <th className="text-right text-sm font-semibold text-gray-700 p-3">Qty</th>
                    <th className="text-right text-sm font-semibold text-gray-700 p-3">DP</th>
                    <th className="text-right text-sm font-semibold text-gray-700 p-3">Disc%</th>
                    <th className="text-right text-sm font-semibold text-gray-700 p-3">Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <Select value={item.productId} onValueChange={v => handleProductChange(item.id, v)}>
                          <SelectTrigger className="h-9 min-w-[150px]"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2"><Input value={item.brand} disabled className="h-9 bg-gray-50 text-gray-600 min-w-[100px]" /></td>
                      <td className="p-2"><Input value={item.sku} disabled className="h-9 bg-gray-50 text-gray-600 min-w-[100px]" /></td>
                      <td className="p-2"><Input value={item.stock > 0 ? `${item.stock} units` : ''} disabled className="h-9 bg-gray-50 text-gray-600 text-right min-w-[90px]" /></td>
                      <td className="p-2"><Input type="number" value={item.quantity} onChange={e => setOrderItems(p => p.map(i => i.id === item.id ? { ...i, quantity: e.target.value, lastEdited: 'quantity' } : i))} placeholder="0" className="h-9 text-right min-w-[70px]" /></td>
                      <td className="p-2">
                        <div className="relative min-w-[110px]">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 text-sm">â‚¹</span>
                          <Input type="number" value={item.dp} onChange={e => setOrderItems(p => p.map(i => i.id === item.id ? { ...i, dp: Number(e.target.value) || 0, lastEdited: 'dp' } : i))} className="h-9 text-right pl-6" />
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="relative min-w-[80px]">
                          <Input type="number" min="0" max="100" value={item.discount} onChange={e => setOrderItems(p => p.map(i => i.id === item.id ? { ...i, discount: e.target.value, lastEdited: 'discount' } : i))} placeholder="0" className="h-9 text-right pr-6" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="relative min-w-[120px]">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 text-sm">â‚¹</span>
                          <Input type="number" value={item.amount} onChange={e => setOrderItems(p => p.map(i => i.id === item.id ? { ...i, amount: e.target.value, lastEdited: 'amount' } : i))} placeholder="0.00" className="h-9 text-right pl-6 bg-teal-50" />
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        {orderItems.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)} className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button type="button" variant="outline" onClick={handleAddItem}><Plus size={16} className="mr-2" />Add Product Row</Button>
          </div>

          <Card className="bg-teal-50 border-teal-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Order Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-700">Subtotal:</span><span className="font-semibold">â‚¹ {subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-700">Total Discount:</span><span className="font-semibold text-teal-600">- â‚¹ {totalDiscount.toFixed(2)}</span></div>
              <div className="flex justify-between text-base font-bold border-t pt-2 mt-2"><span className="text-gray-900">Grand Total:</span><span className="text-[#34b0a7]">â‚¹ {grandTotal.toFixed(2)}</span></div>
            </div>
          </Card>

          <div className="space-y-2">
            <Label>Site Address </Label>
            <Textarea value={siteAddress} onChange={e => setSiteAddress(e.target.value)} placeholder="Enter delivery site address" rows={3} />
          </div>

          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Additional remarks" rows={3} />
          </div>

          <div className="space-y-3">
            <Label>Delivery Options *</Label>
            <RadioGroup value={deliveryOption} onValueChange={setDeliveryOption}>
              <div className="flex items-center space-x-2"><RadioGroupItem value="today" id="today" /><Label htmlFor="today" className="font-normal cursor-pointer">Today</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="tomorrow" id="tomorrow" /><Label htmlFor="tomorrow" className="font-normal cursor-pointer">Tomorrow</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="select" id="select" /><Label htmlFor="select" className="font-normal cursor-pointer">Select Date</Label></div>
            </RadioGroup>
            {deliveryOption === 'select' && <Input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="mt-2" />}
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" className="bg-[#34b0a7] hover:bg-[#34b0a7]/90" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Order'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/sales')}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
