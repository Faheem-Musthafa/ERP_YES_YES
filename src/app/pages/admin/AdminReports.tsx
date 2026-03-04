import React, { useState, useEffect } from 'react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import {
    PageHeader, DataCard, StyledThead, StyledTh, StyledTr, StyledTd,
    StatusBadge, SearchBar, Spinner, EmptyState
} from '@/app/components/ui/primitives';
import { Button } from '@/app/components/ui/button';
import { Download, Filter, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';

export const AdminReports = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<any[]>([]);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        fetchData();
    }, [statusFilter, dateFrom, dateTo]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('order_items')
                .select(`
          id,
          quantity,
          dealer_price,
          discount_pct,
          amount,
          products (name, sku, brands(name)),
          orders!inner (
            order_number,
            status,
            company,
            created_at,
            customers (name)
          )
        `)
                .order('id', { ascending: false });

            if (statusFilter !== 'all') {
                query = query.eq('orders.status', statusFilter);
            }

            if (dateFrom) {
                // start of day
                const from = new Date(dateFrom);
                from.setHours(0, 0, 0, 0);
                query = query.gte('orders.created_at', from.toISOString());
            }
            if (dateTo) {
                // end of day
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                query = query.lte('orders.created_at', to.toISOString());
            }

            const { data, error } = await query;
            if (error) throw error;
            setItems(data ?? []);
        } catch (err: any) {
            toast.error('Failed to fetch report data: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter(item => {
        if (!search) return true;
        const s = search.toLowerCase();
        const orderNo = item.orders?.order_number?.toLowerCase() || '';
        const custName = item.orders?.customers?.name?.toLowerCase() || '';
        const prodName = item.products?.name?.toLowerCase() || '';

        return orderNo.includes(s) || custName.includes(s) || prodName.includes(s);
    });

    const exportCSV = () => {
        if (filteredItems.length === 0) return;

        const headers = ['Date', 'Order No', 'Customer', 'Company', 'Product', 'Brand', 'Qty', 'DP', 'Discount %', 'Amount', 'Status'];
        const rows = filteredItems.map(item => [
            new Date(item.orders?.created_at).toLocaleDateString(),
            item.orders?.order_number,
            `"${item.orders?.customers?.name ?? ''}"`,
            item.orders?.company,
            `"${item.products?.name ?? ''}"`,
            `"${item.products?.brands?.name ?? ''}"`,
            item.quantity,
            item.dealer_price,
            item.discount_pct,
            item.amount,
            item.orders?.status
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Sales_Item_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 pb-12">
            <PageHeader
                title="Item-Wise Sales Report"
                subtitle="Detailed breakdown of all products sold across orders"
                actions={
                    <Button onClick={exportCSV} disabled={filteredItems.length === 0} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                        <Download size={16} /> Export to CSV
                    </Button>
                }
            />

            {/* Filters */}
            <DataCard className="bg-white border-border shadow-sm p-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <SearchBar
                            placeholder="Search product, customer, or order no..."
                            value={search}
                            onChange={setSearch}
                        />
                    </div>

                    <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        <div className="space-y-1.5 shrink-0">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-36 h-10">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Approved">Approved</SelectItem>
                                    <SelectItem value="Billed">Billed</SelectItem>
                                    <SelectItem value="Delivered">Delivered</SelectItem>
                                    <SelectItem value="Rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5 shrink-0">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Date From</label>
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)}
                                className="h-10 text-sm w-36"
                            />
                        </div>

                        <div className="space-y-1.5 shrink-0">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Date To</label>
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)}
                                className="h-10 text-sm w-36"
                            />
                        </div>
                    </div>
                </div>
            </DataCard>

            {/* Data Table */}
            <DataCard>
                {loading ? (
                    <div className="flex justify-center py-20"><Spinner size={32} /></div>
                ) : filteredItems.length === 0 ? (
                    <EmptyState
                        icon={FileText}
                        message="No sales data found"
                        sub="Try adjusting your search or filter criteria."
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <StyledThead>
                                <tr>
                                    <StyledTh>Date</StyledTh>
                                    <StyledTh>Order No</StyledTh>
                                    <StyledTh>Customer</StyledTh>
                                    <StyledTh>Product</StyledTh>
                                    <StyledTh>Brand</StyledTh>
                                    <StyledTh right>Qty</StyledTh>
                                    <StyledTh right>DP (₹)</StyledTh>
                                    <StyledTh right>Disc %</StyledTh>
                                    <StyledTh right>Amount (₹)</StyledTh>
                                    <StyledTh center>Status</StyledTh>
                                </tr>
                            </StyledThead>
                            <tbody>
                                {filteredItems.map(item => (
                                    <StyledTr key={item.id} className="hover:bg-muted/30">
                                        <StyledTd mono className="text-xs text-muted-foreground whitespace-nowrap">
                                            {new Date(item.orders?.created_at).toLocaleDateString()}
                                        </StyledTd>
                                        <StyledTd className="font-semibold text-primary whitespace-nowrap">
                                            {item.orders?.order_number}
                                        </StyledTd>
                                        <StyledTd className="font-medium truncate max-w-[150px]">
                                            {item.orders?.customers?.name ?? '—'}
                                        </StyledTd>
                                        <StyledTd className="text-foreground font-medium truncate max-w-[200px]">
                                            {item.products?.name ?? '—'}
                                        </StyledTd>
                                        <StyledTd className="text-muted-foreground text-xs uppercase tracking-wider">
                                            {item.products?.brands?.name ?? '—'}
                                        </StyledTd>
                                        <StyledTd right mono className="font-bold">
                                            {item.quantity}
                                        </StyledTd>
                                        <StyledTd right mono className="text-muted-foreground">
                                            {item.dealer_price?.toLocaleString('en-IN') ?? '0'}
                                        </StyledTd>
                                        <StyledTd right mono className="text-red-600/80">
                                            {item.discount_pct}%
                                        </StyledTd>
                                        <StyledTd right mono className="font-bold text-emerald-600">
                                            ₹{item.amount?.toLocaleString('en-IN') ?? '0'}
                                        </StyledTd>
                                        <StyledTd center>
                                            <StatusBadge status={item.orders?.status} />
                                        </StyledTd>
                                    </StyledTr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </DataCard>
        </div>
    );
};
