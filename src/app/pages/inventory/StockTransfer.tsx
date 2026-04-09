import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { ArrowRightLeft, History } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import { DataCard, EmptyState, FormSection, PageHeader, SearchBar } from '@/app/components/ui/primitives';
import type { GodownEnum } from '@/app/types/database';

interface ProductWithStock {
  id: string;
  name: string;
  sku: string;
  brands: { name: string } | null;
  kottakkal_stock: number;
  chenakkal_stock: number;
  total_stock: number;
}

interface TransferRow {
  id: string;
  quantity: number;
  from_location: GodownEnum;
  to_location: GodownEnum;
  reason: string | null;
  created_at: string;
  products: { name: string; sku: string } | null;
}

export const StockTransfer = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [recentTransfers, setRecentTransfers] = useState<TransferRow[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [fromLocation, setFromLocation] = useState<GodownEnum>('Kottakkal');
  const [toLocation, setToLocation] = useState<GodownEnum>('Chenakkal');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      const [{ data: prod, error: prodError }, { data: transfers, error: transferError }] = await Promise.all([
        supabase.from('products').select('id, name, sku, brands(name)').eq('is_active', true).order('name'),
        supabase
          .from('stock_transfers')
          .select('id, quantity, from_location, to_location, reason, created_at, products(name, sku)')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (prodError) throw prodError;
      if (transferError) throw transferError;

      const productIds = (prod ?? []).map(p => p.id);
      const { data: stockData, error: stockError } = await supabase
        .from('product_stock_locations')
        .select('product_id, location, stock_qty')
        .in('product_id', productIds);

      if (stockError) throw stockError;

      const productsWithStock: ProductWithStock[] = (prod ?? []).map(p => {
        const kottakkalStock = stockData?.find(s => s.product_id === p.id && s.location === 'Kottakkal');
        const chenakkalStock = stockData?.find(s => s.product_id === p.id && s.location === 'Chenakkal');
        const kottakkal_stock = kottakkalStock?.stock_qty ?? 0;
        const chenakkal_stock = chenakkalStock?.stock_qty ?? 0;

        return {
          ...p,
          kottakkal_stock,
          chenakkal_stock,
          total_stock: kottakkal_stock + chenakkal_stock,
        };
      });

      setProducts(productsWithStock);
      setRecentTransfers((transfers ?? []) as TransferRow[]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load data');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const fromStock = selectedProduct
    ? fromLocation === 'Kottakkal'
      ? selectedProduct.kottakkal_stock
      : selectedProduct.chenakkal_stock
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !quantity || !fromLocation || !toLocation) {
      toast.error('All fields required');
      return;
    }
    if (fromLocation === toLocation) {
      toast.error('From and To locations must be different');
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }
    if (!selectedProduct) return;
    if (qty > fromStock) {
      toast.error(`Insufficient stock at ${fromLocation}. Available: ${fromStock}`);
      return;
    }

    const confirmTransfer = window.confirm(
      `Transfer ${qty} units of ${selectedProduct.name} from ${fromLocation} to ${toLocation}?`
    );
    if (!confirmTransfer) return;

    setSaving(true);
    try {
      const { error: transferErr } = await supabase.rpc('transfer_stock', {
        p_product_id: selectedProductId,
        p_from_location: fromLocation,
        p_to_location: toLocation,
        p_quantity: qty,
        p_reason: reason || null,
        p_user_id: user?.id ?? null,
      });

      if (transferErr) throw transferErr;

      toast.success(
        `Successfully transferred ${qty} units from ${fromLocation} to ${toLocation}`
      );
      setSelectedProductId('');
      setQuantity('');
      setReason('');
      setFromLocation('Kottakkal');
      setToLocation('Chenakkal');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Transfer failed');
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter(
    p =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const swapLocations = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Transfer"
        subtitle="Transfer stock between Kottakkal and Chenakkal locations"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DataCard className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormSection
              title="New Transfer"
              subtitle="Transfer stock from one location to another"
            >
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Product *</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.sku}) — K: {p.kottakkal_stock} | C: {p.chenakkal_stock}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedProduct && (
                  <div className="text-sm bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="font-semibold text-blue-900 mb-1">Current Stock Levels:</p>
                    <div className="grid grid-cols-2 gap-2 text-blue-700">
                      <div>
                        Kottakkal: <strong>{selectedProduct.kottakkal_stock} units</strong>
                      </div>
                      <div>
                        Chenakkal: <strong>{selectedProduct.chenakkal_stock} units</strong>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
                  <div className="space-y-2">
                    <Label>From Location *</Label>
                    <Select
                      value={fromLocation}
                      onValueChange={(v) => setFromLocation(v as GodownEnum)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kottakkal">Kottakkal</SelectItem>
                        <SelectItem value="Chenakkal">Chenakkal</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedProduct && (
                      <p className="text-xs text-gray-600">
                        Available: {fromStock} units
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="mb-5"
                    onClick={swapLocations}
                    title="Swap locations"
                  >
                    <ArrowRightLeft size={16} />
                  </Button>
                  <div className="space-y-2">
                    <Label>To Location *</Label>
                    <Select
                      value={toLocation}
                      onValueChange={(v) => setToLocation(v as GodownEnum)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kottakkal">Kottakkal</SelectItem>
                        <SelectItem value="Chenakkal">Chenakkal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    min="1"
                    max={fromStock}
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                    required
                  />
                  {selectedProduct && quantity && (
                    <p className="text-xs text-gray-600">
                      After transfer: {fromLocation} will have {Math.max(0, fromStock - Number(quantity))} units
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Reason (Optional)</Label>
                  <Textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Reason for transfer"
                    rows={3}
                  />
                </div>
                <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row gap-3">
                  <Button
                    type="submit"
                    className="w-full sm:w-auto rounded-xl bg-[#34b0a7] hover:bg-[#2a9d94]"
                    disabled={saving}
                  >
                    {saving ? 'Transferring...' : 'Transfer Stock'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto rounded-xl"
                    onClick={() => {
                      setSelectedProductId('');
                      setQuantity('');
                      setReason('');
                      setFromLocation('Kottakkal');
                      setToLocation('Chenakkal');
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
            action={
              <SearchBar
                placeholder="Search products..."
                value={search}
                onChange={setSearch}
                className="w-full sm:w-56"
              />
            }
          >
            {filtered.length === 0 ? (
              <EmptyState
                icon={ArrowRightLeft}
                message="No products match your search"
                sub="Try a different product name or SKU."
              />
            ) : (
              <div className="overflow-y-auto max-h-80">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Product
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Kottakkal
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Chenakkal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-3 py-2 font-medium text-xs">{p.name}</td>
                        <td
                          className={`px-3 py-2 text-right font-bold text-xs ${
                            p.kottakkal_stock <= 5 ? 'text-amber-600' : ''
                          }`}
                        >
                          {p.kottakkal_stock}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-bold text-xs ${
                            p.chenakkal_stock <= 5 ? 'text-amber-600' : ''
                          }`}
                        >
                          {p.chenakkal_stock}
                        </td>
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
        <h3 className="text-base font-bold text-gray-800 mb-4">Recent Transfers</h3>
        {recentTransfers.length === 0 ? (
          <EmptyState
            icon={History}
            message="No transfers recorded yet"
            sub="Completed stock transfers will be listed here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Product
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    From
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    To
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Qty
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Reason
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentTransfers.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold">
                      {(t.products as { name: string } | null)?.name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        {t.from_location}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                        {t.to_location}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{t.quantity}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{t.reason || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
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
