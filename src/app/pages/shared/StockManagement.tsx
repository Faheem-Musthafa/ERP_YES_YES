import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import {
  AlertTriangle, PackageSearch, Boxes, Wallet, AlertCircle, XCircle,
} from 'lucide-react';
import { supabase } from '@/app/supabase';
import {
  PageHeader, SearchBar, FilterBar, FilterField, DataCard,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, ErrorState, TablePagination,
} from '@/app/components/ui/primitives';
import { DEFAULT_MASTER_DATA_SETTINGS, loadMasterDataSettings } from '@/app/settings';
import { LOW_STOCK_THRESHOLD } from '@/app/stockHealth';

interface ProductWithStock {
  id: string;
  name: string;
  sku: string;
  dealer_price: number;
  brands: { id: string; name: string } | null;
  locationStocks: Record<string, number>;
  locationReserved: Record<string, number>;
  total_stock: number;
  total_reserved: number;
}

type StatAccent = 'slate' | 'emerald' | 'amber' | 'red';

const STAT_ACCENT: Record<StatAccent, { bar: string; iconBg: string; iconText: string; value: string }> = {
  slate:   { bar: 'bg-slate-400',   iconBg: 'bg-slate-100',   iconText: 'text-slate-600',   value: 'text-foreground' },
  emerald: { bar: 'bg-emerald-500', iconBg: 'bg-emerald-100', iconText: 'text-emerald-700', value: 'text-emerald-600' },
  amber:   { bar: 'bg-amber-500',   iconBg: 'bg-amber-100',   iconText: 'text-amber-700',   value: 'text-amber-600' },
  red:     { bar: 'bg-red-500',     iconBg: 'bg-red-100',     iconText: 'text-red-700',     value: 'text-red-600' },
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: StatAccent;
}

