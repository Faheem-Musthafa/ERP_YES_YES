import React, { useState, useEffect } from 'react';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Search, AlertTriangle } from 'lucide-react';
import { supabase } from '@/app/supabase';

export const StockManagement = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [{ data: prod }, { data: br }] = await Promise.all([
        supabase.from('products').select('id, name, sku, stock_qty, dealer_price, brands(id, name)').eq('is_active', true).order('name'),
        supabase.from('brands').select('id, name').eq('is_active', true).order('name'),
      ]);
      setProducts(prod ?? []);
      setBrands(br ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchBrand = !brandFilter || brandFilter === 'all' || p.brands?.id === brandFilter;
    const matchStock = !stockFilter || stockFilter === 'all' ||
      (stockFilter === 'out' && p.stock_qty === 0) ||
      (stockFilter === 'low' && p.stock_qty > 0 && p.stock_qty <= 5) ||
      (stockFilter === 'ok' && p.stock_qty > 5);
    return matchSearch && matchBrand && matchStock;
  });

  const stockStatus = (qty: number) => {
    if (qty === 0) return { label: 'Out of Stock', cls: 'bg-red-100 text-red-700' };
    if (qty <= 5) return { label: 'Low Stock', cls: 'bg-amber-100 text-amber-700' };
    return { label: 'In Stock', cls: 'bg-emerald-100 text-emerald-700' };
  };

  const lowCount = products.filter(p => p.stock_qty <= 5).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Stock Management</h1>
        <p className="text-gray-500 mt-1 text-sm">View and monitor all product stock levels</p>
      </div>

      {lowCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="text-amber-600 flex-shrink-0" size={18} />
          <span className="text-amber-800 text-sm font-medium">{lowCount} item(s) are low on stock or out of stock</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by brand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Stock status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="ok">In Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-[#34b0a7] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Product</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Brand</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">SKU</th>
                  <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">DP (₹)</th>
                  <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Stock Qty</th>
                  <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => {
                  const s = stockStatus(p.stock_qty);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-gray-600">{p.brands?.name ?? '-'}</td>
                      <td className="px-4 py-3 font-mono text-gray-600 text-xs">{p.sku}</td>
                      <td className="px-4 py-3 text-right">₹ {p.dealer_price?.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right font-bold">{p.stock_qty}</td>
                      <td className="px-4 py-3 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>{s.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
