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

type CreditNoteType = 'GST Credit Note' | 'NGST' | 'Not-GST Credit Note';
type NgstItemType = 'Incentive' | 'Discount' | 'Bonton Coin' | 'Others';

const NGST_ITEM_OPTIONS: NgstItemType[] = ['Incentive', 'Discount', 'Bonton Coin', 'Others'];

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
  brand_name: string;
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
  const [ngstItemType, setNgstItemType] = useState<NgstItemType | ''>('');
  const [ngstOtherItem, setNgstOtherItem] = useState('');
  const [brandName, setBrandName] = useState('');
  const [price, setPrice] = useState('');
  const [remark, setRemark] = useState('');

  const normalizeAmount = (value: number) => Math.abs(value || 0);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const [{ data: customerData, error: customerError }, profiles] = await Promise.all([
          supabase
            .from('customers')
            .select('id, name, phone')
            .eq('is_active', true)
            .order('name'),
          loadCompanyProfiles().catch(() => null),
        ]);

        if (customerError) throw customerError;

        setCustomers(customerData ?? []);
        if (profiles) {
          setCompanyProfiles(profiles);
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to load page data');
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

  const isNotGstCreditNote = creditNoteType === 'Not-GST Credit Note';
  const isOrderItemCreditNote = creditNoteType === 'GST Credit Note' || creditNoteType === 'NGST';

  useEffect(() => {
    if (isNotGstCreditNote) {
      setItemProductId('');
    } else {
      setNgstItemType('');
      setNgstOtherItem('');
      setBrandName('');
    }
  }, [creditNoteType, isNotGstCreditNote]);

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
        .select('product_id, amount, products(name, sku, brands(name))')
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
        brand_name: row.products?.brands?.name ?? '',
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

  const availableBillBrands = useMemo(
    () =>
      Array.from(
        new Set(
          billItems
            .map((item) => item.brand_name.trim())
            .filter((value) => value.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [billItems]
  );

  const resolvedNgstItemType = ngstItemType === 'Others' ? ngstOtherItem.trim() : ngstItemType;

  const handleItemChange = (productId: string) => {
    setItemProductId(productId);
    const picked = billItems.find((item) => item.product_id === productId);
    if (picked) {
      const positiveAmount = normalizeAmount(picked.amount);
      setPrice(positiveAmount > 0 ? positiveAmount.toFixed(2) : '');
    }
  };

  useEffect(() => {
    if (!isOrderItemCreditNote) return;
    if (billItems.length === 0) return;
    if (itemProductId && billItems.some((item) => item.product_id === itemProductId)) return;

    const firstBillItem = billItems[0];
    if (firstBillItem) {
      handleItemChange(firstBillItem.product_id);
    }
  }, [isOrderItemCreditNote, billItems, itemProductId]);

  useEffect(() => {
    if (!isNotGstCreditNote) return;
    if (!againstOrderId || availableBillBrands.length === 0) {
      setBrandName('');
      return;
    }
    if (!availableBillBrands.includes(brandName)) {
      setBrandName(availableBillBrands[0] ?? '');
    }
  }, [isNotGstCreditNote, againstOrderId, availableBillBrands, brandName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saving) return;

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
    if (isOrderItemCreditNote && !itemProductId) {
      toast.error('Please select item');
      return;
    }
    if (isOrderItemCreditNote && !selectedItem) {
      toast.error('Selected item is not available for this bill');
      return;
    }
    if (isNotGstCreditNote && !ngstItemType) {
      toast.error('Please select item type');
      return;
    }
    if (isNotGstCreditNote && ngstItemType === 'Others' && !ngstOtherItem.trim()) {
      toast.error('Please enter item type for Others');
      return;
    }
    if (isNotGstCreditNote && !brandName) {
      toast.error('Please select brand');
      return;
    }
    if (isNotGstCreditNote && availableBillBrands.length === 0) {
      toast.error('Selected bill has no brand-linked items for Not-GST credit note');
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

    if (isOrderItemCreditNote) {
      const maxAllowed = normalizeAmount(selectedItem?.amount ?? 0);
      if (maxAllowed > 0 && noteAmount > maxAllowed) {
        toast.error(`Credit amount cannot exceed selected item amount (₹${maxAllowed.toLocaleString('en-IN')})`);
        return;
      }
    } else {
      const maxAllowed = normalizeAmount(selectedBill?.grand_total ?? 0);
      if (maxAllowed > 0 && noteAmount > maxAllowed) {
        toast.error(`Credit amount cannot exceed selected bill total (₹${maxAllowed.toLocaleString('en-IN')})`);
        return;
      }
    }

    const resolvedProductId = isNotGstCreditNote
      ? (billItems.find((item) => item.brand_name === brandName)?.product_id ?? '')
      : itemProductId;

    if (!resolvedProductId) {
      toast.error('Selected bill has no items to map this credit note');
      return;
    }

    setSaving(true);
    try {
      const orderNumber = `CN-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      const remarkParts = selectedBill
        ? [
            `Type: ${creditNoteType}`,
            `Against Order: ${selectedBill.order_number}`,
            `Against Invoice: ${selectedBill.invoice_number ?? 'N/A'}`,
            isNotGstCreditNote ? `Not-GST Item: ${resolvedNgstItemType}` : null,
            isNotGstCreditNote ? `Brand: ${brandName}` : null,
            `Remark: ${remark.trim()}`,
          ]
        : [
            `Type: ${creditNoteType}`,
            isNotGstCreditNote ? `Not-GST Item: ${resolvedNgstItemType}` : null,
            isNotGstCreditNote ? `Brand: ${brandName}` : null,
            `Remark: ${remark.trim()}`,
          ];

      const remarks = remarkParts.filter((value): value is string => Boolean(value)).join('; ');

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
        product_id: resolvedProductId,
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
                    <SelectItem value="NGST">NGST</SelectItem>
                    <SelectItem value="Not-GST Credit Note">Not-GST Credit Note</SelectItem>
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
                <label className="text-xs font-semibold text-gray-500">{isNotGstCreditNote ? 'Item Selection *' : 'Ordered Item *'}</label>
                {isNotGstCreditNote ? (
                  <>
                    <Select value={ngstItemType} onValueChange={(value) => setNgstItemType(value as NgstItemType)} disabled={!againstOrderId}>
                      <SelectTrigger className="h-10 rounded-xl text-sm bg-gray-50 border-gray-200 shadow-none">
                        <SelectValue placeholder={againstOrderId ? 'Select item type' : 'Select bill first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {NGST_ITEM_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {ngstItemType === 'Others' && (
                      <Input
                        value={ngstOtherItem}
                        onChange={(e) => setNgstOtherItem(e.target.value)}
                        placeholder="Enter item type"
                        className="h-10 rounded-xl bg-gray-50 border-gray-200 shadow-none"
                      />
                    )}
                    <p className="text-xs text-muted-foreground">Use item type options like Incentive, Discount, Bonton Coin, or Others.</p>
                  </>
                ) : (
                  <>
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
                    {selectedItem && (
                      <p className="text-xs text-muted-foreground">Auto-selected from selected bill. Maximum for item: ₹{normalizeAmount(selectedItem.amount).toLocaleString('en-IN')}</p>
                    )}
                  </>
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

            {isNotGstCreditNote && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500">Brand *</label>
                  <Select value={brandName} onValueChange={setBrandName} disabled={!againstOrderId || availableBillBrands.length === 0}>
                    <SelectTrigger className="h-10 rounded-xl text-sm bg-gray-50 border-gray-200 shadow-none">
                      <SelectValue placeholder={againstOrderId ? 'Select bill brand' : 'Select bill first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBillBrands.map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {againstOrderId && availableBillBrands.length === 0 && (
                    <p className="text-xs text-muted-foreground">No brand information found on selected bill items.</p>
                  )}
                </div>
              </div>
            )}

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
                  {isOrderItemCreditNote && selectedItem ? (
                    <>
                      {' '}
                      • Item: <span className="font-semibold text-foreground">{selectedItem.product_name}</span>
                    </>
                  ) : null}
                  {isNotGstCreditNote && resolvedNgstItemType ? (
                    <>
                      {' '}
                      • Not-GST Item: <span className="font-semibold text-foreground">{resolvedNgstItemType}</span>
                    </>
                  ) : null}
                  {isNotGstCreditNote && brandName ? (
                    <>
                      {' '}
                      • Brand: <span className="font-semibold text-foreground">{brandName}</span>
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
