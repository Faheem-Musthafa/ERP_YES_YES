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

export const StockAdjustment = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [recentAdjustments, setRecentAdjustments] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [type, setType] = useState<'Addition' | 'Subtraction'>('Addition');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    const [{ data: prod }, { data: adj }] = await Promise.all([
      supabase.from('products').select('id, name, sku, stock_qty, brands(name)').eq('is_active', true).order('name'),
      supabase.from('stock_adjustments').select('id, quantity, type, reason, created_at, products(name, sku)').order('created_at', { ascending: false }).limit(20),
    ]);
    setProducts(prod ?? []);
    setRecentAdjustments(adj ?? []);
  };
  useEffect(() => { fetchData(); }, []);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !quantity || !reason) { toast.error('All fields required'); return; }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) { toast.error('Quantity must be greater than zero'); return; }
    if (!selectedProduct) return;
    const newStock = type === 'Addition' ? selectedProduct.stock_qty + qty : selectedProduct.stock_qty - qty;
    if (newStock < 0) { toast.error('Stock cannot go below 0'); return; }
    if (type === 'Subtraction') {
      const confirmSubtraction = window.confirm(`You are reducing stock by ${qty} for ${selectedProduct.name}. Continue?`);
      if (!confirmSubtraction) return;
    }
    setSaving(true);
    try {
      const { data: adjData, error: adjErr } = await supabase.from('stock_adjustments').insert({ product_id: selectedProductId, quantity: qty, type, reason, adjusted_by: user?.id ?? null }).select('id').single();
      if (adjErr) throw adjErr;
      const { error: stockErr } = await supabase.from('products').update({ stock_qty: newStock }).eq('id', selectedProductId);
      if (stockErr) {
        // Rollback: delete the adjustment record if stock update failed
        await supabase.from('stock_adjustments').delete().eq('id', adjData.id);
        throw stockErr;
      }
      toast.success(`Stock ${type === 'Addition' ? 'increased' : 'decreased'} by ${qty}. New stock: ${newStock}`);
      setSelectedProductId(''); setQuantity(''); setReason('');
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
                    <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku}) — Stock: {p.stock_qty}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {selectedProduct && <p className="text-sm text-teal-700 bg-teal-50 p-3 rounded">Current stock: <strong>{selectedProduct.stock_qty} units</strong></p>}
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
                    <p className="text-xs text-gray-600">New stock: {type === 'Addition' ? selectedProduct.stock_qty + Number(quantity) : Math.max(0, selectedProduct.stock_qty - Number(quantity))} units</p>
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
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-3 py-2 font-medium text-xs">{p.name}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{(p.brands as any)?.name}</td>
                        <td className={`px-3 py-2 text-right font-bold text-xs ${p.stock_qty <= 5 ? 'text-amber-600' : ''}`}>{p.stock_qty}</td>
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
                    <td className="px-4 py-3 font-semibold">{(a.products as any)?.name}</td>
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
