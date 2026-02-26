import React from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Search, Eye } from 'lucide-react';

export const Brands = () => {
  const brands = [
    { id: 1, name: 'Brand A', totalProducts: 45, activeProducts: 42, status: 'Active' },
    { id: 2, name: 'Brand B', totalProducts: 38, activeProducts: 35, status: 'Active' },
    { id: 3, name: 'Brand C', totalProducts: 52, activeProducts: 48, status: 'Active' },
    { id: 4, name: 'Brand D', totalProducts: 29, activeProducts: 27, status: 'Active' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Brands Management</h1>
        <p className="text-gray-600 mt-1">View and manage product brands</p>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Search brands..."
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-700 p-3">Brand Name</th>
                <th className="text-center text-xs font-semibold text-gray-700 p-3">Total Products</th>
                <th className="text-center text-xs font-semibold text-gray-700 p-3">Active Products</th>
                <th className="text-center text-xs font-semibold text-gray-700 p-3">Status</th>
                <th className="text-center text-xs font-semibold text-gray-700 p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-sm font-medium text-gray-900">{brand.name}</td>
                  <td className="p-3 text-sm text-center">{brand.totalProducts}</td>
                  <td className="p-3 text-sm text-center">{brand.activeProducts}</td>
                  <td className="p-3 text-center">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {brand.status}
                    </span>
                  </td>
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
      </Card>
    </div>
  );
};
