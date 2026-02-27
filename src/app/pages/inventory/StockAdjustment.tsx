import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Search } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';

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
    if (!selectedProduct) return;
    const newStock = type === 'Addition' ? selectedProduct.stock_qty + qty : selectedProduct.stock_qty - qty;
    if (newStock < 0) { toast.error('Stock cannot go below 0'); return; }
    setSaving(true);
    try {
      await supabase.from('stock_adjustments').insert({ product_id: selectedProductId, quantity: qty, type, reason, adjusted_by: user?.id ?? null });
      await supabase.from('products').update({ stock_qty: newStock }).eq('id', selectedProductId);
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Stock Adjustment</h1>
        <p className="text-gray-600 mt-1">Manually adjust product stock levels</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">New Adjustment</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku}) — Stock: {p.stock_qty}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selectedProduct && <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded">Current stock: <strong>{selectedProduct.stock_qty} units</strong></p>}
            <div className="space-y-2">
              <Label>Adjustment Type *</Label>
              <Select value={type} onValueChange={v => setType(v as 'Addition' | 'Subtraction')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Addition">Addition (increase stock)</SelectItem>
                  <SelectItem value="Subtraction">Subtraction (decrease stock)</SelectItem>
                </SelectContent>
              </Select>
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
            <Button type="submit" className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90" disabled={saving}>{saving ? 'Saving...' : 'Apply Adjustment'}</Button>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Current Stock Levels</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm w-48" />
            </div>
          </div>
          <div className="overflow-y-auto max-h-80">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-2">Product</th>
                  <th className="text-left p-2">Brand</th>
                  <th className="text-right p-2">Stock</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium text-xs">{p.name}</td>
                    <td className="p-2 text-gray-500 text-xs">{(p.brands as any)?.name}</td>
                    <td className={`p-2 text-right font-semibold text-xs ${p.stock_qty <= 5 ? 'text-orange-600' : ''}`}>{p.stock_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Adjustments</h3>
        {recentAdjustments.length === 0 ? <p className="text-gray-500 text-sm">No adjustments recorded yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3">Product</th>
                  <th className="text-center p-3">Type</th>
                  <th className="text-right p-3">Qty</th>
                  <th className="text-left p-3">Reason</th>
                  <th className="text-left p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentAdjustments.map(a => (
                  <tr key={a.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{(a.products as any)?.name}</td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${a.type === 'Addition' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.type}</span>
                    </td>
                    <td className="p-3 text-right font-semibold">{a.quantity}</td>
                    <td className="p-3 text-gray-600 text-xs">{a.reason}</td>
                    <td className="p-3 text-gray-500">{new Date(a.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
