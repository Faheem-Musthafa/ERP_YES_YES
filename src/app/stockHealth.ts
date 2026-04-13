import { supabase } from '@/app/supabase';

export interface StockHealthItem {
  id: string;
  name: string;
  brandName: string | null;
  totalStock: number;
}

export interface StockHealthSummary {
  totalProducts: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockItems: StockHealthItem[];
}

interface ProductRow {
  id: string;
  name: string;
  brands: { name: string } | null;
}

interface StockRow {
  product_id: string;
  stock_qty: number | null;
}

export const loadStockHealthSummary = async (
  threshold = 5,
  lowStockLimit = 10,
): Promise<StockHealthSummary> => {
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, brands(name)')
    .eq('is_active', true)
    .order('name');

  if (productsError) {
    throw productsError;
  }

  const productRows = (products ?? []) as ProductRow[];
  const productIds = productRows.map((product) => product.id);

  const { data: stockRows, error: stockError } = productIds.length === 0
    ? { data: [] as StockRow[], error: null }
    : await supabase
        .from('product_stock_locations')
        .select('product_id, stock_qty')
        .in('product_id', productIds);

  if (stockError) {
    throw stockError;
  }

  const stockTotals = new Map<string, number>();
  ((stockRows ?? []) as StockRow[]).forEach((row) => {
    stockTotals.set(row.product_id, (stockTotals.get(row.product_id) ?? 0) + (row.stock_qty ?? 0));
  });

  const items: StockHealthItem[] = productRows.map((product) => ({
    id: product.id,
    name: product.name,
    brandName: product.brands?.name ?? null,
    totalStock: stockTotals.get(product.id) ?? 0,
  }));

  const lowStockItems = items
    .filter((item) => item.totalStock <= threshold)
    .sort((left, right) => {
      if (left.totalStock !== right.totalStock) {
        return left.totalStock - right.totalStock;
      }
      return left.name.localeCompare(right.name);
    });

  return {
    totalProducts: items.length,
    inStockCount: items.filter((item) => item.totalStock > threshold).length,
    lowStockCount: lowStockItems.length,
    outOfStockCount: lowStockItems.filter((item) => item.totalStock === 0).length,
    lowStockItems: lowStockItems.slice(0, lowStockLimit),
  };
};
