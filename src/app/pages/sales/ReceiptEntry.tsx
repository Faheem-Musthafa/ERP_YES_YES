import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useNavigate } from 'react-router';
import { ArrowLeft, Info, Check, AlertTriangle, IndianRupee, Tag, User, ReceiptText, Building2, Calendar, FileText, ChevronRight, Trash2 } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import { COMPANY_LIST, cloneCompanyProfiles, getCompanyDisplayName, loadCompanyProfiles } from '@/app/companyProfiles';
import type { CompanyEnum, PaymentModeEnum, ReceiptAllocationKindEnum } from '@/app/types/database';
import { DEFAULT_RECEIPT_STATUS } from '@/app/utils';
import { addDaysISO, todayLocalISO, validateDateNotInFuture } from '@/app/dates';
import { LIMITS, sanitizeChallanNumber, sanitizeNonNegativeDecimal, sanitizeText, sanitizeUpperAlnum, validatePositiveAmount } from '@/app/validation';

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  company: string | null;
  opening_invoice: number | null;
  opening_delivery_challan: number | null;
}

interface OrderOption {
  id: string;
  order_number: string;
  invoice_number: string | null;
  grand_total: number;
  created_at: string;
  customer_id: string | null;
}

interface SettleableTarget {
  key: string;
  kind: ReceiptAllocationKindEnum;
  target_order_id: string | null;
  label: string;
  sublabel: string;
  outstanding: number;
}

interface AllocationLine {
  uid: string;
  kind: ReceiptAllocationKindEnum;
  target_order_id: string | null;
  amount: string;
}

