import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router';
import { ArrowLeft, Upload, Download, AlertTriangle, CheckCircle2, Loader2, Trash2, Info } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { PageHeader } from '@/app/components/ui/primitives';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import { COMPANY_LIST, cloneCompanyProfiles, getCompanyDisplayName, loadCompanyProfiles } from '@/app/companyProfiles';
import { DEFAULT_MASTER_DATA_SETTINGS, DEFAULT_ORDER_FORM_SETTINGS, loadMasterDataSettings, loadOrderFormSettings } from '@/app/settings';
import type { CompanyEnum, GodownEnum, InvoiceTypeEnum } from '@/app/types/database';
import { addMoney, mulMoney, pctMoney, roundMoney, toMoney, toNumber } from '@/app/money';

interface CustomerLookup { id: string; name: string; phone: string | null; company: string | null; }
interface ProductLookup { id: string; name: string; sku: string | null; dealer_price: number | null; }
interface SalespersonLookup { id: string; full_name: string; employee_id: string | null; }

interface ParsedItem {
  product_id: string;
  product_label: string;
  quantity: number;
  dealer_price: number;
  discount_pct: number;
  amount: number;
}

interface ParsedBill {
  order_ref: string;
  bill_date: string;            // YYYY-MM-DD — back-dated created_at + billed_at
  customer_id: string;
  customer_label: string;
  salesperson_id: string;
  salesperson_label: string;
  company: CompanyEnum;
  invoice_type: InvoiceTypeEnum;
  godown: GodownEnum;
  site_address: string;
  invoice_number: string | null;
  order_number_override: string | null;  // null = allocate at submit
  remarks: string | null;
  items: ParsedItem[];
  subtotal: number;
  total_discount: number;
  grand_total: number;
}

interface RowError { row: number; field?: string; message: string; }

const REQUIRED_COLUMNS = [
  'bill_date', 'order_ref', 'customer_phone', 'salesperson_employee_id', 'product_sku', 'quantity', 'dealer_price',
];
const OPTIONAL_COLUMNS = [
  'company', 'invoice_type', 'godown', 'site_address', 'discount_pct', 'invoice_number', 'order_number', 'remarks',
];

const INVOICE_TYPES: InvoiceTypeEnum[] = [
  'GST', 'NGST', 'IGST', 'Delivery Challan Out', 'Delivery Challan In', 'Stock Transfer', 'Credit Note', 'Accessories',
];

const norm = (v: unknown): string => (v == null ? '' : String(v)).trim();
const normKey = (v: unknown): string => norm(v).toLowerCase().replace(/\s+/g, '_');
const normPhone = (v: unknown): string => norm(v).replace(/[^\d]/g, '');

