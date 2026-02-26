import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Search, Eye } from 'lucide-react';
import { Badge } from '../../components/ui/badge';

import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';

interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  stock: number;
  dp: number;
  status: string;
}

export const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const data: Product[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
        setProducts(data);
      } catch (err) {
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

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
        <h1 className="text-2xl font-semibold text-gray-900">Products Management</h1>
        <p className="text-gray-600 mt-1">View and manage product inventory</p>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Search products..."
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        {loading ? (
          <div className="text-center text-gray-500">Loading products...</div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">SKU</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">Product Name</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">Brand</th>
                  <th className="text-center text-xs font-semibold text-gray-700 p-3">Stock</th>
                  <th className="text-right text-xs font-semibold text-gray-700 p-3">DP (₹)</th>
                  <th className="text-center text-xs font-semibold text-gray-700 p-3">Status</th>
                  <th className="text-center text-xs font-semibold text-gray-700 p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm font-mono">{product.sku}</td>
                    <td className="p-3 text-sm font-medium">{product.name}</td>
                    <td className="p-3 text-sm">{product.brand}</td>
                    <td className="p-3 text-sm text-center">{product.stock} units</td>
                    <td className="p-3 text-sm text-right font-semibold">₹ {product.dp.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-center">{getStockBadge(product.stock)}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" className="h-8">
                          <Eye size={14} />
                        </Button>
                      </div>
                    </td>
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
