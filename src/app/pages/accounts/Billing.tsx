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

type BillableOrder = {
  id: string;
  order_number: string;
  status: 'Approved' | 'Billed' | 'Delivered' | 'Pending' | 'Rejected';
  company: string;
  invoice_type: string;
  invoice_number: string | null;
  grand_total: number;
  approved_at: string | null;
  created_at: string;
  customers: {
    name: string;
    gst_pan: string | null;
    phone: string;
    address: string;
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

const normalize = (value: string) => value.toLowerCase().trim();

const addLine = (doc: jsPDF, text: string, y: number, opts?: { bold?: boolean; right?: string }) => {
  if (opts?.bold) doc.setFont('helvetica', 'bold');
  else doc.setFont('helvetica', 'normal');
  doc.text(text, 12, y);
  if (opts?.right) doc.text(opts.right, 198, y, { align: 'right' });
};

const renderInvoicePdf = (order: BillableOrder, lines: OrderLine[], invoiceNo: string) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const createdDate = new Date(order.approved_at ?? order.created_at).toLocaleDateString('en-IN');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('YES YES MARKETING', 12, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Tax Invoice', 12, 20);

  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice No: ${invoiceNo}`, 198, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice Date: ${createdDate}`, 198, 20, { align: 'right' });

  addLine(doc, `Order No: ${order.order_number}`, 30);
  addLine(doc, `Company: ${order.company}`, 35);
  addLine(doc, `Invoice Type: ${order.invoice_type}`, 40);
  addLine(doc, `Customer: ${order.customers?.name ?? '—'}`, 45);
  addLine(doc, `GST/PAN: ${order.customers?.gst_pan ?? '—'}`, 50);

  doc.setDrawColor(180);
  doc.line(12, 56, 198, 56);

  doc.setFont('helvetica', 'bold');
  doc.text('Item', 12, 62);
  doc.text('Qty', 122, 62, { align: 'right' });
  doc.text('Rate', 148, 62, { align: 'right' });
  doc.text('Disc%', 170, 62, { align: 'right' });
  doc.text('Amount', 198, 62, { align: 'right' });

  let y = 68;
  doc.setFont('helvetica', 'normal');
  for (const line of lines) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    const itemName = line.products?.name ?? 'Product';
    doc.text(itemName.slice(0, 60), 12, y);
    doc.text(String(line.quantity), 122, y, { align: 'right' });
    doc.text(line.dealer_price.toFixed(2), 148, y, { align: 'right' });
    doc.text(line.discount_pct.toFixed(2), 170, y, { align: 'right' });
    doc.text(line.amount.toFixed(2), 198, y, { align: 'right' });
    y += 6;
  }

  y += 4;
  doc.line(12, y, 198, y);
  y += 8;

  addLine(doc, 'Line Total', y, { right: `₹ ${order.grand_total.toLocaleString('en-IN')}` });
  y += 6;

  if (order.invoice_type === 'GST') {
    addLine(doc, 'CGST', y, { right: '₹ 0.00' });
    y += 6;
    addLine(doc, 'SGST', y, { right: '₹ 0.00' });
    y += 6;
  }
  if (order.invoice_type === 'IGST') {
    addLine(doc, 'IGST', y, { right: '₹ 0.00' });
    y += 6;
  }

  addLine(doc, 'Grand Total', y, { bold: true, right: `₹ ${order.grand_total.toLocaleString('en-IN')}` });
  y += 10;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('GST rows are displayed per invoice type. Tax rates/amounts are not yet configured in database fields.', 12, y);

  doc.save(`${invoiceNo}.pdf`);
};

export const Billing = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<BillableOrder[]>([]);
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

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, status, company, invoice_type, invoice_number, grand_total, approved_at, created_at, customers(name, gst_pan, phone, address)')
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
    void fetchOrders();
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
      const { data: billedInvoiceNo, error: billErr } = await supabase
        .rpc('bill_order_atomic', { p_order_id: order.id, p_billed_by: user?.id ?? null });
      if (billErr) throw billErr;
      const invoiceNo = billedInvoiceNo || order.invoice_number;
      if (!invoiceNo) throw new Error('Invoice number generation failed');

      const lines = await fetchOrderLines(order.id);
      renderInvoicePdf(order, lines, invoiceNo);

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