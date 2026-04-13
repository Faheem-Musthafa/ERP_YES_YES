import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Plus, Pencil, Package, Archive, RotateCcw } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { toast } from 'sonner';
import { DEFAULT_MASTER_DATA_SETTINGS, loadMasterDataSettings } from '@/app/settings';
import { archiveRecoverableRecord, restoreRecoverableRecord } from '@/app/recovery';
import {
  PageHeader, SearchBar, DataCard, FilterBar, FilterField,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, StatusBadge, IconBtn, TablePagination,
  CustomTooltip,
} from '@/app/components/ui/primitives';

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  dealer_price: number;
  stock_qty: number;
  is_active: boolean;
  brands: { id: string; name: string } | null;
}

interface BrandRow {
  id: string;
  name: string;
}

interface ProductStockRow extends ProductRow {
  live_stock_qty: number;
}

interface StockLocationRow {
  product_id: string;
  stock_qty: number;
}

export const Products = () => {
  const [products, setProducts] = useState<ProductStockRow[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductStockRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', brand_id: '', sku: '', dealer_price: '', stock_qty: '0' });
  const [archiveTarget, setArchiveTarget] = useState<ProductStockRow | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: prod, error: prodError }, { data: br, error: brError }] = await Promise.all([
        supabase.from('products').select('id, name, sku, dealer_price, stock_qty, is_active, brands(id, name)').order('name'),
        supabase.from('brands').select('id, name').eq('is_active', true).order('name'),
      ]);

      if (prodError) throw prodError;
      if (brError) throw brError;

      const productRows = (prod ?? []) as ProductRow[];
      const productIds = productRows.map((product) => product.id);
      const { data: stockRows, error: stockError } = productIds.length === 0
        ? { data: [] as StockLocationRow[], error: null }
        : await supabase
            .from('product_stock_locations')
            .select('product_id, stock_qty')
            .in('product_id', productIds);

      if (stockError) throw stockError;

      const stockTotals = new Map<string, number>();
      ((stockRows ?? []) as StockLocationRow[]).forEach((stockRow) => {
        stockTotals.set(stockRow.product_id, (stockTotals.get(stockRow.product_id) ?? 0) + (stockRow.stock_qty ?? 0));
      });

      setProducts(productRows.map((product) => ({
        ...product,
        live_stock_qty: stockTotals.get(product.id) ?? 0,
      })));
      setBrands((br ?? []) as BrandRow[]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: '', brand_id: '', sku: '', dealer_price: '', stock_qty: '0' }); setOpen(true); };
  const openEdit = (p: ProductStockRow) => { setEditing(p); setForm({ name: p.name, brand_id: p.brands?.id ?? '', sku: p.sku, dealer_price: String(p.dealer_price), stock_qty: String(p.live_stock_qty) }); setOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.sku) { toast.error('Name and SKU are required'); return; }
    setSaving(true);
    const initialStock = Number(form.stock_qty) || 0;
    const payload = { name: form.name, brand_id: form.brand_id || null, sku: form.sku, dealer_price: Number(form.dealer_price) || 0, stock_qty: initialStock };
    try {
      if (editing) {
        const { error } = await supabase
          .from('products')
          .update({ name: payload.name, brand_id: payload.brand_id, sku: payload.sku, dealer_price: payload.dealer_price })
          .eq('id', editing.id);
        if (error) throw error; toast.success('Product updated!');
      } else {
        const masterSettings = await loadMasterDataSettings().catch(() => DEFAULT_MASTER_DATA_SETTINGS);
        const godowns = masterSettings.godowns
          .map((location) => location.trim())
          .filter((location) => location.length > 0);

        if (godowns.length === 0) {
          throw new Error('No godown configured in Settings. Add at least one godown before creating products.');
        }

        const { data: createdProduct, error } = await supabase
          .from('products')
          .insert({ ...payload, is_active: true })
          .select('id')
          .single();
        if (error) throw error; toast.success('Product added!');
        if (createdProduct?.id) {
          const stockSeedRows = godowns.map((location, index) => ({
            product_id: createdProduct.id,
            location,
            stock_qty: index === 0 ? initialStock : 0,
          }));

          const { error: stockInitError } = await supabase
            .from('product_stock_locations')
            .insert(stockSeedRows);
          if (stockInitError) {
            await supabase.from('products').delete().eq('id', createdProduct.id);
            throw stockInitError;
          }
        }
      }
      setOpen(false); fetchData();
    } catch (err: any) { toast.error(err.message || 'Failed to save product'); }
    finally { setSaving(false); }
  };

  const archiveProduct = async (p: ProductStockRow) => {
    try {
      await archiveRecoverableRecord({
        table: 'products',
        id: p.id,
        entityLabel: p.name,
        reason: 'Archived from Products management',
        metadata: { sku: p.sku },
      });
      toast.success('Product archived');
      setArchiveTarget(null);
      await fetchData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to archive product');
    }
  };

  const restoreProduct = async (p: ProductStockRow) => {
    try {
      await restoreRecoverableRecord({
        table: 'products',
        id: p.id,
        entityLabel: p.name,
        metadata: { sku: p.sku },
      });
      toast.success('Product restored');
      await fetchData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to restore product');
    }
  };

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchBrand = !brandFilter || brandFilter === 'all' || (p.brands?.id === brandFilter);
    return matchSearch && matchBrand;
  });
  useEffect(() => { setCurrentPage(1); }, [search, brandFilter, products.length]);
  const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        subtitle="Manage product catalog"
        actions={
          <CustomTooltip content="Add a new product to inventory" side="bottom">
            <Button size="sm" onClick={openAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus size={15} /> Add Product
            </Button>
          </CustomTooltip>
        }
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
        {loading ? <Spinner /> :
          filtered.length === 0 ? (
            <EmptyState icon={Package} message="No products found" sub="Adjust filters or add a new product" />
          ) : (
            <>
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
                    {paginated.map(p => (
                      <StyledTr key={p.id}>
                        <StyledTd className="font-semibold text-foreground">{p.name}</StyledTd>
                        <StyledTd className="text-muted-foreground">{p.brands?.name ?? '—'}</StyledTd>
                        <StyledTd mono className="text-xs text-muted-foreground">{p.sku}</StyledTd>
                        <StyledTd right mono>₹{p.dealer_price?.toLocaleString('en-IN')}</StyledTd>
                        <StyledTd right mono>
                          <span
                            title={p.live_stock_qty === 0 ? 'Out of stock' : p.live_stock_qty <= 5 ? 'Low stock' : 'In stock'}
                            className={`font-bold ${p.live_stock_qty === 0 ? 'text-red-600' : p.live_stock_qty <= 5 ? 'text-amber-600' : 'text-foreground'}`}
                          >
                            {p.live_stock_qty}
                          </span>
                        </StyledTd>
                        <StyledTd><StatusBadge status={p.is_active ? 'Active' : 'Archived'} /></StyledTd>
                        <StyledTd right>
                          <div className="flex items-center justify-end gap-1">
                            <CustomTooltip content={`Edit ${p.name}`} side="top">
                              <IconBtn onClick={() => openEdit(p)}><Pencil size={14} /></IconBtn>
                            </CustomTooltip>
                            <CustomTooltip content={p.is_active ? `Archive ${p.name}` : `Restore ${p.name}`} side="top">
                              {p.is_active ? (
                                <IconBtn onClick={() => setArchiveTarget(p)} danger><Archive size={13} /></IconBtn>
                              ) : (
                                <IconBtn onClick={() => void restoreProduct(p)}><RotateCcw size={13} /></IconBtn>
                              )}
                            </CustomTooltip>
                          </div>
                        </StyledTd>
                      </StyledTr>
                    ))}
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
                <p className="text-[10px] text-muted-foreground">
                  {Boolean(editing) ? 'Live stock is managed through Adjustments, Transfers, GRN and Billing' : 'Initial stock is seeded into live inventory during product creation'}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <CustomTooltip content="Close without saving" side="top">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </CustomTooltip>
            <CustomTooltip content={editing ? 'Update product' : 'Create new product'} side="top">
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={saving}>
                {saving ? 'Saving...' : 'Save Product'}
              </Button>
            </CustomTooltip>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(archiveTarget)} onOpenChange={open => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive product?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget ? `Archive "${archiveTarget.name}" from active inventory lists? You can restore it later from this screen.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => archiveTarget && void archiveProduct(archiveTarget)}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
