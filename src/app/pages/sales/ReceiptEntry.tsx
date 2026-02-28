import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useNavigate } from 'react-router';
import { ArrowLeft, Info } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import type { PaymentModeEnum } from '@/app/types/database';

const BRANDS = ['MITSUBISHI', 'PANASONIC', 'LG', 'TRANE', 'ESPA', 'KSB', 'HELLA', 'BONTON', 'BOSCH', 'STB', 'SWH', 'Vedion-WLC', 'INV-BT', 'INV-DU', 'LOWSIDE', 'MIT Switch-Gear', 'DAIKIN', 'Lucker', 'HAIER', 'Other'];

export const ReceiptEntry = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customers, setCustomers] = useState<any[]>([]);
  const [approvedOrders, setApprovedOrders] = useState<any[]>([]);

  const [company, setCompany] = useState('');
  const [modeOfReceipt, setModeOfReceipt] = useState<PaymentModeEnum | ''>('');
  const [brand, setBrand] = useState('');
  const [otherBrand, setOtherBrand] = useState('');
  const [customerType, setCustomerType] = useState('');
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
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: custData }, { data: ordData }] = await Promise.all([
        supabase.from('customers').select('id, name, phone, address, gst_pan').eq('is_active', true).order('name'),
        supabase.from('orders').select('id, order_number, grand_total, created_at, customers(name)').eq('status', 'Approved').order('created_at', { ascending: false }),
      ]);
      if (custData) setCustomers(custData);
      if (ordData) setApprovedOrders(ordData);
    };
    fetchData();
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

  // Map display mode to DB enum
  const mapMode = (m: string): PaymentModeEnum => {
    if (m === 'Bank') return 'Bank Transfer';
    return m as PaymentModeEnum;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) { toast.error('Please select an invoice/order'); return; }
    if (!receivedAmount || !receivedDate) { toast.error('Please enter amount and date'); return; }
    setLoading(true);
    try {
      const receiptNumber = `RCPT-${Date.now()}`;
      const { error } = await supabase.from('receipts').insert({
        receipt_number: receiptNumber,
        order_id: selectedOrderId,
        amount: Number(receivedAmount),
        payment_mode: mapMode(modeOfReceipt as string),
        recorded_by: user?.id ?? null,
      });
      if (error) throw error;
      toast.success(`Receipt ${receiptNumber} saved!`);
      navigate('/sales/my-collection');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save receipt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 text-sm text-gray-600">
        <span>Dashboard</span><span className="mx-2">/</span><span>Sales</span><span className="mx-2">/</span><span className="text-gray-900 font-medium">Receipt</span>
      </div>
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft size={20} className="mr-2" />Back</Button>
        <h1 className="text-2xl font-semibold text-gray-900">Receipt Entry</h1>
        <p className="text-gray-600 mt-1">Record customer receipt against invoice</p>
      </div>

      <Card className="p-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Receipt Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Company *</Label>
                <Select value={company} onValueChange={setCompany}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LLP">LLP</SelectItem>
                    <SelectItem value="YES YES">YES YES</SelectItem>
                    <SelectItem value="Zekon">Zekon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mode of Receipt *</Label>
                <Select value={modeOfReceipt} onValueChange={v => setModeOfReceipt(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank">Bank Transfer</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Brand</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Brand *</Label>
                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                  <SelectContent>{BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {brand === 'Other' && (
                <div className="space-y-2">
                  <Label>Enter Brand Name *</Label>
                  <Input value={otherBrand} onChange={e => setOtherBrand(e.target.value)} placeholder="Enter brand name" required />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Customer</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Customer Type *</Label>
                <Select value={customerType} onValueChange={handleCustomerTypeChange}>
                  <SelectTrigger><SelectValue placeholder="Select customer type" /></SelectTrigger>
                  <SelectContent><SelectItem value="existing">Existing</SelectItem><SelectItem value="new">New</SelectItem></SelectContent>
                </Select>
              </div>
              {customerType === 'existing' && (
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select value={selectedCustomerId} onValueChange={handleCustomerSelect}>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
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
                    <Input type="tel" value={customerPhone} onChange={e => { setCustomerPhone(e.target.value); setPhoneAutoFilled(false); }} placeholder="Phone number" required className={phoneAutoFilled ? 'bg-teal-50 pr-10' : ''} />
                    {phoneAutoFilled && <Info className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>GST / PAN</Label>
                  <div className="relative">
                    <Input value={customerGst} onChange={e => { setCustomerGst(e.target.value); setGstAutoFilled(false); }} placeholder="Optional" className={gstAutoFilled ? 'bg-teal-50 pr-10' : ''} />
                    {gstAutoFilled && <Info className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Address *</Label>
                  <Textarea value={customerAddress} onChange={e => { setCustomerAddress(e.target.value); setAddressAutoFilled(false); }} placeholder="Customer address" required rows={3} className={addressAutoFilled ? 'bg-teal-50' : ''} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Receipt Financials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Received Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">â‚¹</span>
                  <Input type="number" value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} placeholder="0.00" required className="pl-8" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Received Date *</Label>
                <Input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Against Invoice (Order) *</Label>
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                  <SelectContent>
                    {approvedOrders.map(o => (
                      <SelectItem key={o.id} value={o.id}>
                        <div className="flex flex-col py-1">
                          <span className="font-medium">{o.order_number}</span>
                          <span className="text-xs text-gray-500">{o.customers?.name} â€¢ â‚¹{o.grand_total?.toLocaleString('en-IN')} â€¢ {new Date(o.created_at).toLocaleDateString()}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {modeOfReceipt === 'Cheque' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Cheque Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label>Cheque Number *</Label><Input value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} placeholder="Cheque number" required /></div>
                <div className="space-y-2"><Label>Cheque Date *</Label><Input type="date" value={chequeDate} onChange={e => setChequeDate(e.target.value)} required /></div>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={loading}>{loading ? 'Saving...' : 'Save Receipt'}</Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
