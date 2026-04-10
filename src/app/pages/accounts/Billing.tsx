import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Search, Download, ReceiptText, ShieldAlert, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  DataCard,
  EmptyState,
  FilterBar,
  FilterField,
  PageHeader,
  SearchBar,
  Spinner,
  StatusBadge,
  StyledTd,
  StyledTh,
  StyledThead,
  StyledTr,
  TablePagination,
} from '@/app/components/ui/primitives';
import type { CompanyEnum, Json } from '@/app/types/database';

type BillableOrder = {
  id: string;
  order_number: string;
  status: 'Approved' | 'Billed' | 'Delivered' | 'Pending' | 'Rejected';
  company: string;
  invoice_type: string;
  invoice_number: string | null;
  godown: string | null;
  site_address: string;
  remarks: string | null;
  delivery_date: string | null;
  subtotal: number;
  total_discount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  tax_amount: number;
  grand_total: number;
  approved_at: string | null;
  billed_at: string | null;
  created_at: string;
  customers: {
    name: string;
    gst_pan: string | null;
    phone: string;
    address: string;
    place?: string | null;
  } | null;
};

type OrderLine = {
  id: string;
  quantity: number;
  dealer_price: number;
  discount_pct: number;
  amount: number;
  products: {
    name: string;
    sku: string;
  } | null;
};

type InvoiceSettings = {
  companyName: string;
  companyGstin: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
};

type ReversalStatus = 'Pending' | 'Approved' | 'Rejected';

type BillingReversalRequest = {
  id: string;
  order_id: string;
  order_number: string;
  invoice_number: string | null;
  company: string;
  customer_name: string | null;
  request_reason: string;
  admin_review_note: string | null;
  status: ReversalStatus;
  requested_by: string;
  requested_by_name: string | null;
  approved_by_name: string | null;
  rejected_by_name: string | null;
  created_at: string;
  updated_at: string;
};

type CompanyInvoiceSettings = Record<CompanyEnum, InvoiceSettings>;

const COMPANY_LIST: CompanyEnum[] = ['LLP', 'YES YES', 'Zekon'];

const DEFAULT_INVOICE_SETTINGS: CompanyInvoiceSettings = {
  LLP: {
    companyName: 'LLP',
    companyGstin: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
  },
  'YES YES': {
    companyName: 'YES YES MARKETING',
    companyGstin: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
  },
  Zekon: {
    companyName: 'Zekon',
    companyGstin: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
  },
};

const cloneDefaultInvoiceSettings = (): CompanyInvoiceSettings => ({
  LLP: { ...DEFAULT_INVOICE_SETTINGS.LLP },
  'YES YES': { ...DEFAULT_INVOICE_SETTINGS['YES YES'] },
  Zekon: { ...DEFAULT_INVOICE_SETTINGS.Zekon },
});

const normalize = (value: string) => value.toLowerCase().trim();
const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString('en-IN') : '—';
const readSettingString = (value: Json | null, fallback = '') => typeof value === 'string' ? value : fallback;
const readNullableString = (value: Json | null): string | null => typeof value === 'string' ? value : null;
const isJsonObject = (value: Json | null): value is Record<string, Json> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const readReversalStatus = (value: Json | null): ReversalStatus => {
  const raw = readSettingString(value, 'Pending');
  if (raw === 'Approved') return 'Approved';
  if (raw === 'Rejected') return 'Rejected';
  return 'Pending';
};

const readBillingReversalRequests = (value: Json | null): BillingReversalRequest[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isJsonObject(entry as Json)) {
      return [];
    }

    const row = entry as Record<string, Json>;
    const id = readSettingString(row.id ?? null);
    const orderId = readSettingString(row.order_id ?? null);
    if (!id || !orderId) {
      return [];
    }

    const request: BillingReversalRequest = {
      id,
      order_id: orderId,
      order_number: readSettingString(row.order_number ?? null, '—'),
      invoice_number: readNullableString(row.invoice_number ?? null),
      company: readSettingString(row.company ?? null, '—'),
      customer_name: readNullableString(row.customer_name ?? null),
      request_reason: readSettingString(row.request_reason ?? null),
      admin_review_note: readNullableString(row.admin_review_note ?? null),
      status: readReversalStatus(row.status ?? null),
      requested_by: readSettingString(row.requested_by ?? null),
      requested_by_name: readNullableString(row.requested_by_name ?? null),
      approved_by_name: readNullableString(row.approved_by_name ?? null),
      rejected_by_name: readNullableString(row.rejected_by_name ?? null),
      created_at: readSettingString(row.created_at ?? null),
      updated_at: readSettingString(row.updated_at ?? null),
    };

    return [request];
  });
};

