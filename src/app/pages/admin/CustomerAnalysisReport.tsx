import React, { useState, useEffect } from 'react';
import { supabase } from '@/app/supabase';
import { Button } from '@/app/components/ui/button';
import { Download, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { fmt, downloadCSV } from '@/app/utils';
import {
    PageHeader, DataCard, StyledThead, StyledTh, StyledTr, StyledTd,
    SearchBar, Spinner, EmptyState, TablePagination, FilterBar, FilterField
} from '@/app/components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CustomerAnalysis {
    name: string;
    phone: string;
    location: string | null;
    place: string | null;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    lastOrderDate: string | null;
    status: string;
}

export const CustomerAnalysisReport = () => {
    const [data, setData] = useState<CustomerAnalysis[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [locationFilter, setLocationFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: customers, error: custErr } = await supabase
                .from('customers')
                .select('id, name, phone, location, place, is_active')
                .eq('is_active', true);

            if (custErr) throw custErr;

            const { data: orders, error: ordErr } = await supabase
                .from('orders')
                .select('customer_id, grand_total, created_at');

            if (ordErr) throw ordErr;

            const orderMap = new Map<string, { count: number; revenue: number; lastDate: string }>();
            orders?.forEach(o => {
                if (!o.customer_id) return;
                const existing = orderMap.get(o.customer_id) || { count: 0, revenue: 0, lastDate: '' };
                orderMap.set(o.customer_id, {
                    count: existing.count + 1,
                    revenue: existing.revenue + (o.grand_total || 0),
                    lastDate: !existing.lastDate || o.created_at > existing.lastDate ? o.created_at : existing.lastDate,
                });
            });

            const analysis = customers?.map(c => {
                const orderInfo = orderMap.get(c.id) || { count: 0, revenue: 0, lastDate: null };
                return {
                    name: c.name,
                    phone: c.phone,
                    location: c.location,
                    place: c.place,
                    totalOrders: orderInfo.count,
                    totalRevenue: orderInfo.revenue,
                    averageOrderValue: orderInfo.count > 0 ? orderInfo.revenue / orderInfo.count : 0,
                    lastOrderDate: orderInfo.lastDate,
                    status: c.is_active ? 'Active' : 'Inactive',
                } as CustomerAnalysis;
            }) || [];

            setData(analysis.sort((a, b) => b.totalRevenue - a.totalRevenue));
        } catch (err: any) {
            toast.error(err.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void fetchData(); }, []);

    const filtered = data.filter(c => {
        const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
        const matchLocation = locationFilter === 'all' || c.location === locationFilter;
        return matchSearch && matchLocation;
    });

    useEffect(() => { setCurrentPage(1); }, [search, locationFilter]);
    const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const locations = ['Kottakkal', 'Chenakkal'];
    const locationData = locations.map(loc => ({
        name: loc,
        customers: data.filter(c => c.location === loc).length,
        revenue: data.filter(c => c.location === loc).reduce((s, c) => s + c.totalRevenue, 0),
    }));

    const topCustomers = data.slice(0, 5);
    const stats = {
        totalCustomers: data.length,
        totalRevenue: data.reduce((s, c) => s + c.totalRevenue, 0),
        avgOrderValue: data.reduce((s, c) => s + c.averageOrderValue, 0) / data.length,
        activeCustomers: data.filter(c => c.status === 'Active').length,
    };

    const COLORS = ['#00bdb4', '#ff6b6b', '#4ecdc4', '#ffe66d'];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Customer Analysis Report"
                subtitle="Monthly and detailed customer performance metrics"
                actions={
                    <Button
                        size="sm"
                        onClick={() => downloadCSV(paginated.map(c => ({
                            Name: c.name,
                            Phone: c.phone,
                            Location: c.location || '-',
                            Place: c.place || '-',
                            'Total Orders': c.totalOrders,
                            'Total Revenue': `₹ ${c.totalRevenue.toLocaleString('en-IN')}`,
                            'Avg Order Value': `₹ ${c.averageOrderValue.toFixed(0).toLocaleString('en-IN')}`,
                            'Last Order': c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : '-',
                        })), 'customer_analysis_report.csv')}
                        className="gap-2"
                    >
                        <Download size={15} /> Export
                    </Button>
                }
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Customers', value: stats.totalCustomers, icon: Users },
                    { label: 'Active Customers', value: stats.activeCustomers, icon: Users },
                    { label: 'Total Revenue', value: `₹ ${fmt(stats.totalRevenue)}`, icon: TrendingUp },
                    { label: 'Avg Order Value', value: `₹ ${fmt(stats.avgOrderValue)}`, icon: TrendingUp },
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
                    {locationData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={locationData} dataKey="customers" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                    {locationData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p className="text-muted-foreground text-sm">No data</p>}
                </DataCard>

                <DataCard className="p-4">
                    <h3 className="text-sm font-semibold mb-4">Revenue by Location</h3>
                    {locationData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={locationData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="revenue" fill="#00bdb4" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-muted-foreground text-sm">No data</p>}
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
                            {locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </FilterField>
            </FilterBar>

            {/* Table */}
            <DataCard>
                {loading ? <Spinner /> : filtered.length === 0 ? (
                    <EmptyState icon={Users} message="No customers found" />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <StyledThead>
                                    <tr>
                                        <StyledTh>Customer Name</StyledTh>
                                        <StyledTh>Phone</StyledTh>
                                        <StyledTh>Location</StyledTh>
                                        <StyledTh right>Orders</StyledTh>
                                        <StyledTh right>Revenue</StyledTh>
                                        <StyledTh right>Avg Order</StyledTh>
                                        <StyledTh>Last Order</StyledTh>
                                    </tr>
                                </StyledThead>
                                <tbody>
                                    {paginated.map((c, i) => (
                                        <StyledTr key={i}>
                                            <StyledTd className="font-medium">{c.name}</StyledTd>
                                            <StyledTd mono className="text-muted-foreground">{c.phone}</StyledTd>
                                            <StyledTd>
                                                {c.location ? (
                                                    <span className="px-2 py-1 rounded text-xs font-medium bg-violet-100 text-violet-900">{c.location}</span>
                                                ) : '—'}
                                            </StyledTd>
                                            <StyledTd right className="font-semibold">{c.totalOrders}</StyledTd>
                                            <StyledTd right mono>₹ {c.totalRevenue.toLocaleString('en-IN')}</StyledTd>
                                            <StyledTd right mono>₹ {c.averageOrderValue.toFixed(0).toLocaleString('en-IN')}</StyledTd>
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
        </div>
    );
};
