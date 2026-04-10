import React, { useState, useEffect } from 'react';
import { supabase } from '@/app/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { AlertTriangle, Download, MapPin, TrendingUp, Users, Wallet, Search, Filter, ArrowUpRight, BarChart3, PieChart as PieChartIcon, Activity, ChevronRight, UserCog, Mail, Phone, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { fmt, downloadCSV, isCollectedReceiptStatus } from '@/app/utils';
import {
    PageHeader, DataCard, StyledThead, StyledTh, StyledTr, StyledTd,
    SearchBar, Spinner, EmptyState, TablePagination, FilterBar, FilterField, StatusBadge
} from '@/app/components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CustomerAnalysis {
    id: string;
    name: string;
    phone: string;
    location: string | null;
    place: string | null;
    openingBalance: number;
    totalOrders: number;
    totalRevenue: number;
    totalCollected: number;
    outstanding: number;
    averageOrderValue: number;
    lastOrderDate: string | null;
    status: string;
}

interface CustomerRow {
    id: string;
    name: string;
    phone: string;
    location: string | null;
    place: string | null;
    opening_balance: number | null;
    is_active: boolean;
}

interface OrderRow {
    customer_id: string | null;
    grand_total: number | null;
    created_at: string;
    status: string;
}

interface ReceiptRow {
    customer_id: string | null;
    amount: number | null;
    payment_status: string | null;
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
                .select('id, name, phone, location, place, opening_balance, is_active');

            if (custErr) throw custErr;

            const { data: orders, error: ordErr } = await supabase
                .from('orders')
                .select('customer_id, grand_total, created_at, status');

            if (ordErr) throw ordErr;

            const { data: receipts, error: receiptErr } = await supabase
                .from('receipts')
                .select('customer_id, amount, payment_status');

            if (receiptErr) throw receiptErr;

            const validOrderStatuses = ['Approved', 'Billed', 'Delivered'];
            const orderMap = new Map<string, { count: number; revenue: number; lastDate: string }>();
            (orders as OrderRow[] | null)?.forEach(o => {
                if (!o.customer_id) return;
                if (!validOrderStatuses.includes(o.status)) return;
                const existing = orderMap.get(o.customer_id) || { count: 0, revenue: 0, lastDate: '' };
                orderMap.set(o.customer_id, {
                    count: existing.count + 1,
                    revenue: existing.revenue + (o.grand_total || 0),
                    lastDate: !existing.lastDate || o.created_at > existing.lastDate ? o.created_at : existing.lastDate,
                });
            });

            const receiptsMap = new Map<string, number>();
            (receipts as ReceiptRow[] | null)?.forEach(r => {
                if (!r.customer_id) return;
                if (!isCollectedReceiptStatus(r.payment_status)) return;
                receiptsMap.set(r.customer_id, (receiptsMap.get(r.customer_id) ?? 0) + (r.amount ?? 0));
            });

