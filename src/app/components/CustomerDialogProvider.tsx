import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/app/supabase';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, StatusBadge,
} from '@/app/components/ui/primitives';
import { downloadCSV } from '@/app/utils';
import { Phone, MapPin, Receipt, ShoppingBag, FileText, IndianRupee, Download, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerSummary {
  id: string;
  name: string;
  phone: string | null;
  place: string | null;
  location: string | null;
  company: string | null;
  opening_invoice: number | null;
  opening_delivery_challan: number | null;
}

interface CustomerOrderHistory {
  id: string;
  order_number: string | null;
  invoice_number: string | null;
  status: string | null;
  company: string | null;
  grand_total: number | null;
  created_at: string;
  delivery_date: string | null;
}

interface CustomerReceiptHistory {
  id: string;
  receipt_number: string | null;
  amount: number | null;
  payment_mode: string | null;
  payment_status: string | null;
  on_account_of: string | null;
  received_date: string | null;
  created_at: string;
  orders: {
    order_number: string | null;
    invoice_number: string | null;
  } | null;
}

interface CustomerDialogContextValue {
  openCustomer: (id: string) => void;
}

const CustomerDialogContext = createContext<CustomerDialogContextValue | null>(null);

export const useCustomerDialog = () => {
  const ctx = useContext(CustomerDialogContext);
  if (!ctx) {
    return { openCustomer: () => { /* no-op when provider missing */ } } as CustomerDialogContextValue;
  }
  return ctx;
};

export const CustomerDialogProvider = ({ children }: { children: React.ReactNode }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [orders, setOrders] = useState<CustomerOrderHistory[]>([]);
  const [bills, setBills] = useState<CustomerOrderHistory[]>([]);
  const [transactions, setTransactions] = useState<CustomerReceiptHistory[]>([]);

  const reset = () => {
    setOpenId(null);
    setCustomer(null);
    setOrders([]);
    setBills([]);
    setTransactions([]);
  };

  const openCustomer = useCallback((id: string) => {
    if (!id) return;
    setOpenId(id);
  }, []);

  useEffect(() => {
    if (!openId) return;
    let cancelled = false;
    setCustomerLoading(true);
    setHistoryLoading(true);
    (async () => {
      try {
        const [custRes, ordersRes, receiptsRes] = await Promise.allSettled([
          supabase
            .from('customers')
            .select('id, name, phone, place, location, company, opening_invoice, opening_delivery_challan')
            .eq('id', openId)
            .single(),
          supabase
            .from('orders')
            .select('id, order_number, invoice_number, status, company, grand_total, created_at, delivery_date')
            .eq('customer_id', openId)
            .order('created_at', { ascending: false })
            .limit(150),
          supabase
            .from('receipts')
            .select('id, receipt_number, amount, payment_mode, payment_status, on_account_of, received_date, created_at, orders(order_number, invoice_number)')
            .eq('customer_id', openId)
            .order('created_at', { ascending: false })
            .limit(150),
        ]);

        if (cancelled) return;

        if (custRes.status === 'fulfilled' && !custRes.value.error) {
          setCustomer(custRes.value.data as CustomerSummary);
        } else {
          toast.error('Failed to load customer');
          reset();
          return;
        }

        if (ordersRes.status === 'fulfilled' && !ordersRes.value.error) {
          const orderRows = (ordersRes.value.data ?? []) as CustomerOrderHistory[];
          setOrders(orderRows);
          setBills(orderRows.filter((o) =>
            (o.status ?? '').toLowerCase() === 'billed'
            || (o.status ?? '').toLowerCase() === 'delivered'
            || Boolean(o.invoice_number),
          ));
        } else {
          toast.error('Failed to load customer orders');
          setOrders([]);
          setBills([]);
        }

        if (receiptsRes.status === 'fulfilled' && !receiptsRes.value.error) {
          setTransactions((receiptsRes.value.data ?? []) as CustomerReceiptHistory[]);
        } else {
          toast.error('Failed to load customer transactions');
          setTransactions([]);
        }
      } finally {
        if (!cancelled) {
          setCustomerLoading(false);
          setHistoryLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openId]);

  const value = useMemo<CustomerDialogContextValue>(() => ({ openCustomer }), [openCustomer]);

  const exportStatement = () => {
    if (!customer) return;
    const headers = ['Section', 'Date', 'Reference', 'Secondary Ref', 'Status', 'Mode/Company', 'Amount'];
    const rows = [
      ...transactions.map((tx) => [
        'Transaction',
        tx.received_date ? new Date(tx.received_date).toLocaleDateString('en-IN') : '—',
        tx.receipt_number ?? '—',
        tx.orders?.invoice_number ?? tx.orders?.order_number ?? '—',
        tx.payment_status ?? 'Pending',
        tx.payment_mode ?? '—',
        (tx.amount ?? 0).toString(),
      ]),
      ...bills.map((bill) => [
        'Bill',
        new Date(bill.created_at).toLocaleDateString('en-IN'),
        bill.invoice_number ?? '—',
        bill.order_number ?? '—',
        bill.status ?? 'Pending',
        bill.company ?? '—',
        (bill.grand_total ?? 0).toString(),
      ]),
      ...orders.map((order) => [
        'Order',
        new Date(order.created_at).toLocaleDateString('en-IN'),
        order.order_number ?? '—',
        order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN') : '—',
        order.status ?? 'Pending',
        order.company ?? '—',
        (order.grand_total ?? 0).toString(),
      ]),
    ];
    downloadCSV(headers, rows, `customer_statement_${customer.name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportSection = (section: 'transactions' | 'bills' | 'orders') => {
    if (!customer) return;
    if (section === 'transactions') {
      downloadCSV(
        ['Receipt No', 'Order No', 'Invoice No', 'Status', 'Mode', 'Received Date', 'Amount'],
        transactions.map((tx) => [
          tx.receipt_number ?? '—',
          tx.orders?.order_number ?? '—',
          tx.orders?.invoice_number ?? '—',
          tx.payment_status ?? 'Pending',
          tx.payment_mode ?? '—',
          tx.received_date ? new Date(tx.received_date).toLocaleDateString('en-IN') : '—',
          tx.amount ?? 0,
        ]),
        `customer_transactions_${customer.name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      return;
    }
    if (section === 'bills') {
      downloadCSV(
        ['Invoice No', 'Order No', 'Status', 'Company', 'Bill Date', 'Amount'],
        bills.map((bill) => [
          bill.invoice_number ?? '—',
          bill.order_number ?? '—',
          bill.status ?? 'Pending',
          bill.company ?? '—',
          new Date(bill.created_at).toLocaleDateString('en-IN'),
          bill.grand_total ?? 0,
        ]),
        `customer_bills_${customer.name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      return;
    }
    downloadCSV(
      ['Order No', 'Status', 'Company', 'Created Date', 'Delivery Date', 'Grand Total'],
      orders.map((order) => [
        order.order_number ?? '—',
        order.status ?? 'Pending',
        order.company ?? '—',
        new Date(order.created_at).toLocaleDateString('en-IN'),
        order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN') : '—',
        order.grand_total ?? 0,
      ]),
      `customer_orders_${customer.name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  return (
    <CustomerDialogContext.Provider value={value}>
      {children}
      <Dialog open={Boolean(openId)} onOpenChange={(open) => { if (!open) reset(); }}>
        <DialogContent className="max-w-[95vw] xl:max-w-[1400px] h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0 bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl sm:rounded-2xl">
          <DialogHeader className="p-6 pb-4 shrink-0 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold ring-1 ring-primary/20 shadow-inner">
                {customer?.name?.charAt(0) || 'C'}
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  {customerLoading ? 'Loading…' : (customer?.name ?? 'Unknown customer')}
                </DialogTitle>
                <DialogDescription className="mt-1.5 flex items-center gap-3 text-sm flex-wrap">
                  {customer?.company ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 text-[11px] font-bold uppercase tracking-wide">
                      <Building2 size={11} /> {customer.company}
                    </span>
                  ) : customer ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold uppercase tracking-wide">
                      <Building2 size={11} /> Unassigned
                    </span>
                  ) : null}
                  {customer?.phone && (
                    <span className="flex items-center gap-1.5 opacity-90"><Phone size={14} className="text-primary/70"/> {customer.phone}</span>
                  )}
                  {customer?.location ? (
                    <>
                      <span className="text-muted-foreground/30">•</span>
                      <span className="flex items-center gap-1.5 opacity-90"><MapPin size={14} className="text-primary/70"/> {customer.location}</span>
                    </>
                  ) : customer?.place ? (
                    <>
                      <span className="text-muted-foreground/30">•</span>
                      <span className="flex items-center gap-1.5 opacity-90"><MapPin size={14} className="text-primary/70"/> {customer.place}</span>
                    </>
                  ) : null}
                </DialogDescription>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button size="sm" variant="default" onClick={exportStatement} className="gap-2" disabled={!customer}>
                  <Download size={14} /> Export Statement
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportSection('transactions')} className="gap-2" disabled={!customer}>
                  <Receipt size={14} /> Transactions
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportSection('bills')} className="gap-2" disabled={!customer}>
                  <FileText size={14} /> Bills
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportSection('orders')} className="gap-2" disabled={!customer}>
                  <ShoppingBag size={14} /> Orders
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 pt-4">
            {historyLoading || customerLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Spinner />
                <p className="text-sm text-muted-foreground animate-pulse">Loading history…</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {(() => {
                    const invoiceOb = customer?.opening_invoice ?? 0;
                    const dcOb = customer?.opening_delivery_challan ?? 0;
                    const totalOb = invoiceOb + dcOb;
                    const toneFor = (amount: number) => amount > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : amount < 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground';
                    const iconTone = totalOb > 0
                      ? 'bg-rose-500/10 text-rose-500 group-hover:bg-rose-500/20'
                      : totalOb < 0
                        ? 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-500 group-hover:bg-slate-500/20';
                    const sublabel = totalOb > 0 ? 'Customer owes us' : totalOb < 0 ? 'Advance held' : 'Settled';
                    const formatAmount = (n: number) => `${n < 0 ? '-' : ''}₹ ${Math.abs(n).toLocaleString('en-IN')}`;
                    return (
                      <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm flex flex-col justify-between group hover:border-primary/20 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground font-medium">Opening Balance</span>
                          <div className={`p-2 rounded-md transition-colors ${iconTone}`}><IndianRupee size={16} /></div>
                        </div>
                        <div className="mt-3 flex flex-col">
                          <span className={`text-2xl font-bold font-mono ${toneFor(totalOb)}`}>{formatAmount(totalOb)}</span>
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-semibold mt-1">{sublabel}</span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border/40 font-mono text-[11px] leading-relaxed text-muted-foreground">
                          <div className="flex items-center">
                            <span className="text-muted-foreground/60 select-none mr-1">├─</span>
                            <span className="flex-1">Invoice</span>
                            <span className={`font-semibold ${toneFor(invoiceOb)}`}>{formatAmount(invoiceOb)}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-muted-foreground/60 select-none mr-1">└─</span>
                            <span className="flex-1">Delivery Challan</span>
                            <span className={`font-semibold ${toneFor(dcOb)}`}>{formatAmount(dcOb)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm flex flex-col justify-between group hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-medium">Total Orders</span>
                      <div className="p-2 rounded-md bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20 transition-colors"><ShoppingBag size={16} /></div>
                    </div>
                    <span className="text-2xl font-bold mt-3">{orders.length}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm flex flex-col justify-between group hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-medium">Billed Amount</span>
                      <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20 transition-colors"><FileText size={16} /></div>
                    </div>
                    <span className="text-2xl font-bold mt-3 font-mono text-emerald-600 dark:text-emerald-400">
                      ₹ {bills.reduce((acc, b) => acc + (b.grand_total || 0), 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm flex flex-col justify-between group hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-medium">Transactions</span>
                      <div className="p-2 rounded-md bg-violet-500/10 text-violet-500 group-hover:bg-violet-500/20 transition-colors"><Receipt size={16} /></div>
                    </div>
                    <span className="text-2xl font-bold mt-3">{transactions.length}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm flex flex-col justify-between group hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-medium">Total Paid</span>
                      <div className="p-2 rounded-md bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20 transition-colors"><IndianRupee size={16} /></div>
                    </div>
                    <span className="text-2xl font-bold mt-3 font-mono text-amber-600 dark:text-amber-400">
                      ₹ {transactions.reduce((acc, t) => acc + (t.amount || 0), 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <Tabs defaultValue="transactions" className="w-full">
                  <div className="flex items-center mb-4">
                    <TabsList className="h-11 bg-muted/50 p-1 rounded-lg">
                      <TabsTrigger value="transactions" className="rounded-md px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        Transactions <span className="ml-2 rounded-full bg-muted-foreground/10 px-2 py-0.5 text-xs">{transactions.length}</span>
                      </TabsTrigger>
                      <TabsTrigger value="bills" className="rounded-md px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        Bills <span className="ml-2 rounded-full bg-muted-foreground/10 px-2 py-0.5 text-xs">{bills.length}</span>
                      </TabsTrigger>
                      <TabsTrigger value="orders" className="rounded-md px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        Orders <span className="ml-2 rounded-full bg-muted-foreground/10 px-2 py-0.5 text-xs">{orders.length}</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
                    <TabsContent value="transactions" className="m-0 border-0 p-0">
                      {transactions.length === 0 ? (
                        <div className="p-10"><EmptyState icon={Receipt} message="No transactions found" sub="Customer hasn't made any payments yet" /></div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <StyledThead>
                              <tr>
                                <StyledTh className="pl-6">Receipt</StyledTh>
                                <StyledTh>Order / Invoice</StyledTh>
                                <StyledTh>Mode</StyledTh>
                                <StyledTh>Status</StyledTh>
                                <StyledTh>Received Date</StyledTh>
                                <StyledTh right className="pr-6">Amount</StyledTh>
                              </tr>
                            </StyledThead>
                            <tbody className="divide-y divide-border/50">
                              {transactions.map((tx) => (
                                <StyledTr key={tx.id} className="hover:bg-muted/30 transition-colors">
                                  <StyledTd className="font-medium pl-6">{tx.receipt_number ?? '—'}</StyledTd>
                                  <StyledTd>
                                    <p className="font-medium">{tx.orders?.order_number ?? '—'}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{tx.orders?.invoice_number ?? 'No Invoice'}</p>
                                  </StyledTd>
                                  <StyledTd>
                                    <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs font-medium">{tx.payment_mode ?? '—'}</span>
                                  </StyledTd>
                                  <StyledTd><StatusBadge status={tx.payment_status ?? 'Pending'} /></StyledTd>
                                  <StyledTd mono className="text-muted-foreground">{tx.received_date ? new Date(tx.received_date).toLocaleDateString('en-IN') : '—'}</StyledTd>
                                  <StyledTd right mono className="font-bold text-base pr-6">₹ {(tx.amount ?? 0).toLocaleString('en-IN')}</StyledTd>
                                </StyledTr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="bills" className="m-0 border-0 p-0">
                      {bills.length === 0 ? (
                        <div className="p-10"><EmptyState icon={FileText} message="No billed invoices found" sub="Customer has no completed billing history" /></div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <StyledThead>
                              <tr>
                                <StyledTh className="pl-6">Order No</StyledTh>
                                <StyledTh>Invoice No</StyledTh>
                                <StyledTh>Status</StyledTh>
                                <StyledTh>Company</StyledTh>
                                <StyledTh>Bill Date</StyledTh>
                                <StyledTh right className="pr-6">Amount</StyledTh>
                              </tr>
                            </StyledThead>
                            <tbody className="divide-y divide-border/50">
                              {bills.map((bill) => (
                                <StyledTr key={bill.id} className="hover:bg-muted/30 transition-colors">
                                  <StyledTd className="font-medium pl-6">{bill.order_number ?? '—'}</StyledTd>
                                  <StyledTd mono className="text-muted-foreground">{bill.invoice_number ?? '—'}</StyledTd>
                                  <StyledTd><StatusBadge status={bill.status ?? 'Pending'} /></StyledTd>
                                  <StyledTd className="text-muted-foreground">{bill.company ?? '—'}</StyledTd>
                                  <StyledTd mono className="text-muted-foreground">{new Date(bill.created_at).toLocaleDateString('en-IN')}</StyledTd>
                                  <StyledTd right mono className="font-bold text-base pr-6">₹ {(bill.grand_total ?? 0).toLocaleString('en-IN')}</StyledTd>
                                </StyledTr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="orders" className="m-0 border-0 p-0">
                      {orders.length === 0 ? (
                        <div className="p-10"><EmptyState icon={ShoppingBag} message="No orders found" sub="Customer hasn't placed any orders yet" /></div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <StyledThead>
                              <tr>
                                <StyledTh className="pl-6">Order No</StyledTh>
                                <StyledTh>Status</StyledTh>
                                <StyledTh>Company</StyledTh>
                                <StyledTh>Created</StyledTh>
                                <StyledTh>Delivery</StyledTh>
                                <StyledTh right className="pr-6">Grand Total</StyledTh>
                              </tr>
                            </StyledThead>
                            <tbody className="divide-y divide-border/50">
                              {orders.map((order) => (
                                <StyledTr key={order.id} className="hover:bg-muted/30 transition-colors">
                                  <StyledTd className="font-medium pl-6">{order.order_number ?? '—'}</StyledTd>
                                  <StyledTd><StatusBadge status={order.status ?? 'Pending'} /></StyledTd>
                                  <StyledTd className="text-muted-foreground">{order.company ?? '—'}</StyledTd>
                                  <StyledTd mono className="text-muted-foreground">{new Date(order.created_at).toLocaleDateString('en-IN')}</StyledTd>
                                  <StyledTd mono className="text-muted-foreground">{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN') : '—'}</StyledTd>
                                  <StyledTd right mono className="font-bold text-base pr-6">₹ {(order.grand_total ?? 0).toLocaleString('en-IN')}</StyledTd>
                                </StyledTr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </CustomerDialogContext.Provider>
  );
};
