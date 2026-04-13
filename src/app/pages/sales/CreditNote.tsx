import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { PageHeader, DataCard, EmptyState, Spinner } from '@/app/components/ui/primitives';
import { ArrowLeft, FilePlus2 } from 'lucide-react';
import { COMPANY_LIST, cloneCompanyProfiles, getCompanyDisplayName, loadCompanyProfiles } from '@/app/companyProfiles';
import type { CompanyEnum } from '@/app/types/database';

type CreditNoteType = 'GST Credit Note' | 'Non-GST Credit Note (e.g., Incentives / Bonotcoin / Discounts)';

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
}

interface BillOption {
  id: string;
  order_number: string;
  invoice_number: string | null;
  company: CompanyEnum;
  grand_total: number;
  created_at: string;
}

interface BillItem {
  product_id: string;
  product_name: string;
  sku: string;
  amount: number;
}

export const CreditNote = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [bills, setBills] = useState<BillOption[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [companyProfiles, setCompanyProfiles] = useState(cloneCompanyProfiles());

  const [company, setCompany] = useState<CompanyEnum | ''>('');
  const [creditNoteType, setCreditNoteType] = useState<CreditNoteType>('GST Credit Note');
  const [customerId, setCustomerId] = useState('');
  const [againstOrderId, setAgainstOrderId] = useState('');
  const [itemProductId, setItemProductId] = useState('');
  const [price, setPrice] = useState('');
  const [remark, setRemark] = useState('');

  const normalizeAmount = (value: number) => Math.abs(value || 0);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const [{ data, error }, profiles] = await Promise.all([
          supabase
            .from('customers')
            .select('id, name, phone')
            .eq('is_active', true)
            .order('name'),
          loadCompanyProfiles().catch(() => null),
        ]);

        if (error) throw error;
        setCustomers(data ?? []);
        if (profiles) {
          setCompanyProfiles(profiles);
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to load customers');
      } finally {
        setLoading(false);
      }
    };

    void fetchCustomers();
  }, []);

  useEffect(() => {
    const fetchBills = async () => {
      setAgainstOrderId('');
      setItemProductId('');
      setPrice('');
      setBillItems([]);

      if (!customerId || !company) {
        setBills([]);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, invoice_number, company, grand_total, created_at')
        .eq('customer_id', customerId)
        .eq('company', company)
        .in('status', ['Billed', 'Delivered'])
        .neq('invoice_type', 'Credit Note')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error(error.message || 'Failed to load bills');
        setBills([]);
        return;
      }

      setBills((data as BillOption[]) ?? []);
    };

    void fetchBills();
  }, [customerId, company]);

  useEffect(() => {
    const fetchBillItems = async () => {
      setItemProductId('');
      setPrice('');

      if (!againstOrderId) {
        setBillItems([]);
        return;
      }

      const { data, error } = await supabase
        .from('order_items')
        .select('product_id, amount, products(name, sku)')
        .eq('order_id', againstOrderId);

      if (error) {
        toast.error(error.message || 'Failed to load bill items');
        setBillItems([]);
        return;
      }

      const mapped: BillItem[] = (data ?? []).map((row: any) => ({
        product_id: row.product_id,
        product_name: row.products?.name ?? 'Product',
        sku: row.products?.sku ?? '-',
        amount: row.amount ?? 0,
      }));

      setBillItems(mapped);
    };

    void fetchBillItems();
  }, [againstOrderId]);

  const selectedItem = useMemo(
    () => billItems.find((item) => item.product_id === itemProductId),
    [billItems, itemProductId]
  );

  const selectedBill = useMemo(
    () => bills.find((bill) => bill.id === againstOrderId),
    [bills, againstOrderId]
  );

  const handleItemChange = (productId: string) => {
    setItemProductId(productId);
    const picked = billItems.find((item) => item.product_id === productId);
    if (picked) {
      const positiveAmount = normalizeAmount(picked.amount);
      setPrice(positiveAmount > 0 ? positiveAmount.toFixed(2) : '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!company) {
      toast.error('Please select company');
      return;
    }
    if (!creditNoteType) {
      toast.error('Please select credit note type');
      return;
    }
    if (!customerId) {
      toast.error('Please select customer');
      return;
    }
    if (!againstOrderId) {
      toast.error('Please select bill in Against');
      return;
    }
    if (!itemProductId) {
      toast.error('Please select item');
      return;
    }
    if (!remark.trim()) {
      toast.error('Please enter remark');
      return;
    }

    const noteAmount = Number(price);
    if (!Number.isFinite(noteAmount) || noteAmount <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    const maxAllowed = normalizeAmount(selectedItem?.amount ?? 0);
    if (maxAllowed > 0 && noteAmount > maxAllowed) {
      toast.error(`Credit amount cannot exceed selected item amount (₹${maxAllowed.toLocaleString('en-IN')})`);
      return;
    }

    setSaving(true);
    try {
      const orderNumber = `CN-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      const remarks = selectedBill
        ? `Type: ${creditNoteType}; Against Order: ${selectedBill.order_number}; Against Invoice: ${selectedBill.invoice_number ?? 'N/A'}; Remark: ${remark.trim()}`
        : `Type: ${creditNoteType}; Remark: ${remark.trim()}`;

      // Credit notes are financial reversals, so they must be stored as negative values.
      const signedNoteAmount = -noteAmount;

      const { data: createdOrder, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          company,
          invoice_type: 'Credit Note',
          customer_id: customerId,
          godown: null,
          site_address: '',
          remarks,
          delivery_date: null,
          subtotal: signedNoteAmount,
          total_discount: 0,
          grand_total: signedNoteAmount,
          status: 'Pending',
          created_by: user?.id ?? null,
          taxable_amount: creditNoteType === 'GST Credit Note' ? signedNoteAmount : 0,
          cgst_amount: 0,
          sgst_amount: 0,
          igst_amount: 0,
          tax_amount: 0,
        })
        .select('id')
        .single();

      if (orderErr) throw orderErr;

      const { error: itemErr } = await supabase.from('order_items').insert({
        order_id: createdOrder.id,
        product_id: itemProductId,
        quantity: 1,
        dealer_price: signedNoteAmount,
        discount_pct: 0,
        amount: signedNoteAmount,
      });

      if (itemErr) {
        await supabase.from('orders').delete().eq('id', createdOrder.id);
        throw itemErr;
      }

      toast.success(`Credit Note ${orderNumber} created`);
      navigate('/sales/my-orders');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create credit note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Credit Note"
        subtitle="Create customer credit notes against billed invoices"
        actions={
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/sales/create-order')} className="gap-2">
            <ArrowLeft size={16} /> Back to Create Order
          </Button>
        }
      />

      <DataCard className="p-6">
        {loading ? (
          <Spinner />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
              A credit note reduces what the customer owes against an already billed invoice.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">Company *</label>
                <Select value={company} onValueChange={(value) => setCompany(value as CompanyEnum)}>
                  <SelectTrigger className="h-10 rounded-xl text-sm bg-gray-50 border-gray-200 shadow-none">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_LIST.map((companyKey) => (
                      <SelectItem key={companyKey} value={companyKey}>
                        {getCompanyDisplayName(companyKey, companyProfiles)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">Credit Note Type *</label>
                <Select value={creditNoteType} onValueChange={(value) => setCreditNoteType(value as CreditNoteType)}>
                  <SelectTrigger className="h-10 rounded-xl text-sm bg-gray-50 border-gray-200 shadow-none">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GST Credit Note">GST Credit Note</SelectItem>
                    <SelectItem value="Non-GST Credit Note (e.g., Incentives / Bonotcoin / Discounts)">Non-GST Credit Note (e.g., Incentives / Bonotcoin / Discounts)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">Select Customer *</label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="h-10 rounded-xl text-sm bg-gray-50 border-gray-200 shadow-none">
                    <SelectValue placeholder="Choose customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} ({customer.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">Against (Customer Bills) *</label>
                <Select value={againstOrderId} onValueChange={setAgainstOrderId} disabled={!customerId || !company}>
                  <SelectTrigger className="h-10 rounded-xl text-sm bg-gray-50 border-gray-200 shadow-none">
                    <SelectValue placeholder={customerId && company ? 'Choose bill' : 'Select company and customer first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {bills.map((bill) => (
                      <SelectItem key={bill.id} value={bill.id}>
                        {bill.order_number} {bill.invoice_number ? `(${bill.invoice_number})` : ''} • ₹{normalizeAmount(bill.grand_total).toLocaleString('en-IN')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">Item Selection *</label>
                <Select value={itemProductId} onValueChange={handleItemChange} disabled={!againstOrderId}>
                  <SelectTrigger className="h-10 rounded-xl text-sm bg-gray-50 border-gray-200 shadow-none">
                    <SelectValue placeholder={againstOrderId ? 'Select bill item' : 'Select bill first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {billItems.map((item) => (
                      <SelectItem key={item.product_id} value={item.product_id}>
                        {item.product_name} ({item.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {creditNoteType === 'Non-GST Credit Note (e.g., Incentives / Bonotcoin / Discounts)' && (
                  <p className="text-xs text-muted-foreground">Non-GST Credit Note (e.g., Incentives / Bonotcoin / Discounts) selected.</p>
                )}
                {selectedItem && (
                  <p className="text-xs text-muted-foreground">Maximum for selected item: ₹{normalizeAmount(selectedItem.amount).toLocaleString('en-IN')}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">Price *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="h-10 rounded-xl bg-gray-50 border-gray-200 shadow-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500">Remark *</label>
              <Textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Enter reason or context for this credit note"
                className="min-h-[88px] rounded-xl bg-gray-50 border-gray-200 shadow-none"
              />
            </div>

            {customerId && company && bills.length === 0 && (
              <EmptyState icon={FilePlus2} message="No bills found for selected customer" sub="Only billed or delivered invoices are listed in Against for the selected company." />
            )}

            {againstOrderId && billItems.length === 0 && (
              <EmptyState icon={FilePlus2} message="No items found for selected bill" sub="Pick a different bill to continue." />
            )}

            <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              {selectedBill ? (
                <span>
                  Against: <span className="font-semibold text-foreground">{selectedBill.order_number}</span>
                  {selectedItem ? (
                    <>
                      {' '}
                      • Item: <span className="font-semibold text-foreground">{selectedItem.product_name}</span>
                    </>
                  ) : null}
                </span>
              ) : (
                <span>Select customer and bill to continue.</span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/sales/create-order')}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2" disabled={saving}>
                <FilePlus2 size={16} /> {saving ? 'Creating...' : 'Create Credit Note'}
              </Button>
            </div>
          </form>
        )}
      </DataCard>
    </div>
  );
};
