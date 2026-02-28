import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Plus, Pencil, Search } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { toast } from 'sonner';

export const Products = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', brand_id: '', sku: '', dealer_price: '', stock_qty: '0' });

  const fetchData = async () => {
    setLoading(true);
    const [{ data: prod }, { data: br }] = await Promise.all([
      supabase.from('products').select('id, name, sku, dealer_price, stock_qty, is_active, brands(id, name)').order('name'),
      supabase.from('brands').select('id, name').eq('is_active', true).order('name'),
    ]);
    setProducts(prod ?? []);
    setBrands(br ?? []);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: '', brand_id: '', sku: '', dealer_price: '', stock_qty: '0' }); setOpen(true); };
  const openEdit = (p: any) => { setEditing(p); setForm({ name: p.name, brand_id: p.brands?.id ?? '', sku: p.sku, dealer_price: String(p.dealer_price), stock_qty: String(p.stock_qty) }); setOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.sku) { toast.error('Name and SKU are required'); return; }
    setSaving(true);
    const payload = { name: form.name, brand_id: form.brand_id || null, sku: form.sku, dealer_price: Number(form.dealer_price) || 0, stock_qty: Number(form.stock_qty) || 0 };
    try {
      if (editing) {
        const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Product updated!');
      } else {
        const { error } = await supabase.from('products').insert({ ...payload, is_active: true });
        if (error) throw error;
        toast.success('Product added!');
      }
      setOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchBrand = !brandFilter || brandFilter === 'all' || (p.brands?.id === brandFilter);
    return matchSearch && matchBrand;
  });

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage product catalog</p>
        </div>
        <Button onClick={openAdd} className="bg-[#34b0a7] hover:bg-[#34b0a7]/90"><Plus size={18} className="mr-2" />Add Product</Button>
      </div>

      <Card className="p-4 mb-6">
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
      </Card>

      <Card className="overflow-hidden">
        {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">Product</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">Brand</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">SKU</th>
                  <th className="text-right text-xs font-semibold text-gray-700 p-3">Dealer Price</th>
                  <th className="text-right text-xs font-semibold text-gray-700 p-3">Stock</th>
                  <th className="text-center text-xs font-semibold text-gray-700 p-3">Status</th>
                  <th className="text-center text-xs font-semibold text-gray-700 p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm font-medium">{p.name}</td>
                    <td className="p-3 text-sm text-gray-600">{p.brands?.name ?? '-'}</td>
                    <td className="p-3 text-sm text-gray-600 font-mono">{p.sku}</td>
                    <td className="p-3 text-sm text-right">₹ {p.dealer_price?.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-sm text-right font-semibold">
                      <span className={p.stock_qty <= 5 ? 'text-teal-600' : p.stock_qty === 0 ? 'text-red-600' : 'text-gray-900'}>{p.stock_qty}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="p-3 text-center">
                      <Button size="sm" variant="outline" onClick={() => openEdit(p)} className="h-8"><Pencil size={14} /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Product' : 'Add New Product'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Product Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product name" /></div>
            <div className="space-y-2"><Label>Brand</Label>
              <Select value={form.brand_id} onValueChange={v => setForm(f => ({ ...f, brand_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                <SelectContent>{brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>SKU *</Label><Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Product SKU" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Dealer Price (₹)</Label><Input type="number" value={form.dealer_price} onChange={e => setForm(f => ({ ...f, dealer_price: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Initial Stock</Label><Input type="number" value={form.stock_qty} onChange={e => setForm(f => ({ ...f, stock_qty: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-[#34b0a7] hover:bg-[#34b0a7]/90" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
