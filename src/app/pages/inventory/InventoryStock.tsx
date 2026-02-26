import React, { useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Search, Save } from 'lucide-react';
import { toast } from 'sonner';

interface StockItem {
  brand: string;
  product: string;
  sku: string;
  stock: number;
  dp: number;
  lastUpdated: string;
}

export const InventoryStock = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([
    {
      brand: 'Brand A',
      product: 'Product 1',
      sku: 'SKU-1001',
      stock: 150,
      dp: 5500,
      lastUpdated: '2026-01-18',
    },
    {
      brand: 'Brand A',
      product: 'Product 2',
      sku: 'SKU-1002',
      stock: 75,
      dp: 3200,
      lastUpdated: '2026-01-18',
    },
    {
      brand: 'Brand B',
      product: 'Product 3',
      sku: 'SKU-1003',
      stock: 5,
      dp: 8900,
      lastUpdated: '2026-01-17',
    },
    {
      brand: 'Brand B',
      product: 'Product 4',
      sku: 'SKU-1004',
      stock: 200,
      dp: 12500,
      lastUpdated: '2026-01-17',
    },
    {
      brand: 'Brand C',
      product: 'Product 5',
      sku: 'SKU-1005',
      stock: 30,
      dp: 4500,
      lastUpdated: '2026-01-16',
    },
    {
      brand: 'Brand C',
      product: 'Product 6',
      sku: 'SKU-1006',
      stock: 8,
      dp: 7800,
      lastUpdated: '2026-01-16',
    },
    {
      brand: 'Brand D',
      product: 'Product 7',
      sku: 'SKU-1007',
      stock: 120,
      dp: 15000,
      lastUpdated: '2026-01-15',
    },
    {
      brand: 'Brand D',
      product: 'Product 8',
      sku: 'SKU-1008',
      stock: 3,
      dp: 9500,
      lastUpdated: '2026-01-15',
    },
  ]);

  const [editingStock, setEditingStock] = useState<{ [key: string]: number }>({});
  const [changedStock, setChangedStock] = useState<{ [key: string]: boolean }>({});

  const handleStockChange = (sku: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setEditingStock(prev => ({ ...prev, [sku]: numValue }));
    setChangedStock(prev => ({ ...prev, [sku]: true }));
  };

  const handleSaveStock = (sku: string) => {
    setStockItems(prev =>
      prev.map(item =>
        item.sku === sku
          ? {
              ...item,
              stock: editingStock[sku] !== undefined ? editingStock[sku] : item.stock,
              lastUpdated: new Date().toISOString().split('T')[0],
            }
          : item
      )
    );

    setChangedStock(prev => ({ ...prev, [sku]: false }));
    toast.success('Stock quantity updated successfully');
  };

  const getStockBadge = (stock: number) => {
    if (stock < 10) {
      return <Badge className="bg-red-100 text-red-700">Low Stock</Badge>;
    } else if (stock < 50) {
      return <Badge className="bg-orange-100 text-orange-700">Medium</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-700">In Stock</Badge>;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Stock Management</h1>
        <p className="text-gray-600 mt-1">View and update inventory stock levels</p>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Search by product, brand, or SKU..."
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Available Stock</TableHead>
              <TableHead className="text-right">DP (₹)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockItems.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{item.brand}</TableCell>
                <TableCell>{item.product}</TableCell>
                <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={editingStock[item.sku] !== undefined ? editingStock[item.sku] : item.stock}
                      onChange={(e) => handleStockChange(item.sku, e.target.value)}
                      className="w-28 hover:bg-blue-50"
                    />
                    <span className="text-sm text-gray-600">units</span>
                    {changedStock[item.sku] && (
                      <Button
                        size="sm"
                        onClick={() => handleSaveStock(item.sku)}
                        className="h-9 w-9 p-0 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Save size={16} />
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-semibold text-gray-900">₹ {item.dp.toLocaleString('en-IN')}</span>
                </TableCell>
                <TableCell>{getStockBadge(item.stock)}</TableCell>
                <TableCell>{new Date(item.lastUpdated).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Stock</p>
              <p className="text-2xl font-semibold text-gray-900">4</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-semibold">50+</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Medium Stock</p>
              <p className="text-2xl font-semibold text-gray-900">1</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 font-semibold">10-49</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-semibold text-gray-900">3</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-semibold">&lt;10</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
