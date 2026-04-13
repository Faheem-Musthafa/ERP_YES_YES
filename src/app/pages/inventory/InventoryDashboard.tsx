import React, { useState, useEffect } from 'react';
import { Package, CheckCircle, AlertTriangle, Tag, Boxes } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { loadStockHealthSummary } from '@/app/stockHealth';
import {
  PageHeader, DataCard, StyledThead, StyledTh, StyledTr, StyledTd, EmptyState, Spinner, ErrorState,
} from '@/app/components/ui/primitives';

export const InventoryDashboard = () => {
  const [stats, setStats] = useState({ totalProducts: 0, inStock: 0, lowStock: 0, totalBrands: 0 });
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [stockHealth, { data: brands, error: brandsError }] = await Promise.all([
          loadStockHealthSummary(5, 10),
          supabase.from('brands').select('id').eq('is_active', true),
        ]);
        if (brandsError) throw new Error(brandsError.message);

        setLowStockItems(stockHealth.lowStockItems);
        setStats({
          totalProducts: stockHealth.totalProducts,
          inStock: stockHealth.inStockCount,
          lowStock: stockHealth.lowStockCount,
          totalBrands: (brands ?? []).length,
        });
      } catch (err: any) {
        setError(err?.message || 'Unable to load inventory dashboard');
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Inventory Dashboard"
        subtitle="Overview of stock levels and inventory health"
      />
      {loading ? <Spinner /> : error ? <ErrorState message={error} /> : (
        <>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: stats.totalProducts, icon: <Package size={18} />, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200 hover:border-teal-300' },
          { label: 'In Stock', value: stats.inStock, icon: <CheckCircle size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200 hover:border-emerald-300' },
          { label: 'Low Stock Alerts', value: stats.lowStock, icon: <AlertTriangle size={18} />, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200 hover:border-amber-300' },
          { label: 'Total Brands', value: stats.totalBrands, icon: <Tag size={18} />, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200 hover:border-purple-300' },
        ].map((s, i) => (
          <DataCard key={i} className={`p-5 transition-colors group cursor-default ${s.border}`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-xl ${s.bg} ${s.color} transition-transform group-hover:scale-110`}>{s.icon}</div>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mt-1">{s.label}</p>
          </DataCard>
        ))}
      </div>

      <DataCard className="flex flex-col">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes size={16} className="text-muted-foreground" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">Items Requiring Attention</h3>
          </div>
          {lowStockItems.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {lowStockItems.length} Items
            </span>
          )}
        </div>
        {lowStockItems.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            message="No low stock alerts"
            sub="All active products are above the reorder threshold."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <StyledThead>
                <tr>
                  <StyledTh>Product</StyledTh>
                  <StyledTh>Brand</StyledTh>
                  <StyledTh right>Stock</StyledTh>
                  <StyledTh className="text-center">Status</StyledTh>
                </tr>
              </StyledThead>
              <tbody>
                {lowStockItems.map(p => (
                  <StyledTr key={p.id}>
                    <StyledTd className="font-semibold text-foreground">{p.name}</StyledTd>
                    <StyledTd className="text-muted-foreground">{p.brandName ?? '-'}</StyledTd>
                    <StyledTd right className="font-bold">
                      {p.totalStock}
                      <span className="text-muted-foreground font-normal text-xs ml-1">units</span>
                    </StyledTd>
                    <StyledTd className="text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          p.totalStock === 0
                            ? 'bg-red-50 text-red-700 border-red-200/80'
                            : 'bg-amber-50 text-amber-700 border-amber-200/80'
                        }`}
                      >
                        {p.totalStock === 0 ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </StyledTd>
                  </StyledTr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>
        </>
      )}
    </div>
  );
};
