import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useNavigate } from 'react-router';
import { ArrowLeft, Info, Check, AlertTriangle, IndianRupee, Tag, User, ReceiptText, Building2, Calendar, FileText, ChevronRight } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import { FormSection, FormCard, PageHeader } from '@/app/components/ui/primitives';
import { COMPANY_LIST, cloneCompanyProfiles, getCompanyDisplayName, loadCompanyProfiles } from '@/app/companyProfiles';
import type { CompanyEnum, PaymentModeEnum } from '@/app/types/database';
import { DEFAULT_RECEIPT_STATUS } from '@/app/utils';
import { LIMITS, sanitizeDecimalInput, sanitizeMultilineText, sanitizePhone, sanitizeText, sanitizeUpperAlnum, validateGSTIN, validatePhone, validatePositiveAmount, validateRequired } from '@/app/validation';

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  address: string;
  gst_pan: string | null;
}

interface OrderOption {
  id: string;
  order_number: string;
  invoice_number: string | null;
  grand_total: number;
  created_at: string;
  customer_id: string | null;
  customers: { name: string } | null;
}

export const ReceiptEntry = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [brands, setBrands] = useState<string[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [approvedOrders, setApprovedOrders] = useState<OrderOption[]>([]);
  const [companyProfiles, setCompanyProfiles] = useState(cloneCompanyProfiles());

  const [company, setCompany] = useState<CompanyEnum | ''>('');
  const [modeOfReceipt, setModeOfReceipt] = useState<PaymentModeEnum | ''>('');
  const [brand, setBrand] = useState('');
  const [otherBrand, setOtherBrand] = useState('');
  const [customerType, setCustomerType] = useState('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGst, setCustomerGst] = useState('');
  const [phoneAutoFilled, setPhoneAutoFilled] = useState(false);
  const [addressAutoFilled, setAddressAutoFilled] = useState(false);
  const [gstAutoFilled, setGstAutoFilled] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0] ?? '');
  const [onAccountOf, setOnAccountOf] = useState<'Invoice' | 'Advance' | ''>('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [loading, setLoading] = useState(false);
  const invoiceCustomerId = customerType === 'existing' ? selectedCustomerId : '';
  const customerFilteredOrders = approvedOrders.filter(o => !invoiceCustomerId || o.customer_id === invoiceCustomerId);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: custData, error: custError }, { data: ordData, error: ordError }, { data: brandData, error: brandError }, profiles] = await Promise.all([
          supabase.from('customers').select('id, name, phone, address, gst_pan').eq('is_active', true).order('name'),
          supabase
            .from('orders')
            .select('id, order_number, invoice_number, grand_total, created_at, customer_id, customers(name)')
            .eq('status', 'Billed')
            .neq('invoice_type', 'Credit Note')
            .order('created_at', { ascending: false }),
          supabase.from('brands').select('name').eq('is_active', true).order('name'),
          loadCompanyProfiles().catch(() => null),
        ]);

        if (custError) throw custError;
        if (ordError) throw ordError;
        if (brandError) throw brandError;

        if (custData) setCustomers(custData as CustomerOption[]);
        if (ordData) setApprovedOrders(ordData as OrderOption[]);
        if (brandData) setBrands([...brandData.map((b: { name: string }) => b.name), 'Other']);
        if (profiles) setCompanyProfiles(profiles);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load data');
      }
    })();
  }, []);

  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    const c = customers.find(x => x.id === custId);
    if (c) {
      setCustomerPhone(c.phone); setCustomerAddress(c.address); setPhoneAutoFilled(true); setAddressAutoFilled(true);
      if (c.gst_pan) { setCustomerGst(c.gst_pan); setGstAutoFilled(true); } else { setCustomerGst(''); setGstAutoFilled(false); }
    }
  };

  const handleCustomerTypeChange = (t: string) => {
    setCustomerType(t); setSelectedCustomerId(''); setCustomerName(''); setCustomerPhone(''); setCustomerAddress(''); setCustomerGst('');
    setPhoneAutoFilled(false); setAddressAutoFilled(false); setGstAutoFilled(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customerType === 'existing' && !selectedCustomerId) { toast.error('Please select a customer'); return; }
    if (customerType === 'new' && (!customerName || !customerPhone)) { toast.error('Please fill new customer details'); return; }
    if (!company) { toast.error('Please select a company'); return; }
    if (!modeOfReceipt) { toast.error('Please select mode of receipt'); return; }
    if (!brand || (brand === 'Other' && !otherBrand.trim())) { toast.error('Please select a brand'); return; }
    if (!onAccountOf) { toast.error('Please select On Account Of'); return; }
    if (onAccountOf === 'Invoice' && !invoiceCustomerId) { toast.error('Please select a customer first'); return; }
    if (onAccountOf === 'Invoice' && !selectedOrderId) { toast.error('Please select an invoice'); return; }
    if (!receivedAmount || !receivedDate) { toast.error('Please enter amount and date'); return; }
    if (modeOfReceipt === 'Cheque' && (!chequeNumber.trim() || !chequeDate)) { toast.error('Please complete cheque details'); return; }

    setLoading(true);
    try {
      let finalCustomerId = selectedCustomerId;
      if (customerType === 'new') {
        const normalizedCustomerName = sanitizeText(customerName, LIMITS.longText);
        const normalizedCustomerPhone = sanitizePhone(customerPhone);
        const normalizedCustomerAddress = sanitizeMultilineText(customerAddress, LIMITS.address);
        const normalizedCustomerGst = sanitizeUpperAlnum(customerGst, LIMITS.gstin) || null;
        validateRequired(normalizedCustomerName, 'Customer name');
        validateRequired(normalizedCustomerPhone, 'Customer phone');
        validatePhone(normalizedCustomerPhone);
        if (normalizedCustomerGst) validateGSTIN(normalizedCustomerGst);
        const { data: newCust, error: errC } = await supabase.from('customers').insert({
          name: normalizedCustomerName, phone: normalizedCustomerPhone, address: normalizedCustomerAddress, gst_pan: normalizedCustomerGst, is_active: true
        }).select('id').single();
        if (errC) throw errC;
        finalCustomerId = newCust.id;
      }

      const receiptNumber = `RCPT-${Date.now()}`;
      const finalBrand = brand === 'Other' ? otherBrand.trim() : brand;
      const normalizedAmount = Number(receivedAmount);
      validatePositiveAmount(normalizedAmount, 'Received amount');
      const { error } = await supabase.from('receipts').insert({
        receipt_number: receiptNumber,
        order_id: onAccountOf === 'Invoice' ? selectedOrderId : null,
        customer_id: finalCustomerId,
        amount: normalizedAmount,
        payment_mode: modeOfReceipt,
        payment_status: DEFAULT_RECEIPT_STATUS,
        company,
        brand: sanitizeText(finalBrand, LIMITS.mediumText),
        received_date: receivedDate,
        cheque_number: sanitizeUpperAlnum(chequeNumber, LIMITS.mediumText) || null,
        cheque_date: chequeDate || null,
        on_account_of: onAccountOf,
        recorded_by: user?.id ?? null,
      });
      if (error) throw error;
      toast.success(`Receipt ${receiptNumber} saved!`);
      navigate('/sales/my-collection');
    } catch (err: any) { toast.error(err.message || 'Failed to save receipt'); } finally { setLoading(false); }
  };

  const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all flex items-center gap-1 ${active ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20' : 'border-border text-muted-foreground hover:bg-muted/50'}`}>
      {active && <Check size={12} />}
      {children}
    </button>
  );

  const hasUnsavedInput = Boolean(
    company || modeOfReceipt || brand || otherBrand || selectedCustomerId || customerName || customerPhone ||
    customerAddress || customerGst || receivedAmount || receivedDate || onAccountOf || selectedOrderId || chequeNumber || chequeDate
  );

  const handleCancel = () => {
    if (!hasUnsavedInput || window.confirm('Discard this receipt entry? Unsaved changes will be lost.')) {
      navigate(-1);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-xl py-4 border-b border-border/40 -mx-4 px-4 sm:-mx-6 sm:px-6 mb-6">
        <div>
          <button onClick={handleCancel} className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors">
            <ArrowLeft size={14} /> Back to Collection
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3">
            <ReceiptText className="h-8 w-8 text-primary opacity-80" />
            Receipt Entry
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Record customer payment allocations securely against invoices or as advances.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 relative">
        
        {/* Section 1: Entity & Mode */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md shadow-sm overflow-hidden transition-all hover:border-slate-300/80 dark:hover:border-slate-700">
          <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Transaction Routing</h3>
              <p className="text-xs text-slate-500">Legal entity and payment medium</p>
            </div>
          </div>
          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            <div className="space-y-2 group">
              <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Company Entity <span className="text-rose-500">*</span></Label>
              <Select value={company} onValueChange={(value) => setCompany(value as CompanyEnum)}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20"><SelectValue placeholder="Select company branch" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {COMPANY_LIST.map((companyKey) => (
                    <SelectItem key={companyKey} value={companyKey}>{getCompanyDisplayName(companyKey, companyProfiles)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 group">
              <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Mode of Receipt <span className="text-rose-500">*</span></Label>
              <Select value={modeOfReceipt} onValueChange={(value) => setModeOfReceipt(value as PaymentModeEnum)}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20"><SelectValue placeholder="Select payment channel" /></SelectTrigger>
                <SelectContent className="rounded-xl"><SelectItem value="Cash">Cash Currency</SelectItem><SelectItem value="Cheque">Bank Cheque</SelectItem><SelectItem value="Bank Transfer">NEFT / RTGS</SelectItem><SelectItem value="UPI">UPI / Digital</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 2: Financial Amount */}
        <div className="rounded-3xl border border-teal-200/50 dark:border-teal-900/30 bg-gradient-to-br from-teal-50/30 to-cyan-50/10 dark:from-teal-950/20 dark:to-cyan-950/10 backdrop-blur-md shadow-sm overflow-hidden relative">
          <div className="absolute right-0 top-0 w-64 h-64 bg-teal-400/10 dark:bg-teal-400/5 blur-3xl opacity-50 pointer-events-none rounded-full" />
          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div className="space-y-3 md:col-span-2 lg:col-span-1">
              <Label className="text-xs uppercase tracking-wider text-teal-700 dark:text-teal-400 font-bold">Received Amount <span className="text-rose-500">*</span></Label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors">
                  <IndianRupee size={24} />
                </div>
                <Input type="number" min="0.01" step="0.01" value={receivedAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReceivedAmount(sanitizeDecimalInput(e.target.value))} placeholder="0.00" required className="pl-12 h-16 text-3xl font-bold font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-inner rounded-2xl focus-visible:ring-teal-500/30" />
              </div>
            </div>
            <div className="space-y-3">
               <Label className="text-xs uppercase tracking-wider text-teal-700 dark:text-teal-400 font-bold">Received Date <span className="text-rose-500">*</span></Label>
               <div className="relative group">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors">
                   <Calendar size={18} />
                 </div>
                 <Input type="date" value={receivedDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReceivedDate(e.target.value)} required className="pl-12 h-16 text-lg font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-inner rounded-2xl focus-visible:ring-teal-500/30 [&::-webkit-calendar-picker-indicator]:opacity-50" />
               </div>
            </div>
          </div>
        </div>

        {/* Section 3: Brand */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md shadow-sm overflow-hidden transition-all hover:border-slate-300/80 dark:hover:border-slate-700">
          <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Tag size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Brand Assignment</h3>
              <p className="text-xs text-slate-500">Internal metrics tagging</p>
            </div>
          </div>
          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            <div className="space-y-2 group">
              <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Ref Brand <span className="text-rose-500">*</span></Label>
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"><SelectValue placeholder="Select primary brand" /></SelectTrigger>
                <SelectContent className="rounded-xl">{brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {brand === 'Other' && (
              <div className="space-y-2 group animate-in slide-in-from-left-4 duration-300">
                <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Custom Brand <span className="text-rose-500">*</span></Label>
                  <Input value={otherBrand} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtherBrand(sanitizeText(e.target.value, LIMITS.mediumText))} placeholder="Type manually..." required maxLength={LIMITS.mediumText} className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50" />
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Customer Details */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md shadow-sm overflow-hidden transition-all hover:border-slate-300/80 dark:hover:border-slate-700">
          <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                <User size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Customer Profile</h3>
                <p className="text-xs text-slate-500">Target identity for ledger entry</p>
              </div>
            </div>
            <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800 rounded-xl">
              <button type="button" onClick={() => handleCustomerTypeChange('existing')} className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${customerType === 'existing' ? 'bg-white dark:bg-slate-700 text-primary scale-100 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 scale-95'}`}>Existing</button>
              <button type="button" onClick={() => handleCustomerTypeChange('new')} className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${customerType === 'new' ? 'bg-white dark:bg-slate-700 text-primary scale-100 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 scale-95'}`}>New Customer</button>
            </div>
          </div>
          
          <div className="p-6 md:p-8 animate-in fade-in duration-300">
            {customerType === 'existing' ? (
              <div className="space-y-3 group max-w-xl">
                <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Lookup Directory <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <Select value={selectedCustomerId} onValueChange={handleCustomerSelect}>
                    <SelectTrigger className="h-14 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-700 text-base"><SelectValue placeholder="Search by name or phone..." /></SelectTrigger>
                    <SelectContent className="rounded-2xl max-h-[300px]">{customers.map(c => <SelectItem key={c.id} value={c.id} className="py-3 font-medium">{c.name} <span className="text-slate-400 text-xs ml-2 font-mono">({c.phone})</span></SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-2 md:col-span-2 group">
                  <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary">Legal Name <span className="text-rose-500">*</span></Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(sanitizeText(e.target.value, LIMITS.longText))} placeholder="Full business or personal name" required maxLength={LIMITS.longText} className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50" />
                </div>
                <div className="space-y-2 group">
                  <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary">Contact Number <span className="text-rose-500">*</span></Label>
                  <div className="relative">
                    <Input type="tel" value={customerPhone} onChange={(e) => { setCustomerPhone(sanitizePhone(e.target.value)); setPhoneAutoFilled(false); }} placeholder="Primary phone" required maxLength={LIMITS.phone} className={`h-12 rounded-xl ${phoneAutoFilled ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 dark:bg-slate-800/50'}`} />
                    {phoneAutoFilled && <Info size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary" />}
                  </div>
                </div>
                <div className="space-y-2 group">
                  <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary">Tax ID (GST/PAN)</Label>
                  <div className="relative">
                    <Input value={customerGst} onChange={(e) => { setCustomerGst(sanitizeUpperAlnum(e.target.value, LIMITS.gstin)); setGstAutoFilled(false); }} placeholder="Optional tax reference" maxLength={LIMITS.gstin} className={`h-12 rounded-xl ${gstAutoFilled ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 dark:bg-slate-800/50'}`} />
                    {gstAutoFilled && <Info size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary" />}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2 group">
                  <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary">Billing/Shipping Address <span className="text-rose-500">*</span></Label>
                  <Textarea value={customerAddress} onChange={(e) => { setCustomerAddress(sanitizeMultilineText(e.target.value, LIMITS.address)); setAddressAutoFilled(false); }} placeholder="Complete regional address..." rows={3} required maxLength={LIMITS.address} className={`resize-none rounded-xl ${addressAutoFilled ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 dark:bg-slate-800/50'}`} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Target Allocation */}
        <div className="rounded-3xl border border-rose-200/50 dark:border-rose-900/30 bg-gradient-to-tr from-rose-50/20 to-orange-50/10 dark:from-rose-950/10 dark:to-orange-950/10 backdrop-blur-md shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-rose-200/40 dark:border-rose-800/40 bg-white/40 dark:bg-slate-900/40 flex items-center gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Fund Allocation</h3>
              <p className="text-xs text-slate-500">Settle against a billed invoice or hold the amount as advance</p>
            </div>
          </div>
          
          <div className="p-6 md:p-8 space-y-6">
            <div className="space-y-2 max-w-sm group">
              <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-rose-600">Allocation Type <span className="text-rose-500">*</span></Label>
                <Select value={onAccountOf} onValueChange={v => { setOnAccountOf(v as 'Invoice' | 'Advance'); setSelectedOrderId(''); }}>
                  <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-900"><SelectValue placeholder="Declare intent" /></SelectTrigger>
                  <SelectContent className="rounded-xl"><SelectItem value="Invoice">Against Billed Invoice</SelectItem><SelectItem value="Advance">Credit as Advance Hold</SelectItem></SelectContent>
                </Select>
              </div>

            {onAccountOf === 'Invoice' && invoiceCustomerId && (
              <div className="space-y-2 group animate-in fade-in slide-in-from-bottom-2">
                <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-rose-600">Select Billed Invoice <span className="text-rose-500">*</span></Label>
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger className="h-auto py-3 rounded-xl bg-white dark:bg-slate-900 shadow-inner border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Choose billed invoice..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-[300px]">
                    {customerFilteredOrders.map(o => (
                      <SelectItem key={o.id} value={o.id} className="py-2.5">
                        <div className="flex flex-col gap-1 w-full text-left">
                          <span className="font-bold text-foreground text-sm uppercase tracking-wide">{o.invoice_number ?? o.order_number}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground w-full">
                           <span className="truncate max-w-[150px] font-medium">{o.customers?.name}</span>
                            <span className="shrink-0 opacity-40">•</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-1.5 rounded">₹{o.grand_total?.toLocaleString('en-IN')}</span>
                            <span className="shrink-0 opacity-40">•</span>
                            <span className="font-mono">{new Date(o.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                    {customerFilteredOrders.length === 0 && <SelectItem value="none" disabled>No billed invoices linked to this customer</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {onAccountOf === 'Invoice' && !invoiceCustomerId && (
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-500 flex items-center gap-3">
                <Info size={18} />
                Map a Customer Identity first to query outstanding records.
              </div>
            )}
          </div>
        </div>

        {/* Section 6: Cheque Options */}
        {modeOfReceipt === 'Cheque' && (
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4">
             <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cheque Parameters</h3>
             </div>
             <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 group">
                  <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary">Reference ID <span className="text-rose-500">*</span></Label>
                  <Input value={chequeNumber} onChange={(e) => setChequeNumber(sanitizeUpperAlnum(e.target.value, LIMITS.mediumText))} placeholder="000123" required maxLength={LIMITS.mediumText} className="h-12 rounded-xl bg-slate-50 font-mono text-lg" />
                </div>
                <div className="space-y-2 group">
                  <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary">Instrument Date <span className="text-rose-500">*</span></Label>
                  <Input type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} required className="h-12 rounded-xl bg-slate-50 font-medium" />
                </div>
             </div>
          </div>
        )}

        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3 text-xs text-amber-700 dark:text-amber-500 flex items-start gap-3 w-max max-w-full">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 opacity-80" />
          <span className="font-medium leading-relaxed">Cross-check selected invoice and nominal values. Receipt finalization permanently impacts customer ledger balance.</span>
        </div>

        <div className="sticky bottom-4 z-30 bg-background/90 backdrop-blur-xl shadow-2xl rounded-[1.5rem] border border-slate-200/80 dark:border-slate-700 p-4 w-full flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between transform transition-all hover:bg-background/95 mt-8">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-2 flex-1 min-w-0">Fields dotted directly with <span className="text-rose-500">*</span> are mandatory.</p>
          <div className="flex gap-3 w-full sm:w-auto shrink-0">
            <Button type="button" variant="outline" onClick={handleCancel} className="flex-1 sm:flex-none h-12 px-6 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold transition-all">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 sm:flex-none h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold tracking-wide shadow-lg hover:shadow-primary/25 transition-all outline-none text-sm whitespace-nowrap">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Committing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Confirm Receipt <ChevronRight size={16} />
                </div>
              )}
            </Button>
          </div>
        </div>

      </form>
    </div>
  );
};
