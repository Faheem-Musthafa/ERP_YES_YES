import React, { useState, useEffect } from 'react';
import { supabase } from '@/app/supabase';
import { fmt, fmtK, downloadCSV, isCollectedReceiptStatus } from '@/app/utils';
import {
    PageHeader, SearchBar, DataCard, FilterBar, FilterField,
    StyledThead, StyledTh, StyledTr, StyledTd,
    StatusBadge, EmptyState, Spinner, TablePagination,
} from '@/app/components/ui/primitives';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Download, DollarSign, TrendingUp, AlertTriangle, CheckCircle2, Wallet } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerPayment {
    customerId: string;
    customerName: string;
    place: string;
    openingBalance: number;
    totalOrders: number;
    totalBilled: number;
    totalPaid: number;
    outstanding: number;
}

interface OrderPaymentRow {
    id: string;
    customer_id: string | null;
    grand_total: number;
    customers: {
        name: string;
        place: string | null;
        opening_balance: number | null;
    } | null;
}

interface ReceiptPaymentRow {
    id: string;
    order_id: string | null;
    customer_id: string | null;
    amount: number;
    payment_status: string | null;
}

export const Payments = () => {
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<CustomerPayment[]>([]);
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        fetchData();
    }, [dateFrom, dateTo]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Query 1: Fetch orders with customer info
            let ordersQuery = supabase
                .from('orders')
                .select('id, customer_id, grand_total, status, created_at, customers(name, place, opening_balance)')
                .in('status', ['Approved', 'Billed', 'Delivered']);

            if (dateFrom) {
                const from = new Date(dateFrom);
                from.setHours(0, 0, 0, 0);
                ordersQuery = ordersQuery.gte('created_at', from.toISOString());
            }
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                ordersQuery = ordersQuery.lte('created_at', to.toISOString());
            }

            // Query 2: Fetch all receipts
            let receiptsQuery = supabase.from('receipts').select('id, order_id, customer_id, amount, payment_status, received_date, created_at');
            if (dateFrom) {
                receiptsQuery = receiptsQuery.gte('created_at', new Date(dateFrom).toISOString());
            }
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                receiptsQuery = receiptsQuery.lte('created_at', to.toISOString());
            }

            const [{ data: orders, error: ordersError }, { data: receipts, error: receiptsError }] = await Promise.all([
                ordersQuery,
                receiptsQuery,
            ]);

            if (ordersError) throw ordersError;
            if (receiptsError) throw receiptsError;

            // Build a lookup: order_id -> total receipt amount
            const receiptsByOrder = new Map<string, number>();
            const receiptsByCustomer = new Map<string, number>();
            for (const r of ((receipts ?? []) as ReceiptPaymentRow[]).filter(receipt => isCollectedReceiptStatus(receipt.payment_status))) {
                if (r.order_id) {
                    receiptsByOrder.set(r.order_id, (receiptsByOrder.get(r.order_id) ?? 0) + (r.amount ?? 0));
                }
                if (r.customer_id) {
                    receiptsByCustomer.set(r.customer_id, (receiptsByCustomer.get(r.customer_id) ?? 0) + (r.amount ?? 0));
                }
            }

            // Aggregate by customer
            const customerMap = new Map<string, CustomerPayment>();
            for (const o of (orders ?? []) as OrderPaymentRow[]) {
                const cid = o.customer_id;
                if (!cid) continue;

                const existing = customerMap.get(cid);
                const orderPaid = receiptsByOrder.get(o.id) ?? 0;

                if (existing) {
                    existing.totalOrders += 1;
                    existing.totalBilled += o.grand_total ?? 0;
                    existing.totalPaid += orderPaid;
                } else {
                    const customer = o.customers;
                    customerMap.set(cid, {
                        customerId: cid,
                        customerName: customer?.name ?? 'Unknown',
                        place: customer?.place ?? '—',
                        openingBalance: customer?.opening_balance ?? 0,
                        totalOrders: 1,
                        totalBilled: o.grand_total ?? 0,
                        totalPaid: orderPaid,
                        outstanding: 0,
                    });
                }
            }

            for (const [customerId, entry] of customerMap) {
                entry.totalPaid = receiptsByCustomer.get(customerId) ?? entry.totalPaid;
                entry.outstanding = entry.openingBalance + entry.totalBilled - entry.totalPaid;
            }

            setCustomers(Array.from(customerMap.values()));
        } catch (err: any) {
            toast.error('Failed to load payment data: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Client-side search filter
    const filtered = customers.filter(c => {
        if (!search) return true;
        const s = search.toLowerCase();
        return c.customerName.toLowerCase().includes(s) || c.place.toLowerCase().includes(s);
    });

    // Reset page on filter change
    useEffect(() => { setCurrentPage(1); }, [search, dateFrom, dateTo, customers.length]);

    const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    // Stats
    const totalBilled = filtered.reduce((s, c) => s + c.totalBilled, 0);
    const totalOpeningBalance = filtered.reduce((s, c) => s + c.openingBalance, 0);
    const totalCollected = filtered.reduce((s, c) => s + c.totalPaid, 0);
    const totalOutstanding = filtered.reduce((s, c) => s + c.outstanding, 0);
    const totalDue = totalOpeningBalance + totalBilled;
    const collectionRate = totalDue > 0 ? ((totalCollected / totalDue) * 100) : 0;

    const getPaymentStatus = (c: CustomerPayment) => {
        if (c.outstanding <= 0) return 'Fully Paid';
        if (c.totalPaid > 0) return 'Partially Paid';
        return 'Unpaid';
    };

    const getStatusBadgeVariant = (status: string) => {
        if (status === 'Fully Paid') return 'Completed';
        if (status === 'Partially Paid') return 'Pending';
        return 'Rejected';
    };

    const exportCSV = () => {
        if (filtered.length === 0) return;
        const headers = ['Customer Name', 'Place', 'Opening Balance', 'Total Orders', 'Total Billed', 'Total Paid', 'Outstanding', 'Status'];
        const rows = filtered.map(c => [
            c.customerName,
            c.place,
            c.openingBalance,
            c.totalOrders,
            c.totalBilled,
            c.totalPaid,
            c.outstanding,
            getPaymentStatus(c),
        ]);
        downloadCSV(headers, rows, `Payments_Report_${new Date().toISOString().split('T')[0]}.csv`);
        toast.success('CSV exported successfully');
    };

    const statsCards = [
        { label: 'Opening Balance', value: fmtK(totalOpeningBalance), icon: <DollarSign size={20} />, iconBg: 'bg-slate-100 text-slate-600', border: 'border-l-4 border-l-slate-500' },
        { label: 'Total Collected', value: fmtK(totalCollected), icon: <Wallet size={20} />, iconBg: 'bg-emerald-100 text-emerald-600', border: 'border-l-4 border-l-emerald-500' },
        { label: 'Outstanding', value: fmtK(totalOutstanding), icon: <AlertTriangle size={20} />, iconBg: 'bg-amber-100 text-amber-600', border: 'border-l-4 border-l-amber-500' },
        { label: 'Collection Rate', value: `${collectionRate.toFixed(1)}%`, icon: <TrendingUp size={20} />, iconBg: 'bg-violet-100 text-violet-600', border: 'border-l-4 border-l-violet-500' },
    ];

    return (
        <div className="space-y-5">
            <PageHeader
                title="Payments Tracker"
                subtitle="Customer-level payment aggregation and outstanding overview"
                actions={
                    <Button
                        onClick={exportCSV}
                        disabled={filtered.length === 0}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                    >
                        <Download size={16} /> Export CSV
                    </Button>
                }
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statsCards.map((c, i) => (
                    <DataCard key={i} className={`p-5 ${c.border}`}>
                        <div className={`p-2.5 rounded-xl inline-flex mb-3 ${c.iconBg}`}>{c.icon}</div>
                        <p className="text-2xl font-bold text-foreground font-mono">{c.value}</p>
                        <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wide">{c.label}</p>
                    </DataCard>
                ))}
            </div>

            {/* Filter Bar */}
            <FilterBar>
                <SearchBar
                    placeholder="Search by customer name or place..."
                    value={search}
                    onChange={setSearch}
                    className="w-full md:max-w-md"
                />
                <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <FilterField label="Date From" className="shrink-0">
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)}
                            className="h-10 text-sm w-36"
                        />
                    </FilterField>
                    <FilterField label="Date To" className="shrink-0">
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)}
                            className="h-10 text-sm w-36"
                        />
                    </FilterField>
                </div>
            </FilterBar>

            {/* Data Table */}
            <DataCard>
                {loading ? (
                    <Spinner />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={Wallet}
                        message="No payment records found"
                        sub="Try adjusting your search or date filters."
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <StyledThead>
                                    <tr>
                                        <StyledTh>Customer Name</StyledTh>
                                        <StyledTh>Place</StyledTh>
                                        <StyledTh right>Opening (₹)</StyledTh>
                                        <StyledTh right>Total Orders</StyledTh>
                                        <StyledTh right>Total Billed (₹)</StyledTh>
                                        <StyledTh right>Total Paid (₹)</StyledTh>
                                        <StyledTh right>Outstanding (₹)</StyledTh>
                                        <StyledTh center>Status</StyledTh>
                                    </tr>
                                </StyledThead>
                                <tbody>
                                    {paginated.map(c => {
                                        const status = getPaymentStatus(c);
                                        return (
                                            <StyledTr key={c.customerId}>
                                                <StyledTd className="font-semibold text-foreground">{c.customerName}</StyledTd>
                                                <StyledTd className="text-muted-foreground">{c.place}</StyledTd>
                                                <StyledTd right mono className="font-medium">{fmt(c.openingBalance)}</StyledTd>
                                                <StyledTd right mono className="font-medium">{c.totalOrders}</StyledTd>
                                                <StyledTd right mono className="font-semibold text-foreground">{fmt(c.totalBilled)}</StyledTd>
                                                <StyledTd right mono className="font-semibold text-emerald-600">{fmt(c.totalPaid)}</StyledTd>
                                                <StyledTd right mono className="font-bold text-amber-600">{fmt(c.outstanding)}</StyledTd>
                                                <StyledTd center>
                                                    <StatusBadge status={getStatusBadgeVariant(status)} />
                                                </StyledTd>
                                            </StyledTr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{filtered.length} customers</span>
                            <div className="flex items-center gap-4 text-sm font-mono">
                                <span className="text-muted-foreground">Opening: <span className="font-bold text-foreground">{fmt(totalOpeningBalance)}</span></span>
                                <span className="text-muted-foreground">Billed: <span className="font-bold text-foreground">{fmt(totalBilled)}</span></span>
                                <span className="text-muted-foreground">Collected: <span className="font-bold text-emerald-600">{fmt(totalCollected)}</span></span>
                                <span className="text-muted-foreground">Outstanding: <span className="font-bold text-amber-600">{fmt(totalOutstanding)}</span></span>
                            </div>
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
        </div>
    );
};
