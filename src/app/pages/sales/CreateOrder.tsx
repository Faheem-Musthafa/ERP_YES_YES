import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/app/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { useNavigate } from 'react-router';
import { ArrowLeft, Plus, Trash2, Info, ChevronRight, AlertTriangle, Check, ChevronsUpDown, Package, Building2, ArrowRightLeft } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import { PageHeader } from '@/app/components/ui/primitives';
import { cn } from '@/app/components/ui/utils';
import { COMPANY_LIST, cloneCompanyProfiles, getCompanyDisplayName, loadCompanyProfiles } from '@/app/companyProfiles';
import { DEFAULT_ORDER_FORM_SETTINGS, loadOrderFormSettings } from '@/app/settings';
import type { CompanyEnum, InvoiceTypeEnum, GodownEnum, Json } from '@/app/types/database';

interface OrderItem {
  id: string; productId: string; product: string; brand: string; sku: string;
  stock: number; quantity: string; dp: number; mrp: number; discount: string; amount: string;
  lastEdited?: 'discount' | 'amount' | 'quantity' | 'dp';
}
interface Customer { id: string; name: string; phone: string; address: string; gst_pan: string | null; }
interface Product { id: string; name: string; sku: string; dealer_price: number; mrp: number; brand_name: string; locationStocks: Record<string, number>; searchStr: string; }

