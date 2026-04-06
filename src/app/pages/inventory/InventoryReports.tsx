import React, { useState, useEffect, useCallback } from 'react';
import { BarChart2, Package, AlertTriangle, TrendingDown } from 'lucide-react';
import { supabase } from '@/app/supabase';
import {
  PageHeader, DataCard, StyledThead, StyledTh, StyledTr, StyledTd,
  Spinner, EmptyState, StatusBadge, ErrorState,
} from '@/app/components/ui/primitives';

export const InventoryReports = () => {
  const [stats, setStats] = useState({ totalProducts: 0, totalStock: 0, lowStock: 0, outOfStock: 0, totalBrands: 0, adjustments: 0 });
  const [adjustmentHistory, setAdjustmentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    const [{ data: products, error: productsError }, { data: brands, error: brandsError }, { data: adjustments, error: adjustmentsError }] = await Promise.all([
      supabase.from('products').select('id, stock_qty').eq('is_active', true),
      supabase.from('brands').select('id').eq('is_active', true),
      supabase.from('stock_adjustments').select('id, quantity, type, created_at, products(name)').order('created_at', { ascending: false }).limit(10),
    ]);
    if (productsError || brandsError || adjustmentsError) {
      setError(productsError?.message || brandsError?.message || adjustmentsError?.message || 'Unable to load inventory reports');
    } else if (products) {
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
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const summaryCards = [
    { title: 'Total Products', value: stats.totalProducts, icon: <Package size={20} className="text-teal-600" />, iconBg: 'bg-teal-100 text-teal-600', border: 'border-l-4 border-l-teal-500' },
    { title: 'Total Stock Units', value: stats.totalStock, icon: <BarChart2 size={20} className="text-emerald-600" />, iconBg: 'bg-emerald-100 text-emerald-600', border: 'border-l-4 border-l-emerald-500' },
    { title: 'Low Stock Items', value: stats.lowStock, icon: <AlertTriangle size={20} className="text-amber-600" />, iconBg: 'bg-amber-100 text-amber-600', border: 'border-l-4 border-l-amber-500' },
    { title: 'Out of Stock', value: stats.outOfStock, icon: <TrendingDown size={20} className="text-red-600" />, iconBg: 'bg-red-100 text-red-600', border: 'border-l-4 border-l-red-500' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory Reports"
        subtitle="Inventory analytics and stock adjustment history"
      />
      {loading ? <Spinner /> : error ? (
        <DataCard>
          <ErrorState message={error} onRetry={() => void fetchData()} />
        </DataCard>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map((c, i) => (
              <DataCard key={i} className={`p-5 ${c.border}`}>
                <div className={`p-2.5 rounded-xl inline-flex mb-3 ${c.iconBg}`}>{c.icon}</div>
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
                <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wide">{c.title}</p>
              </DataCard>
            ))}
          </div>
          <DataCard className="p-5">
            <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wide">Recent Stock Adjustments</h3>
            {adjustmentHistory.length === 0 ? (
              <EmptyState icon={Package} message="No adjustments recorded yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <StyledThead>
                    <tr>
                      <StyledTh>Product</StyledTh>
                      <StyledTh center>Type</StyledTh>
                      <StyledTh right>Qty Change</StyledTh>
                      <StyledTh>Date</StyledTh>
                    </tr>
                  </StyledThead>
                  <tbody>
                    {adjustmentHistory.map(a => (
                      <StyledTr key={a.id}>
                        <StyledTd className="font-semibold">{(a.products as { name: string } | null)?.name}</StyledTd>
                        <StyledTd center>
                          <StatusBadge status={a.type === 'Addition' ? 'Approved' : 'Rejected'} className="capitalize" />
                        </StyledTd>
                        <StyledTd right mono className="font-bold">{a.type === 'Addition' ? '+' : '-'}{a.quantity}</StyledTd>
                        <StyledTd mono className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</StyledTd>
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
