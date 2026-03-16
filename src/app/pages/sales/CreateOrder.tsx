import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useNavigate } from 'react-router';
import { ArrowLeft, Plus, Trash2, Info, ChevronRight, AlertTriangle } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import { PageHeader } from '@/app/components/ui/primitives';
import type { CompanyEnum, InvoiceTypeEnum } from '@/app/types/database';

interface OrderItem {
  id: string; productId: string; product: string; brand: string; sku: string;
  stock: number; quantity: string; dp: number; mrp: number; discount: string; amount: string;
  lastEdited?: 'discount' | 'amount' | 'quantity' | 'dp';
}
interface Customer { id: string; name: string; phone: string; address: string; gst_pan: string | null; }
interface Product { id: string; name: string; sku: string; dealer_price: number; mrp: number; stock_qty: number; brand_name: string; }

export const CreateOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const [company, setCompany] = useState<CompanyEnum | ''>('');
  const [invoiceType, setInvoiceType] = useState<InvoiceTypeEnum | ''>('');
  const [customerType, setCustomerType] = useState('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGst, setCustomerGst] = useState('');
  const [phoneAutoFilled, setPhoneAutoFilled] = useState(false);
  const [addressAutoFilled, setAddressAutoFilled] = useState(false);
  const [gstAutoFilled, setGstAutoFilled] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { id: '1', productId: '', product: '', brand: '', sku: '', stock: 0, quantity: '', dp: 0, mrp: 0, discount: '', amount: '' }
  ]);
  const [siteAddress, setSiteAddress] = useState('');
  const [isSiteOrder, setIsSiteOrder] = useState<'yes' | 'no'>('no');
  const [remarks, setRemarks] = useState('');
  const [deliveryOption, setDeliveryOption] = useState('today');
  const [customDate, setCustomDate] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: custData }, { data: prodData }] = await Promise.all([
        supabase.from('customers').select('id, name, phone, address, gst_pan').eq('is_active', true).order('name'),
        supabase.from('products').select('id, name, sku, dealer_price, mrp, stock_qty, brands(name)').eq('is_active', true).order('name'),
      ]);
      if (custData) setCustomers(custData);
      if (prodData) setProducts(prodData.map((p: any) => ({ id: p.id, name: p.name, sku: p.sku, dealer_price: p.dealer_price, mrp: p.mrp ?? 0, stock_qty: p.stock_qty, brand_name: p.brands?.name ?? '' })));
    };
    fetchData();
  }, []);

  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    const cust = customers.find(c => c.id === custId);
    if (cust) {
      setCustomerPhone(cust.phone); setCustomerAddress(cust.address); setPhoneAutoFilled(true); setAddressAutoFilled(true);
      if (cust.gst_pan) { setCustomerGst(cust.gst_pan); setGstAutoFilled(true); }
      else { setCustomerGst(''); setGstAutoFilled(false); }
    }
  };

  const handleCustomerTypeChange = (type: string) => {
    setCustomerType(type); setSelectedCustomerId(''); setCustomerName(''); setCustomerPhone('');
    setCustomerAddress(''); setCustomerGst(''); setPhoneAutoFilled(false); setAddressAutoFilled(false); setGstAutoFilled(false);
  };

  const handleProductChange = (id: string, productId: string) => {
    const p = products.find(pr => pr.id === productId);
    setOrderItems(items => items.map(item =>
      item.id === id ? { ...item, productId, product: p?.name ?? '', brand: p?.brand_name ?? '', sku: p?.sku ?? '', stock: p?.stock_qty ?? 0, dp: p?.dealer_price ?? 0, mrp: p?.mrp ?? 0, amount: '', discount: '' } : item
    ));
  };

  const handleAddItem = () => setOrderItems(prev => [...prev, { id: String(Date.now()), productId: '', product: '', brand: '', sku: '', stock: 0, quantity: '', dp: 0, mrp: 0, discount: '', amount: '' }]);
  const handleRemoveItem = (id: string) => {
    if (window.confirm('Remove this line item from the order?')) {
      setOrderItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const clampDiscountInput = (value: string): string => {
    if (value === '') return '';
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return '';
    return String(Math.max(0, Math.min(100, parsed)));
  };

  useEffect(() => {
    setOrderItems(prev => prev.map(item => {
      const qty = Number(item.quantity) || 0; const dp = item.dp || 0;
      if (!qty || !dp) return item;
      if (item.lastEdited === 'amount' && item.amount !== '') {
        const maxAmount = dp * qty;
        if (maxAmount > 0) return { ...item, discount: Math.max(0, Math.min(100, ((maxAmount - (Number(item.amount) || 0)) / maxAmount) * 100)).toFixed(2), lastEdited: undefined };
      }
      if (item.lastEdited === 'discount' || item.lastEdited === 'quantity' || item.lastEdited === 'dp')
        return { ...item, amount: (dp * qty * (1 - (Number(item.discount) || 0) / 100)).toFixed(2), lastEdited: undefined };
      return item;
    }));
  }, [orderItems.map(i => `${i.id}-${i.quantity}-${i.discount}-${i.amount}-${i.dp}-${i.lastEdited}`).join(',')]);

  const subtotal = Math.round(orderItems.reduce((s, i) => s + (i.dp * (Number(i.quantity) || 0)), 0) * 100) / 100;
  const totalDiscount = Math.round(orderItems.reduce((s, i) => s + (i.dp * (Number(i.quantity) || 0) * (Number(i.discount) || 0) / 100), 0) * 100) / 100;
  const grandTotal = Math.round(orderItems.reduce((s, i) => s + (Number(i.amount) || 0), 0) * 100) / 100;

  const getDeliveryDate = (): string => {
    const today = new Date();
    if (deliveryOption === 'today') return today.toISOString().split('T')[0];
    if (deliveryOption === 'tomorrow') { today.setDate(today.getDate() + 1); return today.toISOString().split('T')[0]; }
    return customDate;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !invoiceType) { toast.error('Select company and invoice type'); return; }
    const validItems = orderItems.filter(i => i.productId && i.quantity);
    if (validItems.length === 0) { toast.error('Add at least one product'); return; }
    const stockErrors = validItems.filter(i => Number(i.quantity) > i.stock);
    if (stockErrors.length > 0) { toast.error(`Insufficient stock: ${stockErrors.map(i => i.product).join(', ')}`); return; }
    setLoading(true);
    try {
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
      let customerId: string | null = null;
      if (customerType === 'new' && customerName) {
        const { data: newCust, error: custErr } = await supabase.from('customers').insert({ name: customerName, phone: customerPhone, address: customerAddress, gst_pan: customerGst || null, is_active: true }).select('id').single();
        if (custErr) throw custErr;
        customerId = newCust.id;
      } else if (customerType === 'existing') customerId = selectedCustomerId;

      const { data: order, error: orderErr } = await supabase.from('orders').insert({
        order_number: orderNumber, company: company as CompanyEnum, invoice_type: invoiceType as InvoiceTypeEnum,
        customer_id: customerId, site_address: siteAddress, remarks: remarks || null,
        delivery_date: getDeliveryDate(), subtotal, total_discount: totalDiscount, grand_total: grandTotal,
        status: 'Pending', created_by: user?.id ?? null,
      }).select('id').single();
      if (orderErr) throw orderErr;
      const { error: itemsErr } = await supabase.from('order_items').insert(validItems.map(i => ({ order_id: order.id, product_id: i.productId, quantity: Number(i.quantity), dealer_price: i.dp, discount_pct: Number(i.discount) || 0, amount: Math.round((Number(i.amount) || 0) * 100) / 100 })));
      if (itemsErr) {
        // Rollback: delete orphaned order if items insert failed
        await supabase.from('orders').delete().eq('id', order.id);
        throw itemsErr;
      }
      toast.success(`Order ${orderNumber} created!`);
      navigate('/sales/my-orders');
    } catch (err: any) { toast.error(err.message || 'Failed'); } finally { setLoading(false); }
  };

  /* ─── tiny helpers ─── */
  const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34b0a7] focus-visible:ring-offset-2 ${active ? 'bg-[#34b0a7] border-[#34b0a7] text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
    >
      {children}
    </button>
  );

  const FL = ({ label, htmlFor, required, children }: { label: string; htmlFor?: string; required?: boolean; children: React.ReactNode }) => (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-gray-500">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  );

  const hasUnsavedInput = Boolean(
    company || invoiceType || selectedCustomerId || customerName || customerPhone || customerAddress || customerGst ||
    siteAddress || remarks || customDate || orderItems.some(i => i.productId || i.quantity || i.discount || i.amount)
  );

  const handleCancel = () => {
    if (!hasUnsavedInput || window.confirm('Discard this order draft? Unsaved changes will be lost.')) {
      navigate('/sales');
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="New Sales Order"
        subtitle="Fill in the fields and submit"
        actions={(
          <Button type="button" variant="ghost" size="sm" onClick={handleCancel} className="gap-2">
            <ArrowLeft size={16} />
            Cancel Draft
          </Button>
        )}
      />

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col xl:flex-row gap-4">

          {/* ══ LEFT: Main form ══ */}
          <div className="flex-1 space-y-4 min-w-0">

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>Review company, invoice type, quantities, and totals before submit. Order submission creates transactional records immediately.</span>
            </div>

            {/* ── Invoice Config ── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Invoice Config</p>
              <div className="grid grid-cols-2 gap-3">
                <FL label="Company" htmlFor="company" required>
                  <Select value={company} onValueChange={(v: string) => setCompany(v as CompanyEnum)}>
                    <SelectTrigger id="company" className="h-9 rounded-lg text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LLP">LLP</SelectItem>
                      <SelectItem value="YES YES">YES YES</SelectItem>
                      <SelectItem value="Zekon">Zekon</SelectItem>
                    </SelectContent>
                  </Select>
                </FL>
                <FL label="Invoice Type" htmlFor="invoiceType" required>
                  <Select value={invoiceType} onValueChange={(v: string) => setInvoiceType(v as InvoiceTypeEnum)}>
                    <SelectTrigger id="invoiceType" className="h-9 rounded-lg text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GST">GST</SelectItem>
                      <SelectItem value="NGST">NGST</SelectItem>
                      <SelectItem value="IGST">IGST</SelectItem>
                      <SelectItem value="Delivery Challan Out">DC Out</SelectItem>
                      <SelectItem value="Delivery Challan In">DC In</SelectItem>
                      <SelectItem value="Stock Transfer">Stock Transfer</SelectItem>
                      <SelectItem value="Credit Note">Credit Note</SelectItem>
                    </SelectContent>
                  </Select>
                </FL>
              </div>
            </div>

            {/* ── Customer ── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Customer</p>
                <div className="flex gap-1.5">
                  <Pill active={customerType === 'existing'} onClick={() => handleCustomerTypeChange('existing')}>Existing</Pill>
                  <Pill active={customerType === 'new'} onClick={() => handleCustomerTypeChange('new')}>+ New</Pill>
                </div>
              </div>

              {customerType === 'existing' ? (
                <FL label="Select Customer" htmlFor="selectedCustomerId" required>
                  <Select value={selectedCustomerId} onValueChange={handleCustomerSelect}>
                    <SelectTrigger id="selectedCustomerId" className="h-9 rounded-lg text-sm"><SelectValue placeholder="Pick a customer…" /></SelectTrigger>
                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </FL>
              ) : (
                <FL label="Customer Name" htmlFor="customerName" required>
                  <Input id="customerName" value={customerName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerName(e.target.value)} placeholder="Enter name" className="h-9 rounded-lg text-sm" required />
                </FL>
              )}

              {/* Auto-filled contact info */}
              <div className="grid grid-cols-2 gap-3">
                <FL label="Phone" htmlFor="customerPhone" required>
                  <div className="relative">
                    <Input id="customerPhone" type="tel" value={customerPhone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setCustomerPhone(e.target.value); setPhoneAutoFilled(false); }}
                      placeholder="Mobile" required className={`h-9 rounded-lg text-sm ${phoneAutoFilled ? 'bg-teal-50 border-teal-200' : ''}`} />
                    {phoneAutoFilled && <Info aria-hidden="true" size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-teal-500" />}
                  </div>
                </FL>
                <FL label="GST / PAN" htmlFor="customerGst">
                  <div className="relative">
                    <Input id="customerGst" value={customerGst} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setCustomerGst(e.target.value); setGstAutoFilled(false); }}
                      placeholder="Optional" className={`h-9 rounded-lg text-sm ${gstAutoFilled ? 'bg-teal-50 border-teal-200' : ''}`} />
                    {gstAutoFilled && <Info aria-hidden="true" size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-teal-500" />}
                  </div>
                </FL>
              </div>
              <FL label="Billing Address" htmlFor="customerAddress" required>
                <div className="relative">
                  <Textarea id="customerAddress" value={customerAddress} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { setCustomerAddress(e.target.value); setAddressAutoFilled(false); }}
                    placeholder="Customer address" rows={2} required className={`rounded-lg text-sm resize-none ${addressAutoFilled ? 'bg-teal-50 border-teal-200' : ''}`} />
                  {addressAutoFilled && <Info aria-hidden="true" size={13} className="absolute right-2.5 top-2.5 text-teal-500" />}
                </div>
                {(phoneAutoFilled || addressAutoFilled) && <p className="text-[10px] text-teal-600 mt-0.5">Auto-filled from profile · editable</p>}
              </FL>
            </div>

            {/* ── Products ── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Products</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <caption className="sr-only">Order items with product, pricing, quantity, discount and amount</caption>
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th scope="col" className="text-left pb-2 font-semibold text-gray-500 min-w-[160px]">Product</th>
                      <th scope="col" className="text-left pb-2 font-semibold text-gray-500 min-w-[80px]">Brand</th>
                      <th scope="col" className="text-right pb-2 font-semibold text-gray-500 w-16">MRP</th>
                      <th scope="col" className="text-right pb-2 font-semibold text-gray-500 w-14">Stock</th>
                      <th scope="col" className="text-right pb-2 font-semibold text-gray-500 w-20">Qty</th>
                      <th scope="col" className="text-right pb-2 font-semibold text-gray-500 w-20">DP (₹)</th>
                      <th scope="col" className="text-right pb-2 font-semibold text-gray-500 w-16">Disc%</th>
                      <th scope="col" className="text-right pb-2 font-semibold text-gray-500 w-24">Amount (₹)</th>
                      <th scope="col" className="w-6"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.map((item) => (
                      <tr key={item.id} className="border-b border-gray-50 group">
                        <td className="py-1.5 pr-2">
                          <Select value={item.productId} onValueChange={(v: string) => handleProductChange(item.id, v)}>
                            <SelectTrigger className="h-8 rounded-lg text-xs"><SelectValue placeholder="Select product" /></SelectTrigger>
                            <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="py-1.5 pr-2">
                          <div className="h-8 px-2 bg-gray-50 rounded-lg flex items-center text-gray-500 min-w-[80px]">{item.brand || '—'}</div>
                        </td>
                        <td className="py-1.5 pr-2 text-right">
                          <div className="h-8 px-2 bg-blue-50 rounded-lg flex items-center justify-end text-blue-700 font-medium w-20">
                            {item.mrp > 0 ? `₹${item.mrp}` : '—'}
                          </div>
                        </td>
                        <td className="py-1.5 pr-2 text-right">
                          <div className={`h-8 px-2 rounded-lg flex items-center justify-end font-medium ${item.stock > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 bg-gray-50'}`}>
                            {item.stock > 0 ? item.stock : '—'}
                          </div>
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input id={`quantity-${item.id}`} type="number" value={item.quantity}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderItems(p => p.map(i => i.id === item.id ? { ...i, quantity: e.target.value, lastEdited: 'quantity' } : i))}
                            placeholder="0" className="h-8 text-right rounded-lg text-xs w-20" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">₹</span>
                            <Input id={`dp-${item.id}`} type="number" value={item.dp}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderItems(p => p.map(i => i.id === item.id ? { ...i, dp: Number(e.target.value) || 0, lastEdited: 'dp' } : i))}
                              className="h-8 text-right pl-5 rounded-lg text-xs w-20" />
                          </div>
                        </td>
                        <td className="py-1.5 pr-2">
                          <div className="relative">
                            <Input id={`discount-${item.id}`} type="number" min="0" max="100" value={item.discount}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderItems(p => p.map(i => i.id === item.id ? { ...i, discount: clampDiscountInput(e.target.value), lastEdited: 'discount' } : i))}
                              placeholder="0" className="h-8 text-right pr-5 rounded-lg text-xs w-16" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">%</span>
                          </div>
                        </td>
                        <td className="py-1.5 pr-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">₹</span>
                            <Input id={`amount-${item.id}`} type="number" value={item.amount}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderItems(p => p.map(i => i.id === item.id ? { ...i, amount: e.target.value, lastEdited: 'amount' } : i))}
                              placeholder="0.00" className="h-8 text-right pl-5 rounded-lg text-xs w-24 bg-teal-50/70 border-teal-200" />
                          </div>
                        </td>
                        <td className="py-1.5">
                          {orderItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              aria-label={`Remove ${item.product || 'line item'}`}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={handleAddItem}
                className="flex items-center gap-1.5 text-xs text-teal-600 font-semibold hover:text-teal-700 transition-colors px-1">
                <Plus size={13} /> Add Product
              </button>
            </div>

            {/* ── Delivery ── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Delivery</p>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 font-medium">Date:</span>
                {[{ v: 'today', l: 'Today' }, { v: 'tomorrow', l: 'Tomorrow' }, { v: 'select', l: 'Pick…' }].map(o => (
                  <Pill key={o.v} active={deliveryOption === o.v} onClick={() => setDeliveryOption(o.v)}>{o.l}</Pill>
                ))}
                {deliveryOption === 'select' && (
                  <Input id="customDate" type="date" value={customDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomDate(e.target.value)} className="h-8 rounded-lg text-xs w-36 ml-1" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium shrink-0">Site order?</span>
                <Pill active={isSiteOrder === 'no'} onClick={() => { setIsSiteOrder('no'); setSiteAddress(''); }}>No — Customer address</Pill>
                <Pill active={isSiteOrder === 'yes'} onClick={() => setIsSiteOrder('yes')}>Yes — Different site</Pill>
              </div>

              {isSiteOrder === 'yes' && (
                <Textarea id="siteAddress" value={siteAddress} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSiteAddress(e.target.value)}
                  placeholder="Site / delivery address" rows={2} required className="rounded-lg text-sm resize-none border-amber-200 focus:border-amber-400 bg-amber-50/30" />
              )}
              {isSiteOrder === 'no' && customerAddress && (
                <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-600">
                  <span className="text-gray-400 mr-1">→</span>{customerAddress}
                </div>
              )}

              <Textarea id="remarks" value={remarks} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRemarks(e.target.value)}
                placeholder="Remarks / notes (optional)" rows={2} className="rounded-lg text-sm resize-none" />
            </div>
          </div>

          {/* ══ RIGHT: Sticky Summary ══ */}
          <div className="xl:w-64 shrink-0">
            <div className="sticky top-4 space-y-3">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Order Summary</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-teal-600">
                    <span>Discount</span>
                    <span className="font-medium">−₹{totalDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 font-bold text-base border-t border-gray-100 pt-2 mt-1">
                    <span>Total</span>
                    <span className="text-[#34b0a7]">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-gray-50 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Items</span><span className="font-medium text-gray-700">{orderItems.filter(i => i.productId).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Company</span><span className="font-medium text-gray-700">{company || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type</span><span className="font-medium text-gray-700">{invoiceType || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span className="font-medium text-gray-700">{deliveryOption === 'today' ? 'Today' : deliveryOption === 'tomorrow' ? 'Tomorrow' : customDate || '—'}</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 border-t border-gray-100 pt-2">Fields marked * are mandatory. Removal of any row requires confirmation.</p>
                <Button type="submit" disabled={loading}
                  className="w-full bg-[#34b0a7] hover:bg-[#2a9d94] text-white rounded-xl h-10 font-semibold flex items-center justify-center gap-2">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting…</>
                    : <>Submit Order <ChevronRight size={15} /></>}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} className="w-full rounded-xl h-9 text-sm">
                  Cancel
                </Button>
              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
};