export const CreateOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyProfiles, setCompanyProfiles] = useState(cloneCompanyProfiles());
  const [GodownOptions, setGodownOptions] = useState<string[]>(DEFAULT_ORDER_FORM_SETTINGS.Godowns);
  const [maxDiscountPercentage, setMaxDiscountPercentage] = useState(DEFAULT_ORDER_FORM_SETTINGS.maxDiscountPercentage);

  // Form State
  const [company, setCompany] = useState<CompanyEnum | ''>('');
  const [invoiceType, setInvoiceType] = useState<InvoiceTypeEnum | ''>('');
  const [Godown, setGodown] = useState('');
  const [customerType, setCustomerType] = useState('existing');
  
  // Combobox Selectors State
  const [customerOpen, setCustomerOpen] = useState(false);
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

  const getStockAtLocation = (product: Product | undefined, location: string) => {
    if (!product || !location) return 0;
    return product.locationStocks[location] ?? 0;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: custData, error: custError }, { data: prodData, error: prodError }, { data: stockData, error: stockError }, profiles, orderSettings] = await Promise.all([
          supabase.from('customers').select('id, name, phone, address, gst_pan').eq('is_active', true).order('name'),
          supabase.from('products').select('id, name, sku, dealer_price, mrp, brands(name)').eq('is_active', true).order('name'),
          supabase.from('product_stock_locations').select('product_id, location, stock_qty'),
          loadCompanyProfiles().catch(() => null),
          loadOrderFormSettings().catch(() => null),
        ]);

        if (profiles) {
          setCompanyProfiles(profiles);
        }

        if (orderSettings) {
          const configuredGodowns = Array.from(
            new Set(
              orderSettings.Godowns
                .map((location) => location.trim())
                .filter((location) => location.length > 0),
            ),
          );
          setGodownOptions(configuredGodowns);
          setMaxDiscountPercentage(orderSettings.maxDiscountPercentage);
          setInvoiceType((current) => current || orderSettings.defaultInvoiceType);
          setGodown((current) => {
            if (current && configuredGodowns.includes(current)) return current;
            return configuredGodowns[0] ?? '';
          });
        }
        
        if (custError) {
          toast.error('Could not load customers');
        } else if (custData) {
          setCustomers(custData);
        }
        
        if (prodError || stockError) {
          toast.error('Could not load products');
        } else if (prodData) {
          const stockMap = new Map<string, Record<string, number>>();
          (stockData ?? []).forEach((s: any) => {
            const location = typeof s.location === 'string' ? s.location.trim() : '';
            if (!location) return;
            const existing = stockMap.get(s.product_id) || {};
            existing[location] = s.stock_qty ?? 0;
            stockMap.set(s.product_id, existing);
          });

          const detectedLocations = Array.from(
            new Set(
              (stockData ?? [])
                .map((row: any) => (typeof row.location === 'string' ? row.location.trim() : ''))
                .filter((location: string) => location.length > 0),
            ),
          );
          const configuredGodowns = Array.from(
            new Set(
              (orderSettings?.Godowns ?? DEFAULT_ORDER_FORM_SETTINGS.Godowns)
                .map((location) => location.trim())
                .filter((location) => location.length > 0),
            ),
          );
          const nextGodownOptions = configuredGodowns.length > 0
            ? configuredGodowns
            : detectedLocations;

          setGodownOptions(nextGodownOptions);
          setGodown((current) => {
            if (current && nextGodownOptions.includes(current)) return current;
            return configuredGodowns[0]
              ?? nextGodownOptions[0]
              ?? '';
          });
          
          setProducts(prodData.map((p: any) => ({
            id: p.id, name: p.name, sku: p.sku, dealer_price: p.dealer_price, mrp: p.mrp ?? 0,
            brand_name: p.brands?.name ?? '',
            locationStocks: stockMap.get(p.id) ?? {},
            searchStr: `${p.name} ${p.brands?.name ?? ''} ${p.sku}`.toLowerCase()
          })));
        }
      } catch (err) {
        toast.error('Failed to load order data');
      }
    };
    void fetchData();
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

  const selectedCustomerLabel = customers.find(c => c.id === selectedCustomerId)?.name || "Select a customer...";

  const handleCustomerTypeChange = (type: string) => {
    setCustomerType(type); setSelectedCustomerId(''); setCustomerName(''); setCustomerPhone('');
    setCustomerAddress(''); setCustomerGst(''); setPhoneAutoFilled(false); setAddressAutoFilled(false); setGstAutoFilled(false);
  };

  const handleProductChange = (id: string, productId: string) => {
    const p = products.find(pr => pr.id === productId);
    const stock = getStockAtLocation(p, Godown);
    setOrderItems(items => items.map(item =>
      item.id === id ? { ...item, productId, product: p?.name ?? '', brand: p?.brand_name ?? '', sku: p?.sku ?? '', stock, dp: p?.dealer_price ?? 0, mrp: p?.mrp ?? 0, amount: '', discount: '' } : item
    ));
  };

  const handleAddItem = () => setOrderItems(prev => [...prev, { id: String(Date.now()), productId: '', product: '', brand: '', sku: '', stock: 0, quantity: '', dp: 0, mrp: 0, discount: '', amount: '' }]);
  const handleRemoveItem = (id: string) => {
    if (window.confirm('Remove this line item from the order?')) {
      setOrderItems(prev => prev.filter(i => i.id !== id));
    }
  };

  useEffect(() => {
    setOrderItems(prev => prev.map(item => {
      if (!item.productId) return item;
      const p = products.find(pr => pr.id === item.productId);
      const stock = getStockAtLocation(p, Godown);
      return { ...item, stock };
    }));
  }, [Godown, products]);

  useEffect(() => {
    if (Godown && !GodownOptions.includes(Godown)) {
      setGodown('');
    }
  }, [Godown, GodownOptions]);

  const clampDiscountInput = (value: string): string => {
    if (value === '') return '';
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return '';
    return String(Math.max(0, Math.min(maxDiscountPercentage, parsed)));
  };

  useEffect(() => {
    setOrderItems(prev => prev.map(item => {
      const qty = Number(item.quantity) || 0; const dp = item.dp || 0;
      if (!qty || !dp) return item;
      if (item.lastEdited === 'amount' && item.amount !== '') {
        const maxAmount = dp * qty;
        if (maxAmount > 0) return { ...item, discount: Math.max(0, Math.min(maxDiscountPercentage, ((maxAmount - (Number(item.amount) || 0)) / maxAmount) * 100)).toFixed(2), lastEdited: undefined };
      }
      if (item.lastEdited === 'discount' || item.lastEdited === 'quantity' || item.lastEdited === 'dp')
        return { ...item, amount: (dp * qty * (1 - (Number(item.discount) || 0) / 100)).toFixed(2), lastEdited: undefined };
      return item;
    }));
  }, [orderItems.map(i => `${i.id}-${i.quantity}-${i.discount}-${i.amount}-${i.dp}-${i.lastEdited}`).join(',')]);

  useEffect(() => {
    setOrderItems((prev) => prev.map((item) => {
      if (!item.discount) return item;
      const clamped = clampDiscountInput(item.discount);
      return clamped === item.discount ? item : { ...item, discount: clamped, lastEdited: 'discount' };
    }));
  }, [maxDiscountPercentage]);

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
    if (!Godown) { toast.error('Select Godown'); return; }
    const validItems = orderItems.filter(i => i.productId && i.quantity);
    if (validItems.length === 0) { toast.error('Add at least one product'); return; }
    const stockErrors = validItems.filter(i => Number(i.quantity) > i.stock);
    if (stockErrors.length > 0) { toast.error(`Insufficient stock: ${stockErrors.map(i => i.product).join(', ')}`); return; }
    
    setLoading(true);
    try {
      let customerId: string | null = null;
      if (customerType === 'new') {
        if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
          throw new Error('Name, phone and address are required for new customers');
        }
        const { data: newCust, error: custErr } = await supabase.from('customers').insert({ name: customerName, phone: customerPhone, address: customerAddress, gst_pan: customerGst || null, is_active: true }).select('id').single();
        if (custErr) throw custErr;
        customerId = newCust.id;
      } else if (customerType === 'existing') {
        if (!selectedCustomerId) throw new Error('Select an existing customer');
        customerId = selectedCustomerId;
      }

      const itemsPayload = validItems.map((i) => ({
        product_id: i.productId,
        quantity: Number(i.quantity),
        dealer_price: i.dp,
        discount_pct: Number(i.discount) || 0,
      }));

      const deliveryDate = getDeliveryDate();
      const { data: createdOrderId, error: createOrderErr } = await supabase.rpc('create_order', {
        p_company: company as CompanyEnum,
        p_invoice_type: invoiceType as InvoiceTypeEnum,
        p_customer_id: customerId,
        p_godown: Godown as GodownEnum,
        p_site_address: siteAddress,
        p_items: itemsPayload as unknown as Json,
        p_remarks: remarks || null,
        p_delivery_date: deliveryDate || null,
        p_created_by: user?.id ?? null,
      });
      let resolvedOrderId = createdOrderId;

      if (createOrderErr) {
        const rpcMissing = createOrderErr.code === 'PGRST202' || createOrderErr.message?.toLowerCase().includes('could not find the function');
        if (!rpcMissing) throw createOrderErr;

        const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
        const { data: legacyOrder, error: legacyOrderErr } = await supabase.from('orders').insert({
            order_number: orderNumber, company: company as CompanyEnum, invoice_type: invoiceType as InvoiceTypeEnum,
            customer_id: customerId, godown: Godown as GodownEnum, site_address: siteAddress, remarks: remarks || null, delivery_date: deliveryDate || null,
            subtotal, total_discount: totalDiscount, grand_total: grandTotal, status: 'Pending', created_by: user?.id ?? null,
          }).select('id').single();
        if (legacyOrderErr) throw legacyOrderErr;

        const { error: legacyItemsErr } = await supabase.from('order_items').insert(validItems.map(i => ({
            order_id: legacyOrder.id, product_id: i.productId, quantity: Number(i.quantity), dealer_price: i.dp,
            discount_pct: Number(i.discount) || 0, amount: Math.round((Number(i.amount) || 0) * 100) / 100,
          })));

        if (legacyItemsErr) { await supabase.from('orders').delete().eq('id', legacyOrder.id); throw legacyItemsErr; }
        resolvedOrderId = legacyOrder.id;
      }

      let orderNumber = '';
      if (resolvedOrderId) {
        const { data: orderMeta } = await supabase.from('orders').select('order_number').eq('id', resolvedOrderId).single();
        orderNumber = orderMeta?.order_number ?? '';
      }

      toast.success(orderNumber ? `Order ${orderNumber} created!` : 'Order created!');
      navigate('/sales/my-orders');
    } catch (err: any) { toast.error(err.message || 'Failed'); } finally { setLoading(false); }
  };

  const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bdb4] focus-visible:ring-offset-2 ${active ? 'bg-[#00bdb4] border-[#00bdb4] text-white' : 'border-border text-muted-foreground hover:border-gray-300'}`}
    >
      {children}
    </button>
  );

  const FL = ({ label, htmlFor, required, children }: { label: string; htmlFor?: string; required?: boolean; children: React.ReactNode }) => (
    <div className="space-y-1 w-full">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-gray-500">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  );

  const hasUnsavedInput = Boolean(
    company || invoiceType || Godown || selectedCustomerId || customerName || orderItems.some(i => i.productId || i.quantity || i.discount || i.amount)
  );

  const handleCancel = () => {
    if (!hasUnsavedInput || window.confirm('Discard this order draft? Unsaved changes will be lost.')) {
      navigate('/sales');
    }
  };

  return (
    <div className="space-y-4 pb-20 xl:pb-6 animate-fade-up">
      <PageHeader
        title="New Sales Order"
        subtitle="Fill in the fields and submit"
        actions={(
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate('/sales/stock-transfer')} className="gap-2">
              <ArrowRightLeft size={16} /> Stock Transfer
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => navigate('/sales/credit-note')} className="gap-2">
              <ChevronRight size={16} /> Credit Note
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel} className="gap-2">
              <ArrowLeft size={16} /> Cancel
            </Button>
          </div>
        )}
      />

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col xl:flex-row gap-6">

          {/* ══ LEFT: Main Intent Workflows ══ */}
          <div className="flex-1 space-y-6 min-w-0">

            {/* ── Order Rules Notice ── */}
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-yellow-600" />
              <div>
                <span className="font-semibold block mb-0.5">Immediate Record Creation</span>
                <span>Review company, invoice type, and quantities before submit. Data entry is intent-driven.</span>
              </div>
            </div>

            {/* ── 1. Context Definition (Company & Logistics) ── */}
            <section className="panel-surface p-5 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#e6fffe] text-[#00bdb4] text-xs font-bold font-mono">1</span>
                <h2 className="text-base font-bold text-gray-900 tracking-tight">Order Context</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FL label="Company" htmlFor="company" required>
                  <Select value={company} onValueChange={(v: string) => setCompany(v as CompanyEnum)}>
                    <SelectTrigger id="company" className="h-10 rounded-xl text-sm bg-gray-50 border-gray-200 shadow-none focus:ring-[#00bdb4]"><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>
                      {COMPANY_LIST.map((companyKey) => (
                        <SelectItem key={companyKey} value={companyKey}>
                          {getCompanyDisplayName(companyKey, companyProfiles)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FL>
                <FL label="Invoice Type" htmlFor="invoiceType" required>
                  <Select value={invoiceType} onValueChange={(v: string) => setInvoiceType(v as InvoiceTypeEnum)}>
                    <SelectTrigger id="invoiceType" className="h-10 rounded-xl text-sm bg-gray-50 border-gray-200 shadow-none"><SelectValue placeholder="Invoice Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GST">GST</SelectItem>
                      <SelectItem value="NGST">NGST</SelectItem>
                      <SelectItem value="IGST">IGST</SelectItem>
                      <SelectItem value="Delivery Challan Out">DC Out</SelectItem>
                      <SelectItem value="Delivery Challan In">DC In</SelectItem>
                    </SelectContent>
                  </Select>
                </FL>
                <FL label="Dispatch Godown" htmlFor="Godown" required>
                  <Select value={Godown} onValueChange={setGodown}>
                    <SelectTrigger id="Godown" className="h-10 rounded-xl text-sm bg-gray-50 border-gray-200 shadow-none"><SelectValue placeholder="Dispatch From" /></SelectTrigger>
                    <SelectContent>
                      {GodownOptions.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FL>
              </div>
            </section>

            {/* ── 2. Customer Selection (Typeahead) ── */}
            <section className="panel-surface p-5 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#e6fffe] text-[#00bdb4] text-xs font-bold font-mono">2</span>
                  <h2 className="text-base font-bold text-gray-900 tracking-tight">Customer Profile</h2>
                </div>
                <div className="flex gap-1.5 p-1 bg-gray-100/80 rounded-lg">
                  <Pill active={customerType === 'existing'} onClick={() => handleCustomerTypeChange('existing')}>Database</Pill>
                  <Pill active={customerType === 'new'} onClick={() => handleCustomerTypeChange('new')}>New Lead</Pill>
                </div>
              </div>

              {customerType === 'existing' ? (
                <FL label="Search existing customers" required>
                  <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={customerOpen} className="w-full h-11 justify-between rounded-xl bg-gray-50 border-gray-200 shadow-none text-left font-normal hover:bg-gray-100/50">
                        {selectedCustomerLabel}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl max-h-[300px]" align="start">
                      <Command>
                        <CommandInput placeholder="Search company name, ID or contact..." className="h-11" />
                        <CommandList>
                          <CommandEmpty>No customer found.</CommandEmpty>
                          <CommandGroup heading="Verified Customers">
                            {customers.map((c) => (
                              <CommandItem key={c.id} value={c.name} onSelect={() => { handleCustomerSelect(c.id); setCustomerOpen(false); }}>
                                <Building2 className="mr-2 h-4 w-4 text-gray-400" />
                                {c.name}
                                <Check className={cn("ml-auto h-4 w-4 text-[#00bdb4]", selectedCustomerId === c.id ? "opacity-100" : "opacity-0")} />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </FL>
              ) : (
                <FL label="Full Name / Company Name" htmlFor="customerName" required>
                  <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter name" className="h-10 rounded-xl bg-gray-50 border-gray-200 shadow-none focus:ring-[#00bdb4]" required />
                </FL>
              )}

              {/* CRM Layout for Contact Data */}
              {(customerType === 'new' || selectedCustomerId) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <FL label="Phone Number" htmlFor="customerPhone" required>
                    <div className="relative">
                      <Input id="customerPhone" type="tel" value={customerPhone} onChange={(e) => { setCustomerPhone(e.target.value); setPhoneAutoFilled(false); }}
                        placeholder="Mobile" required className={cn("h-10 rounded-xl shadow-none", phoneAutoFilled ? "bg-[#e6fffe] border-[#b3fffc] text-[#007571]" : "bg-gray-50 border-gray-200")} />
                      {phoneAutoFilled && <Info size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00bdb4]" />}
                    </div>
                  </FL>
                  
                  <FL label="GST/PAN Number" htmlFor="customerGst">
                    <div className="relative">
                      <Input id="customerGst" value={customerGst} onChange={(e) => { setCustomerGst(e.target.value); setGstAutoFilled(false); }}
                        placeholder="Optional" className={cn("h-10 rounded-xl font-mono text-sm shadow-none", gstAutoFilled ? "bg-[#e6fffe] border-[#b3fffc] text-[#007571]" : "bg-gray-50 border-gray-200")} />
                    </div>
                  </FL>

                  <div className="md:col-span-2">
                    <FL label="Billing Address" htmlFor="customerAddress" required>
                      <div className="relative">
                        <Textarea id="customerAddress" value={customerAddress} onChange={(e) => { setCustomerAddress(e.target.value); setAddressAutoFilled(false); }}
                          placeholder="Complete registered address" rows={3} required className={cn("rounded-xl resize-none shadow-none text-sm", addressAutoFilled ? "bg-[#e6fffe] border-[#b3fffc] text-[#007571]" : "bg-gray-50 border-gray-200")} />
                      </div>
                      {(phoneAutoFilled || addressAutoFilled) && <p className="text-xs text-[#009994] mt-1.5 font-medium">✨ Contact details synchronized from CRM profile</p>}
                    </FL>
                  </div>
                </div>
              )}
            </section>

            {/* ── 3. Product Addition (Bento Cards) ── */}
            <section className="panel-surface p-5 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#e6fffe] text-[#00bdb4] text-xs font-bold font-mono">3</span>
                  <h2 className="text-base font-bold text-gray-900 tracking-tight">Line Items</h2>
                </div>
              </div>

              <div className="space-y-4">
                {orderItems.map((item, index) => {
                  const qtyNum = Number(item.quantity) || 0;
                  const isOverStock = qtyNum > item.stock;
                  
                  return (
                    <div key={item.id} className="relative rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden group">
                      {/* Trash badge for mobile/desktop parity */}
                      {orderItems.length > 1 && (
                        <button type="button" onClick={() => handleRemoveItem(item.id)} className="absolute right-2 top-2 z-10 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                      
                      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                        
                        {/* Product Picker */}
                        <div className="lg:col-span-5 flex flex-col justify-center space-y-1.5">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Item {index + 1}</p>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" className="w-full justify-between pr-8 border-gray-200 bg-gray-50/50 hover:bg-gray-100 shadow-none font-medium h-11 rounded-lg truncate">
                                {item.product ? item.product : "Search product or SKU..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] md:w-[400px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search catalog..." className="h-10" />
                                <CommandList className="max-h-[250px]">
                                  <CommandEmpty>No product found.</CommandEmpty>
                                  <CommandGroup>
                                    {products.map((p) => (
                                      <CommandItem key={p.id} value={p.searchStr} onSelect={() => handleProductChange(item.id, p.id)} className="flex items-center justify-between border-b border-gray-50 py-2">
                                        <div className="flex flex-col min-w-0 pr-4">
                                          <span className="font-medium text-gray-900 truncate">{p.name}</span>
                                          <span className="text-xs text-gray-500">{p.brand_name} • {p.sku}</span>
                                        </div>
                                        <span className="shrink-0 text-xs font-mono font-medium text-gray-400">₹{p.dealer_price}</span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          
                          {/* Rich Feedback Row */}
                          {item.productId && (
                            <div className="flex items-center justify-between mt-1 px-1">
                               <div className="flex gap-2 text-xs">
                                  <span className="text-gray-500">MRP: <span className="font-mono text-gray-900">₹{item.mrp}</span></span>
                                  <span className="text-gray-300">|</span>
                                  <span className="text-gray-500">Brand: <span className="font-medium text-gray-700">{item.brand}</span></span>
                               </div>
                               <div className={cn("text-xs font-medium flex items-center gap-1", isOverStock ? "text-red-600" : "text-emerald-600")}>
                                  <Package size={12} /> Stock: <span className="font-mono">{item.stock}</span>
                               </div>
                            </div>
                          )}
                        </div>

                        {/* Calculations Matrix (Tabular Nums) */}
                        <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-4 gap-3 lg:pt-5 pt-2">
                          <FL label="Qty" required>
                             <Input type="number" value={item.quantity} onChange={(e) => setOrderItems(p => p.map(i => i.id === item.id ? { ...i, quantity: e.target.value, lastEdited: 'quantity' } : i))}
                               className={cn("h-10 text-right font-mono font-semibold text-base shadow-none border-gray-200 focus:bg-white bg-gray-50 rounded-lg", isOverStock && "border-red-300 bg-red-50 text-red-700")} placeholder="0" />
                          </FL>
                          <FL label="Rate (DP)">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">₹</span>
                              <Input type="number" value={item.dp} onChange={(e) => setOrderItems(p => p.map(i => i.id === item.id ? { ...i, dp: Number(e.target.value) || 0, lastEdited: 'dp' } : i))}
                                className="h-10 pl-7 text-right font-mono bg-gray-50 border-gray-200 shadow-none rounded-lg" />
                            </div>
                          </FL>
                          <FL label={`Disc (max ${maxDiscountPercentage}%)`}>
                            <div className="relative">
                              <Input type="number" max={maxDiscountPercentage} value={item.discount} onChange={(e) => setOrderItems(p => p.map(i => i.id === item.id ? { ...i, discount: clampDiscountInput(e.target.value), lastEdited: 'discount' } : i))}
                                className="h-10 pr-6 text-right font-mono bg-gray-50 border-gray-200 shadow-none rounded-lg" placeholder="0" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">%</span>
                            </div>
                          </FL>
                          <FL label="Total Value">
                            <div className="relative h-10 w-full rounded-lg bg-[#e6fffe] border border-[#b3fffc] flex items-center justify-end px-3">
                               <Input type="number" value={item.amount} onChange={(e) => setOrderItems(p => p.map(i => i.id === item.id ? { ...i, amount: e.target.value, lastEdited: 'amount' } : i))}
                                  className="absolute inset-0 bg-transparent opacity-0 cursor-text" />
                               <span className="text-gray-500 font-mono text-sm mr-1">₹</span>
                               <span className="font-mono font-bold text-[#007571] text-base">{Number(item.amount) ? Number(item.amount).toFixed(2) : "0.00"}</span>
                            </div>
                          </FL>
                        </div>
                      </div>
                      
                      {/* Inline Validation State */}
                      {isOverStock && qtyNum > 0 && (
                        <div className="bg-red-50 px-4 py-2 text-xs text-red-600 font-medium border-t border-red-100 flex items-center justify-center gap-2">
                          <AlertTriangle size={14} /> Quantity ({qtyNum}) exceeds current stock limit of {item.stock}.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <Button type="button" variant="outline" onClick={handleAddItem} className="w-full border-dashed border-2 py-6 text-[#00bdb4] hover:bg-[#e6fffe] hover:border-[#00bdb4]/50 border-gray-200 mt-2 bg-gray-50">
                <Plus size={16} className="mr-2" /> Append New Row
              </Button>
            </section>

            {/* ── 4. Final Meta & Delivery ── */}
            <section className="panel-surface p-5 space-y-5">
               <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#e6fffe] text-[#00bdb4] text-xs font-bold font-mono">4</span>
                  <h2 className="text-base font-bold text-gray-900 tracking-tight">Delivery & Logistics</h2>
               </div>
               
              <div className="space-y-4">
                 <div>
                    <label className="text-xs font-semibold text-gray-500 mb-2 block">Delivery Timeline</label>
                    <div className="flex flex-wrap gap-2">
                        {[{ v: 'today', l: 'Today' }, { v: 'tomorrow', l: 'Tomorrow' }, { v: 'select', l: 'Custom Date...' }].map(o => (
                          <Pill key={o.v} active={deliveryOption === o.v} onClick={() => setDeliveryOption(o.v)}>{o.l}</Pill>
                        ))}
                    </div>
                 </div>
                 {deliveryOption === 'select' && (
                    <FL label="Select Date"><Input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="h-10 w-full md:w-64" /></FL>
                 )}

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                       <label className="text-xs font-semibold text-gray-500 block">Site Delivery?</label>
                       <div className="flex gap-2">
                          <Pill active={isSiteOrder === 'no'} onClick={() => { setIsSiteOrder('no'); setSiteAddress(''); }}>Same as Address</Pill>
                          <Pill active={isSiteOrder === 'yes'} onClick={() => setIsSiteOrder('yes')}>Different Site</Pill>
                       </div>
                       
                       {isSiteOrder === 'yes' && (
                          <Textarea id="siteAddress" value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} placeholder="Enter alternative site / delivery address" rows={3} required className="resize-none" />
                       )}
                       {isSiteOrder === 'no' && customerAddress && (
                          <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-600 italic">
                             Default: {customerAddress}
                          </div>
                       )}
                    </div>
                    
                    <FL label="Internal Remarks">
                       <Textarea id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Pack safely, specific requests, etc." rows={3} className="resize-none h-[106px]" />
                    </FL>
                 </div>
              </div>
            </section>
          </div>

          {/* ══ RIGHT: Sticky Action/Summary Bar ══ */}
          <div className="xl:w-[320px] shrink-0">
            {/* Using bottom-0 fixed on mobile, and sticky top-4 on desktop */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.06)] xl:sticky xl:top-4 xl:bg-transparent xl:border-none xl:p-0 xl:shadow-none">
              <div className="xl:panel-surface-strong xl:p-5 space-y-4 max-w-7xl mx-auto flex flex-col">
                
                <p className="hidden xl:block text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Checkout Summary</p>
                
                <div className="flex xl:flex-col justify-between items-center xl:items-stretch gap-4">
                   <div className="space-y-2 text-sm flex-1 xl:flex-none">
                     <div className="hidden xl:flex justify-between text-gray-500">
                       <span>Subtotal</span>
                       <span className="font-mono">₹{subtotal.toFixed(2)}</span>
                     </div>
                     <div className="hidden xl:flex justify-between text-[#00bdb4] bg-[#e6fffe] px-2 py-1 -mx-2 rounded">
                       <span>Discount Add.</span>
                       <span className="font-mono">−₹{totalDiscount.toFixed(2)}</span>
                     </div>
                     <div className="flex xl:mt-3 xl:pt-3 xl:border-t xl:border-gray-100 justify-between items-center text-gray-900 group">
                       <span className="font-bold xl:text-lg">Grand Total</span>
                       <span className="font-mono font-black text-xl xl:text-3xl text-[#00bdb4] tracking-tight">₹{grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                     </div>
                     <p className="text-[11px] text-gray-400 hidden xl:block">All numerical calculations are auto-synced. Inclusive of defined local taxes.</p>
                   </div>
   
                   <div className="flex flex-col gap-2 w-[160px] xl:w-full shrink-0">
                     <Button type="submit" disabled={loading} size="lg" className="w-full bg-[#00bdb4] hover:bg-[#009994] text-white rounded-xl shadow-[0_8px_20px_-6px_rgba(0,189,180,0.5)] font-bold text-base h-12 truncate">
                       {loading ? <span className="animate-pulse">Locking...</span> : "Confirm Order"}
                     </Button>
                     <Button type="button" variant="ghost" onClick={handleCancel} className="hidden xl:flex w-full text-gray-500 hover:text-red-600 hover:bg-red-50">
                       Discard Draft
                     </Button>
                   </div>
                </div>
              </div>
            </div>
            {/* Mobile padding spacer to prevent content hiding under fixed bar */}
            <div className="h-24 xl:hidden" aria-hidden="true" />
          </div>

        </div>
      </form>
    </div>
  );
};
