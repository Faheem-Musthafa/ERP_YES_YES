import React, { useState, useEffect } from 'react';
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
    { title: 'Total Products', value: stats.totalProducts, icon: <Package size={20} className="text-teal-600" />, iconBg: 'bg-teal-100 text-teal-600', border: 'border-l-4 border-l-teal-500' },
    { title: 'Total Stock Units', value: stats.totalStock, icon: <BarChart2 size={20} className="text-emerald-600" />, iconBg: 'bg-emerald-100 text-emerald-600', border: 'border-l-4 border-l-emerald-500' },
    { title: 'Low Stock Items', value: stats.lowStock, icon: <AlertTriangle size={20} className="text-amber-600" />, iconBg: 'bg-amber-100 text-amber-600', border: 'border-l-4 border-l-amber-500' },
    { title: 'Out of Stock', value: stats.outOfStock, icon: <TrendingDown size={20} className="text-red-600" />, iconBg: 'bg-red-100 text-red-600', border: 'border-l-4 border-l-red-500' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Inventory Reports</h1>
        <p className="text-gray-500 mt-1 text-sm">Inventory analytics and stock adjustment history</p>
      </div>
      {loading ? <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-[#34b0a7] border-t-transparent rounded-full animate-spin" /></div> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map((c, i) => (
              <div key={i} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${c.border}`}>
                <div className={`p-2.5 rounded-xl inline-flex mb-3 ${c.iconBg}`}>{c.icon}</div>
                <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wide">{c.title}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Recent Stock Adjustments</h3>
            {adjustmentHistory.length === 0 ? <p className="text-gray-400 text-sm">No adjustments recorded yet.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Product</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Qty Change</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {adjustmentHistory.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-4 py-3 font-semibold">{(a.products as any)?.name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${a.type === 'Addition' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{a.type}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold">{a.type === 'Addition' ? '+' : '-'}{a.quantity}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(a.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
