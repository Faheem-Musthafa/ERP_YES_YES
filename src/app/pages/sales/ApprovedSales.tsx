import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import { Download, ShoppingBag, TrendingUp, CheckCircle, FileText, IndianRupee, Calendar } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import {
  PageHeader, SearchBar, DataCard, FilterBar, FilterField,
  StyledThead, StyledTh, StyledTr, StyledTd,
  StatusBadge, EmptyState, Spinner, TablePagination,
} from '@/app/components/ui/primitives';
import { CustomerNameLink } from '@/app/components/CustomerNameLink';
import { cloneCompanyProfiles, getCompanyDisplayName, loadCompanyProfiles } from '@/app/companyProfiles';
import { downloadCSV } from '@/app/utils';
import { todayLocalISO, localRangeToUTC, validateDateRange } from '@/app/dates';
import type { OrderStatusEnum } from '@/app/types/database';

interface ApprovedOrderRow {
  id: string;
  order_number: string;
  status: string;
  company: string | null;
  invoice_type: string | null;
  invoice_number: string | null;
  grand_total: number | null;
  approved_at: string | null;
  created_at: string;
  customer_id: string | null;
  customers: { name: string } | null;
}

const APPROVED_STATUSES: OrderStatusEnum[] = ['Approved', 'Billed', 'Delivered'];