const formatCurrency = (n: number) => `₹ ${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const ReceiptEntry = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [brands, setBrands] = useState<string[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [companyProfiles, setCompanyProfiles] = useState(cloneCompanyProfiles());

  const [company, setCompany] = useState<CompanyEnum | ''>('');
  const [modeOfReceipt, setModeOfReceipt] = useState<PaymentModeEnum | ''>('');
  const [brand, setBrand] = useState('');
  const [otherBrand, setOtherBrand] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedDate, setReceivedDate] = useState(todayLocalISO());
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [loading, setLoading] = useState(false);

  const [customerOrders, setCustomerOrders] = useState<OrderOption[]>([]);
  const [paidPerOrder, setPaidPerOrder] = useState<Record<string, number>>({});
  const [paidOpeningInvoice, setPaidOpeningInvoice] = useState(0);
  const [paidOpeningDc, setPaidOpeningDc] = useState(0);
  const [targetsLoading, setTargetsLoading] = useState(false);

  const [allocations, setAllocations] = useState<AllocationLine[]>([]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;

  useEffect(() => {
    (async () => {
      try {
        const [{ data: custData, error: custError }, { data: brandData, error: brandError }, profiles] = await Promise.all([
          supabase
            .from('customers')
            .select('id, name, phone, company, opening_invoice, opening_delivery_challan')
            .eq('is_active', true)
            .order('name'),
          supabase.from('brands').select('name').eq('is_active', true).order('name'),
          loadCompanyProfiles().catch(() => null),
        ]);

        if (custError) throw custError;
        if (brandError) throw brandError;

        if (custData) setCustomers(custData as CustomerOption[]);
        if (brandData) setBrands([...brandData.map((b: { name: string }) => b.name), 'Other']);
        if (profiles) setCompanyProfiles(profiles);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load data');
      }
    })();
  }, []);

  // Load billable invoices + prior-paid totals for the selected customer.
  useEffect(() => {
    if (!selectedCustomerId) {
      setCustomerOrders([]);
      setPaidPerOrder({});
      setPaidOpeningInvoice(0);
      setPaidOpeningDc(0);
      setAllocations([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setTargetsLoading(true);
      try {
        const { data: ordData, error: ordError } = await supabase
          .from('orders')
          .select('id, order_number, invoice_number, grand_total, created_at, customer_id')
          .eq('customer_id', selectedCustomerId)
          .eq('status', 'Billed')
          .neq('invoice_type', 'Credit Note')
          .order('created_at', { ascending: false });
        if (ordError) throw ordError;
        const orders = (ordData ?? []) as OrderOption[];
        if (cancelled) return;
        setCustomerOrders(orders);

        const orderIds = orders.map((o) => o.id);
        // Allocations against these orders (new flow).
        const { data: allocData, error: allocError } = orderIds.length
          ? await supabase
              .from('receipt_allocations')
              .select('target_order_id, amount')
              .in('target_order_id', orderIds)
          : { data: [] as Array<{ target_order_id: string | null; amount: number }>, error: null };
        if (allocError) throw allocError;
        // Legacy single-row receipts (no allocations rows).
        const { data: legacyReceipts, error: legacyErr } = orderIds.length
          ? await supabase
              .from('receipts')
              .select('id, order_id, amount')
              .in('order_id', orderIds)
          : { data: [] as Array<{ id: string; order_id: string | null; amount: number }>, error: null };
        if (legacyErr) throw legacyErr;
        const legacyReceiptIds = (legacyReceipts ?? []).map((r) => r.id);
        const { data: receiptsWithAlloc, error: rwaErr } = legacyReceiptIds.length
          ? await supabase
              .from('receipt_allocations')
              .select('receipt_id')
              .in('receipt_id', legacyReceiptIds)
          : { data: [] as Array<{ receipt_id: string }>, error: null };
        if (rwaErr) throw rwaErr;
        const allocReceiptSet = new Set((receiptsWithAlloc ?? []).map((r) => r.receipt_id));

        const orderPaid: Record<string, number> = {};
        for (const a of allocData ?? []) {
          if (!a.target_order_id) continue;
          orderPaid[a.target_order_id] = (orderPaid[a.target_order_id] ?? 0) + Number(a.amount);
        }
        for (const r of legacyReceipts ?? []) {
          if (!r.order_id || allocReceiptSet.has(r.id)) continue;
          orderPaid[r.order_id] = (orderPaid[r.order_id] ?? 0) + Number(r.amount);
        }
        if (cancelled) return;
        setPaidPerOrder(orderPaid);

        // Opening-balance allocations already applied (they decrement the OB row,
        // so customer.opening_* already reflects remaining; paidOpening is just
        // for display in the audit trail).
        setPaidOpeningInvoice(0);
        setPaidOpeningDc(0);
        setAllocations([]);
      } catch (err: any) {
        if (!cancelled) toast.error(err.message || 'Failed to load customer outstanding records');
      } finally {
        if (!cancelled) setTargetsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCustomerId]);

  const settleableTargets = useMemo<SettleableTarget[]>(() => {
    const list: SettleableTarget[] = [];
    if (selectedCustomer) {
      const obInv = (selectedCustomer.opening_invoice ?? 0) - paidOpeningInvoice;
      const obDc = (selectedCustomer.opening_delivery_challan ?? 0) - paidOpeningDc;
      if (obInv > 0.009) {
        list.push({
          key: 'opening_invoice',
          kind: 'opening_invoice',
          target_order_id: null,
          label: 'Opening Balance — Invoice',
          sublabel: 'Carried forward',
          outstanding: obInv,
        });
      }
      if (obDc > 0.009) {
        list.push({
          key: 'opening_delivery_challan',
          kind: 'opening_delivery_challan',
          target_order_id: null,
          label: 'Opening Balance — Delivery Challan',
          sublabel: 'Carried forward',
          outstanding: obDc,
        });
      }
    }
    for (const o of customerOrders) {
      const remaining = Number(o.grand_total) - (paidPerOrder[o.id] ?? 0);
      if (remaining > 0.009) {
        list.push({
          key: `order:${o.id}`,
          kind: 'order',
          target_order_id: o.id,
          label: o.invoice_number || o.order_number,
          sublabel: `Bill ${new Date(o.created_at).toLocaleDateString('en-IN')}`,
          outstanding: remaining,
        });
      }
    }
    return list;
  }, [selectedCustomer, customerOrders, paidPerOrder, paidOpeningInvoice, paidOpeningDc]);

  const targetByKey = useMemo(() => {
    const m = new Map<string, SettleableTarget>();
    for (const t of settleableTargets) m.set(t.key, t);
    return m;
  }, [settleableTargets]);

  const allocationKey = (line: AllocationLine) =>
    line.kind === 'order' ? `order:${line.target_order_id}` : line.kind;

  // 'advance' is excluded from usedKeys so the user can keep adding to it via the
  // "Park as Advance" button rather than blocking re-selection.
  const usedKeys = useMemo(
    () => new Set(allocations.filter((l) => l.kind !== 'advance').map(allocationKey)),
    [allocations],
  );

  const allocatedSum = useMemo(
    () => allocations.reduce((acc, l) => acc + (parseFloat(l.amount) || 0), 0),
    [allocations],
  );
  const receivedNum = parseFloat(receivedAmount) || 0;
  const unallocated = receivedNum - allocatedSum;
  const unallocatedAbs = Math.abs(unallocated);
  const isBalanced = receivedNum > 0 && unallocatedAbs < 0.01;

  const addAllocation = (key: string) => {
    const target = targetByKey.get(key);
    if (!target) return;
    const remainingToAllocate = Math.max(0, unallocated);
    const fill = Math.min(target.outstanding, remainingToAllocate);
    setAllocations((prev) => [
      ...prev,
      {
        uid: crypto.randomUUID(),
        kind: target.kind,
        target_order_id: target.target_order_id,
        amount: fill > 0 ? fill.toFixed(2) : '',
      },
    ]);
  };

  const parkRemainingAsAdvance = () => {
    const remainder = unallocated;
    if (remainder <= 0.009) return;
    setAllocations((prev) => {
      const existing = prev.find((l) => l.kind === 'advance');
      if (existing) {
        const merged = (parseFloat(existing.amount) || 0) + remainder;
        return prev.map((l) => (l.uid === existing.uid ? { ...l, amount: merged.toFixed(2) } : l));
      }
      return [
        ...prev,
        { uid: crypto.randomUUID(), kind: 'advance', target_order_id: null, amount: remainder.toFixed(2) },
      ];
    });
  };

  const updateAllocationAmount = (uid: string, amount: string) => {
    setAllocations((prev) =>
      prev.map((l) => (l.uid === uid ? { ...l, amount: sanitizeNonNegativeDecimal(amount) } : l)),
    );
  };

  const removeAllocation = (uid: string) => {
    setAllocations((prev) => prev.filter((l) => l.uid !== uid));
  };

  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) { toast.error('Please select a customer'); return; }
    if (!company) { toast.error('Please select a company'); return; }
    if (!modeOfReceipt) { toast.error('Please select mode of receipt'); return; }
    if (!brand || (brand === 'Other' && !otherBrand.trim())) { toast.error('Please select a brand'); return; }
    if (!receivedAmount || !receivedDate) { toast.error('Please enter amount and date'); return; }
    try { validateDateNotInFuture(receivedDate, 'Received date'); } catch (err: any) { toast.error(err.message); return; }
    if (modeOfReceipt === 'Cheque' && (!chequeNumber.trim() || !chequeDate)) { toast.error('Please complete cheque details'); return; }

    const normalizedAmount = Number(receivedAmount);
    try { validatePositiveAmount(normalizedAmount, 'Received amount'); } catch (err: any) { toast.error(err.message); return; }

    if (allocations.length === 0) { toast.error('Add at least one allocation against an invoice or opening balance'); return; }

    // Per-line + per-target validation
    for (const line of allocations) {
      const amt = parseFloat(line.amount);
      if (!Number.isFinite(amt) || amt <= 0) { toast.error('Every allocation needs an amount greater than zero'); return; }
      if (line.kind === 'advance') continue; // Advance has no target/outstanding cap.
      const key = allocationKey(line);
      const target = targetByKey.get(key);
      if (!target) { toast.error('Allocation references a target that is no longer outstanding'); return; }
      if (amt > target.outstanding + 0.01) {
        toast.error(`Allocation against "${target.label}" exceeds remaining ${formatCurrency(target.outstanding)}`);
        return;
      }
    }

    if (!isBalanced) {
      toast.error(`Receipt cannot be saved with ${formatCurrency(unallocatedAbs)} ${unallocated > 0 ? 'unallocated' : 'over-allocated'}. Allocate the full amount before saving.`);
      return;
    }

    setLoading(true);
    try {
      // UUID avoids Date.now() collisions on concurrent submits before a server
      // allocator is in place.
      const receiptNumber = `RCPT-${crypto.randomUUID()}`;
      const finalBrand = brand === 'Other' ? otherBrand.trim() : brand;
      const onAccountOf = allocations.length === 1 && allocations[0].kind === 'order'
        ? 'Invoice'
        : allocations.length === 1 && allocations[0].kind === 'advance'
          ? 'Advance'
          : allocations.length === 1
            ? 'Opening Balance'
            : 'Mixed';

      const payload = {
        receipt_number: receiptNumber,
        customer_id: selectedCustomerId,
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
        allocations: allocations.map((l) => ({
          kind: l.kind,
          target_order_id: l.target_order_id,
          amount: parseFloat(l.amount),
        })),
      };

      const { error } = await supabase.rpc('create_receipt_with_allocations', { payload });
      if (error) throw error;
      toast.success(`Receipt ${receiptNumber} saved!`);
      navigate('/sales/my-collection');
    } catch (err: any) { toast.error(err.message || 'Failed to save receipt'); } finally { setLoading(false); }
  };

  const hasUnsavedInput = Boolean(
    company || modeOfReceipt || brand || otherBrand || selectedCustomerId
    || receivedAmount || allocations.length > 0 || chequeNumber || chequeDate,
  );

  const handleCancel = () => {
    if (!hasUnsavedInput || window.confirm('Discard this receipt entry? Unsaved changes will be lost.')) {
      navigate(-1);
    }
  };

  const remainingTargets = settleableTargets.filter((t) => !usedKeys.has(t.key));

  return (
    <div className="space-y-6 lg:space-y-8 pb-32 lg:pb-20 animate-in fade-in duration-500 max-w-4xl mx-auto">
      {/* Mobile header */}
      <div className="lg:hidden sm-font -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 px-4 pt-4 pb-3 bg-white border-b border-slate-200/70">
        <button
          type="button"
          onClick={handleCancel}
          className="sm-tap mb-1.5 text-[11px] font-bold tracking-wider uppercase text-[var(--sm-muted)] inline-flex items-center gap-1"
        >
          <ArrowLeft size={13} /> Back
        </button>
        <h1 className="sm-headline text-[24px] text-[var(--sm-text)] inline-flex items-center gap-2">
          <ReceiptText size={20} className="text-[var(--sm-primary)]" />
          New Receipt
        </h1>
        <p className="text-xs text-[var(--sm-muted)] mt-0.5">
          Record a customer payment and allocate it.
        </p>
      </div>

      {/* Desktop header */}
      <div className="hidden lg:flex flex-col gap-4 md:flex-row md:items-end md:justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-xl py-4 border-b border-border/40 -mx-4 px-4 sm:-mx-6 sm:px-6 mb-6">
        <div>
          <button onClick={handleCancel} className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors">
            <ArrowLeft size={14} /> Back to Collection
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3">
            <ReceiptText className="h-8 w-8 text-primary opacity-80" />
            Receipt Entry
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Record customer payment allocations against billed invoices and opening balances.
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
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Payment Details</h3>
              <p className="text-xs text-slate-500">Company and how it was paid</p>
            </div>
          </div>
          <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
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
              <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">How was it paid? <span className="text-rose-500">*</span></Label>
              <Select value={modeOfReceipt} onValueChange={(value) => setModeOfReceipt(value as PaymentModeEnum)}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20"><SelectValue placeholder="Select payment channel" /></SelectTrigger>
                <SelectContent className="rounded-xl"><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Cheque">Cheque</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem><SelectItem value="UPI">UPI</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Mobile — hero Indigo amount card */}
        <div className="lg:hidden sm-font relative overflow-hidden sm-gradient rounded-3xl p-5 shadow-[0_18px_40px_-20px_rgba(79,70,229,0.55)]">
          <div
            className="absolute -top-16 -right-16 h-44 w-44 rounded-full"
            style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.22), transparent 70%)' }}
            aria-hidden
          />
          <p className="relative sm-eyebrow text-white/80">Received Amount *</p>
          <div className="relative mt-2 flex items-center gap-2">
            <IndianRupee size={30} className="text-white/85 shrink-0" />
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(sanitizeNonNegativeDecimal(e.target.value))}
              placeholder="0"
              className="sm-headline w-full bg-transparent text-white text-[42px] tabular-nums tracking-tight outline-none placeholder:text-white/35"
            />
          </div>
          <div className="relative mt-4">
            <p className="sm-eyebrow text-white/80 mb-1.5">Received Date</p>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" />
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                max={todayLocalISO()}
                className="w-full h-12 sm-pill bg-white/15 text-white font-bold pl-10 pr-4 border border-white/20 outline-none focus:bg-white/20 [color-scheme:dark]"
              />
            </div>
          </div>
        </div>

        {/* Desktop — original teal amount section */}
        <div className="hidden lg:block rounded-3xl border border-teal-200/50 dark:border-teal-900/30 bg-gradient-to-br from-teal-50/30 to-cyan-50/10 dark:from-teal-950/20 dark:to-cyan-950/10 backdrop-blur-md shadow-sm overflow-hidden relative">
          <div className="absolute right-0 top-0 w-64 h-64 bg-teal-400/10 dark:bg-teal-400/5 blur-3xl opacity-50 pointer-events-none rounded-full" />
          <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div className="space-y-3 md:col-span-2 lg:col-span-1">
              <Label className="text-xs uppercase tracking-wider text-teal-700 dark:text-teal-400 font-bold">Received Amount <span className="text-rose-500">*</span></Label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors">
                  <IndianRupee size={24} />
                </div>
                <Input type="number" min="0.01" step="0.01" value={receivedAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReceivedAmount(sanitizeNonNegativeDecimal(e.target.value))} placeholder="0.00" className="pl-12 h-16 text-3xl font-bold font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-inner rounded-2xl focus-visible:ring-teal-500/30" />
              </div>
            </div>
            <div className="space-y-3">
               <Label className="text-xs uppercase tracking-wider text-teal-700 dark:text-teal-400 font-bold">Received Date <span className="text-rose-500">*</span></Label>
               <div className="relative group">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors">
                   <Calendar size={18} />
                 </div>
                 <Input type="date" value={receivedDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReceivedDate(e.target.value)} max={todayLocalISO()} className="pl-12 h-16 text-lg font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-inner rounded-2xl focus-visible:ring-teal-500/30 [&::-webkit-calendar-picker-indicator]:opacity-50" />
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
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tag a Brand</h3>
              <p className="text-xs text-slate-500">Used for sales reports</p>
            </div>
          </div>
          <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
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
          <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <User size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Customer Profile</h3>
              <p className="text-xs text-slate-500">Target identity for ledger entry</p>
            </div>
          </div>
          <div className="p-4 md:p-8 animate-in fade-in duration-300">
            <div className="space-y-3 group max-w-xl">
              <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Lookup Directory <span className="text-rose-500">*</span></Label>
              <Select value={selectedCustomerId} onValueChange={handleCustomerSelect}>
                <SelectTrigger className="h-14 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-700 text-base"><SelectValue placeholder="Search by name or phone..." /></SelectTrigger>
                <SelectContent className="rounded-2xl max-h-[300px]">{customers.map(c => <SelectItem key={c.id} value={c.id} className="py-3 font-medium"><span className="inline-flex items-center gap-2">{c.name} {c.company && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">{c.company}</span>}<span className="text-slate-400 text-xs font-mono">({c.phone})</span></span></SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 5: Allocations */}
        <div className="rounded-3xl border border-rose-200/50 dark:border-rose-900/30 bg-gradient-to-tr from-rose-50/20 to-orange-50/10 dark:from-rose-950/10 dark:to-orange-950/10 backdrop-blur-md shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-rose-200/40 dark:border-rose-800/40 bg-white/40 dark:bg-slate-900/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Against Billed Invoice</h3>
                <p className="text-xs text-slate-500">Settle the received amount across invoices and opening balances</p>
              </div>
            </div>
            <div className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-lg ${isBalanced ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'}`}>
              {isBalanced ? <span className="flex items-center gap-1"><Check size={12} /> Balanced</span> : `${formatCurrency(unallocatedAbs)} ${unallocated > 0 ? 'unallocated' : 'over'}`}
            </div>
          </div>

          <div className="p-4 md:p-8 space-y-5">
            {!selectedCustomerId && (
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-500 flex items-center gap-3">
                <Info size={18} />
                Select a customer first to load their outstanding invoices and opening balances.
              </div>
            )}

            {selectedCustomerId && targetsLoading && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" /> Loading outstanding records…
              </div>
            )}

            {selectedCustomerId && !targetsLoading && settleableTargets.length === 0 && allocations.length === 0 && (
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-500 flex items-center gap-3">
                <Check size={18} />
                Customer has no outstanding invoices or opening balance. Nothing to allocate against.
              </div>
            )}

            {selectedCustomerId && allocations.length > 0 && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Invoice / Opening Balance</th>
                      <th className="text-right px-4 py-3 font-semibold">Outstanding</th>
                      <th className="text-right px-4 py-3 font-semibold">Allocate</th>
                      <th className="px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                    {allocations.map((line) => {
                      const isAdvance = line.kind === 'advance';
                      const target = isAdvance ? null : targetByKey.get(allocationKey(line));
                      const outstanding = target?.outstanding ?? 0;
                      const amt = parseFloat(line.amount) || 0;
                      const overAllocatedLine = !isAdvance && amt > outstanding + 0.01;
                      const label = isAdvance ? 'Advance Hold' : (target?.label ?? 'Unknown');
                      const sublabel = isAdvance ? 'Unallocated credit on customer account' : (target?.sublabel ?? '');
                      return (
                        <tr key={line.uid} className={`${isAdvance ? 'bg-amber-50/40 dark:bg-amber-950/20' : 'bg-white/60 dark:bg-slate-900/40'}`}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground flex items-center gap-2">
                              {label}
                              {isAdvance && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 font-bold">Advance</span>}
                            </div>
                            <div className="text-xs text-muted-foreground">{sublabel}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">{isAdvance ? '—' : formatCurrency(outstanding)}</td>
                          <td className="px-4 py-3 text-right">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.amount}
                              onChange={(e) => updateAllocationAmount(line.uid, e.target.value)}
                              className={`h-10 w-32 ml-auto rounded-lg font-mono text-right ${overAllocatedLine ? 'border-rose-400 focus-visible:ring-rose-400/30' : ''}`}
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-2 py-3 text-right">
                            <button type="button" onClick={() => removeAllocation(line.uid)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors" title="Remove allocation">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {selectedCustomerId && !targetsLoading && (remainingTargets.length > 0 || unallocated > 0.009) && (
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
                {remainingTargets.length > 0 && (
                  <div className="space-y-2 flex-1">
                    <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Add allocation</Label>
                    <Select value="" onValueChange={(v) => v && addAllocation(v)}>
                      <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                        <SelectValue placeholder="Pick an invoice or opening balance to settle…" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl max-h-[300px]">
                        {remainingTargets.map((t) => (
                          <SelectItem key={t.key} value={t.key} className="py-2.5">
                            <div className="flex flex-col gap-0.5 w-full text-left">
                              <span className="font-bold text-foreground text-sm uppercase tracking-wide">{t.label}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground w-full">
                                <span>{t.sublabel}</span>
                                <span className="opacity-40">•</span>
                                <span className="font-mono text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/30 px-1.5 rounded">{formatCurrency(t.outstanding)}</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {unallocated > 0.009 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={parkRemainingAsAdvance}
                    className="h-12 px-5 rounded-xl border-amber-300 bg-amber-50/60 hover:bg-amber-100/70 dark:bg-amber-950/30 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold gap-2 shrink-0"
                  >
                    Park {formatCurrency(unallocated)} as Advance
                  </Button>
                )}
              </div>
            )}

            {selectedCustomerId && allocations.length > 0 && (
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Received</div>
                  <div className="font-mono font-bold text-base mt-1">{formatCurrency(receivedNum)}</div>
                </div>
                <div className="rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Allocated</div>
                  <div className="font-mono font-bold text-base mt-1">{formatCurrency(allocatedSum)}</div>
                </div>
                <div className={`rounded-xl border p-3 ${isBalanced ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40' : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/40'}`}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Unallocated</div>
                  <div className={`font-mono font-bold text-base mt-1 ${isBalanced ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>{formatCurrency(unallocatedAbs)}</div>
                </div>
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
             <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 group">
                  <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary">Reference ID <span className="text-rose-500">*</span></Label>
                  <Input value={chequeNumber} onChange={(e) => setChequeNumber(sanitizeChallanNumber(e.target.value, LIMITS.mediumText))} placeholder="000123" required maxLength={LIMITS.mediumText} className="h-12 rounded-xl bg-slate-50 font-mono text-lg" />
                </div>
                <div className="space-y-2 group">
                  <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary">Instrument Date <span className="text-rose-500">*</span></Label>
                  <Input type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} min={addDaysISO(todayLocalISO(), -180)} max={addDaysISO(todayLocalISO(), 180)} required className="h-12 rounded-xl bg-slate-50 font-medium" />
                </div>
             </div>
          </div>
        )}

        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3 text-xs text-amber-700 dark:text-amber-500 flex items-start gap-3 w-max max-w-full">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 opacity-80" />
          <span className="font-medium leading-relaxed">Receipt finalization permanently impacts customer ledger. Allocations against opening balances will reduce the customer's carried-forward balance.</span>
        </div>

        <div className="sticky bottom-24 lg:bottom-4 z-30 bg-background/90 backdrop-blur-xl shadow-2xl rounded-[1.5rem] border border-slate-200/80 dark:border-slate-700 p-4 w-full flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between transform transition-all hover:bg-background/95 mt-8">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-2 flex-1 min-w-0">Receipt cannot be saved until the received amount is fully allocated.</p>
          <div className="flex gap-3 w-full sm:w-auto shrink-0">
            <Button type="button" variant="outline" onClick={handleCancel} className="flex-1 sm:flex-none h-12 px-6 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold transition-all">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !isBalanced || allocations.length === 0} className="flex-1 sm:flex-none h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold tracking-wide shadow-lg hover:shadow-primary/25 transition-all outline-none text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
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
