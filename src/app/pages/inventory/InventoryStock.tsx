import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { PackageOpen } from 'lucide-react';
import { supabase } from '@/app/supabase';
import {
  PageHeader, SearchBar, DataCard, FilterBar, FilterField,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, TablePagination, ErrorState,
} from '@/app/components/ui/primitives';

export const InventoryStock = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [brands, setBrands] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchData = async () => {
    setLoading(true);
    setError('');
    const [{ data: prod, error: prodError }, { data: br, error: brError }] = await Promise.all([
      supabase.from('products').select('id, name, sku, stock_qty, dealer_price, brands(id, name)').eq('is_active', true).order('name'),
      supabase.from('brands').select('id, name').eq('is_active', true).order('name'),
    ]);
    if (prodError || brError) {
      setError(prodError?.message || brError?.message || 'Unable to load stock');
      setProducts([]);
      setBrands([]);
    } else {
      setProducts(prod ?? []);
      setBrands(br ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchBrand = !brandFilter || brandFilter === 'all' || (p.brands?.id === brandFilter);
    return matchSearch && matchBrand;
  });
  useEffect(() => { setCurrentPage(1); }, [search, brandFilter, products.length]);
  const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const getStockStatus = (qty: number) => {
    if (qty === 0) return { label: 'Out of Stock', cls: 'bg-red-50 text-red-700 border-red-200' };
    if (qty <= 5) return { label: 'Low Stock', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'In Stock', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory Stock"
        subtitle="Current stock levels for all products"
      />

      <FilterBar>
        <SearchBar
          placeholder="Search by name / SKU..."
          value={search} onChange={setSearch}
          className="w-full md:max-w-md"
        />
        <FilterField label="Brand">
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-48 h-10 text-sm">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </FilterField>
      </FilterBar>

      <DataCard>
        {loading ? <Spinner /> : error ? (
          <ErrorState message={error} onRetry={() => void fetchData()} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={PackageOpen} message="No products found" sub="Adjust filters or add new products" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <StyledThead>
                <tr>
                  <StyledTh>Product</StyledTh>
                  <StyledTh>Brand</StyledTh>
                  <StyledTh>SKU</StyledTh>
                  <StyledTh right>Dealer Price</StyledTh>
                  <StyledTh right>Stock Qty</StyledTh>
                  <StyledTh>Status</StyledTh>
                </tr>
              </StyledThead>
              <tbody>
                {paginated.map(p => {
                  const s = getStockStatus(p.stock_qty);
                  return (
                    <StyledTr key={p.id}>
                      <StyledTd className="font-semibold text-foreground">{p.name}</StyledTd>
                      <StyledTd className="text-muted-foreground">{p.brands?.name ?? '—'}</StyledTd>
                      <StyledTd mono className="text-xs text-muted-foreground">{p.sku}</StyledTd>
                      <StyledTd right mono>₹{p.dealer_price?.toLocaleString('en-IN')}</StyledTd>
                      <StyledTd right mono>
                        <span className={`font-bold ${p.stock_qty === 0 ? 'text-red-600' : p.stock_qty <= 5 ? 'text-amber-600' : 'text-foreground'}`}>
                          {p.stock_qty}
                        </span>
                      </StyledTd>
                      <StyledTd>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.cls}`}>
                          {s.label}
                        </span>
                      </StyledTd>
                    </StyledTr>
                  );
                })}
              </tbody>
            </table>
            <TablePagination
              totalItems={filtered.length}
              currentPage={page}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="products"
            />
          </div>
        )}
      </DataCard>
    </div>
  );
};
