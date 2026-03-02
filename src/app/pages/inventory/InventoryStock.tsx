import React, { useState, useEffect } from 'react';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Search, Package } from 'lucide-react';
import { supabase } from '@/app/supabase';

export const InventoryStock = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [brands, setBrands] = useState<any[]>([]);

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
    const matchBrand = !brandFilter || brandFilter === 'all' || (p.brands?.id === brandFilter);
    return matchSearch && matchBrand;
  });

  const stockStatus = (qty: number) => {
    if (qty === 0) return { label: 'Out of Stock', cls: 'bg-red-100 text-red-700' };
    if (qty <= 5) return { label: 'Low Stock', cls: 'bg-teal-100 text-teal-700' };
    return { label: 'In Stock', cls: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Inventory Stock</h1>
        <p className="text-gray-500 mt-1 text-sm">Current stock levels for all products</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input placeholder="Search by name / SKU..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by brand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-[#34b0a7] border-t-transparent rounded-full animate-spin" /></div> : filtered.length === 0 ? (
          <div className="text-center py-12"><Package size={40} className="text-gray-200 mx-auto mb-3" /><p className="text-gray-400 text-sm">No products found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Product</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Brand</th>
                  <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">SKU</th>
                  <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Dealer Price</th>
                  <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Stock Qty</th>
                  <th className="text-center text-xs font-semibold text-gray-600 px-4 py-3 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => {
                  const s = stockStatus(p.stock_qty);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-gray-600">{p.brands?.name ?? '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.sku}</td>
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
