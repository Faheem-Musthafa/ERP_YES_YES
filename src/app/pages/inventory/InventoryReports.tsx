import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { BarChart2, Package, AlertTriangle, TrendingDown } from 'lucide-react';
import { supabase } from '@/app/supabase';

export const InventoryReports = () => {
  const [stats, setStats] = useState({ totalProducts: 0, totalStock: 0, lowStock: 0, outOfStock: 0, totalBrands: 0, adjustments: 0 });
  const [adjustmentHistory, setAdjustmentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [{ data: products }, { data: brands }, { data: adjustments }] = await Promise.all([
        supabase.from('products').select('id, stock_qty').eq('is_active', true),
        supabase.from('brands').select('id').eq('is_active', true),
        supabase.from('stock_adjustments').select('id, quantity, type, created_at, products(name)').order('created_at', { ascending: false }).limit(10),
      ]);
      if (products) {
        setStats({
          totalProducts: products.length,
          totalStock: products.reduce((s, p) => s + p.stock_qty, 0),
          lowStock: products.filter(p => p.stock_qty > 0 && p.stock_qty <= 5).length,
          outOfStock: products.filter(p => p.stock_qty === 0).length,
          totalBrands: (brands ?? []).length,
          adjustments: (adjustments ?? []).length,
        });
        setAdjustmentHistory(adjustments ?? []);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const summaryCards = [
    { title: 'Total Products', value: stats.totalProducts, icon: <Package size={24} className="text-teal-600" />, bg: 'bg-teal-50' },
    { title: 'Total Stock Units', value: stats.totalStock, icon: <BarChart2 size={24} className="text-green-600" />, bg: 'bg-green-50' },
    { title: 'Low Stock Items', value: stats.lowStock, icon: <AlertTriangle size={24} className="text-teal-600" />, bg: 'bg-teal-50' },
    { title: 'Out of Stock', value: stats.outOfStock, icon: <TrendingDown size={24} className="text-red-600" />, bg: 'bg-red-50' },
  ];

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-semibold text-gray-900">Inventory Reports</h1><p className="text-gray-600 mt-1">Inventory analytics and stock adjustment history</p></div>
      {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {summaryCards.map((c, i) => (
              <Card key={i} className="p-6">
                <div className="flex items-start justify-between">
                  <div><p className="text-sm text-gray-600 mb-1">{c.title}</p><p className="text-3xl font-bold text-gray-900">{c.value}</p></div>
                  <div className={`p-3 rounded-lg ${c.bg}`}>{c.icon}</div>
                </div>
              </Card>
            ))}
          </div>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Stock Adjustments</h3>
            {adjustmentHistory.length === 0 ? <p className="text-gray-500 text-sm">No adjustments recorded yet.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3">Product</th>
                      <th className="text-center p-3">Type</th>
                      <th className="text-right p-3">Qty Change</th>
                      <th className="text-left p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjustmentHistory.map(a => (
                      <tr key={a.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{(a.products as any)?.name}</td>
                        <td className="p-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${a.type === 'Addition' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.type}</span>
                        </td>
                        <td className="p-3 text-right font-semibold">{a.type === 'Addition' ? '+' : '-'}{a.quantity}</td>
                        <td className="p-3 text-gray-500">{new Date(a.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
