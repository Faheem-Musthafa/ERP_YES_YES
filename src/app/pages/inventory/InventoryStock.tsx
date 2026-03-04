import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { PackageOpen } from 'lucide-react';
import { supabase } from '@/app/supabase';
import {
  PageHeader, SearchBar, DataCard,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner,
} from '@/app/components/ui/primitives';

export const InventoryStock = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [brands, setBrands] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: prod }, { data: br }] = await Promise.all([
        supabase.from('products').select('id, name, sku, stock_qty, dealer_price, brands(id, name)').eq('is_active', true).order('name'),
        supabase.from('brands').select('id, name').eq('is_active', true).order('name'),
      ]);
      setProducts(prod ?? []); setBrands(br ?? []); setLoading(false);
    })();
  }, []);

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchBrand = !brandFilter || brandFilter === 'all' || (p.brands?.id === brandFilter);
    return matchSearch && matchBrand;
  });

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

      <div className="flex gap-3 flex-wrap">
        <SearchBar
          placeholder="Search by name / SKU..."
          value={search} onChange={setSearch}
          className="min-w-[240px]"
        />
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-48 h-9 text-sm">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataCard>
        {loading ? <Spinner /> : filtered.length === 0 ? (
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
                {filtered.map(p => {
                  const s = getStockStatus(p.stock_qty);
                  return (
                    <StyledTr key={p.id}>
                      <StyledTd className="font-semibold text-foreground">{p.name}</StyledTd>
                      <StyledTd className="text-muted-foreground">{p.brands?.name ?? '—'}</StyledTd>
                      <StyledTd mono className="text-xs text-muted-foreground">{p.sku}</StyledTd>
                      <StyledTd right mono>₹{p.dealer_price?.toLocaleString('en-IN')}</StyledTd>
                      <StyledTd right mono>
                        <span className={`font-bold ${p.stock_qty <= 5 ? 'text-amber-600' : p.stock_qty === 0 ? 'text-red-600' : 'text-foreground'}`}>
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
          </div>
        )}
      </DataCard>
    </div>
  );
};
