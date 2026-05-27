import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/app/components/ui/dialog';
import { Tags, StickyNote, Trash2, Pencil, AlertTriangle } from 'lucide-react';
import { formatMoney } from '@/app/money';
import { LOW_STOCK_THRESHOLD } from '@/app/stockHealth';
import {
  PageHeader, SearchBar, DataCard, FilterBar, FilterField,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, IconBtn,
} from '@/app/components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';

const TIER_CODES = ['DP-10', 'DP-12', 'DP-14', 'DP-16', 'DP-17', 'DP-18', 'DP-19', 'DP-20'] as const;
type TierCode = typeof TIER_CODES[number];
const NOTE_LIMIT = 2000;

interface BrandRow { id: string; name: string }
interface ProductRow {
  id: string;
  name: string;
  sku: string;
  mrp: number;
  dealer_price: number;
  brands: { id: string; name: string } | null;
}
interface PriceTierRow { product_id: string; tier_code: string; price: number }
interface StockLocationRow { product_id: string; stock_qty: number }
interface NoteRow {
  id: string;
  product_id: string;
  note: string;
  updated_at: string;
}

interface DisplayRow {
  id: string;
  name: string;
  sku: string;
  mrp: number;
  dealerPrice: number;
  brandId: string | null;
  brandName: string;
  totalStock: number;
  tiers: Record<string, number>;
  note: NoteRow | null;
}

