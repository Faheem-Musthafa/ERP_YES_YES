import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { AlertTriangle, PackageSearch } from 'lucide-react';
import { supabase } from '@/app/supabase';
import {
  PageHeader, SearchBar, FilterBar, FilterField, DataCard,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, ErrorState, TablePagination,
} from '@/app/components/ui/primitives';

export const StockManagement = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchData = async () => {
    setLoading(true);
    setError('');
    const [{ data: prod, error: prodError }, { data: br, error: brandError }] = await Promise.all([
      supabase.from('products').select('id, name, sku, stock_qty, dealer_price, brands(id, name)').eq('is_active', true).order('name'),
      supabase.from('brands').select('id, name').eq('is_active', true).order('name'),
    ]);
    if (prodError || brandError) {
      setError(prodError?.message || brandError?.message || 'Unable to fetch stock data');
    } else {
      setProducts(prod ?? []);
      setBrands(br ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { void fetchData(); }, []);

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchBrand = !brandFilter || brandFilter === 'all' || p.brands?.id === brandFilter;
    const matchStock = !stockFilter || stockFilter === 'all' ||
      (stockFilter === 'out' && p.stock_qty === 0) ||
      (stockFilter === 'low' && p.stock_qty > 0 && p.stock_qty <= 5) ||
      (stockFilter === 'ok' && p.stock_qty > 5);
    return matchSearch && matchBrand && matchStock;
  });
  useEffect(() => { setCurrentPage(1); }, [search, brandFilter, stockFilter, products.length]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stockStatus = (qty: number) => {
    if (qty === 0) return { label: 'Out of Stock', cls: 'bg-red-100 text-red-900 border border-red-300/80' };
    if (qty <= 5) return { label: 'Low Stock', cls: 'bg-amber-100 text-amber-900 border border-amber-300/80' };
    return { label: 'In Stock', cls: 'bg-emerald-100 text-emerald-900 border border-emerald-300/80' };
  };

  const lowCount = products.filter(p => p.stock_qty <= 5).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Management"
        subtitle="View and monitor all product stock levels"
      />

      {lowCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3" role="status" aria-live="polite">
          <AlertTriangle className="text-amber-600 flex-shrink-0" size={18} />
          <span className="text-amber-800 text-sm font-medium">{lowCount} item(s) are low on stock or out of stock</span>
        </div>
      )}

      <FilterBar>
        <SearchBar
          placeholder="Search products..."
          value={search}
          onChange={setSearch}
          className="w-full md:max-w-md"
        />
        <div className="flex flex-wrap items-end gap-3">
          <FilterField label="Brand">
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="h-10 w-[200px]"><SelectValue placeholder="All Brands" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Stock Status">
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="h-10 w-[170px]"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="ok">In Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </div>
      </FilterBar>

      <DataCard>
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void fetchData()} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={PackageSearch} message="No products found for selected filters" />
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Stock table with product, brand, SKU, dealer price, stock quantity and stock status</caption>
              <StyledThead>
                <tr>
                  <StyledTh>Product</StyledTh>
                  <StyledTh>Brand</StyledTh>
                  <StyledTh>SKU</StyledTh>
                  <StyledTh right>DP (₹)</StyledTh>
                  <StyledTh right>Stock Qty</StyledTh>
                  <StyledTh center>Status</StyledTh>
                </tr>
              </StyledThead>
              <tbody>
                {paginated.map(p => {
                  const s = stockStatus(p.stock_qty);
                  return (
                    <StyledTr key={p.id}>
                      <StyledTd className="font-medium">{p.name}</StyledTd>
                      <StyledTd className="text-muted-foreground">{p.brands?.name ?? '-'}</StyledTd>
                      <StyledTd mono className="text-xs text-muted-foreground">{p.sku}</StyledTd>
                      <StyledTd right mono>₹ {p.dealer_price?.toLocaleString('en-IN')}</StyledTd>
                      <StyledTd right mono className="font-bold">{p.stock_qty}</StyledTd>
                      <StyledTd center><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>{s.label}</span></StyledTd>
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
              itemLabel="products"
            />
          </>
        )}
      </DataCard>
    </div>
  );
};