export const ApprovedSales = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<ApprovedOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Approved' | 'Billed' | 'Delivered'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [companyProfiles, setCompanyProfiles] = useState(cloneCompanyProfiles());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    void loadCompanyProfiles().then(setCompanyProfiles).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      try {
        validateDateRange(dateFrom || null, dateTo || null);
        const { gte, lt } = localRangeToUTC(dateFrom || null, dateTo || null);
        let query = supabase
          .from('orders')
          .select('id, order_number, status, company, invoice_type, invoice_number, grand_total, approved_at, created_at, customer_id, customers(name)')
          .eq('created_by', user.id)
          .in('status', APPROVED_STATUSES)
          .order('approved_at', { ascending: false, nullsFirst: false });
        if (gte) query = query.gte('approved_at', gte);
        if (lt) query = query.lt('approved_at', lt);
        const { data, error } = await query;
        if (error) throw error;
        setRows((data ?? []) as ApprovedOrderRow[]);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load approved sales');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (companyFilter !== 'all' && (o.company ?? '') !== companyFilter) return false;
      if (!s) return true;
      const hay = [o.order_number, o.invoice_number, o.customers?.name].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(s);
    });
  }, [rows, search, statusFilter, companyFilter]);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, companyFilter, dateFrom, dateTo, rows.length]);
  const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => {
    const totalCount = filtered.length;
    const totalRevenue = filtered.reduce((s, o) => s + (o.grand_total ?? 0), 0);
    const billed = filtered.filter((o) => o.status === 'Billed' || o.status === 'Delivered');
    const billedRevenue = billed.reduce((s, o) => s + (o.grand_total ?? 0), 0);
    const delivered = filtered.filter((o) => o.status === 'Delivered');
    const deliveredRevenue = delivered.reduce((s, o) => s + (o.grand_total ?? 0), 0);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const monthRevenue = filtered.filter((o) => (o.approved_at ?? o.created_at) >= monthStart).reduce((s, o) => s + (o.grand_total ?? 0), 0);
    const avgValue = totalCount > 0 ? totalRevenue / totalCount : 0;
    return { totalCount, totalRevenue, billedCount: billed.length, billedRevenue, deliveredCount: delivered.length, deliveredRevenue, monthRevenue, avgValue };
  }, [filtered]);

  const exportCSV = () => {
    downloadCSV(
      ['Order No', 'Invoice No', 'Customer', 'Company', 'Type', 'Status', 'Approved Date', 'Grand Total'],
      filtered.map((o) => [
        o.order_number,
        o.invoice_number ?? '—',
        o.customers?.name ?? '—',
        getCompanyDisplayName(o.company, companyProfiles),
        o.invoice_type ?? '—',
        o.status,
        o.approved_at ? new Date(o.approved_at).toLocaleDateString('en-IN') : '—',
        o.grand_total ?? 0,
      ]),
      `my-approved-sales-${todayLocalISO()}.csv`,
    );
  };

  const formatCurrency = (n: number) => `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const companyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.company) set.add(r.company);
    return [...set];
  }, [rows]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales"
        subtitle={`${stats.totalCount} approved order${stats.totalCount === 1 ? '' : 's'} in scope`}
        actions={
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-2" disabled={filtered.length === 0}>
            <Download size={15} /> Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DataCard className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Approved Revenue</span>
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600"><IndianRupee size={14} /></div>
          </div>
          <p className="text-2xl font-bold font-mono">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{stats.totalCount} orders</p>
        </DataCard>

        <DataCard className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Billed</span>
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600"><FileText size={14} /></div>
          </div>
          <p className="text-2xl font-bold font-mono">{formatCurrency(stats.billedRevenue)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{stats.billedCount} bills</p>
        </DataCard>

        <DataCard className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Delivered</span>
            <div className="p-1.5 rounded-md bg-violet-500/10 text-violet-600"><CheckCircle size={14} /></div>
          </div>
          <p className="text-2xl font-bold font-mono">{formatCurrency(stats.deliveredRevenue)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{stats.deliveredCount} delivered</p>
        </DataCard>

        <DataCard className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Avg Order Value</span>
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600"><TrendingUp size={14} /></div>
          </div>
          <p className="text-2xl font-bold font-mono">{formatCurrency(stats.avgValue)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">This month: {formatCurrency(stats.monthRevenue)}</p>
        </DataCard>
      </div>

      <FilterBar>
        <FilterField label="Search">
          <SearchBar
            placeholder="Order no / invoice / customer…"
            value={search}
            onChange={setSearch}
            className="w-56"
          />
        </FilterField>
        <FilterField label="Status">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="h-10 w-36 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Billed">Billed</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
        {companyOptions.length > 0 && (
          <FilterField label="Company">
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="h-10 w-40 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All companies</SelectItem>
                {companyOptions.map((c) => (
                  <SelectItem key={c} value={c}>{getCompanyDisplayName(c, companyProfiles)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        )}
        <FilterField label="From">
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} max={todayLocalISO()} className="h-10 pl-9 w-40 rounded-xl" />
          </div>
        </FilterField>
        <FilterField label="To">
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} max={todayLocalISO()} className="h-10 pl-9 w-40 rounded-xl" />
          </div>
        </FilterField>
      </FilterBar>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <DataCard>
          <EmptyState icon={ShoppingBag} message="No approved sales" sub="Approved, billed and delivered orders you created appear here" />
        </DataCard>
      ) : (
        <DataCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <StyledThead>
                <tr>
                  <StyledTh>Order No</StyledTh>
                  <StyledTh>Invoice No</StyledTh>
                  <StyledTh>Customer</StyledTh>
                  <StyledTh>Company</StyledTh>
                  <StyledTh>Type</StyledTh>
                  <StyledTh>Status</StyledTh>
                  <StyledTh>Approved</StyledTh>
                  <StyledTh right>Grand Total</StyledTh>
                </tr>
              </StyledThead>
              <tbody>
                {paginated.map((o) => (
                  <StyledTr key={o.id}>
                    <StyledTd mono className="font-semibold text-primary">{o.order_number}</StyledTd>
                    <StyledTd mono className="text-muted-foreground">{o.invoice_number ?? '—'}</StyledTd>
                    <StyledTd>
                      {o.customers?.name
                        ? <CustomerNameLink customerId={o.customer_id}>{o.customers.name}</CustomerNameLink>
                        : '—'}
                    </StyledTd>
                    <StyledTd className="text-muted-foreground">{getCompanyDisplayName(o.company, companyProfiles)}</StyledTd>
                    <StyledTd className="text-muted-foreground">{o.invoice_type ?? '—'}</StyledTd>
                    <StyledTd><StatusBadge status={o.status} /></StyledTd>
                    <StyledTd mono className="text-xs text-muted-foreground">{o.approved_at ? new Date(o.approved_at).toLocaleDateString('en-IN') : '—'}</StyledTd>
                    <StyledTd right mono className="font-bold">{formatCurrency(o.grand_total ?? 0)}</StyledTd>
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
        </DataCard>
      )}
    </div>
  );
};
