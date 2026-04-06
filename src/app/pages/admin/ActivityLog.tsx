import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/supabase';
import { fmt } from '@/app/utils';
import {
    PageHeader, SearchBar, DataCard, FilterBar, FilterField,
    StyledThead, StyledTh, StyledTr, StyledTd,
    StatusBadge, EmptyState, Spinner, ErrorState, TablePagination,
} from '@/app/components/ui/primitives';
import { Badge } from '@/app/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Input } from '@/app/components/ui/input';
import { FileText, ShoppingCart, Package, Truck } from 'lucide-react';
import { toast } from 'sonner';

interface ActivityEvent {
    id: string;
    timestamp: string;
    action: string;
    performedBy: string;
    details: string;
    category: 'order' | 'stock' | 'delivery';
}

const CATEGORY_BADGE: Record<string, { label: string; className: string }> = {
    order: { label: 'Order', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    stock: { label: 'Stock', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    delivery: { label: 'Delivery', className: 'bg-purple-100 text-purple-700 border-purple-200' },
};

const CATEGORY_ICON: Record<string, React.ElementType> = {
    order: ShoppingCart,
    stock: Package,
    delivery: Truck,
};

const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ', ' +
        d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export const ActivityLog = () => {
    const [events, setEvents] = useState<ActivityEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const fetchActivity = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [usersRes, ordersRes, stockRes, deliveriesRes] = await Promise.all([
                supabase.from('users').select('id, full_name'),
                supabase
                    .from('orders')
                    .select('id, order_number, status, grand_total, created_by, approved_by, approved_at, created_at, customers(name)')
                    .order('created_at', { ascending: false })
                    .limit(200),
                supabase
                    .from('stock_adjustments')
                    .select('id, product_id, quantity, type, reason, adjusted_by, created_at, products(name)')
                    .order('created_at', { ascending: false })
                    .limit(100),
                supabase
                    .from('deliveries')
                    .select('id, delivery_number, order_id, status, initiated_by, initiated_by_name, created_by, created_at, dispatched_at, delivered_at')
                    .order('created_at', { ascending: false })
                    .limit(100),
            ]);

            if (usersRes.error) throw usersRes.error;
            if (ordersRes.error) throw ordersRes.error;
            if (stockRes.error) throw stockRes.error;
            if (deliveriesRes.error) throw deliveriesRes.error;

            // Build user lookup
            const users: Record<string, string> = {};
            for (const u of usersRes.data ?? []) {
                users[u.id] = u.full_name;
            }

            const allEvents: ActivityEvent[] = [];

            // -- Orders --
            for (const o of ordersRes.data ?? []) {
                const customerName = (o.customers as { name: string } | null)?.name ?? 'Unknown';
                allEvents.push({
                    id: `order-created-${o.id}`,
                    timestamp: o.created_at,
                    action: 'Order Created',
                    performedBy: users[o.created_by] ?? 'Unknown',
                    details: `${o.order_number} - ${customerName} (${fmt(o.grand_total ?? 0)})`,
                    category: 'order',
                });

                if (o.approved_at) {
                    const statusLabel = o.status === 'Rejected' ? 'Order Rejected' : 'Order Approved';
                    allEvents.push({
                        id: `order-review-${o.id}`,
                        timestamp: o.approved_at,
                        action: statusLabel,
                        performedBy: users[o.approved_by] ?? 'Unknown',
                        details: `${o.order_number} - ${customerName}`,
                        category: 'order',
                    });
                }
            }

            // -- Stock Adjustments --
            for (const s of stockRes.data ?? []) {
                const productName = (s.products as { name: string } | null)?.name ?? 'Unknown Product';
                allEvents.push({
                    id: `stock-${s.id}`,
                    timestamp: s.created_at,
                    action: `Stock ${s.type}`,
                    performedBy: users[s.adjusted_by] ?? 'Unknown',
                    details: `${s.quantity} x ${productName} - ${s.reason ?? ''}`,
                    category: 'stock',
                });
            }

            // -- Deliveries --
            for (const d of deliveriesRes.data ?? []) {
                allEvents.push({
                    id: `delivery-${d.id}`,
                    timestamp: d.created_at,
                    action: 'Delivery Created',
                    performedBy: d.initiated_by_name || users[d.created_by] || 'Unknown',
                    details: `${d.delivery_number ?? ''} - Status: ${d.status}`,
                    category: 'delivery',
                });
            }

            // Sort descending by timestamp
            allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            setEvents(allEvents);
        } catch (err: any) {
            setError(err.message || 'Failed to load activity log');
            toast.error('Failed to load activity log');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchActivity(); }, [fetchActivity]);

    // Filtering
    const filtered = events.filter(e => {
        if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
        if (dateFrom) {
            const from = new Date(dateFrom);
            from.setHours(0, 0, 0, 0);
            if (new Date(e.timestamp) < from) return false;
        }
        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            if (new Date(e.timestamp) > to) return false;
        }
        if (search) {
            const s = search.toLowerCase();
            return (
                e.action.toLowerCase().includes(s) ||
                e.performedBy.toLowerCase().includes(s) ||
                e.details.toLowerCase().includes(s)
            );
        }
        return true;
    });

    // Reset page when filters change
    useEffect(() => { setCurrentPage(1); }, [search, categoryFilter, dateFrom, dateTo, events.length]);

    const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    // Stats
    const stats = [
        { label: 'Total Events', value: filtered.length, color: 'text-primary', icon: FileText },
        { label: 'Orders', value: filtered.filter(e => e.category === 'order').length, color: 'text-blue-600', icon: ShoppingCart },
        { label: 'Stock Changes', value: filtered.filter(e => e.category === 'stock').length, color: 'text-amber-600', icon: Package },
        { label: 'Deliveries', value: filtered.filter(e => e.category === 'delivery').length, color: 'text-purple-600', icon: Truck },
    ];

    return (
        <div className="space-y-5">
            <PageHeader
                title="Activity Log"
                subtitle="Recent system activity across all modules"
            />

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stats.map(s => (
                    <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
                        <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <FilterBar>
                <SearchBar
                    placeholder="Search action, user, or details..."
                    value={search}
                    onChange={setSearch}
                    className="w-full md:max-w-md"
                />
                <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <FilterField label="Category" className="shrink-0">
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-36 h-10">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="order">Orders</SelectItem>
                                <SelectItem value="stock">Stock</SelectItem>
                                <SelectItem value="delivery">Deliveries</SelectItem>
                            </SelectContent>
                        </Select>
                    </FilterField>

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
                {loading ? <Spinner /> : error ? (
                    <ErrorState message={error} onRetry={fetchActivity} />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={FileText}
                        message="No activity found"
                        sub="Try adjusting your search or filter criteria."
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <StyledThead>
                                    <tr>
                                        <StyledTh>Time</StyledTh>
                                        <StyledTh>Action</StyledTh>
                                        <StyledTh>Performed By</StyledTh>
                                        <StyledTh>Details</StyledTh>
                                        <StyledTh center>Category</StyledTh>
                                    </tr>
                                </StyledThead>
                                <tbody>
                                    {paginated.map(e => {
                                        const catInfo = CATEGORY_BADGE[e.category];
                                        const CatIcon = CATEGORY_ICON[e.category];
                                        return (
                                            <StyledTr key={e.id}>
                                                <StyledTd mono className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {formatTime(e.timestamp)}
                                                </StyledTd>
                                                <StyledTd className="font-semibold text-foreground whitespace-nowrap">
                                                    {e.action}
                                                </StyledTd>
                                                <StyledTd className="text-foreground">
                                                    {e.performedBy}
                                                </StyledTd>
                                                <StyledTd className="text-muted-foreground truncate max-w-[300px]">
                                                    {e.details}
                                                </StyledTd>
                                                <StyledTd center>
                                                    <Badge
                                                        variant="outline"
                                                        className={`gap-1 ${catInfo.className}`}
                                                    >
                                                        <CatIcon size={11} />
                                                        {catInfo.label}
                                                    </Badge>
                                                </StyledTd>
                                            </StyledTr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <TablePagination
                            totalItems={filtered.length}
                            currentPage={page}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                            itemLabel="events"
                        />
                    </>
                )}
            </DataCard>
        </div>
    );
};
