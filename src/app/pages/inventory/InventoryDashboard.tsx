import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
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
    { title: 'Total Products', value: stats.totalProducts, icon: <Package className="text-blue-600" size={24} />, bg: 'bg-blue-50' },
    { title: 'In Stock', value: stats.inStock, icon: <CheckCircle className="text-green-600" size={24} />, bg: 'bg-green-50' },
    { title: 'Low Stock Alerts', value: stats.lowStock, icon: <AlertTriangle className="text-orange-600" size={24} />, bg: 'bg-orange-50' },
    { title: 'Total Brands', value: stats.totalBrands, icon: <Tag className="text-purple-600" size={24} />, bg: 'bg-purple-50' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Inventory Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of stock and inventory health</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {cards.map((c, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-start justify-between">
              <div><p className="text-sm text-gray-600 mb-1">{c.title}</p><p className="text-3xl font-bold text-gray-900">{c.value}</p></div>
              <div className={`p-3 rounded-lg ${c.bg}`}>{c.icon}</div>
            </div>
          </Card>
        ))}
      </div>
      {lowStockItems.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><AlertTriangle size={20} className="text-orange-500" />Items Requiring Attention</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3">Product</th>
                  <th className="text-left p-3">Brand</th>
                  <th className="text-right p-3">Stock</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3 text-gray-600">{(p.brands as any)?.name ?? '-'}</td>
                    <td className="p-3 text-right font-semibold">{p.stock_qty} units</td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${p.stock_qty === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {p.stock_qty === 0 ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