export const PriceList = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const [noteTarget, setNoteTarget] = useState<DisplayRow | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [productResult, brandResult] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, sku, mrp, dealer_price, brands(id, name)')
          .eq('is_active', true)
          .order('name'),
        supabase.from('brands').select('id, name').eq('is_active', true).order('name'),
      ]);

      if (productResult.error) throw productResult.error;
      if (brandResult.error) throw brandResult.error;

      const products = (productResult.data ?? []) as unknown as ProductRow[];
      const productIds = products.map((product) => product.id);

      if (productIds.length === 0) {
        setRows([]);
        setBrands((brandResult.data ?? []) as BrandRow[]);
        return;
      }

      const [tierResult, stockResult, noteResult] = await Promise.all([
        supabase
          .from('product_price_tiers')
          .select('product_id, tier_code, price')
          .in('product_id', productIds),
        supabase
          .from('product_stock_locations')
          .select('product_id, stock_qty')
          .in('product_id', productIds),
        supabase
          .from('salesperson_product_notes')
          .select('id, product_id, note, updated_at')
          .eq('user_id', user.id)
          .in('product_id', productIds),
      ]);

      if (tierResult.error) throw tierResult.error;
      if (stockResult.error) throw stockResult.error;
      if (noteResult.error) throw noteResult.error;

      const tiersByProduct = new Map<string, Record<string, number>>();
      ((tierResult.data ?? []) as PriceTierRow[]).forEach((row) => {
        const bucket = tiersByProduct.get(row.product_id) ?? {};
        bucket[row.tier_code] = Number(row.price);
        tiersByProduct.set(row.product_id, bucket);
      });

      const stockByProduct = new Map<string, number>();
      ((stockResult.data ?? []) as StockLocationRow[]).forEach((row) => {
        stockByProduct.set(row.product_id, (stockByProduct.get(row.product_id) ?? 0) + (row.stock_qty ?? 0));
      });

      const noteByProduct = new Map<string, NoteRow>();
      ((noteResult.data ?? []) as NoteRow[]).forEach((row) => {
        noteByProduct.set(row.product_id, row);
      });

      const display: DisplayRow[] = products.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        mrp: Number(product.mrp ?? 0),
        dealerPrice: Number(product.dealer_price ?? 0),
        brandId: product.brands?.id ?? null,
        brandName: product.brands?.name ?? 'Unbranded',
        totalStock: stockByProduct.get(product.id) ?? 0,
        tiers: tiersByProduct.get(product.id) ?? {},
        note: noteByProduct.get(product.id) ?? null,
      }));

      setRows(display);
      setBrands((brandResult.data ?? []) as BrandRow[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load price list';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (brandFilter !== 'all' && row.brandId !== brandFilter) return false;
      if (showLowStockOnly && row.totalStock > LOW_STOCK_THRESHOLD) return false;
      if (!term) return true;
      return (
        row.name.toLowerCase().includes(term) ||
        row.sku.toLowerCase().includes(term) ||
        row.brandName.toLowerCase().includes(term)
      );
    });
  }, [rows, search, brandFilter, showLowStockOnly]);

  const grouped = useMemo(() => {
    const map = new Map<string, DisplayRow[]>();
    filtered.forEach((row) => {
      const list = map.get(row.brandName) ?? [];
      list.push(row);
      map.set(row.brandName, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const openNoteDialog = (row: DisplayRow) => {
    setNoteTarget(row);
    setNoteDraft(row.note?.note ?? '');
  };

  const closeNoteDialog = () => {
    setNoteTarget(null);
    setNoteDraft('');
  };

  const saveNote = async () => {
    if (!user || !noteTarget) return;
    const trimmed = noteDraft.trim();
    if (!trimmed) {
      toast.error('Note cannot be empty');
      return;
    }
    if (trimmed.length > NOTE_LIMIT) {
      toast.error(`Note too long (max ${NOTE_LIMIT} chars)`);
      return;
    }
    setSavingNote(true);
    try {
      const { error } = await supabase
        .from('salesperson_product_notes')
        .upsert(
          { product_id: noteTarget.id, user_id: user.id, note: trimmed },
          { onConflict: 'product_id,user_id' },
        );
      if (error) throw error;
      toast.success('Note saved');
      closeNoteDialog();
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save note';
      toast.error(message);
    } finally {
      setSavingNote(false);
    }
  };

  const deleteNote = async () => {
    if (!user || !noteTarget?.note) return;
    setSavingNote(true);
    try {
      const { error } = await supabase
        .from('salesperson_product_notes')
        .delete()
        .eq('id', noteTarget.note.id);
      if (error) throw error;
      toast.success('Note removed');
      closeNoteDialog();
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete note';
      toast.error(message);
    } finally {
      setSavingNote(false);
    }
  };

  const isLowStock = (qty: number) => qty <= LOW_STOCK_THRESHOLD;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Price List"
        subtitle="Current MRP, dealer pricing tiers, stock health, and your private product notes."
      />

      <FilterBar>
        <FilterField label="Search" className="flex-1 min-w-[180px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, SKU, or brand" />
        </FilterField>
        <FilterField label="Brand">
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="h-10 min-w-[180px] rounded-xl">
              <SelectValue placeholder="All brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Stock">
          <Button
            type="button"
            variant={showLowStockOnly ? 'default' : 'outline'}
            onClick={() => setShowLowStockOnly((value) => !value)}
            className="h-10 rounded-xl"
          >
            <AlertTriangle size={14} className="mr-1.5" />
            {showLowStockOnly ? 'Showing low stock' : 'Show low stock only'}
          </Button>
        </FilterField>
      </FilterBar>

      {loading ? (
        <Spinner />
      ) : grouped.length === 0 ? (
        <DataCard>
          <EmptyState
            icon={Tags}
            message="No products match the current filters"
            sub="Try clearing the search or brand filter."
          />
        </DataCard>
      ) : (
        <div className="space-y-5">
          {grouped.map(([brandName, brandRows]) => (
            <DataCard key={brandName}>
              <div className="flex items-center justify-between border-b border-border/60 bg-slate-50/60 px-4 py-2.5 dark:bg-slate-900/40">
                <h2 className="text-sm font-semibold tracking-wide text-foreground">{brandName}</h2>
                <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {brandRows.length} {brandRows.length === 1 ? 'product' : 'products'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-sm">
                  <StyledThead>
                    <tr>
                      <StyledTh>SKU</StyledTh>
                      <StyledTh>Product</StyledTh>
                      <StyledTh right>MRP</StyledTh>
                      <StyledTh right>DP</StyledTh>
                      {TIER_CODES.map((tier) => (
                        <StyledTh key={tier} right>{tier}</StyledTh>
                      ))}
                      <StyledTh right>Stock</StyledTh>
                      <StyledTh>My Note</StyledTh>
                    </tr>
                  </StyledThead>
                  <tbody>
                    {brandRows.map((row) => {
                      const low = isLowStock(row.totalStock);
                      const rowClass = low ? 'bg-red-50/60 hover:bg-red-50 dark:bg-red-950/20' : '';
                      return (
                        <StyledTr key={row.id} className={rowClass}>
                          <StyledTd mono className="font-medium text-xs text-muted-foreground">{row.sku}</StyledTd>
                          <StyledTd className="font-medium text-foreground">{row.name}</StyledTd>
                          <StyledTd right mono>{formatMoney(row.mrp, { paise: false })}</StyledTd>
                          <StyledTd right mono className="font-semibold">{formatMoney(row.dealerPrice, { paise: false })}</StyledTd>
                          {TIER_CODES.map((tier) => (
                            <StyledTd key={tier} right mono>
                              {row.tiers[tier] != null
                                ? formatMoney(row.tiers[tier], { paise: false })
                                : <span className="text-muted-foreground/50">—</span>}
                            </StyledTd>
                          ))}
                          <StyledTd right>
                            <span
                              className={
                                low
                                  ? 'inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300'
                                  : 'inline-flex items-center gap-1 text-foreground'
                              }
                            >
                              {low && <AlertTriangle size={11} aria-hidden />}
                              {row.totalStock}
                            </span>
                          </StyledTd>
                          <StyledTd>
                            <div className="flex items-start gap-2">
                              {row.note ? (
                                <div className="flex-1 min-w-[140px] max-w-[260px]">
                                  <p className="text-xs leading-snug text-foreground line-clamp-2">{row.note.note}</p>
                                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                    Edited {new Date(row.note.updated_at).toLocaleDateString()}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs italic text-muted-foreground">No note</span>
                              )}
                              <IconBtn
                                onClick={() => openNoteDialog(row)}
                                title={row.note ? 'Edit note' : 'Add note'}
                              >
                                {row.note ? <Pencil size={14} /> : <StickyNote size={14} />}
                              </IconBtn>
                            </div>
                          </StyledTd>
                        </StyledTr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </DataCard>
          ))}
        </div>
      )}

      <Dialog open={noteTarget !== null} onOpenChange={(open) => { if (!open) closeNoteDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{noteTarget?.note ? 'Edit note' : 'Add note'}</DialogTitle>
            <DialogDescription>
              {noteTarget ? `${noteTarget.brandName} · ${noteTarget.name} (${noteTarget.sku})` : ''}
              <br />
              Visible only to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder="e.g. Customer XYZ prefers DP-17. Promo running till 15-Jun."
              maxLength={NOTE_LIMIT}
              rows={5}
              className="resize-none"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Max {NOTE_LIMIT} characters</span>
              <span>{noteDraft.length}/{NOTE_LIMIT}</span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            {noteTarget?.note && (
              <Button
                type="button"
                variant="ghost"
                onClick={deleteNote}
                disabled={savingNote}
                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
              >
                <Trash2 size={14} className="mr-1.5" />
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={closeNoteDialog} disabled={savingNote}>Cancel</Button>
            <Button type="button" onClick={saveNote} disabled={savingNote || !noteDraft.trim()}>
              {savingNote ? 'Saving…' : 'Save note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
