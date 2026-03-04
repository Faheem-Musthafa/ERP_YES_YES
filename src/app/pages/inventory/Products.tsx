import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Plus, Pencil, Package, Trash2 } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { toast } from 'sonner';
import {
  PageHeader, SearchBar, DataCard,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, StatusBadge, IconBtn,
} from '@/app/components/ui/primitives';

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
    setProducts(prod ?? []); setBrands(br ?? []); setLoading(false);
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
        if (error) throw error; toast.success('Product updated!');
      } else {
        const { error } = await supabase.from('products').insert({ ...payload, is_active: true });
        if (error) throw error; toast.success('Product added!');
      }
      setOpen(false); fetchData();
    } catch (err: any) { toast.error(err.message || 'Failed to save product'); }
    finally { setSaving(false); }
  };

  const deleteProduct = async (p: any) => {
    if (!window.confirm(`Delete "${p.name}" permanently?`)) return;
    const { error } = await supabase.from('products').delete().eq('id', p.id);
    if (error) toast.error('Failed to delete product');
    else { toast.success('Product deleted'); fetchData(); }
  };

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchBrand = !brandFilter || brandFilter === 'all' || (p.brands?.id === brandFilter);
    return matchSearch && matchBrand;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        subtitle="Manage product catalog"
        actions={
          <Button size="sm" onClick={openAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus size={15} /> Add Product
          </Button>
        }
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
        {loading ? <Spinner /> :
          filtered.length === 0 ? (
            <EmptyState icon={Package} message="No products found" sub="Adjust filters or add a new product" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <StyledThead>
                  <tr>
                    <StyledTh>Product</StyledTh>
                    <StyledTh>Brand</StyledTh>
                    <StyledTh>SKU</StyledTh>
                    <StyledTh right>Dealer Price</StyledTh>
                    <StyledTh right>Stock</StyledTh>
                    <StyledTh>Status</StyledTh>
                    <StyledTh right>Actions</StyledTh>
                  </tr>
                </StyledThead>
                <tbody>
                  {filtered.map(p => (
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
                      <StyledTd><StatusBadge status={p.is_active ? 'Active' : 'Inactive'} /></StyledTd>
                      <StyledTd right>
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn onClick={() => openEdit(p)} title="Edit"><Pencil size={14} /></IconBtn>
                          <IconBtn onClick={() => deleteProduct(p)} title="Delete" danger><Trash2 size={13} /></IconBtn>
                        </div>
                      </StyledTd>
                    </StyledTr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </DataCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package size={16} className="text-primary" />
              {editing ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Product Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Premium Widget 2000" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Brand</Label>
                <Select value={form.brand_id} onValueChange={v => setForm(f => ({ ...f, brand_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                  <SelectContent>
                    {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">SKU <span className="text-destructive">*</span></Label>
                <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. WGT-2000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Dealer Price (₹)</Label>
                <Input type="number" value={form.dealer_price} onChange={e => setForm(f => ({ ...f, dealer_price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Initial Stock</Label>
                <Input type="number" value={form.stock_qty} onChange={e => setForm(f => ({ ...f, stock_qty: e.target.value }))} disabled={Boolean(editing)} />
                {Boolean(editing) && <p className="text-[10px] text-muted-foreground">Modify stock via Adjustments</p>}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={saving}>
              {saving ? 'Saving...' : 'Save Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
