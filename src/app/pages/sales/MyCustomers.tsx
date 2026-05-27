import React, { useState, useEffect } from 'react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Download, Users, TrendingUp, Phone, MapPin, Receipt, ShoppingBag, FileText, IndianRupee, MessageCircle, Plus, ChevronRight, Search, X } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { fmt, downloadCSV } from '@/app/utils';
import { loadMasterDataSettings } from '@/app/settings';
import {
    PageHeader, DataCard, StyledThead, StyledTh, StyledTr, StyledTd,
    SearchBar, Spinner, EmptyState, TablePagination, FilterBar, FilterField, StatusBadge,
    CustomTooltip
} from '@/app/components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';

interface CustomerData {
    id: string;
    name: string;
    phone: string;
    location: string | null;
    place: string | null;
    company: string | null;
    openingInvoice: number;
    openingDeliveryChallan: number;
    openingBalance: number;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    lastOrderDate: string | null;
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
    received_date: string | null;
    created_at: string;
    orders: {
        order_number: string | null;
        invoice_number: string | null;
    } | null;
}

export const MyCustomers = () => {
    const { user } = useAuth();
    const [customers, setCustomers] = useState<CustomerData[]>([]);
    const [locationOptions, setLocationOptions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [locationFilter, setLocationFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
    const [customerOrders, setCustomerOrders] = useState<CustomerOrderHistory[]>([]);
    const [customerBills, setCustomerBills] = useState<CustomerOrderHistory[]>([]);
    const [customerTransactions, setCustomerTransactions] = useState<CustomerReceiptHistory[]>([]);
    const pageSize = 10;

    const fetchData = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            // Fetch active customers
            const { data: custData, error: custErr } = await supabase
                .from('customers')
                .select('id, name, phone, location, place, company, opening_invoice, opening_delivery_challan, opening_balance, is_active')
                .eq('is_active', true);

            if (custErr) throw custErr;

            // Sales role: only their own orders should drive per-customer metrics.
            // Admin / accounts: full scope (RLS handles cross-cutting visibility).
            let orderQuery = supabase
                .from('orders')
                .select('customer_id, grand_total, created_at');
            if (user?.role === 'sales' && user?.id) {
                orderQuery = orderQuery.eq('created_by', user.id);
            }
            const { data: orderData, error: ordErr } = await orderQuery;

            if (ordErr) throw ordErr;

            // Build order map
            const orderMap = new Map<string, { count: number; revenue: number; lastDate: string }>();
            orderData?.forEach(o => {
                if (!o.customer_id) return;
                const existing = orderMap.get(o.customer_id) || { count: 0, revenue: 0, lastDate: '' };
                orderMap.set(o.customer_id, {
                    count: existing.count + 1,
                    revenue: existing.revenue + (o.grand_total || 0),
                    lastDate: !existing.lastDate || Date.parse(o.created_at) > Date.parse(existing.lastDate) ? o.created_at : existing.lastDate,
                });
            });

            // Transform to customer data
            const data = custData?.map(c => {
                const orderInfo = orderMap.get(c.id) || { count: 0, revenue: 0, lastDate: '' };
                return {
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    location: c.location,
                    place: c.place,
                    company: c.company ?? null,
                    openingInvoice: c.opening_invoice ?? 0,
                    openingDeliveryChallan: c.opening_delivery_challan ?? 0,
                    openingBalance: c.opening_balance ?? 0,
                    totalOrders: orderInfo.count,
                    totalRevenue: orderInfo.revenue,
                    averageOrderValue: orderInfo.count > 0 ? orderInfo.revenue / orderInfo.count : 0,
                    lastOrderDate: orderInfo.lastDate,
                } as CustomerData;
            }) || [];

            setCustomers(data.sort((a, b) => b.totalRevenue - a.totalRevenue));

                        const settings = await loadMasterDataSettings().catch(() => null);
                        const configured = settings?.districts ?? [];
                        const discovered = Array.from(
                            new Set(
                                data
                                    .map((row) => row.location)
                                    .filter((row): row is string => typeof row === 'string' && row.trim().length > 0),
                            ),
                        );

                        const merged = [...configured];
                        discovered.forEach((value) => {
                            if (!merged.includes(value)) {
                                merged.push(value);
                            }
                        });
                        setLocationOptions(merged);
        } catch (err: any) {
            toast.error(err.message || 'Failed to fetch customers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void fetchData(); }, [user?.id]);

    const filtered = customers.filter(c => {
        const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
        const matchLocation = locationFilter === 'all' || c.location === locationFilter;
        return matchSearch && matchLocation;
    });

    useEffect(() => { setCurrentPage(1); }, [search, locationFilter]);
        useEffect(() => {
            if (locationFilter !== 'all' && !locationOptions.includes(locationFilter)) {
                setLocationFilter('all');
            }
        }, [locationFilter, locationOptions]);

    const openHistory = (customer: CustomerData) => {
        setSelectedCustomer(customer);
        setHistoryOpen(true);
    };

    const fetchCustomerHistory = async (customerId: string) => {
        setHistoryLoading(true);
        try {
            const [ordersResult, receiptsResult] = await Promise.allSettled([
                supabase
                    .from('orders')
                    .select('id, order_number, invoice_number, status, company, grand_total, created_at, delivery_date')
                    .eq('customer_id', customerId)
                    .order('created_at', { ascending: false })
                    .limit(150),
                supabase
                    .from('receipts')
                    .select('id, receipt_number, amount, payment_mode, payment_status, received_date, created_at, orders(order_number, invoice_number)')
                    .eq('customer_id', customerId)
                    .order('created_at', { ascending: false })
                    .limit(150),
            ]);

            if (ordersResult.status === 'fulfilled') {
                if (ordersResult.value.error) {
                    toast.error('Failed to load customer orders');
                    setCustomerOrders([]);
                    setCustomerBills([]);
                } else {
                    const orders = (ordersResult.value.data ?? []) as CustomerOrderHistory[];
                    setCustomerOrders(orders);
                    setCustomerBills(
                        orders.filter((order) =>
                            (order.status ?? '').toLowerCase() === 'billed'
                            || (order.status ?? '').toLowerCase() === 'delivered'
                            || Boolean(order.invoice_number),
                        ),
                    );
                }
            } else {
                toast.error('Failed to load customer orders');
                setCustomerOrders([]);
                setCustomerBills([]);
            }

            if (receiptsResult.status === 'fulfilled') {
                if (receiptsResult.value.error) {
                    toast.error('Failed to load customer transactions');
                    setCustomerTransactions([]);
                } else {
                    setCustomerTransactions((receiptsResult.value.data ?? []) as CustomerReceiptHistory[]);
                }
            } else {
                toast.error('Failed to load customer transactions');
                setCustomerTransactions([]);
            }
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (!historyOpen || !selectedCustomer?.id) return;
        void fetchCustomerHistory(selectedCustomer.id);
    }, [historyOpen, selectedCustomer?.id]);

    const exportCustomerStatement = () => {
        if (!selectedCustomer) return;

        const headers = ['Section', 'Date', 'Reference', 'Secondary Ref', 'Status', 'Mode/Company', 'Amount'];
        const rows = [
            ...customerTransactions.map((tx) => [
                'Transaction',
                tx.received_date ? new Date(tx.received_date).toLocaleDateString('en-IN') : '—',
                tx.receipt_number ?? '—',
                tx.orders?.invoice_number ?? tx.orders?.order_number ?? '—',
                tx.payment_status ?? 'Pending',
                tx.payment_mode ?? '—',
                (tx.amount ?? 0).toString(),
            ]),
            ...customerBills.map((bill) => [
                'Bill',
                new Date(bill.created_at).toLocaleDateString('en-IN'),
                bill.invoice_number ?? '—',
                bill.order_number ?? '—',
                bill.status ?? 'Pending',
                bill.company ?? '—',
                (bill.grand_total ?? 0).toString(),
            ]),
            ...customerOrders.map((order) => [
                'Order',
                new Date(order.created_at).toLocaleDateString('en-IN'),
                order.order_number ?? '—',
                order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN') : '—',
                order.status ?? 'Pending',
                order.company ?? '—',
                (order.grand_total ?? 0).toString(),
            ]),
        ];

        downloadCSV(
            headers,
            rows,
            `customer_statement_${selectedCustomer.name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`,
        );
    };

    const exportCustomerSection = (section: 'transactions' | 'bills' | 'orders') => {
        if (!selectedCustomer) return;

        if (section === 'transactions') {
            downloadCSV(
                ['Receipt No', 'Order No', 'Invoice No', 'Status', 'Mode', 'Received Date', 'Amount'],
                customerTransactions.map((tx) => [
                    tx.receipt_number ?? '—',
                    tx.orders?.order_number ?? '—',
                    tx.orders?.invoice_number ?? '—',
                    tx.payment_status ?? 'Pending',
                    tx.payment_mode ?? '—',
                    tx.received_date ? new Date(tx.received_date).toLocaleDateString('en-IN') : '—',
                    tx.amount ?? 0,
                ]),
                `customer_transactions_${selectedCustomer.name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`,
            );
            return;
        }

        if (section === 'bills') {
            downloadCSV(
                ['Invoice No', 'Order No', 'Status', 'Company', 'Bill Date', 'Amount'],
                customerBills.map((bill) => [
                    bill.invoice_number ?? '—',
                    bill.order_number ?? '—',
                    bill.status ?? 'Pending',
                    bill.company ?? '—',
                    new Date(bill.created_at).toLocaleDateString('en-IN'),
                    bill.grand_total ?? 0,
                ]),
                `customer_bills_${selectedCustomer.name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`,
            );
            return;
        }

        downloadCSV(
            ['Order No', 'Status', 'Company', 'Created Date', 'Delivery Date', 'Grand Total'],
            customerOrders.map((order) => [
                order.order_number ?? '—',
                order.status ?? 'Pending',
                order.company ?? '—',
                new Date(order.created_at).toLocaleDateString('en-IN'),
                order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN') : '—',
                order.grand_total ?? 0,
            ]),
            `customer_orders_${selectedCustomer.name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`,
        );
    };

    const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const locationData = locationOptions.map(loc => ({
        name: loc,
        customers: customers.filter(c => c.location === loc).length,
        revenue: customers.filter(c => c.location === loc).reduce((s, c) => s + c.totalRevenue, 0),
    }));

    const stats = {
        totalCustomers: customers.length,
        totalRevenue: customers.reduce((s, c) => s + c.totalRevenue, 0),
        avgOrderValue: customers.length > 0 ? customers.reduce((s, c) => s + c.averageOrderValue, 0) / customers.length : 0,
        totalOrders: customers.reduce((s, c) => s + c.totalOrders, 0),
    };

    const COLORS = ['#00bdb4', '#ff6b6b', '#4ecdc4', '#ffe66d'];

    return (
        <>
        {/* ════════════════════════════════════════════════════
           MOBILE — sales-rep customer book, Enterprise SaaS aesthetic.
           Indigo→Violet gradient hero, search-first, big-touch
           list cards with call / WhatsApp / quick-order. Hidden ≥ lg.
           ════════════════════════════════════════════════════ */}
        <div className="lg:hidden sm-font sm-surface -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 min-h-[calc(100vh-4rem)]">
          <div className="space-y-5 px-4 pt-5 pb-4 max-w-2xl mx-auto">
            <header className="sm-rise">
              <p className="sm-eyebrow text-[var(--sm-muted)]">Portfolio</p>
              <h1 className="sm-headline text-[26px] text-[var(--sm-text)] mt-0.5">My customers</h1>
            </header>

            {/* Portfolio hero */}
            <section className="sm-rise sm-rise-1 relative overflow-hidden sm-gradient rounded-[20px] p-5 shadow-[0_18px_40px_-20px_rgba(79,70,229,0.55)]">
              <div
                className="absolute -top-16 -right-16 h-44 w-44 rounded-full"
                style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.22), transparent 70%)' }}
                aria-hidden
              />
              <p className="relative sm-eyebrow text-white/80">My book</p>
              <div className="relative mt-2 flex items-end gap-3">
                <span className="sm-headline text-[44px] leading-none text-white">{stats.totalCustomers}</span>
                <span className="text-xs text-white/75 pb-1.5">customer{stats.totalCustomers === 1 ? '' : 's'}</span>
              </div>
              <div className="relative mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white/12 border border-white/10 px-2.5 py-2">
                  <p className="text-[9px] font-bold tracking-wider uppercase text-white/80">Revenue</p>
                  <p className="mt-0.5 font-mono font-bold text-sm text-white">{fmt(stats.totalRevenue)}</p>
                </div>
                <div className="rounded-xl bg-white/12 border border-white/10 px-2.5 py-2">
                  <p className="text-[9px] font-bold tracking-wider uppercase text-white/80">Orders</p>
                  <p className="mt-0.5 font-mono font-bold text-sm text-white">{stats.totalOrders}</p>
                </div>
                <div className="rounded-xl bg-white/12 border border-white/10 px-2.5 py-2">
                  <p className="text-[9px] font-bold tracking-wider uppercase text-white/80">Avg</p>
                  <p className="mt-0.5 font-mono font-bold text-sm text-white">{fmt(stats.avgOrderValue)}</p>
                </div>
              </div>
            </section>

            {/* Search */}
            <div className="sm-rise sm-rise-2 relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--sm-muted)]" />
              <input
                type="search"
                inputMode="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or phone…"
                className="sm-font w-full h-12 sm-pill bg-white border border-[var(--sm-border)] pl-11 pr-10 text-sm font-medium text-[var(--sm-text)] placeholder:text-[var(--sm-muted)] focus:border-[var(--sm-primary)] focus:ring-2 focus:ring-indigo-200 outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="sm-tap absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[var(--sm-muted)]"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Location filter chips */}
            {locationOptions.length > 0 && (
              <div className="sm-rise sm-rise-2 -mx-1 overflow-x-auto" role="tablist" aria-label="Location filter">
                <div className="flex gap-2 px-1 pb-1">
                  <button
                    type="button"
                    onClick={() => setLocationFilter('all')}
                    className={`sm-tap shrink-0 sm-pill px-3.5 py-1.5 text-[11px] font-bold border ${
                      locationFilter === 'all'
                        ? 'sm-gradient text-white border-transparent'
                        : 'bg-white text-[var(--sm-text)] border-[var(--sm-border)]'
                    }`}
                  >
                    All
                  </button>
                  {locationOptions.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocationFilter(loc)}
                      className={`sm-tap shrink-0 sm-pill px-3.5 py-1.5 text-[11px] font-bold border ${
                        locationFilter === loc
                          ? 'sm-gradient text-white border-transparent'
                          : 'bg-white text-[var(--sm-text)] border-[var(--sm-border)]'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* List */}
            <section className="sm-rise sm-rise-3 sm-card overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-sm text-[var(--sm-muted)]">Loading…</div>
              ) : paginated.length === 0 ? (
                <div className="p-8 text-center">
                  <Users size={28} className="mx-auto text-[var(--sm-muted)]" />
                  <p className="mt-2 text-sm font-bold text-[var(--sm-text)]">No customers</p>
                  <p className="text-xs text-[var(--sm-muted)]">Try clearing filters.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--sm-border)]">
                  {paginated.map((c) => {
                    const phoneDigits = (c.phone || '').replace(/\D/g, '');
                    return (
                      <li key={c.id} className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => openHistory(c)}
                          className="sm-tap w-full flex items-start gap-3 text-left"
                        >
                          <span className="shrink-0 h-10 w-10 sm-pill sm-gradient text-white flex items-center justify-center font-bold">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-bold text-[var(--sm-text)] truncate">{c.name}</p>
                              <p className="font-mono font-bold text-sm text-[var(--sm-text)] shrink-0">{fmt(c.totalRevenue)}</p>
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--sm-muted)]">
                              {c.location && (
                                <>
                                  <MapPin size={11} />
                                  <span className="truncate">{c.location}</span>
                                  <span className="opacity-40">·</span>
                                </>
                              )}
                              <span>{c.totalOrders} order{c.totalOrders === 1 ? '' : 's'}</span>
                            </div>
                            {c.lastOrderDate && (
                              <p className="mt-0.5 text-[11px] text-[var(--sm-muted)]/80">
                                Last: {new Date(c.lastOrderDate).toLocaleDateString('en-IN')}
                              </p>
                            )}
                          </div>
                          <ChevronRight size={16} className="text-[var(--sm-muted)] mt-1 shrink-0" />
                        </button>
                        <div className="mt-2.5 flex items-center gap-2">
                          {phoneDigits && (
                            <a
                              href={`tel:${phoneDigits}`}
                              className="sm-tap inline-flex items-center gap-1.5 sm-pill bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 text-[11px] font-bold"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone size={12} /> Call
                            </a>
                          )}
                          {phoneDigits && (
                            <a
                              href={`https://wa.me/${phoneDigits}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="sm-tap inline-flex items-center gap-1.5 sm-pill bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 text-[11px] font-bold"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MessageCircle size={12} /> WhatsApp
                            </a>
                          )}
                          <Link
                            to={`/sales/create-order?customer=${c.id}`}
                            className="sm-tap ml-auto inline-flex items-center gap-1.5 sm-pill sm-gradient text-white px-3 py-1.5 text-[11px] font-bold"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Plus size={12} /> Order
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {filtered.length > pageSize && (
                <div className="border-t border-[var(--sm-border)]">
                  <TablePagination
                    totalItems={filtered.length}
                    currentPage={page}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    itemLabel="customers"
                  />
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Desktop preserved verbatim */}
        <div className="hidden lg:block space-y-6">
            <PageHeader
                title="My Customers"
                subtitle="Active customer portfolio"
                actions={
                    <CustomTooltip content="Download customer data as CSV file" side="bottom">
                        <Button
                            size="sm"
                            onClick={() => {
                              const headers = ['Name', 'Phone', 'Location', 'Place', 'Orders Count', 'Total Revenue', 'Avg Order Value', 'Last Order'];
                              const rows = paginated.map(c => [
                                c.name,
                                c.phone,
                                c.location || '-',
                                c.place || '-',
                                c.totalOrders,
                                c.totalRevenue,
                                c.averageOrderValue.toFixed(0),
                                c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : '-',
                              ]);
                              downloadCSV(headers, rows, 'my_customers.csv');
                            }}
                            className="gap-2"
                        >
                            <Download size={15} /> Export
                        </Button>
                    </CustomTooltip>
                }
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Customers', value: stats.totalCustomers, icon: Users },
                    { label: 'Total Orders', value: stats.totalOrders, icon: TrendingUp },
                    { label: 'Total Revenue', value: `${fmt(stats.totalRevenue)}`, icon: TrendingUp },
                    { label: 'Avg Order Value', value: `${fmt(stats.avgOrderValue)}`, icon: TrendingUp },
                ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <DataCard key={i} className="p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                                    <p className="text-lg font-bold mt-1">{stat.value}</p>
                                </div>
                                <Icon size={20} className="text-primary opacity-50" />
                            </div>
                        </DataCard>
                    );
                })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DataCard className="p-4">
                    <h3 className="text-sm font-semibold mb-4">Customers by Location</h3>
                    {locationData.filter(l => l.customers > 0).length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={locationData.filter(l => l.customers > 0)} dataKey="customers" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                    {locationData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p className="text-muted-foreground text-sm">No location data</p>}
                </DataCard>

                <DataCard className="p-4">
                    <h3 className="text-sm font-semibold mb-4">Revenue by Location</h3>
                    {locationData.filter(l => l.revenue > 0).length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={locationData.filter(l => l.revenue > 0)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="revenue" fill="#00bdb4" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-muted-foreground text-sm">No revenue data</p>}
                </DataCard>
            </div>

            {/* Filter & Search */}
            <FilterBar>
                <SearchBar
                    placeholder="Search by name or phone..."
                    value={search}
                    onChange={setSearch}
                    className="max-w-md"
                />
                <FilterField label="Location">
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                        <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Locations</SelectItem>
                            {locationOptions.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </FilterField>
            </FilterBar>

            {/* Table */}
            <DataCard>
                {loading ? <Spinner /> : customers.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        message="No customers assigned yet"
                        sub="Your admin will assign customers to you"
                    />
                ) : filtered.length === 0 ? (
                    <EmptyState icon={Users} message="No customers found for selected filters" />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <StyledThead>
                                    <tr>
                                        <StyledTh>Customer Name</StyledTh>
                                        <StyledTh>Company</StyledTh>
                                        <StyledTh>Phone</StyledTh>
                                        <StyledTh>Location</StyledTh>
                                        <StyledTh right>Orders</StyledTh>
                                        <StyledTh right>Revenue</StyledTh>
                                        <StyledTh right>Avg Order</StyledTh>
                                        <StyledTh>Last Order</StyledTh>
                                    </tr>
                                </StyledThead>
                                <tbody>
                                    {paginated.map((c) => (
                                        <StyledTr
                                            key={c.id}
                                            onClick={() => openHistory(c)}
                                            className="cursor-pointer"
                                            title={`Open history for ${c.name}`}
                                        >
                                            <StyledTd className="font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => openHistory(c)}
                                                    className="hover:text-primary hover:underline text-left"
                                                >
                                                    {c.name}
                                                </button>
                                            </StyledTd>
                                            <StyledTd>
                                                {c.company ? (
                                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">{c.company}</span>
                                                ) : (
                                                    <span className="text-[11px] text-amber-600 italic">unassigned</span>
                                                )}
                                            </StyledTd>
                                            <StyledTd mono className="text-muted-foreground">{c.phone}</StyledTd>
                                            <StyledTd>
                                                {c.location ? (
                                                    <span className="px-2 py-1 rounded text-xs font-medium bg-violet-100 text-violet-900">{c.location}</span>
                                                ) : '—'}
                                            </StyledTd>
                                            <StyledTd right className="font-semibold">{c.totalOrders}</StyledTd>
                                            <StyledTd right mono> {c.totalRevenue.toLocaleString('en-IN')}</StyledTd>
                                            <StyledTd right mono> {Math.round(c.averageOrderValue).toLocaleString('en-IN')}</StyledTd>
                                            <StyledTd className="text-xs text-muted-foreground">
                                                {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('en-IN') : '—'}
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
                            itemLabel="customers"
                        />
                    </>
                )}
            </DataCard>

            <Dialog
                open={historyOpen}
                onOpenChange={(open) => {
                    setHistoryOpen(open);
                    if (!open) {
                        setSelectedCustomer(null);
                        setCustomerOrders([]);
                        setCustomerBills([]);
                        setCustomerTransactions([]);
                    }
                }}
            >
                <DialogContent className="p-0 bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl overflow-hidden flex flex-col w-screen max-w-screen h-[100dvh] max-h-[100dvh] rounded-none lg:w-auto lg:max-w-[1400px] lg:h-[90vh] lg:max-h-[90vh] lg:rounded-2xl sm-font lg:font-normal">
                    <DialogHeader className="p-4 lg:p-6 lg:pb-4 shrink-0 border-b border-border/50 bg-muted/20">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
                            <div className="flex items-center gap-3 lg:gap-4 min-w-0">
                                <div className="h-11 w-11 lg:h-14 lg:w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg lg:text-2xl font-bold ring-1 ring-primary/20 shadow-inner shrink-0">
                                    {selectedCustomer?.name?.charAt(0) || 'C'}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <DialogTitle className="text-lg lg:text-2xl font-bold tracking-tight truncate">
                                        {selectedCustomer?.name}
                                    </DialogTitle>
                                    <DialogDescription className="mt-1 lg:mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs lg:text-sm">
                                         {selectedCustomer?.phone && (
                                            <a href={`tel:${(selectedCustomer.phone || '').replace(/\D/g, '')}`} className="flex items-center gap-1 opacity-90 hover:text-primary"><Phone size={12} className="text-primary/70"/> {selectedCustomer.phone}</a>
                                         )}
                                         {selectedCustomer?.location && (
                                            <>
                                                <span className="text-muted-foreground/30 hidden lg:inline">•</span>
                                                <span className="flex items-center gap-1 opacity-90"><MapPin size={12} className="text-primary/70"/> {selectedCustomer.location}</span>
                                            </>
                                         )}
                                    </DialogDescription>
                                </div>
                            </div>
                            <div className="lg:ml-auto flex flex-wrap items-center gap-2 -mr-1 lg:mr-0 overflow-x-auto lg:overflow-visible pr-1">
                                <Button size="sm" variant="default" onClick={exportCustomerStatement} className="gap-1.5 h-8 lg:h-9 text-[11px] lg:text-sm shrink-0">
                                    <Download size={13} /> Statement
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => exportCustomerSection('transactions')} className="gap-1.5 h-8 lg:h-9 text-[11px] lg:text-sm shrink-0">
                                    <Receipt size={13} /> Transactions
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => exportCustomerSection('bills')} className="gap-1.5 h-8 lg:h-9 text-[11px] lg:text-sm shrink-0">
                                    <FileText size={13} /> Bills
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => exportCustomerSection('orders')} className="gap-1.5 h-8 lg:h-9 text-[11px] lg:text-sm shrink-0">
                                    <ShoppingBag size={13} /> Orders
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 lg:p-6 lg:pt-4 pb-24 lg:pb-6">
                        {historyLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-4">
                                <Spinner />
                                <p className="text-sm text-muted-foreground animate-pulse">Loading history...</p>
                            </div>
                        ) : (
                            <div className="space-y-4 lg:space-y-6">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
                                    {(() => {
                                        const invoiceOb = selectedCustomer?.openingInvoice ?? 0;
                                        const dcOb = selectedCustomer?.openingDeliveryChallan ?? 0;
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
                                        const sublabel = totalOb > 0
                                            ? 'Customer owes us'
                                            : totalOb < 0
                                                ? 'Advance held'
                                                : 'Settled';
                                        const formatAmount = (n: number) => `${n < 0 ? '-' : ''} ${Math.abs(n).toLocaleString('en-IN')}`;
                                        return (
                                            <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm flex flex-col justify-between group hover:border-primary/20 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground font-medium">Opening Balance</span>
                                                    <div className={`p-2 rounded-md transition-colors ${iconTone}`}><IndianRupee size={16} /></div>
                                                </div>
                                                <div className="mt-3 flex flex-col">
                                                    <span className={`text-2xl font-bold font-mono ${toneFor(totalOb)}`}>
                                                        {formatAmount(totalOb)}
                                                    </span>
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
                                        <span className="text-2xl font-bold mt-3">{customerOrders.length}</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm flex flex-col justify-between group hover:border-primary/20 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground font-medium">Billed Amount</span>
                                            <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20 transition-colors"><FileText size={16} /></div>
                                        </div>
                                        <span className="text-2xl font-bold mt-3 font-mono text-emerald-600 dark:text-emerald-400">
                                             {customerBills.reduce((acc, b) => acc + (b.grand_total || 0), 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm flex flex-col justify-between group hover:border-primary/20 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground font-medium">Transactions</span>
                                            <div className="p-2 rounded-md bg-violet-500/10 text-violet-500 group-hover:bg-violet-500/20 transition-colors"><Receipt size={16} /></div>
                                        </div>
                                        <span className="text-2xl font-bold mt-3">{customerTransactions.length}</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm flex flex-col justify-between group hover:border-primary/20 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground font-medium">Total Paid</span>
                                            <div className="p-2 rounded-md bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20 transition-colors"><IndianRupee size={16} /></div>
                                        </div>
                                        <span className="text-2xl font-bold mt-3 font-mono text-amber-600 dark:text-amber-400">
                                             {customerTransactions.reduce((acc, t) => acc + (t.amount || 0), 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <Tabs defaultValue="transactions" className="w-full">
                                    <div className="flex items-center mb-3 lg:mb-4 -mx-1 overflow-x-auto">
                                        <TabsList className="h-10 lg:h-11 bg-muted/50 p-1 rounded-lg w-full lg:w-auto">
                                            <TabsTrigger value="transactions" className="flex-1 lg:flex-none rounded-md px-2 lg:px-4 text-xs lg:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                                Transactions <span className="ml-1.5 rounded-full bg-muted-foreground/10 px-1.5 py-0.5 text-[10px] lg:text-xs">{customerTransactions.length}</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="bills" className="flex-1 lg:flex-none rounded-md px-2 lg:px-4 text-xs lg:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                                Bills <span className="ml-1.5 rounded-full bg-muted-foreground/10 px-1.5 py-0.5 text-[10px] lg:text-xs">{customerBills.length}</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="orders" className="flex-1 lg:flex-none rounded-md px-2 lg:px-4 text-xs lg:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                                Orders <span className="ml-1.5 rounded-full bg-muted-foreground/10 px-1.5 py-0.5 text-[10px] lg:text-xs">{customerOrders.length}</span>
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
                                        <TabsContent value="transactions" className="m-0 border-0 p-0">
                                            {customerTransactions.length === 0 ? (
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
                                                            {customerTransactions.map((tx) => (
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
                                            {customerBills.length === 0 ? (
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
                                                            {customerBills.map((bill) => (
                                                                <StyledTr key={bill.id} className="hover:bg-muted/30 transition-colors">
                                                                    <StyledTd className="font-medium pl-6">{bill.order_number ?? '—'}</StyledTd>
                                                                    <StyledTd mono className="text-muted-foreground">{bill.invoice_number ?? '—'}</StyledTd>
                                                                    <StyledTd><StatusBadge status={bill.status ?? 'Pending'} /></StyledTd>
                                                                    <StyledTd className="text-muted-foreground">{bill.company ?? '—'}</StyledTd>
                                                                    <StyledTd mono className="text-muted-foreground">{new Date(bill.created_at).toLocaleDateString('en-IN')}</StyledTd>
                                                                    <StyledTd right mono className="font-bold text-base pr-6">{(bill.grand_total ?? 0).toLocaleString('en-IN')}</StyledTd>
                                                                </StyledTr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="orders" className="m-0 border-0 p-0">
                                            {customerOrders.length === 0 ? (
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
                                                            {customerOrders.map((order) => (
                                                                <StyledTr key={order.id} className="hover:bg-muted/30 transition-colors">
                                                                    <StyledTd className="font-medium pl-6">{order.order_number ?? '—'}</StyledTd>
                                                                    <StyledTd><StatusBadge status={order.status ?? 'Pending'} /></StyledTd>
                                                                    <StyledTd className="text-muted-foreground">{order.company ?? '—'}</StyledTd>
                                                                    <StyledTd mono className="text-muted-foreground">{new Date(order.created_at).toLocaleDateString('en-IN')}</StyledTd>
                                                                    <StyledTd mono className="text-muted-foreground">{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN') : '—'}</StyledTd>
                                                                    <StyledTd right mono className="font-bold text-base pr-6">{(order.grand_total ?? 0).toLocaleString('en-IN')}</StyledTd>
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
        </div>
        </>
    );
};