const readInvoiceSetting = (value: Json | null, fallback: InvoiceSettings): InvoiceSettings => {
  if (!isJsonObject(value)) {
    return { ...fallback };
  }

  return {
    companyName: readSettingString(value.company_name ?? null, fallback.companyName),
    companyGstin: readSettingString(value.company_gstin ?? null, fallback.companyGstin),
    companyAddress: readSettingString(value.company_address ?? null, fallback.companyAddress),
    companyPhone: readSettingString(value.company_phone ?? null, fallback.companyPhone),
    companyEmail: readSettingString(value.company_email ?? null, fallback.companyEmail),
  };
};

const readCompanyInvoiceSettings = (value: Json | null): CompanyInvoiceSettings => {
  const next = cloneDefaultInvoiceSettings();
  if (!isJsonObject(value)) {
    return next;
  }

  COMPANY_LIST.forEach((company) => {
    next[company] = readInvoiceSetting(value[company] ?? null, next[company]);
  });

  return next;
};

const splitText = (doc: jsPDF, text: string, width: number) => {
  const safeText = text.trim() || '—';
  return doc.splitTextToSize(safeText, width);
};

const toWordsUnder100 = (num: number) => {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num < 10) return units[num] ?? '';
  if (num < 20) return teens[num - 10] ?? '';
  const ten = Math.floor(num / 10);
  const unit = num % 10;
  return `${tens[ten] ?? ''}${unit ? ` ${units[unit]}` : ''}`.trim();
};

const numberToWordsIndian = (value: number) => {
  const num = Math.floor(Math.abs(value));
  if (num === 0) return 'Zero';

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const remainder = num % 100;
  const parts: string[] = [];

  if (crore) parts.push(`${numberToWordsIndian(crore)} Crore`);
  if (lakh) parts.push(`${numberToWordsIndian(lakh)} Lakh`);
  if (thousand) parts.push(`${numberToWordsIndian(thousand)} Thousand`);
  if (hundred) parts.push(`${toWordsUnder100(hundred)} Hundred`);
  if (remainder) parts.push(toWordsUnder100(remainder));

  return parts.join(' ').trim();
};

const addLine = (doc: jsPDF, text: string, y: number, opts?: { bold?: boolean; right?: string }) => {
  if (opts?.bold) doc.setFont('helvetica', 'bold');
  else doc.setFont('helvetica', 'normal');
  doc.text(text, 12, y);
  if (opts?.right) doc.text(opts.right, 198, y, { align: 'right' });
};

