import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { AlertTriangle, PackageSearch } from 'lucide-react';
import { supabase } from '@/app/supabase';
import {
  PageHeader, SearchBar, FilterBar, FilterField, DataCard,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, ErrorState, TablePagination,
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

export const StockManagement = () => {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: prod, error: prodError }, { data: br, error: brandError }] = await Promise.all([
        supabase.from('products').select('id, name, sku, dealer_price, brands(id, name)').eq('is_active', true).order('name'),
        supabase.from('brands').select('id, name').eq('is_active', true).order('name'),
      ]);
      
      if (prodError || brandError) {
        throw prodError || brandError;
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
      setError(err?.message || 'Unable to fetch stock data');
      setProducts([]);
      setBrands([]);
    }
    setLoading(false);
  };

  useEffect(() => { void fetchData(); }, []);

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchBrand = !brandFilter || brandFilter === 'all' || p.brands?.id === brandFilter;
    
    let matchStock = true;
    if (stockFilter && stockFilter !== 'all') {
      const relevantStock = locationFilter === 'all' 
        ? p.total_stock 
        : locationFilter === 'Kottakkal' 
        ? p.kottakkal_stock 
        : p.chenakkal_stock;
      
      if (stockFilter === 'out') matchStock = relevantStock === 0;
      else if (stockFilter === 'low') matchStock = relevantStock > 0 && relevantStock <= 5;
      else if (stockFilter === 'ok') matchStock = relevantStock > 5;
    }
    
    return matchSearch && matchBrand && matchStock;
  });
  useEffect(() => { setCurrentPage(1); }, [search, brandFilter, stockFilter, locationFilter, products.length]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stockStatus = (qty: number) => {
    if (qty === 0) return { label: 'Out of Stock', cls: 'bg-red-100 text-red-900 border border-red-300/80' };
    if (qty <= 5) return { label: 'Low Stock', cls: 'bg-amber-100 text-amber-900 border border-amber-300/80' };
    return { label: 'In Stock', cls: 'bg-emerald-100 text-emerald-900 border border-emerald-300/80' };
  };

  const getLocationStock = (p: ProductWithStock, location: string) => {
    if (location === 'Kottakkal') return p.kottakkal_stock;
    if (location === 'Chenakkal') return p.chenakkal_stock;
    return p.total_stock;
  };

  const lowCount = products.filter(p => {
    if (locationFilter === 'all') return p.total_stock <= 5;
    if (locationFilter === 'Kottakkal') return p.kottakkal_stock <= 5;
    if (locationFilter === 'Chenakkal') return p.chenakkal_stock <= 5;
    return false;
  }).length;

  const outOfStockCount = products.filter(p => {
    if (locationFilter === 'all') return p.total_stock === 0;
    if (locationFilter === 'Kottakkal') return p.kottakkal_stock === 0;
    if (locationFilter === 'Chenakkal') return p.chenakkal_stock === 0;
    return false;
  }).length;

  const totalStockValue = filtered.reduce((sum, p) => {
    const stock = getLocationStock(p, locationFilter);
    return sum + stock * (Number(p.dealer_price) || 0);
  }, 0);
  
  const totalItems = filtered.length;

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Stock Management & Valuation"
        subtitle="Detailed view of product quantities, locations, and total stock value"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Total Items</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{totalItems}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Total Stock Value</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">₹ {totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Low Stock Items</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{lowCount}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Out of Stock</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{outOfStockCount}</p>
        </div>
      </div>

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
          <FilterField label="Location">
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="h-10 w-[170px]"><SelectValue placeholder="All" /></SelectTrigger>
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
                  {locationFilter === 'all' ? (
                    <>
                      <StyledTh right>Kottakkal</StyledTh>
                      <StyledTh right>Chenakkal</StyledTh>
                      <StyledTh right>Total Stock</StyledTh>
                    </>
                  ) : (
                    <StyledTh right>Stock Qty</StyledTh>
                  )}
                  <StyledTh right>Stock Value (₹)</StyledTh>
                  <StyledTh center>Status</StyledTh>
                </tr>
              </StyledThead>
              <tbody>
                {paginated.map(p => {
                  const relevantStock = getLocationStock(p, locationFilter);
                  const s = stockStatus(relevantStock);
                  const val = (p.dealer_price || 0) * relevantStock;
                  return (
                    <StyledTr key={p.id}>
                      <StyledTd className="font-medium">{p.name}</StyledTd>
                      <StyledTd className="text-muted-foreground">{p.brands?.name ?? '-'}</StyledTd>
                      <StyledTd mono className="text-xs text-muted-foreground">{p.sku}</StyledTd>
                      <StyledTd right mono>₹ {p.dealer_price?.toLocaleString('en-IN')}</StyledTd>
                      {locationFilter === 'all' ? (
                        <>
                          <StyledTd right mono className={`font-bold ${p.kottakkal_stock === 0 ? 'text-red-600' : p.kottakkal_stock <= 5 ? 'text-amber-600' : 'text-foreground'}`}>
                            {p.kottakkal_stock}
                          </StyledTd>
                          <StyledTd right mono className={`font-bold ${p.chenakkal_stock === 0 ? 'text-red-600' : p.chenakkal_stock <= 5 ? 'text-amber-600' : 'text-foreground'}`}>
                            {p.chenakkal_stock}
                          </StyledTd>
                          <StyledTd right mono className={`font-bold ${p.total_stock === 0 ? 'text-red-600' : p.total_stock <= 5 ? 'text-amber-600' : 'text-emerald-700'}`}>
                            {p.total_stock}
                          </StyledTd>
                        </>
                      ) : (
                        <StyledTd right mono className={`font-bold ${relevantStock === 0 ? 'text-red-600' : relevantStock <= 5 ? 'text-amber-600' : 'text-foreground'}`}>
                          {relevantStock}
                        </StyledTd>
                      )}
                      <StyledTd right mono className="font-bold text-emerald-700">₹ {val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</StyledTd>
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
