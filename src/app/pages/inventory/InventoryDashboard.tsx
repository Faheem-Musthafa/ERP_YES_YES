import React, { useState, useEffect } from 'react';
import { Package, CheckCircle, AlertTriangle, Tag } from 'lucide-react';
import { supabase } from '@/app/supabase';

export const InventoryDashboard = () => {
  const [stats, setStats] = useState({ totalProducts: 0, inStock: 0, lowStock: 0, totalBrands: 0 });
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: products }, { data: brands }] = await Promise.all([
        supabase.from('products').select('id, name, stock_qty, brands(name)').eq('is_active', true),
        supabase.from('brands').select('id').eq('is_active', true),
      ]);
      if (products) {
        const low = products.filter(p => p.stock_qty <= 5);
        setLowStockItems(low.slice(0, 10));
        setStats({
          totalProducts: products.length,
          inStock: products.filter(p => p.stock_qty > 5).length,
          lowStock: low.length,
          totalBrands: (brands ?? []).length,
        });
      }
    };
    fetchData();
  }, []);

  const cards = [
    { title: 'Total Products', value: stats.totalProducts, icon: <Package className="text-teal-600" size={24} />, bg: 'bg-teal-50' },
    { title: 'In Stock', value: stats.inStock, icon: <CheckCircle className="text-green-600" size={24} />, bg: 'bg-green-50' },
    { title: 'Low Stock Alerts', value: stats.lowStock, icon: <AlertTriangle className="text-teal-600" size={24} />, bg: 'bg-teal-50' },
    { title: 'Total Brands', value: stats.totalBrands, icon: <Tag className="text-purple-600" size={24} />, bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Inventory Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">Overview of stock levels and inventory health</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Products', value: stats.totalProducts, icon: <Package className="text-teal-600" size={20} />, bg: 'bg-teal-50', border: 'border-l-4 border-l-teal-500' },
          { title: 'In Stock', value: stats.inStock, icon: <CheckCircle className="text-emerald-600" size={20} />, bg: 'bg-emerald-50', border: 'border-l-4 border-l-emerald-500' },
          { title: 'Low Stock Alerts', value: stats.lowStock, icon: <AlertTriangle className="text-amber-600" size={20} />, bg: 'bg-amber-50', border: 'border-l-4 border-l-amber-500' },
          { title: 'Total Brands', value: stats.totalBrands, icon: <Tag className="text-purple-600" size={20} />, bg: 'bg-purple-50', border: 'border-l-4 border-l-purple-500' },
        ].map((c, i) => (
          <div key={i} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${c.border}`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${c.bg}`}>{c.icon}</div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wide">{c.title}</p>
          </div>
        ))}
      </div>

      {/* Low Stock Table */}
      {lowStockItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <AlertTriangle size={15} className="text-amber-500" /> Items Requiring Attention
            <span className="ml-auto text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{lowStockItems.length} items</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Brand</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Stock</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lowStockItems.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{(p.brands as any)?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-gray-800">{p.stock_qty}</span>
                      <span className="text-gray-400 text-xs"> units</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.stock_qty === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {p.stock_qty === 0 ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