const StatCard = ({ icon, label, value, accent }: StatCardProps) => {
  const palette = STAT_ACCENT[accent];
  return (
    <div className="relative overflow-hidden bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <span className={`absolute inset-y-0 left-0 w-1 ${palette.bar}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className={`text-2xl font-bold mt-1 truncate ${palette.value}`}>{value}</p>
        </div>
        <div className={`shrink-0 h-9 w-9 rounded-lg flex items-center justify-center ${palette.iconBg} ${palette.iconText}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export const StockManagement = () => {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [locationOptions, setLocationOptions] = useState<string[]>(DEFAULT_MASTER_DATA_SETTINGS.Godowns);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [settings, { data: prod, error: prodError }, { data: br, error: brandError }] = await Promise.all([
        loadMasterDataSettings().catch(() => DEFAULT_MASTER_DATA_SETTINGS),
        supabase.from('products').select('id, name, sku, dealer_price, brands(id, name)').eq('is_active', true).order('name'),
        supabase.from('brands').select('id, name').eq('is_active', true).order('name'),
      ]);
      
      if (prodError || brandError) {
        throw prodError || brandError;
      }

      const productIds = (prod ?? []).map(p => p.id);
      type StockRow = { product_id: string; location: string | null; stock_qty: number | null; reserved_qty: number | null };
      let stockData: StockRow[] = [];
      const availRes = await supabase
        .from('v_available_stock')
        .select('product_id, location, stock_qty, reserved_qty')
        .in('product_id', productIds);

      if (availRes.error) {
        // v_available_stock joins stock_reservations; fall back to base table
        // when the caller lacks SELECT on reservations (reserved_qty unknown).
        const msg = (availRes.error.message || '').toLowerCase();
        const isPermissionDenied = msg.includes('permission denied') || availRes.error.code === '42501';
        if (!isPermissionDenied) throw availRes.error;
        const fallback = await supabase
          .from('product_stock_locations')
          .select('product_id, location, stock_qty')
          .in('product_id', productIds);
        if (fallback.error) throw fallback.error;
        stockData = (fallback.data ?? []).map((row: any) => ({
          product_id: row.product_id,
          location: row.location,
          stock_qty: row.stock_qty,
          reserved_qty: 0,
        }));
      } else {
        stockData = (availRes.data ?? []) as StockRow[];
      }

      const configuredLocations = Array.from(new Set(
        settings.Godowns
          .map((location) => location.trim())
          .filter((location) => location.length > 0),
      ));
      const detectedLocations = Array.from(new Set(
        stockData
          .map((row) => (typeof row.location === 'string' ? row.location.trim() : ''))
          .filter((location) => location.length > 0),
      ));
      const nextLocationOptions = configuredLocations.length > 0
        ? configuredLocations
        : detectedLocations;
      setLocationOptions(nextLocationOptions);

      const stockByProduct = new Map<string, Record<string, number>>();
      const reservedByProduct = new Map<string, Record<string, number>>();
      stockData.forEach((row) => {
        const location = typeof row.location === 'string' ? row.location.trim() : '';
        if (!location) return;
        const existingStock = stockByProduct.get(row.product_id) ?? {};
        existingStock[location] = row.stock_qty ?? 0;
        stockByProduct.set(row.product_id, existingStock);
        const existingReserved = reservedByProduct.get(row.product_id) ?? {};
        existingReserved[location] = row.reserved_qty ?? 0;
        reservedByProduct.set(row.product_id, existingReserved);
      });

      const productsWithStock: ProductWithStock[] = (prod ?? []).map(p => {
        const locationStocks = stockByProduct.get(p.id) ?? {};
        const locationReserved = reservedByProduct.get(p.id) ?? {};
        const total_stock = nextLocationOptions.reduce(
          (sum, location) => sum + (locationStocks[location] ?? 0),
          0,
        );
        const total_reserved = nextLocationOptions.reduce(
          (sum, location) => sum + (locationReserved[location] ?? 0),
          0,
        );

        return {
          ...p,
          locationStocks,
          locationReserved,
          total_stock,
          total_reserved,
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

  useEffect(() => {
    if (locationFilter !== 'all' && !locationOptions.includes(locationFilter)) {
      setLocationFilter('all');
    }
  }, [locationFilter, locationOptions]);

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchBrand = !brandFilter || brandFilter === 'all' || p.brands?.id === brandFilter;
    
    let matchStock = true;
    if (stockFilter && stockFilter !== 'all') {
      const relevantStock = locationFilter === 'all' 
        ? p.total_stock 
        : (p.locationStocks[locationFilter] ?? 0);
      
      if (stockFilter === 'out') matchStock = relevantStock === 0;
      else if (stockFilter === 'low') matchStock = relevantStock > 0 && relevantStock <= LOW_STOCK_THRESHOLD;
      else if (stockFilter === 'ok') matchStock = relevantStock > LOW_STOCK_THRESHOLD;
    }
    
    return matchSearch && matchBrand && matchStock;
  });
  useEffect(() => { setCurrentPage(1); }, [search, brandFilter, stockFilter, locationFilter, products.length]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stockStatus = (qty: number) => {
    if (qty === 0) return { label: 'Out of Stock', cls: 'bg-red-100 text-red-900 border border-red-300/80' };
    if (qty <= LOW_STOCK_THRESHOLD) return { label: 'Low Stock', cls: 'bg-amber-100 text-amber-900 border border-amber-300/80' };
    return { label: 'In Stock', cls: 'bg-emerald-100 text-emerald-900 border border-emerald-300/80' };
  };

  const getLocationStock = (p: ProductWithStock, location: string) => {
    if (!location || location === 'all') return p.total_stock;
    return p.locationStocks[location] ?? 0;
  };
  const getLocationReserved = (p: ProductWithStock, location: string) => {
    if (!location || location === 'all') return p.total_reserved;
    return p.locationReserved[location] ?? 0;
  };

  const stockClassName = (qty: number) => {
    if (qty === 0) return 'text-red-600';
    if (qty <= LOW_STOCK_THRESHOLD) return 'text-amber-600';
    return 'text-foreground';
  };

  const lowCount = products.filter(p => {
    const relevantStock = getLocationStock(p, locationFilter);
    // Strictly > 0 so Out-of-Stock items are not double-counted in Low.
    return relevantStock > 0 && relevantStock <= LOW_STOCK_THRESHOLD;
  }).length;

  const outOfStockCount = products.filter(p => {
    const relevantStock = getLocationStock(p, locationFilter);
    return relevantStock === 0;
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Boxes size={18} />}
          label="Total Items"
          value={totalItems.toLocaleString('en-IN')}
          accent="slate"
        />
        <StatCard
          icon={<Wallet size={18} />}
          label="Total Stock Value"
          value={`₹ ${totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          accent="emerald"
        />
        <StatCard
          icon={<AlertCircle size={18} />}
          label="Low Stock Items"
          value={lowCount.toLocaleString('en-IN')}
          accent="amber"
        />
        <StatCard
          icon={<XCircle size={18} />}
          label="Out of Stock"
          value={outOfStockCount.toLocaleString('en-IN')}
          accent="red"
        />
      </div>

      {(lowCount > 0 || outOfStockCount > 0) && (
        <div
          className="bg-gradient-to-r from-amber-50 to-white border border-amber-200 rounded-xl p-3.5 flex items-center gap-3 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <span className="shrink-0 h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <AlertTriangle size={16} />
          </span>
          <span className="text-amber-900 text-sm">
            <span className="font-semibold">Attention:</span>{' '}
            {lowCount > 0 && <>{lowCount} low-stock item{lowCount === 1 ? '' : 's'}</>}
            {lowCount > 0 && outOfStockCount > 0 && <> · </>}
            {outOfStockCount > 0 && <>{outOfStockCount} out of stock</>}
          </span>
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
                {locationOptions.map((location) => (
                  <SelectItem key={location} value={location}>{location}</SelectItem>
                ))}
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
                      {locationOptions.map((location) => (
                        <StyledTh key={location} right>{location}</StyledTh>
                      ))}
                      <StyledTh right>Total Stock</StyledTh>
                    </>
                  ) : (
                    <StyledTh right>Stock Qty</StyledTh>
                  )}
                  <StyledTh right>Reserved</StyledTh>
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
                          {locationOptions.map((location) => {
                            const locationQty = getLocationStock(p, location);
                            return (
                              <StyledTd key={location} right mono className={`font-bold ${stockClassName(locationQty)}`}>
                                {locationQty}
                              </StyledTd>
                            );
                          })}
                          <StyledTd right mono className={`font-bold ${p.total_stock === 0 ? 'text-red-600' : p.total_stock <= LOW_STOCK_THRESHOLD ? 'text-amber-600' : 'text-emerald-700'}`}>
                            {p.total_stock}
                          </StyledTd>
                        </>
                      ) : (
                        <StyledTd right mono className={`font-bold ${relevantStock === 0 ? 'text-red-600' : relevantStock <= LOW_STOCK_THRESHOLD ? 'text-amber-600' : 'text-foreground'}`}>
                          {relevantStock}
                        </StyledTd>
                      )}
                      <StyledTd right mono>
                        {(() => {
                          const reserved = getLocationReserved(p, locationFilter);
                          return reserved > 0 ? (
                            <span className="font-semibold text-amber-700">{reserved}</span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          );
                        })()}
                      </StyledTd>
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
