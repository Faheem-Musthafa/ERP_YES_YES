import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useNavigate } from 'react-router';
import { ArrowLeft, Info, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import { FormSection, FormCard, PageHeader } from '@/app/components/ui/primitives';
import type { PaymentModeEnum } from '@/app/types/database';

const mapMode = (m: string): PaymentModeEnum => (m === 'Bank' ? 'Bank Transfer' : m as PaymentModeEnum);

const MODE_STATUSES: Record<string, string[]> = {
  Cash: ['Received', 'Not Received'],
  Cheque: ['Cleared', 'Bounced'],
  Bank: ['Credited'],
  UPI: ['Received'],
};

export const ReceiptEntry = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [brands, setBrands] = useState<string[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [approvedOrders, setApprovedOrders] = useState<any[]>([]);

  const [company, setCompany] = useState('');
  const [modeOfReceipt, setModeOfReceipt] = useState('');
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
  const [receivedDate, setReceivedDate] = useState('');
  const [onAccountOf, setOnAccountOf] = useState<'Invoice' | 'Advance' | ''>('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: custData, error: custError }, { data: ordData, error: ordError }, { data: brandData, error: brandError }] = await Promise.all([
          supabase.from('customers').select('id, name, phone, address, gst_pan').eq('is_active', true).order('name'),
          supabase.from('orders').select('id, order_number, invoice_number, grand_total, created_at, customer_id, customers(name)').eq('status', 'Approved').order('created_at', { ascending: false }),
          supabase.from('brands').select('name').eq('is_active', true).order('name'),
        ]);

        if (custError) throw custError;
        if (ordError) throw ordError;
        if (brandError) throw brandError;

        if (custData) setCustomers(custData);
        if (ordData) setApprovedOrders(ordData);
        if (brandData) setBrands([...brandData.map((b: any) => b.name), 'Other']);
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
    if (!onAccountOf) { toast.error('Please select On Account Of'); return; }
    if (onAccountOf === 'Invoice' && !selectedOrderId) { toast.error('Please select an invoice'); return; }
    if (!receivedAmount || !receivedDate) { toast.error('Please enter amount and date'); return; }

    setLoading(true);
    try {
      let finalCustomerId = selectedCustomerId;
      if (customerType === 'new') {
        const { data: newCust, error: errC } = await supabase.from('customers').insert({
          name: customerName, phone: customerPhone, address: customerAddress, gst_pan: customerGst || null, is_active: true
        }).select('id').single();
        if (errC) throw errC;
        finalCustomerId = newCust.id;
      }

      const receiptNumber = `RCPT-${Date.now()}`;
      const paymentStatus = MODE_STATUSES[modeOfReceipt]?.[0] ?? null;
      const { error } = await supabase.from('receipts').insert({
        receipt_number: receiptNumber,
        customer_id: finalCustomerId,
        order_id: onAccountOf === 'Invoice' ? selectedOrderId : null,
        amount: Number(receivedAmount),
        payment_mode: mapMode(modeOfReceipt),
        payment_status: paymentStatus,
        company: company || null,
        brand: brand === 'Other' ? otherBrand : brand || null,
        received_date: receivedDate || null,
        cheque_number: chequeNumber || null,
        cheque_date: chequeDate || null,
        on_account_of: onAccountOf || null,
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
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Receipt Entry"
        subtitle="Record customer payment against invoice or advance"
        actions={(
          <Button variant="ghost" size="sm" onClick={handleCancel} className="gap-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        )}
      />

      <FormCard>
        <form onSubmit={handleSubmit} className="space-y-8">

          <FormSection title="Receipt Details" subtitle="Start with legal entity and payment mode before tagging customer allocation.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5"><Label>Company <span className="text-destructive">*</span></Label>
                <Select value={company} onValueChange={setCompany}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent><SelectItem value="LLP">LLP</SelectItem><SelectItem value="YES YES">YES YES</SelectItem><SelectItem value="Zekon">Zekon</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Mode of Receipt <span className="text-destructive">*</span></Label>
                <Select value={modeOfReceipt} onValueChange={setModeOfReceipt}>
                  <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                  <SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Cheque">Cheque</SelectItem><SelectItem value="Bank">Bank Transfer</SelectItem><SelectItem value="UPI">UPI</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </FormSection>

          <FormSection title="Brand Assignment" subtitle="Assign internal brand reference for downstream reporting.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5"><Label>Ref Brand <span className="text-destructive">*</span></Label>
                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                  <SelectContent>{brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {brand === 'Other' && (
                <div className="space-y-1.5"><Label>Custom Brand <span className="text-destructive">*</span></Label>
                  <Input value={otherBrand} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtherBrand(e.target.value)} placeholder="Enter details..." required />
                </div>
              )}
            </div>
          </FormSection>

          <FormSection title="Customer Info" action={
            <div className="flex gap-2">
              <Pill active={customerType === 'existing'} onClick={() => handleCustomerTypeChange('existing')}>Existing</Pill>
              <Pill active={customerType === 'new'} onClick={() => handleCustomerTypeChange('new')}>New</Pill>
            </div>
          }>
            <div className="space-y-5">
              {customerType === 'existing' ? (
                <div className="space-y-1.5">
                  <Label>Select Customer <span className="text-destructive">*</span></Label>
                  <Select value={selectedCustomerId} onValueChange={handleCustomerSelect}>
                    <SelectTrigger><SelectValue placeholder="Search customers..." /></SelectTrigger>
                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Customer Name <span className="text-destructive">*</span></Label>
                    <Input value={customerName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerName(e.target.value)} placeholder="Enter name" required />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label>Phone <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Input type="tel" value={customerPhone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setCustomerPhone(e.target.value); setPhoneAutoFilled(false); }}
                          placeholder="Enter mobile..." required className={phoneAutoFilled ? 'bg-primary/5 border-primary/20' : ''} />
                        {phoneAutoFilled && <Info size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary" />}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>GST / PAN</Label>
                      <div className="relative">
                        <Input value={customerGst} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setCustomerGst(e.target.value); setGstAutoFilled(false); }}
                          placeholder="Optional" className={gstAutoFilled ? 'bg-primary/5 border-primary/20' : ''} />
                        {gstAutoFilled && <Info size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary" />}
                      </div>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Billing Address <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Textarea value={customerAddress} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { setCustomerAddress(e.target.value); setAddressAutoFilled(false); }}
                          placeholder="Enter address..." rows={2} required className={`resize-none ${addressAutoFilled ? 'bg-primary/5 border-primary/20' : ''}`} />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </FormSection>

          <FormSection title="Financial Allocation" subtitle="Map received amount either against an invoice or as advance.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label>Amount Received (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" value={receivedAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReceivedAmount(e.target.value)} placeholder="0.00" required className="font-mono text-lg" />
              </div>
              <div className="space-y-1.5">
                <Label>Received Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={receivedDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReceivedDate(e.target.value)} required />
              </div>

              <div className="space-y-1.5 md:col-span-2"><Label>On Account Of <span className="text-destructive">*</span></Label>
                <Select value={onAccountOf} onValueChange={v => { setOnAccountOf(v as 'Invoice' | 'Advance'); setSelectedOrderId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Invoice or Advance?" /></SelectTrigger>
                  <SelectContent><SelectItem value="Invoice">Against Invoice/Order</SelectItem><SelectItem value="Advance">Advance Payment</SelectItem></SelectContent>
                </Select>
              </div>

              {onAccountOf === 'Invoice' && (
                <div className="space-y-1.5 md:col-span-2"><Label>Select Invoice <span className="text-destructive">*</span></Label>
                  <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                    <SelectTrigger className="h-auto py-2"><SelectValue placeholder="Select an approved invoice..." /></SelectTrigger>
                    <SelectContent>
                      {approvedOrders.filter(o => !selectedCustomerId || o.customer_id === selectedCustomerId).map(o => (
                        <SelectItem key={o.id} value={o.id}>
                          <div className="flex flex-col py-0.5 space-y-0.5">
                            <span className="font-semibold text-foreground">{o.invoice_number ?? o.order_number}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground w-full">
                              <span className="truncate max-w-[120px]">{o.customers?.name}</span>
                              <span className="shrink-0">•</span>
                              <span className="font-mono text-primary font-medium">₹{o.grand_total?.toLocaleString('en-IN')}</span>
                              <span className="shrink-0">•</span>
                              <span className="font-mono">{new Date(o.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                      {approvedOrders.filter(o => !selectedCustomerId || o.customer_id === selectedCustomerId).length === 0 && (
                        <SelectItem value="none" disabled>No pending invoices for this customer</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </FormSection>

          {modeOfReceipt === 'Cheque' && (
            <FormSection title="Cheque Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5"><Label>Cheque/Ref Number <span className="text-destructive">*</span></Label>
                  <Input value={chequeNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChequeNumber(e.target.value)} placeholder="Enter ref..." required />
                </div>
                <div className="space-y-1.5"><Label>Cheque/Transfer Date <span className="text-destructive">*</span></Label>
                  <Input type="date" value={chequeDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChequeDate(e.target.value)} required />
                </div>
              </div>
            </FormSection>
          )}

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>Before saving, verify invoice selection and amount. Receipt records are financial entries and should not be duplicated.</span>
          </div>

          <div className="sticky bottom-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 rounded-xl border border-border p-3 flex flex-col-reverse sm:flex-row gap-3 sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Required fields are marked with *. Use Cancel to safely discard this draft.</p>
            <div className="flex gap-3">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto min-w-[160px]">
              {loading ? 'Saving...' : 'Save Receipt'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
              Cancel
            </Button>
            </div>
          </div>
        </form>
      </FormCard>
    </div>
  );
};