const renderInvoicePdf = (order: BillableOrder, lines: OrderLine[], invoiceNo: string, settings: InvoiceSettings) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const rightX = pageWidth - margin;
  const contentWidth = pageWidth - margin * 2;
  const invoiceDate = formatDate(order.billed_at ?? order.approved_at ?? order.created_at);

  const drawTableHeader = (top: number) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, top, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('#', 15, top + 5.2);
    doc.text('Description', 23, top + 5.2);
    doc.text('SKU', 103, top + 5.2);
    doc.text('Qty', 123, top + 5.2, { align: 'right' });
    doc.text('Rate', 143, top + 5.2, { align: 'right' });
    doc.text('Disc%', 161, top + 5.2, { align: 'right' });
    doc.text('Taxable', 180, top + 5.2, { align: 'right' });
    doc.text('Amount', 198, top + 5.2, { align: 'right' });
    doc.setTextColor(31, 41, 55);
  };

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(15, 118, 110);
  doc.rect(margin, margin, contentWidth, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(settings.companyName || 'YES YES MARKETING', margin + 4, margin + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('TAX INVOICE', margin + 4, margin + 12.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(invoiceNo, rightX - 2, margin + 8, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Invoice Date: ${invoiceDate}`, rightX - 2, margin + 13, { align: 'right' });

  doc.setTextColor(31, 41, 55);
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);

  doc.roundedRect(margin, 34, 92, 39, 3, 3, 'FD');
  doc.roundedRect(106, 34, 92, 39, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Sold By', margin + 4, 40);
  doc.text('Bill To / Ship To', 110, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const sellerLines = [
    settings.companyName || 'YES YES MARKETING',
    settings.companyAddress || 'Company address not configured',
    settings.companyPhone ? `Phone: ${settings.companyPhone}` : '',
    settings.companyEmail ? `Email: ${settings.companyEmail}` : '',
    settings.companyGstin ? `GSTIN: ${settings.companyGstin}` : '',
  ].filter(Boolean);
  sellerLines.forEach((line, index) => {
    doc.text(splitText(doc, line, 82), margin + 4, 46 + (index * 4.3));
  });

  const customerLines = [
    order.customers?.name ?? 'Walk-in Customer',
    order.customers?.address ?? 'Customer address not available',
    order.customers?.place ? `Place: ${order.customers.place}` : '',
    order.site_address ? `Site Address: ${order.site_address}` : '',
    order.customers?.phone ? `Phone: ${order.customers.phone}` : '',
    order.customers?.gst_pan ? `GST/PAN: ${order.customers.gst_pan}` : '',
  ].filter(Boolean);
  customerLines.forEach((line, index) => {
    doc.text(splitText(doc, line, 82), 110, 46 + (index * 4.3));
  });

  doc.roundedRect(margin, 78, contentWidth, 17, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Order No', margin + 4, 84);
  doc.text('Invoice Type', 62, 84);
  doc.text('Company', 104, 84);
  doc.text('Delivery Date', 142, 84);
  doc.text('Godown', 176, 84);
  doc.setFont('helvetica', 'normal');
  doc.text(order.order_number, margin + 4, 90);
  doc.text(order.invoice_type, 62, 90);
  doc.text(order.company, 104, 90);
  doc.text(formatDate(order.delivery_date), 142, 90);
  doc.text(order.godown ?? '—', 176, 90);

  let y = 101;
  drawTableHeader(y);
  y += 10;

  doc.setFontSize(8.2);
  doc.setFont('helvetica', 'normal');

  lines.forEach((line, index) => {
    const description = splitText(doc, line.products?.name ?? 'Product', 74);
    const sku = splitText(doc, line.products?.sku ?? '—', 16);
    const rowHeight = Math.max(description.length, sku.length, 1) * 4.5 + 2;

    if (y + rowHeight > pageHeight - 60) {
      doc.addPage();
      y = 18;
      drawTableHeader(y);
      y += 10;
      doc.setFontSize(8.2);
      doc.setFont('helvetica', 'normal');
    }

    doc.setDrawColor(241, 245, 249);
    doc.rect(margin, y - 4.5, contentWidth, rowHeight, 'S');
    doc.text(String(index + 1), 15, y);
    doc.text(description, 23, y);
    doc.text(sku, 103, y);
    doc.text(String(line.quantity), 123, y, { align: 'right' });
    doc.text(line.dealer_price.toFixed(2), 143, y, { align: 'right' });
    doc.text(line.discount_pct.toFixed(2), 161, y, { align: 'right' });
    doc.text(line.amount.toFixed(2), 180, y, { align: 'right' });
    doc.text(line.amount.toFixed(2), 198, y, { align: 'right' });
    y += rowHeight;
  });

  const amountInWords = `${numberToWordsIndian(order.grand_total)} Rupees Only`;
  const summaryTop = Math.min(y + 4, 218);

  doc.roundedRect(margin, summaryTop, 108, 34, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Amount in Words', margin + 4, summaryTop + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(splitText(doc, amountInWords, 98), margin + 4, summaryTop + 12);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(splitText(doc, order.remarks?.trim() ? `Remarks: ${order.remarks}` : 'Remarks: Thank you for your business.', 98), margin + 4, summaryTop + 26);
  doc.setTextColor(31, 41, 55);

  doc.roundedRect(126, summaryTop, 72, 46, 3, 3, 'FD');
  const totals: Array<[string, number]> = [
    ['Subtotal', order.subtotal],
    ['Discount', order.total_discount],
    ['Taxable Amount', order.taxable_amount],
  ];
  if (order.cgst_amount > 0) totals.push(['CGST', order.cgst_amount]);
  if (order.sgst_amount > 0) totals.push(['SGST', order.sgst_amount]);
  if (order.igst_amount > 0) totals.push(['IGST', order.igst_amount]);
  if (order.tax_amount > 0) totals.push(['Total Tax', order.tax_amount]);
  totals.push(['Grand Total', order.grand_total]);

  let totalsY = summaryTop + 7;
  totals.forEach(([label, value], index) => {
    const isGrand = index === totals.length - 1;
    doc.setFont('helvetica', isGrand ? 'bold' : 'normal');
    doc.setFontSize(isGrand ? 10 : 8.5);
    doc.text(label, 130, totalsY);
    doc.text(formatCurrency(value), 194, totalsY, { align: 'right' });
    totalsY += isGrand ? 6.5 : 5;
  });

  const footerY = 270;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, footerY - 8, rightX, footerY - 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Certified that the particulars given above are true and correct.', margin, footerY - 2);
  doc.text(`For ${settings.companyName || 'YES YES MARKETING'}`, rightX, footerY - 2, { align: 'right' });
  doc.line(158, footerY + 8, rightX, footerY + 8);
  doc.text('Authorised Signatory', rightX, footerY + 13, { align: 'right' });
  doc.save(`${invoiceNo}.pdf`);
};

export const Billing = () => {
  const { user, login } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canRequestReversal = user?.role === 'accounts' || isAdmin;

  const [orders, setOrders] = useState<BillableOrder[]>([]);
  const [invoiceSettings, setInvoiceSettings] = useState<CompanyInvoiceSettings>(cloneDefaultInvoiceSettings());
  const [reversalRequests, setReversalRequests] = useState<BillingReversalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReversals, setLoadingReversals] = useState(true);
  const [reversalFeatureReady, setReversalFeatureReady] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Approved' | 'Billed'>('all');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<'all' | string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestOrder, setRequestOrder] = useState<BillableOrder | null>(null);
  const [requestReason, setRequestReason] = useState('');
  const [requestingReversal, setRequestingReversal] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRequest, setReviewRequest] = useState<BillingReversalRequest | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [reviewingAction, setReviewingAction] = useState(false);
  const snapshotRef = useRef<HTMLDivElement | null>(null);
  const pageSize = 10;

  const loadInvoiceSettings = async () => {
    const withLegacyFallback = async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['company_profiles', 'company_name', 'company_gstin', 'company_address', 'company_phone', 'company_email']);

      if (error) throw error;

      let nextSettings = cloneDefaultInvoiceSettings();
      let hasCompanyProfiles = false;

      (data ?? []).forEach((setting) => {
        if (setting.key === 'company_profiles') {
          nextSettings = readCompanyInvoiceSettings(setting.value);
          hasCompanyProfiles = true;
        }
      });

      if (!hasCompanyProfiles) {
        const legacyYesYes = { ...nextSettings['YES YES'] };
        (data ?? []).forEach((setting) => {
          if (setting.key === 'company_name') legacyYesYes.companyName = readSettingString(setting.value, legacyYesYes.companyName);
          if (setting.key === 'company_gstin') legacyYesYes.companyGstin = readSettingString(setting.value);
          if (setting.key === 'company_address') legacyYesYes.companyAddress = readSettingString(setting.value);
          if (setting.key === 'company_phone') legacyYesYes.companyPhone = readSettingString(setting.value);
          if (setting.key === 'company_email') legacyYesYes.companyEmail = readSettingString(setting.value);
        });
        nextSettings = {
          ...nextSettings,
          'YES YES': legacyYesYes,
        };
      }

      setInvoiceSettings(nextSettings);
    };

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_company_profiles');

    if (rpcError) {
      const isMissingRpc = rpcError.code === 'PGRST202' || rpcError.message?.toLowerCase().includes('could not find the function');
      if (!isMissingRpc) {
        throw rpcError;
      }

      await withLegacyFallback();
      return;
    }

    setInvoiceSettings(readCompanyInvoiceSettings(rpcData as Json));
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, status, company, invoice_type, invoice_number, godown, site_address, remarks, delivery_date, subtotal, total_discount, taxable_amount, cgst_amount, sgst_amount, igst_amount, tax_amount, grand_total, approved_at, billed_at, created_at, customers(name, gst_pan, phone, address, place)')
      .in('status', ['Approved', 'Billed'])
      .order('approved_at', { ascending: false });
    if (error) {
      toast.error(error.message);
      setOrders([]);
    } else {
      setOrders((data ?? []) as BillableOrder[]);
    }
    setLoading(false);
  };

  const loadBillingReversalRequests = async () => {
    setLoadingReversals(true);
    try {
      const { data, error } = await supabase.rpc('get_billing_reversal_requests', { p_status: null });
      if (error) {
        const missingRpc = error.code === 'PGRST202' || error.message?.toLowerCase().includes('could not find the function');
        if (missingRpc) {
          setReversalFeatureReady(false);
          setReversalRequests([]);
          return;
        }
        throw error;
      }

      setReversalFeatureReady(true);
      setReversalRequests(readBillingReversalRequests(data as Json));
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to load billing reversal requests');
    } finally {
      setLoadingReversals(false);
    }
  };

  useEffect(() => {
    void Promise.all([fetchOrders(), loadInvoiceSettings(), loadBillingReversalRequests()]).catch((error: any) => {
      toast.error(error?.message ?? 'Failed to load billing screen');
    });
  }, []);

  const pendingRequestByOrderId = useMemo(() => {
    const map = new Map<string, BillingReversalRequest>();
    reversalRequests.forEach((request) => {
      if (request.status === 'Pending') {
        map.set(request.order_id, request);
      }
    });
    return map;
  }, [reversalRequests]);

  const filtered = useMemo(() => {
    const q = normalize(search);
    return orders.filter(order => {
      const dateValue = order.approved_at?.slice(0, 10) ?? order.created_at.slice(0, 10);
      const matchSearch = !q ||
        normalize(order.order_number).includes(q) ||
        normalize(order.invoice_number ?? '').includes(q) ||
        normalize(order.customers?.name ?? '').includes(q);
      const matchStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchType = invoiceTypeFilter === 'all' || order.invoice_type === invoiceTypeFilter;
      const matchFrom = !fromDate || dateValue >= fromDate;
      const matchTo = !toDate || dateValue <= toDate;
      return matchSearch && matchStatus && matchType && matchFrom && matchTo;
    });
  }, [orders, search, statusFilter, invoiceTypeFilter, fromDate, toDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, invoiceTypeFilter, fromDate, toDate]);

  const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const invoiceTypes = Array.from(new Set(orders.map(o => o.invoice_type))).sort();

  const fetchOrderLines = async (orderId: string) => {
    const { data, error } = await supabase
      .from('order_items')
      .select('id, quantity, dealer_price, discount_pct, amount, products(name, sku)')
      .eq('order_id', orderId);
    if (error) throw error;
    return (data ?? []) as OrderLine[];
  };

  const generateInvoice = async (order: BillableOrder) => {
    if (order.status === 'Approved') {
      const shouldBill = window.confirm('Do you want to bill this order now and generate the invoice PDF?');
      if (!shouldBill) return;
    }

    setBusyOrderId(order.id);
    try {
      let invoiceNo = order.invoice_number;
      if (order.status === 'Approved') {
        const idempotencyKey = `bill:${order.id}`;
        let billedInvoiceNo: string | null = null;

        const { data: idempotentInvoiceNo, error: idempotentErr } = await supabase.rpc('bill_order_idempotent', {
          p_order_id: order.id,
          p_billed_by: user?.id ?? null,
          p_idempotency_key: idempotencyKey,
        });

        if (idempotentErr) {
          const rpcMissing = idempotentErr.code === 'PGRST202' || idempotentErr.message?.toLowerCase().includes('could not find the function');
          if (!rpcMissing) throw idempotentErr;

          const { data: legacyInvoiceNo, error: legacyErr } = await supabase
            .rpc('bill_order_atomic', { p_order_id: order.id, p_billed_by: user?.id ?? null });
          if (legacyErr) throw legacyErr;
          billedInvoiceNo = legacyInvoiceNo;
        } else {
          billedInvoiceNo = idempotentInvoiceNo;
        }

        invoiceNo = billedInvoiceNo || invoiceNo;
      }
      if (!invoiceNo) throw new Error('Invoice number generation failed');

      const lines = await fetchOrderLines(order.id);
      const settingsForCompany = invoiceSettings[order.company as CompanyEnum] ?? DEFAULT_INVOICE_SETTINGS['YES YES'];
      renderInvoicePdf(order, lines, invoiceNo, settingsForCompany);

      const { error: markPdfErr } = await supabase
        .from('orders')
        .update({ invoice_pdf_generated_at: new Date().toISOString() })
        .eq('id', order.id);
      if (markPdfErr) throw markPdfErr;

      toast.success(`${invoiceNo} generated successfully.`);
      await Promise.all([fetchOrders(), loadBillingReversalRequests()]);
    } catch (error: any) {
      toast.error(error?.message ?? 'Unable to generate invoice');
    } finally {
      setBusyOrderId(null);
    }
  };

  const submitBillingReversalRequest = async () => {
    if (!requestOrder || !user) return;
    if (!reversalFeatureReady) {
      toast.error('Billing reversal workflow is not available. Apply BILLING_REVERSAL_WORKFLOW.sql first.');
      return;
    }
    if (requestReason.trim().length < 8) {
      toast.error('Please provide a clear reason (minimum 8 characters)');
      return;
    }

    setRequestingReversal(true);
    try {
      const { error } = await supabase.rpc('request_billing_reversal', {
        p_order_id: requestOrder.id,
        p_reason: requestReason.trim(),
        p_requested_by: user.id,
      });
      if (error) throw error;

      toast.success(`Reversal request submitted for ${requestOrder.order_number}`);
      setRequestDialogOpen(false);
      setRequestOrder(null);
      setRequestReason('');
      await loadBillingReversalRequests();
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to submit reversal request');
    } finally {
      setRequestingReversal(false);
    }
  };

  const startAdminReview = (request: BillingReversalRequest) => {
    setReviewRequest(request);
    setAdminNote(request.admin_review_note ?? '');
    setAdminPassword('');
    setReviewDialogOpen(true);
  };

  const submitAdminReview = async (action: 'approve' | 'reject') => {
    if (!reviewRequest || !user || !isAdmin) return;
    if (!adminPassword.trim()) {
      toast.error('Admin password is required to continue');
      return;
    }

    setReviewingAction(true);
    try {
      const authResult = await login(user.email, adminPassword);
      if (!authResult.success) {
        throw new Error(authResult.error ?? 'Admin password verification failed');
      }

      const rpcName = action === 'approve' ? 'approve_billing_reversal' : 'reject_billing_reversal';
      const { data, error } = await supabase.rpc(rpcName, {
        p_request_id: reviewRequest.id,
        p_admin_user_id: user.id,
        p_admin_note: adminNote.trim() || null,
      });
      if (error) throw error;
      if (!data) {
        throw new Error('Request is no longer pending');
      }

      toast.success(action === 'approve' ? 'Billing reversal approved' : 'Billing reversal request rejected');
      setReviewDialogOpen(false);
      setReviewRequest(null);
      setAdminPassword('');
      setAdminNote('');
      await Promise.all([fetchOrders(), loadBillingReversalRequests()]);
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to process reversal request');
    } finally {
      setReviewingAction(false);
    }
  };

  const captureScreenshot = async () => {
    const target = snapshotRef.current;
    if (!target) return;
    try {
      const canvas = await html2canvas(target, {
        useCORS: true,
        backgroundColor: '#ffffff',
        scale: 1.5,
      });
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Unable to generate screenshot');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `billing-snapshot-${date}.png`;
        link.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error: any) {
      toast.error(error?.message ?? 'Screenshot capture failed');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Billing & Invoices"
        subtitle="Create invoices from approved orders and export GST invoice PDFs"
        actions={
          <Button size="sm" variant="outline" onClick={() => void captureScreenshot()}>
            Capture Screenshot
          </Button>
        }
      />

      <FilterBar>
        <SearchBar
          placeholder="Search by order, invoice, customer..."
          value={search}
          onChange={setSearch}
          className="w-full md:max-w-md"
        />
        <div className="flex flex-wrap items-end gap-3">
          <FilterField label="Status">
            <Select value={statusFilter} onValueChange={(value: 'all' | 'Approved' | 'Billed') => setStatusFilter(value)}>
              <SelectTrigger className="h-10 w-40 text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Billed">Billed</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Invoice Type">
            <Select value={invoiceTypeFilter} onValueChange={setInvoiceTypeFilter}>
              <SelectTrigger className="h-10 w-44 text-sm">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {invoiceTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="From Date">
            <Input type="date" className="h-10 w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </FilterField>
          <FilterField label="To Date">
            <Input type="date" className="h-10 w-36" value={toDate} onChange={e => setToDate(e.target.value)} />
          </FilterField>
        </div>
      </FilterBar>

      <div ref={snapshotRef}>
      <DataCard>
        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState icon={ReceiptText} message="No billable orders" sub="Approved or billed orders will appear here." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <StyledThead>
                  <tr>
                    <StyledTh>Order</StyledTh>
                    <StyledTh>Invoice No</StyledTh>
                    <StyledTh>Customer</StyledTh>
                    <StyledTh>Invoice Type</StyledTh>
                    <StyledTh>Status</StyledTh>
                    <StyledTh right>Total</StyledTh>
                    <StyledTh center>Action</StyledTh>
                  </tr>
                </StyledThead>
                <tbody>
                  {paginated.map(order => (
                    <StyledTr key={order.id}>
                      <StyledTd mono className="font-semibold text-primary">{order.order_number}</StyledTd>
                      <StyledTd mono className="text-muted-foreground">{order.invoice_number ?? 'Not generated'}</StyledTd>
                      <StyledTd>{order.customers?.name ?? '—'}</StyledTd>
                      <StyledTd>{order.invoice_type}</StyledTd>
                      <StyledTd><StatusBadge status={order.status} /></StyledTd>
                      <StyledTd right mono className="font-semibold">₹{order.grand_total.toLocaleString('en-IN')}</StyledTd>
                      <StyledTd center>
                        <div className="flex flex-wrap justify-center gap-2">
                          <Button
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => void generateInvoice(order)}
                            disabled={busyOrderId === order.id}
                          >
                            {order.status === 'Approved' ? <ReceiptText size={14} /> : <Download size={14} />}
                            {busyOrderId === order.id ? 'Processing...' : order.status === 'Approved' ? 'Bill & PDF' : 'Download PDF'}
                          </Button>
                          {canRequestReversal && order.status === 'Billed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5"
                              onClick={() => {
                                setRequestOrder(order);
                                setRequestReason('');
                                setRequestDialogOpen(true);
                              }}
                              disabled={busyOrderId === order.id || !reversalFeatureReady || pendingRequestByOrderId.has(order.id)}
                            >
                              <Undo2 size={14} />
                              {pendingRequestByOrderId.has(order.id) ? 'Revert Requested' : 'Request Revert'}
                            </Button>
                          )}
                        </div>
                      </StyledTd>
                    </StyledTr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              totalItems={filtered.length}
              currentPage={page}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="orders"
            />
          </>
        )}
      </DataCard>
      </div>

      <DataCard className="p-4 text-xs text-muted-foreground">
        <p className="font-medium">Billing process:</p>
        <ul className="mt-1 list-disc pl-4 space-y-1">
          <li>Accounts generates invoice from <strong>Approved</strong> orders.</li>
          <li>System assigns invoice number and transitions order to <strong>Billed</strong>.</li>
          <li>For mistaken billing, raise a <strong>Request Revert</strong> and wait for admin approval.</li>
        </ul>
      </DataCard>

      <DataCard className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Billing Reversal Requests</p>
            <p className="text-xs text-muted-foreground">
              Admin password verification is required before approving or rejecting reversal actions.
            </p>
          </div>
          {!reversalFeatureReady && (
            <div className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
              <ShieldAlert size={14} />
              Apply BILLING_REVERSAL_WORKFLOW.sql
            </div>
          )}
        </div>

        {loadingReversals ? (
          <Spinner />
        ) : reversalRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reversal requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <StyledThead>
                <tr>
                  <StyledTh>Order</StyledTh>
                  <StyledTh>Invoice</StyledTh>
                  <StyledTh>Customer</StyledTh>
                  <StyledTh>Requested By</StyledTh>
                  <StyledTh>Status</StyledTh>
                  <StyledTh>Reason</StyledTh>
                  <StyledTh center>Action</StyledTh>
                </tr>
              </StyledThead>
              <tbody>
                {reversalRequests.map((request) => (
                  <StyledTr key={request.id}>
                    <StyledTd mono>{request.order_number}</StyledTd>
                    <StyledTd mono>{request.invoice_number ?? '—'}</StyledTd>
                    <StyledTd>{request.customer_name ?? '—'}</StyledTd>
                    <StyledTd>
                      <div className="flex flex-col gap-0.5">
                        <span>{request.requested_by_name ?? 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">{request.created_at ? new Date(request.created_at).toLocaleString('en-IN') : '—'}</span>
                      </div>
                    </StyledTd>
                    <StyledTd>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        request.status === 'Pending'
                          ? 'bg-amber-100 text-amber-800'
                          : request.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                      }`}
                      >
                        {request.status}
                      </span>
                    </StyledTd>
                    <StyledTd>
                      <div className="max-w-[240px]">
                        <p className="line-clamp-2 text-xs">{request.request_reason || '—'}</p>
                        {request.admin_review_note && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">Admin: {request.admin_review_note}</p>
                        )}
                      </div>
                    </StyledTd>
                    <StyledTd center>
                      {isAdmin && request.status === 'Pending' ? (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => startAdminReview(request)}>
                          Review
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </StyledTd>
                  </StyledTr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Billing Reversal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{requestOrder?.order_number ?? 'Order'}</p>
              <p className="text-xs text-muted-foreground">Invoice: {requestOrder?.invoice_number ?? 'Not available'}</p>
              <p className="text-xs text-muted-foreground">Customer: {requestOrder?.customers?.name ?? '—'}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reversal-reason">Reason for reversal</Label>
              <Textarea
                id="reversal-reason"
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                rows={4}
                placeholder="Explain what was billed by mistake and why reversal is needed"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)} disabled={requestingReversal}>Cancel</Button>
            <Button onClick={() => void submitBillingReversalRequest()} disabled={requestingReversal}>
              {requestingReversal ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Review: Billing Reversal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{reviewRequest?.order_number ?? 'Order'}</p>
              <p className="text-xs text-muted-foreground">Invoice: {reviewRequest?.invoice_number ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Requested by: {reviewRequest?.requested_by_name ?? 'Unknown'}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-note">Admin note</Label>
              <Textarea
                id="admin-note"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                placeholder="Optional review note"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Confirm admin password</Label>
              <Input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)} disabled={reviewingAction}>Cancel</Button>
            <Button variant="outline" onClick={() => void submitAdminReview('reject')} disabled={reviewingAction}>
              {reviewingAction ? 'Processing...' : 'Reject'}
            </Button>
            <Button onClick={() => void submitAdminReview('approve')} disabled={reviewingAction}>
              {reviewingAction ? 'Processing...' : 'Approve & Revert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
