import React, { useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { toast } from 'sonner';

export const StockAdjustment = () => {
  const [adjustmentType, setAdjustmentType] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Stock adjustment recorded successfully');
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Stock Adjustment</h1>
        <p className="text-gray-600 mt-1">Record stock adjustments and corrections</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Adjustment</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Adjustment Type</Label>
              <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Stock Increase</SelectItem>
                  <SelectItem value="decrease">Stock Decrease</SelectItem>
                  <SelectItem value="correction">Stock Correction</SelectItem>
                  <SelectItem value="damage">Damaged Goods</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Product SKU</Label>
              <Input placeholder="Enter SKU" />
            </div>

            <div>
              <Label>Product Name</Label>
              <Input placeholder="Enter product name" disabled />
            </div>

            <div>
              <Label>Current Stock</Label>
              <Input placeholder="0" disabled />
            </div>

            <div>
              <Label>Adjustment Quantity</Label>
              <Input type="number" placeholder="Enter quantity" />
            </div>

            <div>
              <Label>Reason</Label>
              <Input placeholder="Enter reason for adjustment" />
            </div>

            <Button type="submit" className="w-full bg-[#1e3a8a] hover:bg-blue-900">
              Submit Adjustment
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Adjustments</h2>
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">SKU-1001</span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Increase</span>
              </div>
              <p className="text-xs text-gray-600">+50 units - GRN received</p>
              <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">SKU-1003</span>
                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">Decrease</span>
              </div>
              <p className="text-xs text-gray-600">-5 units - Damaged goods</p>
              <p className="text-xs text-gray-500 mt-1">5 hours ago</p>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">SKU-1008</span>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">Correction</span>
              </div>
              <p className="text-xs text-gray-600">Physical count correction</p>
              <p className="text-xs text-gray-500 mt-1">1 day ago</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
