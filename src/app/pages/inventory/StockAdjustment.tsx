import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { AlertTriangle, Boxes, History } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import { DataCard, EmptyState, FormSection, PageHeader, SearchBar } from '@/app/components/ui/primitives';
import type { GodownEnum } from '@/app/types/database';
import { DEFAULT_MASTER_DATA_SETTINGS, loadMasterDataSettings } from '@/app/settings';

interface ProductWithStock {
  id: string;
  name: string;
  sku: string;
  brands: { name: string } | null;
  locationStocks: Record<string, number>;
  total_stock: number;
}

interface AdjustmentRow {
  id: string;
  quantity: number;
  type: 'Addition' | 'Subtraction';
  reason: string | null;
  created_at: string;
  products: { name: string; sku: string } | null;
}

export const StockAdjustment = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [recentAdjustments, setRecentAdjustments] = useState<AdjustmentRow[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [locationOptions, setLocationOptions] = useState<string[]>(DEFAULT_MASTER_DATA_SETTINGS.godowns);
  const [quantity, setQuantity] = useState('');
  const [type, setType] = useState<'Addition' | 'Subtraction'>('Addition');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      const [settings, { data: prod, error: prodError }, { data: adj, error: adjError }] = await Promise.all([
        loadMasterDataSettings().catch(() => DEFAULT_MASTER_DATA_SETTINGS),
        supabase.from('products').select('id, name, sku, brands(name)').eq('is_active', true).order('name'),
        supabase.from('stock_adjustments').select('id, quantity, type, reason, created_at, products(name, sku)').order('created_at', { ascending: false }).limit(20),
      ]);

      if (prodError) throw prodError;
      if (adjError) throw adjError;

      const productIds = (prod ?? []).map(p => p.id);
      const { data: stockData, error: stockError } = await supabase
        .from('product_stock_locations')
        .select('product_id, location, stock_qty')
        .in('product_id', productIds);

      if (stockError) throw stockError;

      const configuredLocations = Array.from(
        new Set(
          settings.godowns
            .map((location) => location.trim())
            .filter((location) => location.length > 0),
        ),
      );
      const detectedLocations = Array.from(
        new Set(
          (stockData ?? [])
            .map((row: any) => (typeof row.location === 'string' ? row.location.trim() : ''))
            .filter((value: string) => value.length > 0),
        ),
      );
      const nextLocationOptions = configuredLocations.length > 0
        ? configuredLocations
        : detectedLocations;
      setLocationOptions(nextLocationOptions);
      setSelectedLocation((current) => {
        if (current && nextLocationOptions.includes(current)) return current;
        return nextLocationOptions[0] || '';
      });

      const stockByProduct = new Map<string, Record<string, number>>();
      (stockData ?? []).forEach((row: any) => {
        const location = typeof row.location === 'string' ? row.location.trim() : '';
        if (!location) return;
        const existing = stockByProduct.get(row.product_id) ?? {};
        existing[location] = row.stock_qty ?? 0;
        stockByProduct.set(row.product_id, existing);
      });

      const productsWithStock: ProductWithStock[] = (prod ?? []).map(p => {
        const locationStocks = stockByProduct.get(p.id) ?? {};
        const total_stock = nextLocationOptions.reduce(
          (sum, location) => sum + (locationStocks[location] ?? 0),
          0,
        );
        
        return {
          ...p,
          locationStocks,
          total_stock,
        };
      });

      setProducts(productsWithStock);
      setRecentAdjustments((adj ?? []) as AdjustmentRow[]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load data');
    }
  };
  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (selectedLocation && !locationOptions.includes(selectedLocation)) {
      setSelectedLocation('');
    }
  }, [selectedLocation, locationOptions]);

  const getLocationStock = (product: ProductWithStock, location: string) =>
    product.locationStocks[location] ?? 0;

  const formatProductLocationSummary = (product: ProductWithStock) =>
    locationOptions.map((location) => `${location}: ${getLocationStock(product, location)}`).join(' | ');

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const currentLocationStock = selectedProduct 
    ? getLocationStock(selectedProduct, selectedLocation)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !quantity || !reason || !selectedLocation) { 
      toast.error('All fields required'); 
      return; 
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) { toast.error('Quantity must be greater than zero'); return; }
    if (!selectedProduct) return;
    if (type === 'Subtraction') {
      const confirmSubtraction = window.confirm(`You are reducing stock by ${qty} for ${selectedProduct.name} at ${selectedLocation}. Continue?`);
      if (!confirmSubtraction) return;
    }
    setSaving(true);
    try {
      const { data: adjustmentId, error: adjustmentErr } = await supabase.rpc('create_stock_adjustment_atomic', {
        p_product_id: selectedProductId,
        p_location: selectedLocation as GodownEnum,
        p_quantity: qty,
        p_type: type,
        p_reason: reason,
        p_user_id: user?.id ?? null,
      });

      if (adjustmentErr) throw adjustmentErr;

      toast.success(`Stock ${type === 'Addition' ? 'increased' : 'decreased'} by ${qty} at ${selectedLocation}. Adjustment ${adjustmentId ? 'saved' : 'applied'}.`);
      setSelectedProductId(''); 
      setQuantity(''); 
      setReason('');
      setSelectedLocation((current) => {
        if (current && locationOptions.includes(current)) return current;
        return locationOptions[0] || '';
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Adjustment failed');
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Adjustment"
        subtitle="Manually adjust product stock levels"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DataCard className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormSection
              title="New Adjustment"
              subtitle="All fields marked with * are mandatory. Subtractions require confirmation."
            >
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Product *</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku}) — {formatProductLocationSummary(p)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {selectedProduct && (
                  <div className="text-sm bg-teal-50 p-3 rounded border border-teal-200">
                    <p className="font-semibold text-teal-900 mb-1">Current Stock Levels:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-teal-700">
                      {locationOptions.map((location) => (
                        <div key={location}>{location}: <strong>{getLocationStock(selectedProduct, location)} units</strong></div>
                      ))}
                    </div>
                    <div className="mt-1 pt-1 border-t border-teal-200">
                      Total: <strong>{selectedProduct.total_stock} units</strong>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Location *</Label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                          {selectedProduct ? ` (Current: ${getLocationStock(selectedProduct, location)})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Adjustment Type *</Label>
                  <Select value={type} onValueChange={v => setType(v as 'Addition' | 'Subtraction')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Addition">Addition (increase stock)</SelectItem>
                      <SelectItem value="Subtraction">Subtraction (decrease stock)</SelectItem>
                    </SelectContent>
                  </Select>
                  {type === 'Subtraction' && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <span>Subtraction is a destructive action and will ask for final confirmation on submit.</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Enter quantity" required />
                  {selectedProduct && quantity && (
                    <p className="text-xs text-gray-600">
                      New stock at {selectedLocation}: {type === 'Addition' ? currentLocationStock + Number(quantity) : Math.max(0, currentLocationStock - Number(quantity))} units
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Reason *</Label>
                  <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for adjustment" rows={3} required />
                </div>
                <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row gap-3">
                  <Button type="submit" className={`w-full sm:w-auto rounded-xl ${type === 'Subtraction' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#34b0a7] hover:bg-[#2a9d94]'}`} disabled={saving}>
                    {saving ? 'Saving...' : type === 'Subtraction' ? 'Confirm Subtraction' : 'Apply Adjustment'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto rounded-xl"
                    onClick={() => {
                      setSelectedProductId('');
                      setQuantity('');
                      setReason('');
                      setType('Addition');
                      setSelectedLocation(locationOptions[0] || '');
                    }}
                  >
                    Reset Form
                  </Button>
                </div>
              </div>
            </FormSection>
          </form>
        </DataCard>

        <DataCard className="p-6">
          <FormSection
            title="Current Stock Levels"
            action={(
              <SearchBar
                placeholder="Search products..."
                value={search}
                onChange={setSearch}
                className="w-full sm:w-56"
              />
            )}
          >
            {filtered.length === 0 ? (
              <EmptyState
                icon={Boxes}
                message="No products match your search"
                sub="Try a different product name or SKU."
              />
            ) : (
              <div className="overflow-y-auto max-h-80">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Product</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Brand</th>
                      {locationOptions.map((location) => (
                        <th key={location} className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">{location}</th>
                      ))}
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-3 py-2 font-medium text-xs">{p.name}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{p.brands?.name}</td>
                        {locationOptions.map((location) => {
                          const locationQty = getLocationStock(p, location);
                          return (
                            <td key={location} className={`px-3 py-2 text-right font-bold text-xs ${locationQty <= 5 ? 'text-amber-600' : ''}`}>{locationQty}</td>
                          );
                        })}
                        <td className={`px-3 py-2 text-right font-bold text-xs ${p.total_stock <= 5 ? 'text-amber-600' : 'text-emerald-700'}`}>{p.total_stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </FormSection>
        </DataCard>
      </div>

      <DataCard className="p-6">
        <h3 className="text-base font-bold text-gray-800 mb-4">Recent Adjustments</h3>
        {recentAdjustments.length === 0 ? (
          <EmptyState
            icon={History}
            message="No adjustments recorded yet"
            sub="Completed stock adjustments will be listed here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Product</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Qty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Reason</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentAdjustments.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold">{(a.products as { name: string } | null)?.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${a.type === 'Addition' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{a.type}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{a.quantity}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{a.reason}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(a.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>
    </div>
  );
};
