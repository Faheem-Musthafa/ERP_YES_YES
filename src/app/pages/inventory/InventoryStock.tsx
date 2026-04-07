import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { PackageOpen } from 'lucide-react';
import { supabase } from '@/app/supabase';
import {
  PageHeader, SearchBar, DataCard, FilterBar, FilterField,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, TablePagination, ErrorState,
} from '@/app/components/ui/primitives';

interface ProductWithStock {
  id: string;
  name: string;
  sku: string;
  dealer_price: number;
  brands: { id: string; name: string } | null;
  kottakkal_stock: number;
  chenakkal_stock: number;
  total_stock: number;
}

export const InventoryStock = () => {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [brands, setBrands] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: prod, error: prodError }, { data: br, error: brError }] = await Promise.all([
        supabase.from('products').select('id, name, sku, dealer_price, brands(id, name)').eq('is_active', true).order('name'),
        supabase.from('brands').select('id, name').eq('is_active', true).order('name'),
      ]);

      if (prodError || brError) {
        throw prodError || brError;
      }

      const productIds = (prod ?? []).map(p => p.id);
      const { data: stockData, error: stockError } = await supabase
        .from('product_stock_locations')
        .select('product_id, location, stock_qty')
        .in('product_id', productIds);

      if (stockError) throw stockError;

      const productsWithStock: ProductWithStock[] = (prod ?? []).map(p => {
        const kottakkalStock = stockData?.find(s => s.product_id === p.id && s.location === 'Kottakkal');
        const chenakkalStock = stockData?.find(s => s.product_id === p.id && s.location === 'Chenakkal');
        const kottakkal_stock = kottakkalStock?.stock_qty ?? 0;
        const chenakkal_stock = chenakkalStock?.stock_qty ?? 0;
        
        return {
          ...p,
          kottakkal_stock,
          chenakkal_stock,
          total_stock: kottakkal_stock + chenakkal_stock,
        };
      });

      setProducts(productsWithStock);
      setBrands(br ?? []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load stock');
      setProducts([]);
      setBrands([]);
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
  useEffect(() => { setCurrentPage(1); }, [search, brandFilter, locationFilter, products.length]);
  const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const getStockStatus = (qty: number) => {
    if (qty === 0) return { label: 'Out of Stock', cls: 'bg-red-50 text-red-700 border-red-200' };
    if (qty <= 5) return { label: 'Low Stock', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'In Stock', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const getLocationStock = (p: ProductWithStock, location: string) => {
    if (location === 'Kottakkal') return p.kottakkal_stock;
    if (location === 'Chenakkal') return p.chenakkal_stock;
    return p.total_stock;
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
        <div className="flex flex-wrap items-end gap-3">
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
          <FilterField label="Location">
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-48 h-10 text-sm">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="Kottakkal">Kottakkal</SelectItem>
                <SelectItem value="Chenakkal">Chenakkal</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </div>
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
                  {locationFilter === 'all' ? (
                    <>
                      <StyledTh right>Kottakkal</StyledTh>
                      <StyledTh right>Chenakkal</StyledTh>
                      <StyledTh right>Total Stock</StyledTh>
                    </>
                  ) : (
                    <StyledTh right>Stock Qty</StyledTh>
                  )}
                  <StyledTh>Status</StyledTh>
                </tr>
              </StyledThead>
              <tbody>
                {paginated.map(p => {
                  const relevantStock = getLocationStock(p, locationFilter);
                  const s = getStockStatus(relevantStock);
                  return (
                    <StyledTr key={p.id}>
                      <StyledTd className="font-semibold text-foreground">{p.name}</StyledTd>
                      <StyledTd className="text-muted-foreground">{p.brands?.name ?? '—'}</StyledTd>
                      <StyledTd mono className="text-xs text-muted-foreground">{p.sku}</StyledTd>
                      <StyledTd right mono>₹{p.dealer_price?.toLocaleString('en-IN')}</StyledTd>
                      {locationFilter === 'all' ? (
                        <>
                          <StyledTd right mono>
                            <span className={`font-bold ${p.kottakkal_stock === 0 ? 'text-red-600' : p.kottakkal_stock <= 5 ? 'text-amber-600' : 'text-foreground'}`}>
                              {p.kottakkal_stock}
                            </span>
                          </StyledTd>
                          <StyledTd right mono>
                            <span className={`font-bold ${p.chenakkal_stock === 0 ? 'text-red-600' : p.chenakkal_stock <= 5 ? 'text-amber-600' : 'text-foreground'}`}>
                              {p.chenakkal_stock}
                            </span>
                          </StyledTd>
                          <StyledTd right mono>
                            <span className={`font-bold ${p.total_stock === 0 ? 'text-red-600' : p.total_stock <= 5 ? 'text-amber-600' : 'text-emerald-700'}`}>
                              {p.total_stock}
                            </span>
                          </StyledTd>
                        </>
                      ) : (
                        <StyledTd right mono>
                          <span className={`font-bold ${relevantStock === 0 ? 'text-red-600' : relevantStock <= 5 ? 'text-amber-600' : 'text-foreground'}`}>
                            {relevantStock}
                          </span>
                        </StyledTd>
                      )}
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
