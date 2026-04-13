import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Plus, Pencil, Tag, Archive, RotateCcw } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { toast } from 'sonner';
import { archiveRecoverableRecord, restoreRecoverableRecord } from '@/app/recovery';
import {
  PageHeader, SearchBar, DataCard,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, StatusBadge, IconBtn, TablePagination,
  CustomTooltip,
} from '@/app/components/ui/primitives';

export const Brands = () => {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('id, name, is_active, created_at')
        .order('name');
      if (brandError) throw brandError;

      let products: any[] = [];
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('brand_id, dealer_price, stock_qty')
        .eq('is_active', true);

      if (productError) {
        toast.warning('Brands loaded, but product metrics are unavailable right now.');
      } else {
        products = productData ?? [];
      }

      const enriched = (brandData ?? []).map((b: any) => {
        const brandProducts = products.filter((p: any) => p.brand_id === b.id);
        return {
          ...b,
          productCount: brandProducts.length,
          stockValue: brandProducts.reduce((sum: number, p: any) => sum + ((p.dealer_price ?? 0) * (p.stock_qty ?? 0)), 0),
        };
      });
      setBrands(enriched);
    } catch (err: any) {
      const message = err?.code === '42501'
        ? 'Permission denied while loading brands. Check grants/RLS for brands table.'
        : err?.message || 'Failed to load brands';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBrands(); }, []);

  const openAdd = () => { setEditing(null); setName(''); setOpen(true); };
  const openEdit = (b: any) => { setEditing(b); setName(b.name); setOpen(true); };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Brand name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from('brands').update({ name: name.trim() }).eq('id', editing.id);
        if (error) throw error;
        toast.success('Brand updated!');
      } else {
        const { error } = await supabase.from('brands').insert({ name: name.trim(), is_active: true });
        if (error) throw error;
        toast.success('Brand added!');
      }
      setOpen(false); fetchBrands();
    } catch (err: any) { toast.error(err.message || 'Failed to save brand'); }
    finally { setSaving(false); }
  };

  const restoreBrand = async (b: any) => {
    try {
      await restoreRecoverableRecord({
        table: 'brands',
        id: b.id,
        entityLabel: b.name,
      });
      toast.success('Brand restored');
      await fetchBrands();
    } catch (err) {
      console.error('Restore brand error:', err);
      toast.error('Failed to restore brand');
    }
  };

  const archiveBrand = async (b: any) => {
    try {
      await archiveRecoverableRecord({
        table: 'brands',
        id: b.id,
        entityLabel: b.name,
        reason: 'Archived from Brands management',
      });
      toast.success('Brand archived');
      setArchiveTarget(null);
      await fetchBrands();
    } catch (error) {
      console.error('Archive brand error:', error);
      toast.error('Failed to archive brand');
    }
  };

  const filtered = brands.filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()));
  useEffect(() => { setCurrentPage(1); }, [search, brands.length]);
  const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalValue = filtered.reduce((s, b) => s + b.stockValue, 0);
  const totalProducts = filtered.reduce((s, b) => s + b.productCount, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Brands"
        subtitle="Manage product brands"
        actions={
          <CustomTooltip content="Add a new product brand" side="bottom">
            <Button size="sm" onClick={openAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus size={15} /> Add Brand
            </Button>
          </CustomTooltip>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <DataCard className="p-4 flex flex-col justify-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Total Brands</p>
          <p className="text-2xl font-bold font-mono text-foreground">{filtered.length}</p>
        </DataCard>
        <DataCard className="p-4 flex flex-col justify-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Active Products</p>
          <p className="text-2xl font-bold font-mono text-foreground">{totalProducts}</p>
        </DataCard>
        <DataCard className="p-4 flex flex-col justify-center col-span-2 sm:col-span-1 bg-primary/5 border-primary/20">
          <p className="text-[10px] text-primary uppercase tracking-widest font-semibold mb-1">Stock Value</p>
          <p className="text-2xl font-bold font-mono text-primary">
            ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </DataCard>
      </div>

      <SearchBar
        placeholder="Search brands..."
        value={search}
        onChange={setSearch}
        className="max-w-xs"
      />

      <DataCard>
        {loading ? <Spinner /> :
          filtered.length === 0 ? (
            <EmptyState icon={Tag} message="No brands found" sub="Add a brand to categorize products" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <StyledThead>
                    <tr>
                      <StyledTh>Brand Name</StyledTh>
                      <StyledTh right>Products</StyledTh>
                      <StyledTh right>Stock Value</StyledTh>
                      <StyledTh>Status</StyledTh>
                      <StyledTh>Added</StyledTh>
                      <StyledTh right>Actions</StyledTh>
                    </tr>
                  </StyledThead>
                  <tbody>
                    {paginated.map(b => (
                      <StyledTr key={b.id}>
                        <StyledTd className="font-semibold text-foreground">{b.name}</StyledTd>
                        <StyledTd right mono className="text-muted-foreground">{b.productCount}</StyledTd>
                        <StyledTd right mono>
                          {b.stockValue > 0 ? (
                            <span className="font-semibold text-primary">₹{b.stockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                          ) : <span className="text-muted-foreground opacity-50">—</span>}
                        </StyledTd>
                        <StyledTd><StatusBadge status={b.is_active ? 'Active' : 'Archived'} /></StyledTd>
                        <StyledTd mono className="text-xs text-muted-foreground">
                          {new Date(b.created_at).toLocaleDateString()}
                        </StyledTd>
                        <StyledTd right>
                          <div className="flex items-center justify-end gap-1">
                            <CustomTooltip content={`Edit ${b.name}`} side="top">
                              <IconBtn onClick={() => openEdit(b)}><Pencil size={14} /></IconBtn>
                            </CustomTooltip>
                            <CustomTooltip content={b.is_active ? `Archive ${b.name}` : `Restore ${b.name}`} side="top">
                              {b.is_active ? (
                                <IconBtn onClick={() => setArchiveTarget(b)} danger><Archive size={13} /></IconBtn>
                              ) : (
                                <IconBtn onClick={() => void restoreBrand(b)}><RotateCcw size={13} /></IconBtn>
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
                itemLabel="brands"
              />
            </>
          )
        }
      </DataCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag size={16} className="text-primary" />
              {editing ? 'Edit Brand' : 'Add New Brand'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-xs">Brand Name <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sony, Samsung" className="mt-1.5" />
          </div>
          <DialogFooter className="gap-2">
            <CustomTooltip content="Close without saving" side="top">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </CustomTooltip>
            <CustomTooltip content={editing ? 'Update brand name' : 'Create new brand'} side="top">
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={saving}>
                {saving ? 'Saving...' : 'Save Brand'}
              </Button>
            </CustomTooltip>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(archiveTarget)} onOpenChange={open => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive brand?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget ? `Archive "${archiveTarget.name}" from active brand lists? You can restore it later from this screen.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => archiveTarget && void archiveBrand(archiveTarget)}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