            const analysis = (customers as CustomerRow[] | null)?.map(c => {
                const orderInfo = orderMap.get(c.id) || { count: 0, revenue: 0, lastDate: null };
                const openingBalance = c.opening_balance ?? 0;
                const totalCollected = receiptsMap.get(c.id) ?? 0;
                return {
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    location: c.location,
                    place: c.place,
                    openingBalance,
                    totalOrders: orderInfo.count,
                    totalRevenue: orderInfo.revenue,
                    totalCollected,
                    outstanding: openingBalance + orderInfo.revenue - totalCollected,
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

    const locationOptions = Array.from(
        new Set(data.map(c => c.location).filter((location): location is string => Boolean(location)))
    ).sort((a, b) => a.localeCompare(b));

    const locationData = locationOptions.map(loc => ({
        name: loc,
        customers: filtered.filter(c => c.location === loc).length,
        revenue: filtered.filter(c => c.location === loc).reduce((s, c) => s + c.totalRevenue, 0),
    })).filter(item => item.customers > 0 || item.revenue > 0);

    const totalOpeningBalance = filtered.reduce((s, c) => s + c.openingBalance, 0);
    const totalDue = totalOpeningBalance + filtered.reduce((s, c) => s + c.totalRevenue, 0);
    const collectionRate = totalDue > 0 ? Math.min((filtered.reduce((s, c) => s + c.totalCollected, 0) / totalDue) * 100, 100) : 0;
    const topCustomers = filtered.slice(0, 5);
    const topLocation = [...locationData].sort((a, b) => b.revenue - a.revenue)[0] ?? null;
    const atRiskCustomers = filtered.filter(c => c.outstanding > 0).length;
    const stats = {
        totalCustomers: filtered.length,
        totalRevenue: filtered.reduce((s, c) => s + c.totalRevenue, 0),
        totalCollected: filtered.reduce((s, c) => s + c.totalCollected, 0),
        totalOutstanding: filtered.reduce((s, c) => s + c.outstanding, 0),
        avgOrderValue: filtered.length > 0 ? filtered.reduce((s, c) => s + c.averageOrderValue, 0) / filtered.length : 0,
        activeCustomers: filtered.filter(c => c.status === 'Active').length,
    };

    const COLORS = ['#00bdb4', '#ff6b6b', '#4ecdc4', '#ffe66d'];

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-500">
            {/* Elegant Top Header with Blur */}
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-xl py-4 border-b border-border/40 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 mb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3">
                        <UserCog className="h-8 w-8 text-primary opacity-80" />
                        Customer Analytics
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                        Track customer health, geographical spread, and outstanding movements across active districts.
                    </p>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                    <Button
                        size="sm"
                        onClick={() => downloadCSV(
                            ['Name', 'Phone', 'Location', 'Place', 'Opening Balance', 'Total Orders', 'Total Revenue', 'Collected', 'Outstanding', 'Avg Order Value', 'Last Order', 'Status'],
                            paginated.map(c => [
                                c.name,
                                c.phone,
                                c.location || '-',
                                c.place || '-',
                                c.openingBalance,
                                c.totalOrders,
                                c.totalRevenue,
                                c.totalCollected,
                                c.outstanding,
                                c.averageOrderValue.toFixed(0),
                                c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : '-',
                                c.status,
                            ]),
                            'customer_analysis_report.csv'
                        )}
                        className="gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-all shadow-md active:scale-[0.98] rounded-xl h-10 px-4"
                    >
                        <Download size={15} /> Export Analysis
                    </Button>
                </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {[
                    { label: 'Total Base', metric: 'Total Customers', value: stats.totalCustomers, sub: `${stats.activeCustomers} active accounts`, icon: Users, accent: 'blue' },
                    { label: 'Gross', metric: 'Total Revenue', value: fmt(stats.totalRevenue), sub: `Opening due ${fmt(totalOpeningBalance)}`, icon: TrendingUp, accent: 'teal' },
                    { label: 'Yield', metric: 'Collected', value: fmt(stats.totalCollected), sub: `${collectionRate.toFixed(1)}% collection rate`, icon: Wallet, accent: 'emerald' },
                    { label: 'Risk', metric: 'Outstanding', value: fmt(stats.totalOutstanding), sub: `${atRiskCustomers} pending dues`, icon: AlertTriangle, accent: 'amber' },
                ].map((stat, i) => {
                    const Icon = stat.icon;
                    const isBlue = stat.accent === 'blue';
                    const isTeal = stat.accent === 'teal';
                    const isEmerald = stat.accent === 'emerald';
                    const isAmber = stat.accent === 'amber';
                    
                    const bgClass = isBlue ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-800/30' : 
                                   isTeal ? 'bg-teal-50/50 dark:bg-teal-900/10 border-teal-200/50 dark:border-teal-800/30' : 
                                   isEmerald ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30' : 
                                   'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30';
                    
                    const iconBg = isBlue ? 'bg-blue-100 dark:bg-blue-800/40 text-blue-600 dark:text-blue-400' :
                                  isTeal ? 'bg-teal-100 dark:bg-teal-800/40 text-teal-600 dark:text-teal-400' :
                                  isEmerald ? 'bg-emerald-100 dark:bg-emerald-800/40 text-emerald-600 dark:text-emerald-400' :
                                  'bg-amber-100 dark:bg-amber-800/40 text-amber-600 dark:text-amber-400';

                    return (
                        <div key={i} className={`relative overflow-hidden rounded-3xl border p-5 ${bgClass} transition-all hover:shadow-lg hover:-translate-y-0.5 group`}>
                            <div className="flex items-start justify-between gap-4 relative z-10">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 opacity-80 mb-1">{stat.metric}</p>
                                    <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{stat.value}</h3>
                                    <div className="flex items-center gap-1.5 mt-3">
                                        <Activity size={12} className="opacity-50" />
                                        <p className="text-xs font-medium opacity-70 text-slate-700 dark:text-slate-300">{stat.sub}</p>
                                    </div>
                                </div>
                                <div className={`p-3 rounded-2xl ${iconBg} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon size={22} />
                                </div>
                            </div>
                            <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full blur-3xl opacity-20 transition-all group-hover:opacity-40 pointer-events-none ${iconBg.split(' ')[0]}`} />
                        </div>
                    );
                })}
            </div>

            {/* Middle Dashboards: Insights & Leaderboard */}
            <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
                
                {/* Insights Panel */}
                <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md shadow-sm overflow-hidden flex flex-col transition-all hover:border-slate-300/80 dark:hover:border-slate-700">
                    <div className="p-6 md:p-8 flex-1">
                        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-3 max-w-lg">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
                                    <ArrowUpRight size={14} /> AI Analysis Lens
                                </div>
                                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white leading-snug">
                                    Customer footprint centers around <span className="text-primary">{topLocation?.name ?? 'active zones'}</span>
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    This perspective aggregates opening dues with active sales velocity. We calculate collection efficiency dynamically to highlight accounts requiring immediate resolution interventions.
                                </p>
                            </div>
                            
                            <div className="shrink-0 rounded-2xl border border-teal-100 dark:border-teal-900/30 bg-gradient-to-br from-teal-50/80 to-cyan-50/80 dark:from-teal-950/30 dark:to-cyan-950/30 p-5 shadow-inner">
                                <p className="text-[10px] font-extrabold uppercase tracking-widest text-teal-600 dark:text-teal-400">Peak District</p>
                                <div className="mt-2.5 flex items-center gap-2.5 text-teal-900 dark:text-teal-100">
                                    <div className="p-1.5 bg-teal-200 dark:bg-teal-800 rounded-lg"><MapPin size={16} className="text-teal-700 dark:text-teal-300" /></div>
                                    <span className="text-xl font-bold tracking-tight">{topLocation?.name ?? 'Not Set'}</span>
                                </div>
                                <div className="mt-4 pt-3 border-t border-teal-200/50 dark:border-teal-800/50">
                                    <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">
                                        {topLocation ? `${topLocation.customers} Active Customers` : 'No data yet'}
                                    </p>
                                    <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">{topLocation ? fmt(topLocation.revenue) + ' gross volume' : ''}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition-all">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Visible Segment</p>
                                <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white capitalize">{locationFilter === 'all' ? 'All Operations' : locationFilter}</p>
                                <p className="text-xs text-slate-500 mt-1">{filtered.length} client portfolios</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition-all">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Yield per Ticket</p>
                                <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white font-mono">{fmt(stats.avgOrderValue)}</p>
                                <p className="text-xs text-slate-500 mt-1">Average valid sales volume</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Collection Rate</p>
                                    <span className="text-sm font-black text-slate-900 dark:text-white">{collectionRate.toFixed(1)}%</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 transition-all duration-1000 ease-out relative"
                                        style={{ width: `${collectionRate}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 font-medium">Yield vs outstanding baseline</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Performers */}
                <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md shadow-sm overflow-hidden flex flex-col transition-all hover:border-slate-300/80 dark:hover:border-slate-700">
                    <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-white dark:bg-slate-900/50">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Activity className="text-primary" size={18} /> Top Portfolios
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">Highest value realization accounts</p>
                        </div>
                        <StatusBadge status={atRiskCustomers > 0 ? 'Pending' : 'Completed'} />
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-center space-y-2.5 bg-slate-50/30 dark:bg-transparent">
                        {topCustomers.length === 0 ? (
                            <EmptyState icon={Users} message="No customer data found" />
                        ) : topCustomers.map((customer, index) => (
                            <div key={customer.id} className="group relative z-0 flex items-center justify-between gap-3 rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm border border-slate-200/60 dark:border-slate-800 transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5">
                                <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary/0 group-hover:bg-primary rounded-l-2xl transition-colors"></div>
                                <div className="flex items-center gap-3 min-w-0 pl-1">
                                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-sm font-black text-slate-700 dark:text-slate-300 shadow-inner overflow-hidden border border-slate-200/50 dark:border-slate-600/50">
                                        {index + 1}
                                        <div className="absolute inset-0 bg-white/40 dark:bg-black/20 mix-blend-overlay"></div>
                                    </div>
                                    <div className="truncate">
                                        <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{customer.name}</p>
                                        <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500 flex items-center gap-1">
                                            {customer.location ?? 'Unmapped'} <span className="opacity-40">•</span> {customer.totalOrders} TXNs
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{fmt(customer.totalRevenue)}</p>
                                    <div className="mt-1 flex items-center justify-end gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                                        <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-500">Unsettled {fmt(customer.outstanding)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Smart Chart Layouts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md shadow-sm p-6 lg:p-8 flex flex-col">
                    <div className="mb-8 flex items-start justify-between">
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider mb-3">
                                <PieChartIcon size={12} /> Coverage Scope
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Customer Distribution</h3>
                            <p className="text-sm text-slate-500 mt-1">Concentration across defined zones</p>
                        </div>
                    </div>
                    <div className="flex-1 min-h-[280px]">
                        {locationData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={locationData} 
                                        dataKey="customers" 
                                        nameKey="name" 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius={60} 
                                        outerRadius={90} 
                                        paddingAngle={5}
                                        label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => {
                                           const RADIAN = Math.PI / 180;
                                           const radius = 25 + innerRadius + (outerRadius - innerRadius);
                                           const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                           const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                           return (
                                             <text x={x} y={y} fill={COLORS[index % COLORS.length]} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-semibold">
                                               {locationData[index].name} ({value})
                                             </text>
                                           );
                                        }}
                                    >
                                        {locationData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <EmptyState icon={MapPin} message="No district mapping" sub="Add locations to render visualization" />}
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md shadow-sm p-6 lg:p-8 flex flex-col">
                    <div className="mb-8 flex items-start justify-between">
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider mb-3">
                                <BarChart3 size={12} /> Financial Mix
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Revenue by District</h3>
                            <p className="text-sm text-slate-500 mt-1">Realized value split geographically</p>
                        </div>
                    </div>
                    <div className="flex-1 min-h-[280px]">
                        {locationData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={locationData} maxBarSize={45}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.2)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} />
                                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="revenue" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <EmptyState icon={TrendingUp} message="Insufficient revenue data" sub="Process orders to unlock visual insights" />}
                    </div>
                </div>
            </div>

            {/* Smart Universal Filter */}
            <div className="sticky top-24 z-20 mx-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg p-2 flex flex-col md:flex-row md:items-center justify-between gap-3 mt-4">
                <div className="relative w-full md:w-96 flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <Input
                        placeholder="Search portfolios by name or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-11 bg-slate-50/50 dark:bg-slate-800/50 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-xl"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1.5 h-10 border border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-2 border-r border-slate-300 dark:border-slate-600 pr-2">Visible Total</span>
                        <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{fmt(stats.totalRevenue)}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-1 border border-slate-200/50 dark:border-slate-700/50">
                        <div className="p-1.5 text-slate-400"><Filter size={15} /></div>
                        <Select value={locationFilter} onValueChange={setLocationFilter}>
                            <SelectTrigger className="w-[180px] h-9 border-0 bg-transparent shadow-none focus:ring-0 font-medium">
                                <SelectValue placeholder="All Geographies" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
                                <SelectItem value="all" className="font-medium">All Districts</SelectItem>
                                {locationOptions.map(loc => <SelectItem key={loc} value={loc} className="font-medium">{loc}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Premium Table View */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md shadow-sm overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 px-6 py-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Users size={18} className="opacity-80" /> Operational Ledger
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">Deep dive into individual portfolio lifecycle and settlements.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-bold uppercase text-slate-500">Rows</span>
                            <span className="font-bold text-sm bg-white dark:bg-slate-900 px-1.5 rounded shadow-sm">{paginated.length} / {filtered.length}</span>
                        </div>
                    </div>
                </div>
                
                {loading ? <div className="p-10"><Spinner /></div> : filtered.length === 0 ? (
                    <EmptyState icon={Search} message="No parameters matched" sub="Try adjusting filters or search query." />
                ) : (
                    <>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50/80 dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800/80">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Portfolio Identity</th>
                                        <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Contact</th>
                                        <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Zone</th>
                                        <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 text-right">Opening Δ</th>
                                        <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 text-right">Volume</th>
                                        <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 text-right text-emerald-600 dark:text-emerald-500">Realized</th>
                                        <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 text-right text-amber-600 dark:text-amber-500">Unsettled</th>
                                        <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 bg-white dark:bg-slate-900/20">
                                    {paginated.map(c => (
                                        <tr key={c.id} className="transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/40 group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shadow-sm ring-1 ring-white/50 dark:ring-black/20">
                                                        {c.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-slate-100">{c.name}</p>
                                                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">{c.totalOrders} TXNs logged</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 font-mono text-sm text-slate-600 dark:text-slate-300">
                                                    <Phone size={12} className="opacity-50" /> {c.phone}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {c.location ? (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                                                        <MapPin size={12} className="opacity-60" /> {c.location}
                                                    </div>
                                                ) : <span className="text-slate-400 text-xs">—</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-sm text-slate-500 dark:text-slate-400">
                                                {c.openingBalance > 0 ? `₹${c.openingBalance.toLocaleString('en-IN')}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <p className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">₹{c.totalRevenue.toLocaleString('en-IN')}</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5 font-mono">avg ₹{Math.round(c.averageOrderValue).toLocaleString('en-IN')}</p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="inline-flex items-center justify-end font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 px-2 py-0.5 rounded">
                                                    ₹{c.totalCollected.toLocaleString('en-IN')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className={`inline-flex items-center justify-end font-mono gap-1.5 text-sm font-bold px-2 py-0.5 rounded ${c.outstanding > 0 ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10' : 'text-slate-400'}`}>
                                                    {c.outstanding > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>}
                                                    ₹{c.outstanding.toLocaleString('en-IN')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right sm:text-left">
                                                <StatusBadge status={c.status} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-slate-50/80 dark:bg-slate-900/50 p-2 border-t border-slate-200/60 dark:border-slate-800">
                            <TablePagination
                                totalItems={filtered.length}
                                currentPage={page}
                                pageSize={pageSize}
                                onPageChange={setCurrentPage}
                                itemLabel="portfolios"
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
