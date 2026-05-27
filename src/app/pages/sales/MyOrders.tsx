import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useNavigate } from 'react-router';
import { Download, FileText, Plus, Search, X } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { downloadCSV, STATUS_STRIPE } from '@/app/utils';
import { ordersQuery, type OrderListRow } from '@/app/lib/api/orders';
import { usePagedQuery } from '@/app/lib/queries/usePagedQuery';
import { useDebounced } from '@/app/hooks/useDebounced';

const STATUSES = ['all', 'Pending', 'Approved', 'Billed', 'Delivered', 'Rejected'];
import { cloneCompanyProfiles, getCompanyDisplayName, loadCompanyProfiles } from '@/app/companyProfiles';
import {
  PageHeader, SearchBar, DataCard, FilterBar, FilterField,
  StyledThead, StyledTh, StyledTr, StyledTd,
  StatusBadge, EmptyState, Spinner, TablePagination
} from '@/app/components/ui/primitives';
import { CustomerNameLink } from '@/app/components/CustomerNameLink';

export const MyOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyProfiles, setCompanyProfiles] = useState(cloneCompanyProfiles());
  const pageSize = 10;
  const debouncedSearch = useDebounced(search, 250);

  const { rows: paginated, totalItems, isLoading: loading, page, setPage } = usePagedQuery<OrderListRow>({
    key: ['my-orders', user?.id ?? '', debouncedSearch, statusFilter],
    pageSize,
    enabled: !!user?.id,
    buildQuery: () => ordersQuery({
      createdBy: user?.id,
      status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
      search: debouncedSearch || undefined,
    }),
  });

  useEffect(() => {
    void loadCompanyProfiles()
      .then(setCompanyProfiles)
      .catch(() => undefined);
  }, []);

  const exportOrders = () => {
    downloadCSV(
      ['Order No', 'Customer', 'Company', 'Invoice Type', 'Grand Total', 'Delivery Date', 'Status', 'Created'],
      paginated.map((order) => [
        order.order_number,
        order.customers?.name ?? '—',
        getCompanyDisplayName(order.company, companyProfiles),
        order.invoice_type ?? '—',
        order.grand_total ?? 0,
        order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN') : '—',
        order.status ?? '—',
        order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : '—',
      ]),
      `my-orders-page${page}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };


  return (
    <>
      {/* ═══════════════════════════════════════════════════
         MOBILE — order timeline cards. Indigo gradient header,
         pill status chips, big tap rows. Hidden ≥ lg.
         ═══════════════════════════════════════════════════ */}
      <div className="lg:hidden sm-font sm-surface -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 min-h-[calc(100vh-4rem)]">
        <div className="space-y-4 px-4 pt-5 pb-4 max-w-2xl mx-auto">
          <header className="sm-rise flex items-start justify-between">
            <div>
              <p className="sm-eyebrow text-[var(--sm-muted)]">Pipeline</p>
              <h1 className="sm-headline text-[26px] text-[var(--sm-text)] mt-0.5">My orders</h1>
            </div>
            <button
              type="button"
              onClick={() => navigate('/sales/create-order')}
              className="sm-tap sm-gradient sm-pill px-4 py-2.5 text-[12px] font-bold text-white inline-flex items-center gap-1.5"
            >
              <Plus size={14} strokeWidth={2.6} /> NEW
            </button>
          </header>

          {/* Search */}
          <div className="sm-rise sm-rise-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--sm-muted)]" />
            <input
              type="search"
              inputMode="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order or customer…"
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

          {/* Status filter pills */}
          <div className="sm-rise sm-rise-2 -mx-1 overflow-x-auto">
            <div className="flex gap-2 px-1 pb-1">
              {STATUSES.map((s) => {
                const active = (s === 'all' && (statusFilter === '' || statusFilter === 'all')) || statusFilter === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`sm-tap shrink-0 sm-pill px-3.5 py-1.5 text-[11px] font-bold border ${
                      active
                        ? 'sm-gradient text-white border-transparent'
                        : 'bg-white text-[var(--sm-text)] border-[var(--sm-border)]'
                    }`}
                  >
                    {s === 'all' ? 'All' : s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* List */}
          <section className="sm-rise sm-rise-3 sm-card overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-[var(--sm-muted)]">Loading…</div>
            ) : paginated.length === 0 ? (
              <div className="p-8 text-center">
                <FileText size={28} className="mx-auto text-[var(--sm-muted)]" />
                <p className="mt-2 text-sm font-bold text-[var(--sm-text)]">No orders found</p>
                <p className="text-xs text-[var(--sm-muted)] mt-0.5">Tap NEW to start one.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--sm-border)]">
                {paginated.map((order) => (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/sales/my-orders?focus=${order.id}`)}
                      className="sm-tap w-full text-left flex items-stretch gap-3 px-4 py-3.5 active:bg-slate-50"
                    >
                      <span className={`w-1 rounded-full ${STATUS_STRIPE[order.status] ?? 'bg-slate-300'}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-[var(--sm-text)] truncate">{order.order_number}</p>
                          <p className="font-mono font-bold text-sm text-[var(--sm-text)]">
                            ₹{(order.grand_total ?? 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <p className="text-xs text-[var(--sm-muted)] truncate mt-0.5">
                          {order.customers?.name ?? '—'}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                          <span className="sm-pill px-2 py-0.5 font-bold uppercase tracking-wide bg-slate-100 text-[var(--sm-text)]">
                            {order.status}
                          </span>
                          <span className="text-[var(--sm-muted)]">
                            {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                          {order.delivery_date && (
                            <>
                              <span className="opacity-40">·</span>
                              <span className="text-[var(--sm-muted)]">
                                Deliver {new Date(order.delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {totalItems > pageSize && (
              <div className="border-t border-[var(--sm-border)]">
                <TablePagination
                  totalItems={totalItems}
                  currentPage={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  itemLabel="orders"
                />
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Desktop preserved verbatim */}
      <div className="hidden lg:block space-y-5">
      <PageHeader
        title="My Orders"
        subtitle="All orders you have created"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={exportOrders} className="gap-2">
              <Download size={15} /> Export Orders
            </Button>
            <Button size="sm" onClick={() => navigate('/sales/create-order')} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus size={15} /> Create Order
            </Button>
          </div>
        }
      />

      <FilterBar>
        <SearchBar
          placeholder="Search by order no / customer..."
          value={search} onChange={setSearch}
          className="w-full md:max-w-md"
        />
        <FilterField label="Order Status">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 h-10 text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Billed">Billed</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
      </FilterBar>

      <DataCard>
        {loading ? <Spinner /> : totalItems === 0 ? (
          <EmptyState icon={FileText} message="No orders found" sub="Submit your first order to see it here" action={<Button onClick={() => navigate('/sales/create-order')} variant="outline" size="sm" className="mt-4">Create Order</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <StyledThead>
                <tr>
                  <StyledTh>Order No</StyledTh>
                  <StyledTh>Customer</StyledTh>
                  <StyledTh>Company</StyledTh>
                  <StyledTh>Invoice Type</StyledTh>
                  <StyledTh right>Grand Total</StyledTh>
                  <StyledTh>Delivery Date</StyledTh>
                  <StyledTh>Status</StyledTh>
                  <StyledTh>Created</StyledTh>
                </tr>
              </StyledThead>
              <tbody>
                {paginated.map(order => (
                  <StyledTr key={order.id} className="group">
                    <StyledTd className="font-semibold text-primary group-hover:underline">{order.order_number}</StyledTd>
                    <StyledTd className="font-medium text-foreground">
                      {order.customers?.name
                        ? <CustomerNameLink customerId={order.customer_id}>{order.customers.name}</CustomerNameLink>
                        : '—'}
                    </StyledTd>
                    <StyledTd className="text-muted-foreground">{getCompanyDisplayName(order.company, companyProfiles)}</StyledTd>
                    <StyledTd className="text-muted-foreground">{order.invoice_type}</StyledTd>
                    <StyledTd right mono className="font-bold">₹{order.grand_total?.toLocaleString('en-IN')}</StyledTd>
                    <StyledTd mono className="text-xs text-muted-foreground">{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '—'}</StyledTd>
                    <StyledTd><StatusBadge status={order.status} /></StyledTd>
                    <StyledTd mono className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</StyledTd>
                  </StyledTr>
                ))}
              </tbody>
            </table>
            <TablePagination
              totalItems={totalItems}
              currentPage={page}
              pageSize={pageSize}
              onPageChange={setPage}
              itemLabel="orders"
            />
          </div>
        )}
      </DataCard>
    </div>
    </>
  );
};
