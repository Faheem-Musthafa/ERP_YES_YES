import React, { useState, useEffect } from 'react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Download, Users, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { fmt, downloadCSV, LOCATIONS } from '@/app/utils';
import {
    PageHeader, DataCard, StyledThead, StyledTh, StyledTr, StyledTd,
    SearchBar, Spinner, EmptyState, TablePagination, FilterBar, FilterField,
    CustomTooltip
} from '@/app/components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CustomerData {
    id: string;
    name: string;
    phone: string;
    location: string | null;
    place: string | null;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    lastOrderDate: string | null;
}

export const MyCustomers = () => {
    const { user } = useAuth();
    const [customers, setCustomers] = useState<CustomerData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [locationFilter, setLocationFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const fetchData = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            // Fetch customers assigned to this sales rep
            const { data: custData, error: custErr } = await supabase
                .from('customers')
                .select('id, name, phone, location, place, is_active')
                .eq('assigned_to', user.id)
                .eq('is_active', true);

            if (custErr) throw custErr;

            // Fetch all orders to calculate metrics
            const { data: orderData, error: ordErr } = await supabase
                .from('orders')
                .select('customer_id, grand_total, created_at');

            if (ordErr) throw ordErr;

            // Build order map
            const orderMap = new Map<string, { count: number; revenue: number; lastDate: string }>();
            orderData?.forEach(o => {
                if (!o.customer_id) return;
                const existing = orderMap.get(o.customer_id) || { count: 0, revenue: 0, lastDate: '' };
                orderMap.set(o.customer_id, {
                    count: existing.count + 1,
                    revenue: existing.revenue + (o.grand_total || 0),
                    lastDate: !existing.lastDate || o.created_at > existing.lastDate ? o.created_at : existing.lastDate,
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
                    totalOrders: orderInfo.count,
                    totalRevenue: orderInfo.revenue,
                    averageOrderValue: orderInfo.count > 0 ? orderInfo.revenue / orderInfo.count : 0,
                    lastOrderDate: orderInfo.lastDate,
                } as CustomerData;
            }) || [];

            setCustomers(data.sort((a, b) => b.totalRevenue - a.totalRevenue));
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
    const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const locationData = LOCATIONS.map(loc => ({
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
        <div className="space-y-6">
            <PageHeader
                title="My Customers"
                subtitle="Customers assigned to you"
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
                            {locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
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
