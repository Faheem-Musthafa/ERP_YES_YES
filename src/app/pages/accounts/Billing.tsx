import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Search, Download, ReceiptText } from 'lucide-react';
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
import type { Json } from '@/app/types/database';

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

const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  companyName: 'YES YES MARKETING',
  companyGstin: '',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
};

const normalize = (value: string) => value.toLowerCase().trim();
const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString('en-IN') : '—';
const readSettingString = (value: Json | null, fallback = '') => typeof value === 'string' ? value : fallback;

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
  const { user } = useAuth();
  const [orders, setOrders] = useState<BillableOrder[]>([]);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Approved' | 'Billed'>('all');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<'all' | string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const snapshotRef = useRef<HTMLDivElement | null>(null);
  const pageSize = 10;

  const loadInvoiceSettings = async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['company_name', 'company_gstin', 'company_address', 'company_phone', 'company_email']);

    if (error) throw error;

    const nextSettings = { ...DEFAULT_INVOICE_SETTINGS };
    (data ?? []).forEach((setting) => {
      if (setting.key === 'company_name') nextSettings.companyName = readSettingString(setting.value, DEFAULT_INVOICE_SETTINGS.companyName);
      if (setting.key === 'company_gstin') nextSettings.companyGstin = readSettingString(setting.value);
      if (setting.key === 'company_address') nextSettings.companyAddress = readSettingString(setting.value);
      if (setting.key === 'company_phone') nextSettings.companyPhone = readSettingString(setting.value);
      if (setting.key === 'company_email') nextSettings.companyEmail = readSettingString(setting.value);
    });

    setInvoiceSettings(nextSettings);
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

  useEffect(() => {
    void Promise.all([fetchOrders(), loadInvoiceSettings()]).catch((error: any) => {
      toast.error(error?.message ?? 'Failed to load billing screen');
    });
  }, []);

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
    setBusyOrderId(order.id);
    try {
      let invoiceNo = order.invoice_number;
      if (order.status === 'Approved') {
        const { data: billedInvoiceNo, error: billErr } = await supabase
          .rpc('bill_order_atomic', { p_order_id: order.id, p_billed_by: user?.id ?? null });
        if (billErr) throw billErr;
        invoiceNo = billedInvoiceNo || invoiceNo;
      }
      if (!invoiceNo) throw new Error('Invoice number generation failed');

      const lines = await fetchOrderLines(order.id);
      renderInvoicePdf(order, lines, invoiceNo, invoiceSettings);

      const { error: markPdfErr } = await supabase
        .from('orders')
        .update({ invoice_pdf_generated_at: new Date().toISOString() })
        .eq('id', order.id);
      if (markPdfErr) throw markPdfErr;

      toast.success(`${invoiceNo} generated successfully.`);
      await fetchOrders();
    } catch (error: any) {
      toast.error(error?.message ?? 'Unable to generate invoice');
    } finally {
      setBusyOrderId(null);
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
                        <Button
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => void generateInvoice(order)}
                          disabled={busyOrderId === order.id}
                        >
                          {order.status === 'Approved' ? <ReceiptText size={14} /> : <Download size={14} />}
                          {busyOrderId === order.id ? 'Processing...' : order.status === 'Approved' ? 'Bill & PDF' : 'Download PDF'}
                        </Button>
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
          <li>GST/IGST/NGST invoice PDF can be downloaded from this screen.</li>
        </ul>
      </DataCard>
    </div>
  );
};