export const BulkBillUpload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [companyProfiles, setCompanyProfiles] = useState(cloneCompanyProfiles());
  const [godowns, setGodowns] = useState<string[]>(DEFAULT_MASTER_DATA_SETTINGS.Godowns.slice());
  const [defaultInvoiceType, setDefaultInvoiceType] = useState<InvoiceTypeEnum>(DEFAULT_ORDER_FORM_SETTINGS.defaultInvoiceType);

  const [defaultCompany, setDefaultCompany] = useState<CompanyEnum | ''>('');
  const [defaultInvType, setDefaultInvType] = useState<InvoiceTypeEnum | ''>('');
  const [defaultGodown, setDefaultGodown] = useState<GodownEnum | ''>('');

  const [customers, setCustomers] = useState<CustomerLookup[]>([]);
  const [products, setProducts] = useState<ProductLookup[]>([]);
  const [salespeople, setSalespeople] = useState<SalespersonLookup[]>([]);
  const [lookupsReady, setLookupsReady] = useState(false);

  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [bills, setBills] = useState<ParsedBill[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [imported, setImported] = useState(0);

  useEffect(() => {
    void loadCompanyProfiles().then(setCompanyProfiles).catch(() => undefined);
    void loadMasterDataSettings().then(s => setGodowns(s.Godowns ?? [])).catch(() => undefined);
    void loadOrderFormSettings().then(s => {
      setDefaultInvoiceType(s.defaultInvoiceType);
      setDefaultInvType(prev => prev || s.defaultInvoiceType);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!defaultCompany && COMPANY_LIST.length > 0) setDefaultCompany(COMPANY_LIST[0]);
  }, [defaultCompany]);

  useEffect(() => {
    if (!defaultGodown && godowns.length > 0) setDefaultGodown(godowns[0]);
  }, [defaultGodown, godowns]);

  useEffect(() => {
    (async () => {
      try {
        const [
          { data: custs, error: cErr },
          { data: prods, error: pErr },
          { data: sps, error: sErr },
        ] = await Promise.all([
          supabase.from('customers').select('id, name, phone, company').eq('is_active', true),
          supabase.from('products').select('id, name, sku, dealer_price').eq('is_active', true),
          supabase.from('users').select('id, full_name, employee_id').eq('role', 'sales').eq('is_active', true).is('deleted_at', null),
        ]);
        if (cErr) throw cErr;
        if (pErr) throw pErr;
        if (sErr) throw sErr;
        setCustomers((custs ?? []) as CustomerLookup[]);
        setProducts((prods ?? []) as ProductLookup[]);
        setSalespeople((sps ?? []) as SalespersonLookup[]);
        setLookupsReady(true);
      } catch (err: any) {
        toast.error(err?.message || 'Failed to load customers/products/salespeople');
      }
    })();
  }, []);

  const customerByPhone = useMemo(() => {
    const map = new Map<string, CustomerLookup>();
    customers.forEach(c => { const p = normPhone(c.phone); if (p) map.set(p, c); });
    return map;
  }, [customers]);

  const productBySku = useMemo(() => {
    const map = new Map<string, ProductLookup>();
    products.forEach(p => { const s = norm(p.sku).toLowerCase(); if (s) map.set(s, p); });
    return map;
  }, [products]);

  const salespersonByEmpId = useMemo(() => {
    const map = new Map<string, SalespersonLookup>();
    salespeople.forEach(s => { const e = norm(s.employee_id).toLowerCase(); if (e) map.set(e, s); });
    return map;
  }, [salespeople]);

  const handleDownloadTemplate = () => {
    const headers = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];
    const sampleEmp = salespeople[0]?.employee_id || 'EMP001';
    const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
    const sample = [
      {
        bill_date: yesterday, order_ref: 'BILL-001', customer_phone: '9999999999',
        salesperson_employee_id: sampleEmp, product_sku: 'SKU-A', quantity: 2, dealer_price: 1000,
        company: defaultCompany || COMPANY_LIST[0] || '', invoice_type: defaultInvType || defaultInvoiceType,
        godown: defaultGodown || godowns[0] || '', site_address: 'Customer site address',
        discount_pct: 5, invoice_number: 'INV-2024-0001', order_number: '', remarks: 'Optional remarks',
      },
      {
        bill_date: yesterday, order_ref: 'BILL-001', customer_phone: '9999999999',
        salesperson_employee_id: sampleEmp, product_sku: 'SKU-B', quantity: 1, dealer_price: 500,
        company: '', invoice_type: '', godown: '', site_address: '', discount_pct: 0,
        invoice_number: '', order_number: '', remarks: '',
      },
      {
        bill_date: yesterday, order_ref: 'BILL-002', customer_phone: '8888888888',
        salesperson_employee_id: sampleEmp, product_sku: 'SKU-C', quantity: 5, dealer_price: 250,
        company: defaultCompany || COMPANY_LIST[0] || '', invoice_type: defaultInvType || defaultInvoiceType,
        godown: defaultGodown || godowns[0] || '', site_address: 'Different site',
        discount_pct: 10, invoice_number: 'INV-2024-0002', order_number: '', remarks: '',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'bills');
    XLSX.writeFile(wb, 'bulk-bills-template.xlsx');
  };

  const reset = () => {
    setFileName('');
    setErrors([]);
    setBills([]);
    setImported(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = async (file: File) => {
    if (!lookupsReady) { toast.error('Customer/product/salesperson lookups still loading'); return; }
    if (!defaultCompany) { toast.error('Pick default company first'); return; }
    if (!defaultGodown) { toast.error('Pick default godown first'); return; }

    setParsing(true);
    setErrors([]);
    setBills([]);
    setImported(0);
    setFileName(file.name);

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error('Workbook has no sheets');
      const ws = wb.Sheets[sheetName];
      const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });

      if (json.length === 0) throw new Error('File is empty');

      const rows = json.map(r => {
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(r)) out[normKey(k)] = r[k];
        return out;
      });

      const headerKeys = new Set(Object.keys(rows[0]));
      const missing = REQUIRED_COLUMNS.filter(c => !headerKeys.has(c));
      if (missing.length > 0) throw new Error(`Missing required columns: ${missing.join(', ')}`);

      const rowErrors: RowError[] = [];
      const grouped = new Map<string, ParsedBill>();
      const todayIso = new Date().toISOString().slice(0, 10);

      rows.forEach((r, idx) => {
        const rowNum = idx + 2; // header is row 1
        const pushErr = (field: string, message: string) => rowErrors.push({ row: rowNum, field, message });

        const orderRef = norm(r.order_ref);
        const phone = normPhone(r.customer_phone);
        const empId = norm(r.salesperson_employee_id).toLowerCase();
        const sku = norm(r.product_sku).toLowerCase();
        const quantity = Number(r.quantity);
        const dealerPrice = Number(r.dealer_price);
        const discountPct = r.discount_pct === '' || r.discount_pct == null ? 0 : Number(r.discount_pct);

        if (!orderRef) pushErr('order_ref', 'Required');
        if (!phone) pushErr('customer_phone', 'Required');
        if (!empId) pushErr('salesperson_employee_id', 'Required');
        if (!sku) pushErr('product_sku', 'Required');
        if (!Number.isFinite(quantity) || quantity <= 0) pushErr('quantity', 'Must be > 0');
        if (!Number.isFinite(dealerPrice) || dealerPrice < 0) pushErr('dealer_price', 'Must be >= 0');
        if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100) pushErr('discount_pct', 'Must be 0-100');

        let billDate = '';
        const bdRaw = r.bill_date;
        if (bdRaw == null || bdRaw === '') {
          pushErr('bill_date', 'Required');
        } else if (bdRaw instanceof Date) {
          billDate = bdRaw.toISOString().slice(0, 10);
        } else {
          const s = norm(bdRaw);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) pushErr('bill_date', 'Must be YYYY-MM-DD');
          else billDate = s;
        }
        if (billDate && billDate > todayIso) pushErr('bill_date', 'Cannot be in the future');

        const customer = phone ? customerByPhone.get(phone) : undefined;
        if (phone && !customer) pushErr('customer_phone', `No active customer with phone ${phone}`);

        const salesperson = empId ? salespersonByEmpId.get(empId) : undefined;
        if (empId && !salesperson) pushErr('salesperson_employee_id', `No active sales user with employee_id ${empId}`);

        const product = sku ? productBySku.get(sku) : undefined;
        if (sku && !product) pushErr('product_sku', `No active product with SKU ${sku}`);

        const rowCompanyRaw = norm(r.company);
        const company = (rowCompanyRaw || defaultCompany) as CompanyEnum;
        if (rowCompanyRaw && !COMPANY_LIST.includes(rowCompanyRaw as CompanyEnum)) {
          pushErr('company', `Unknown company "${rowCompanyRaw}"`);
        }

        const rowInvRaw = norm(r.invoice_type);
        const invoiceType = (rowInvRaw || defaultInvType || defaultInvoiceType) as InvoiceTypeEnum;
        if (rowInvRaw && !INVOICE_TYPES.includes(rowInvRaw as InvoiceTypeEnum)) {
          pushErr('invoice_type', `Unknown invoice_type "${rowInvRaw}"`);
        }

        const rowGodownRaw = norm(r.godown);
        const godown = (rowGodownRaw || defaultGodown) as GodownEnum;
        if (rowGodownRaw && godowns.length > 0 && !godowns.includes(rowGodownRaw)) {
          pushErr('godown', `Unknown godown "${rowGodownRaw}"`);
        }

        const siteAddress = norm(r.site_address);
        const invoiceNumber = norm(r.invoice_number) || null;
        const orderNumberOverride = norm(r.order_number) || null;

        if (rowErrors.some(e => e.row === rowNum)) return;

        const existing = grouped.get(orderRef);
        if (existing) {
          if (existing.bill_date !== billDate) { pushErr('bill_date', `Conflicts with prior ${orderRef} bill_date`); return; }
          if (existing.customer_id !== customer!.id) { pushErr('customer_phone', `Conflicts with prior ${orderRef} customer`); return; }
          if (existing.salesperson_id !== salesperson!.id) { pushErr('salesperson_employee_id', `Conflicts with prior ${orderRef} salesperson`); return; }
          if (existing.company !== company) { pushErr('company', `Conflicts with prior ${orderRef} company`); return; }
          if (existing.invoice_type !== invoiceType) { pushErr('invoice_type', `Conflicts with prior ${orderRef} invoice_type`); return; }
          if (existing.godown !== godown) { pushErr('godown', `Conflicts with prior ${orderRef} godown`); return; }
        }

        const lineGross = mulMoney(toMoney(dealerPrice), quantity);
        const lineDiscount = pctMoney(lineGross, discountPct);
        const lineAmount = toMoney(toNumber(lineGross) - toNumber(lineDiscount));

        const item: ParsedItem = {
          product_id: product!.id,
          product_label: `${product!.name}${product!.sku ? ` (${product!.sku})` : ''}`,
          quantity,
          dealer_price: dealerPrice,
          discount_pct: discountPct,
          amount: toNumber(roundMoney(lineAmount)),
        };

        if (existing) {
          existing.items.push(item);
          existing.subtotal = toNumber(roundMoney(addMoney(toMoney(existing.subtotal), lineGross)));
          existing.total_discount = toNumber(roundMoney(addMoney(toMoney(existing.total_discount), lineDiscount)));
          existing.grand_total = toNumber(roundMoney(addMoney(toMoney(existing.grand_total), lineAmount)));
        } else {
          grouped.set(orderRef, {
            order_ref: orderRef,
            bill_date: billDate,
            customer_id: customer!.id,
            customer_label: `${customer!.name}${customer!.phone ? ` (${customer!.phone})` : ''}`,
            salesperson_id: salesperson!.id,
            salesperson_label: `${salesperson!.full_name}${salesperson!.employee_id ? ` (${salesperson!.employee_id})` : ''}`,
            company,
            invoice_type: invoiceType,
            godown,
            site_address: siteAddress,
            invoice_number: invoiceNumber,
            order_number_override: orderNumberOverride,
            remarks: norm(r.remarks) || null,
            items: [item],
            subtotal: toNumber(roundMoney(lineGross)),
            total_discount: toNumber(roundMoney(lineDiscount)),
            grand_total: toNumber(roundMoney(lineAmount)),
          });
        }
      });

      if (rowErrors.length > 0) {
        setErrors(rowErrors);
        setBills([]);
        toast.error(`File rejected — ${rowErrors.length} error${rowErrors.length === 1 ? '' : 's'} found`);
        return;
      }

      const parsedBills = Array.from(grouped.values());
      setBills(parsedBills);
      toast.success(`Parsed ${parsedBills.length} bill${parsedBills.length === 1 ? '' : 's'} from ${rows.length} row${rows.length === 1 ? '' : 's'}`);
    } catch (err: any) {
      setErrors([{ row: 0, message: err?.message || 'Failed to parse file' }]);
      toast.error(err?.message || 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const allocateOrderNumber = async (company: CompanyEnum): Promise<string> => {
    try {
      const { data, error } = await supabase.rpc('allocate_order_number', { p_company: company });
      if (error) throw error;
      if (typeof data === 'string' && data.length > 0) return data;
    } catch {
      // fall through to UUID fallback
    }
    return `ORD-${crypto.randomUUID()}`;
  };

  const handleSubmit = async () => {
    if (bills.length === 0 || submitting) return;
    setSubmitting(true);
    const insertedIds: string[] = [];
    try {
      for (let i = 0; i < bills.length; i += 1) {
        const b = bills[i];
        const orderNumber = b.order_number_override ?? await allocateOrderNumber(b.company);
        const billedAtIso = `${b.bill_date}T00:00:00Z`;

        const { data: orderRow, error: ordErr } = await supabase.from('orders').insert({
          order_number: orderNumber,
          company: b.company,
          invoice_type: b.invoice_type,
          invoice_number: b.invoice_number,
          customer_id: b.customer_id,
          godown: b.godown,
          site_address: b.site_address,
          remarks: b.remarks,
          subtotal: b.subtotal,
          total_discount: b.total_discount,
          grand_total: b.grand_total,
          status: 'Billed',
          created_by: user?.id ?? null,
          salesperson_id: b.salesperson_id,
          billed_by: b.salesperson_id,
          billed_at: billedAtIso,
          created_at: billedAtIso,
        }).select('id').single();

        if (ordErr || !orderRow) throw new Error(`${b.order_ref}: ${ordErr?.message || 'order insert returned no row'}`);
        insertedIds.push(orderRow.id);

        const { error: itemsErr } = await supabase.from('order_items').insert(
          b.items.map(it => ({
            order_id: orderRow.id,
            product_id: it.product_id,
            quantity: it.quantity,
            dealer_price: it.dealer_price,
            discount_pct: it.discount_pct,
            amount: it.amount,
          })),
        );
        if (itemsErr) throw new Error(`${b.order_ref}: ${itemsErr.message}`);

        setImported(i + 1);
      }
      toast.success(`Imported ${bills.length} bill${bills.length === 1 ? '' : 's'}`);
      navigate('/admin/sales');
    } catch (err: any) {
      for (const id of insertedIds) {
        await supabase.from('orders').update({ status: 'Voided' }).eq('id', id);
      }
      toast.error(`${err?.message || 'Import failed'} — rolled back ${insertedIds.length} inserted bill${insertedIds.length === 1 ? '' : 's'}`);
      setImported(0);
    } finally {
      setSubmitting(false);
    }
  };

  const totalItems = useMemo(() => bills.reduce((acc, b) => acc + b.items.length, 0), [bills]);
  const totalValue = useMemo(() => bills.reduce((acc, b) => acc + b.grand_total, 0), [bills]);

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
          <ArrowLeft size={16} /> Back
        </Button>
      </div>
      <PageHeader
        title="Bulk Bill Upload"
        subtitle="Back-fill historical/previous-day bills from CSV or Excel. Records are inserted as Billed with their original date — no stock movement."
      />

      <section className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-5 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Defaults</h2>
            <p className="text-xs text-slate-500 mt-1">Used when a row omits the value. Row-level values override.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2 rounded-xl">
            <Download size={14} /> Download template
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Company</Label>
            <Select value={defaultCompany} onValueChange={(v) => setDefaultCompany(v as CompanyEnum)}>
              <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200"><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {COMPANY_LIST.map(c => <SelectItem key={c} value={c}>{getCompanyDisplayName(c, companyProfiles)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Invoice type</Label>
            <Select value={defaultInvType} onValueChange={(v) => setDefaultInvType(v as InvoiceTypeEnum)}>
              <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200"><SelectValue placeholder="Select invoice type" /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {INVOICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Godown</Label>
            <Select value={defaultGodown} onValueChange={(v) => setDefaultGodown(v as GodownEnum)}>
              <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200"><SelectValue placeholder="Select godown" /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {godowns.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-6 md:p-8">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 inline-flex items-center justify-center">
            <Upload size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{fileName || 'Drop CSV / XLSX or click to choose'}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Required columns: <span className="font-mono">{REQUIRED_COLUMNS.join(', ')}</span>
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={parsing || submitting} className="gap-2 rounded-xl">
              {parsing ? <><Loader2 size={14} className="animate-spin" /> Parsing…</> : <><Upload size={14} /> Choose file</>}
            </Button>
            {(fileName || bills.length > 0 || errors.length > 0) && (
              <Button type="button" variant="outline" onClick={reset} disabled={parsing || submitting} className="gap-2 rounded-xl">
                <Trash2 size={14} /> Clear
              </Button>
            )}
          </div>
        </div>
      </section>

      {errors.length > 0 && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle className="text-rose-600 mt-0.5 shrink-0" size={18} />
            <div>
              <p className="text-sm font-bold text-rose-700">File rejected — fix all errors and re-upload</p>
              <p className="text-xs text-rose-600/80 mt-0.5">Strict mode: no rows are imported when any error is present.</p>
            </div>
          </div>
          <div className="rounded-xl border border-rose-200 bg-white overflow-hidden">
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-rose-100/60 text-rose-800 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold w-16">Row</th>
                    <th className="px-3 py-2 text-left font-bold w-44">Field</th>
                    <th className="px-3 py-2 text-left font-bold">Problem</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((e, i) => (
                    <tr key={i} className="border-t border-rose-100">
                      <td className="px-3 py-2 font-mono text-slate-700">{e.row || '-'}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">{e.field || '-'}</td>
                      <td className="px-3 py-2 text-slate-800">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {bills.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 inline-flex items-center justify-center">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Ready to import</p>
                <p className="text-xs text-slate-500">{bills.length} bill{bills.length === 1 ? '' : 's'} · {totalItems} line item{totalItems === 1 ? '' : 's'} · ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
            </div>
            <Button type="button" onClick={handleSubmit} disabled={submitting} className="gap-2 rounded-xl">
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Importing {imported}/{bills.length}…</> : <><CheckCircle2 size={14} /> Import {bills.length} bill{bills.length === 1 ? '' : 's'}</>}
            </Button>
          </div>

          <div className="divide-y divide-slate-100">
            {bills.map((b) => (
              <div key={b.order_ref} className="px-5 py-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-slate-500">{b.order_ref} · {b.bill_date}</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{b.customer_label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {b.company} · {b.invoice_type} · {b.godown} · by {b.salesperson_label}
                      {b.invoice_number ? ` · inv ${b.invoice_number}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="text-sm font-bold text-slate-900">₹{b.grand_total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Product</th>
                        <th className="px-3 py-2 text-right font-semibold w-20">Qty</th>
                        <th className="px-3 py-2 text-right font-semibold w-28">DP</th>
                        <th className="px-3 py-2 text-right font-semibold w-20">Disc%</th>
                        <th className="px-3 py-2 text-right font-semibold w-28">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.items.map((it, idx) => (
                        <tr key={idx} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-800">{it.product_label}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-700">{it.quantity}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-700">{it.dealer_price.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-700">{it.discount_pct}</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">{it.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-slate-500 mt-0.5 shrink-0" />
          <div className="text-xs text-slate-600 space-y-2">
            <p><span className="font-bold text-slate-900">Group rows into one bill</span> by repeating the same <span className="font-mono">order_ref</span>. Header fields (bill_date, customer_phone, salesperson_employee_id, company, invoice_type, godown, site_address) must match across rows in the same group.</p>
            <p><span className="font-bold text-slate-900">Lookups:</span> customer by phone (digits only), salesperson by employee_id, product by SKU (case-insensitive).</p>
            <p><span className="font-bold text-slate-900">Status:</span> all imported records are saved as <span className="font-mono">Billed</span> with back-dated created_at + billed_at = <span className="font-mono">bill_date</span>. <span className="font-bold text-slate-900">billed_by</span> is set to the salesperson (not the uploader).</p>
            <p><span className="font-bold text-slate-900">No stock impact:</span> stock quantities are not modified — assume the goods already left physically.</p>
            <p><span className="font-bold text-slate-900">Strict validation:</span> any row error rejects the whole file. Mid-import failures roll back inserted bills to <span className="font-mono">Voided</span>.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BulkBillUpload;
