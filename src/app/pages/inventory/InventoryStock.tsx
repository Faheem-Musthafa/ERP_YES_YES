import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { PackageOpen } from 'lucide-react';
import { supabase } from '@/app/supabase';
import {
  PageHeader, SearchBar, DataCard, FilterBar, FilterField,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, TablePagination, ErrorState,
} from '@/app/components/ui/primitives';
import { DEFAULT_MASTER_DATA_SETTINGS, loadMasterDataSettings } from '@/app/settings';

interface ProductWithStock {
  id: string;
  name: string;
  sku: string;
  dealer_price: number;
  brands: { id: string; name: string } | null;
  locationStocks: Record<string, number>;
  total_stock: number;
}

export const InventoryStock = () => {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [locationOptions, setLocationOptions] = useState<string[]>(DEFAULT_MASTER_DATA_SETTINGS.Godowns);
  const [brands, setBrands] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [settings, { data: prod, error: prodError }, { data: br, error: brError }] = await Promise.all([
        loadMasterDataSettings().catch(() => DEFAULT_MASTER_DATA_SETTINGS),
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

      const configuredLocations = Array.from(new Set(
        settings.Godowns
          .map((location) => location.trim())
          .filter((location) => location.length > 0),
      ));
      const detectedLocations = Array.from(new Set(
        (stockData ?? [])
          .map((row: any) => (typeof row.location === 'string' ? row.location.trim() : ''))
          .filter((location: string) => location.length > 0),
      ));
      const nextLocationOptions = configuredLocations.length > 0
        ? configuredLocations
        : detectedLocations;
      setLocationOptions(nextLocationOptions);

      const stockByProduct = new Map<string, Record<string, number>>();
      (stockData ?? []).forEach((row: any) => {
        const location = typeof row.location === 'string' ? row.location.trim() : '';
        if (!location) return;
        const existing = stockByProduct.get(row.product_id) ?? {};
        existing[location] = row.stock_qty ?? 0;
        stockByProduct.set(row.product_id, existing);
      });

      const productsWithStock: ProductWithStock[] = (prod ?? []).map(p => {
        const locationStocks = stockByProduct.get(p.id) ?? {};
        const total_stock = nextLocationOptions.reduce(
          (sum, location) => sum + (locationStocks[location] ?? 0),
          0,
        );
        
        return {
          ...p,
          locationStocks,
          total_stock,
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

  useEffect(() => {
    if (locationFilter !== 'all' && !locationOptions.includes(locationFilter)) {
      setLocationFilter('all');
    }
  }, [locationFilter, locationOptions]);

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
    if (!location || location === 'all') return p.total_stock;
    return p.locationStocks[location] ?? 0;
  };

  const stockClassName = (qty: number) => {
    if (qty === 0) return 'text-red-600';
    if (qty <= 5) return 'text-amber-600';
    return 'text-foreground';
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
                {locationOptions.map((location) => (
                  <SelectItem key={location} value={location}>{location}</SelectItem>
                ))}
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
                      {locationOptions.map((location) => (
                        <StyledTh key={location} right>{location}</StyledTh>
                      ))}
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
                          {locationOptions.map((location) => {
                            const locationQty = getLocationStock(p, location);
                            return (
                              <StyledTd key={location} right mono>
                                <span className={`font-bold ${stockClassName(locationQty)}`}>
                                  {locationQty}
                                </span>
                              </StyledTd>
                            );
                          })}
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
