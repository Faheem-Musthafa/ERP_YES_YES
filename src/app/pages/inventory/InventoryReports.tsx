import React, { useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { FileText, Download, Search, FileSpreadsheet, FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface AgingStockRecord {
  sku: string;
  productName: string;
  brand: string;
  purchaseDate: string;
  daysInStock: number;
  availableQuantity: number;
  dp: number;
  stockValue: number;
  agingStatus: 'Aging' | 'Critical Aging';
}

export const InventoryReports = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const agingStockData: AgingStockRecord[] = [
    {
      sku: 'SKU-1008',
      productName: 'Product 8',
      brand: 'Brand D',
      purchaseDate: '2025-07-15',
      daysInStock: 220,
      availableQuantity: 50,
      dp: 4500,
      stockValue: 225000,
      agingStatus: 'Aging',
    },
    {
      sku: 'SKU-1015',
      productName: 'Product 15',
      brand: 'Brand B',
      purchaseDate: '2025-06-01',
      daysInStock: 260,
      availableQuantity: 30,
      dp: 6000,
      stockValue: 180000,
      agingStatus: 'Critical Aging',
    },
    {
      sku: 'SKU-1022',
      productName: 'Product 22',
      brand: 'Brand A',
      purchaseDate: '2025-08-10',
      daysInStock: 195,
      availableQuantity: 80,
      dp: 3200,
      stockValue: 256000,
      agingStatus: 'Aging',
    },
  ];

  const getAgingBadge = (status: string) => {
    if (status === 'Critical Aging') {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Critical Aging</Badge>;
    }
    return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Aging</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  const handleExportExcel = () => {
    toast.success('Exporting Aging Stock Report to Excel...');
  };

  const handleDownloadPDF = () => {
    toast.success('Downloading Aging Stock Report PDF...');
  };

  const filteredAgingData = agingStockData.filter((record) => {
    const matchesSearch =
      record.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand = filterBrand === 'all' || record.brand === filterBrand;

    let matchesDateRange = true;
    if (dateFrom && dateTo) {
      const purchaseDate = new Date(record.purchaseDate);
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      matchesDateRange = purchaseDate >= fromDate && purchaseDate <= toDate;
    }

    return matchesSearch && matchesBrand && matchesDateRange;
  });

  // Calculate summary
  const totalAgingProducts = filteredAgingData.length;
  const totalAgingQuantity = filteredAgingData.reduce((sum, item) => sum + item.availableQuantity, 0);
  const totalAgingStockValue = filteredAgingData.reduce((sum, item) => sum + item.stockValue, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Inventory Reports</h1>
        <p className="text-gray-600 mt-1">Generate and download inventory reports</p>
      </div>

      {/* Quick Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={24} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Stock Summary Report</h3>
              <p className="text-sm text-gray-600 mt-1">Overview of all stock levels by brand and product</p>
              <Button className="mt-4 bg-[#1e3a8a] hover:bg-blue-900">
                <Download size={16} className="mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={24} className="text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Low Stock Alert Report</h3>
              <p className="text-sm text-gray-600 mt-1">Items below minimum stock threshold</p>
              <Button className="mt-4 bg-[#1e3a8a] hover:bg-blue-900">
                <Download size={16} className="mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={24} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Stock Movement Report</h3>
              <p className="text-sm text-gray-600 mt-1">Track stock adjustments and movements</p>
              <Button className="mt-4 bg-[#1e3a8a] hover:bg-blue-900">
                <Download size={16} className="mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={24} className="text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Brand-wise Inventory Report</h3>
              <p className="text-sm text-gray-600 mt-1">Detailed inventory breakdown by brand</p>
              <Button className="mt-4 bg-[#1e3a8a] hover:bg-blue-900">
                <Download size={16} className="mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Aging Stock Report Section */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Aging Stock Report</h2>
          <p className="text-gray-600 mt-1">Products in stock for more than 180 days from purchase date</p>
        </div>

        {/* Info Badge */}
        <div className="mb-6">
          <Badge className="bg-orange-50 text-orange-700 px-3 py-1.5 text-sm hover:bg-orange-50">
            Aging Criteria: Stock older than 180 days
          </Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Total Aging Products</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{totalAgingProducts}</p>
          </Card>
          <Card className="p-4 border-l-4 border-orange-500">
            <p className="text-sm text-gray-600">Total Aging Quantity</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{totalAgingQuantity} units</p>
          </Card>
          <Card className="p-4 border-l-4 border-red-500">
            <p className="text-sm text-gray-600">Total Aging Stock Value</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              ₹ {totalAgingStockValue.toLocaleString('en-IN')}
            </p>
          </Card>
        </div>

        {/* Filter Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Search */}
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Search by SKU / Product / Brand"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filter by Brand */}
          <div>
            <Label className="text-sm text-gray-700 mb-1.5 block">Filter by Brand</Label>
            <Select value={filterBrand} onValueChange={setFilterBrand}>
              <SelectTrigger>
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                <SelectItem value="Brand A">Brand A</SelectItem>
                <SelectItem value="Brand B">Brand B</SelectItem>
                <SelectItem value="Brand C">Brand C</SelectItem>
                <SelectItem value="Brand D">Brand D</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range - From */}
          <div>
            <Label className="text-sm text-gray-700 mb-1.5 block">Purchase Date Range - From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>

          {/* Date Range - To */}
          <div>
            <Label className="text-sm text-gray-700 mb-1.5 block">Purchase Date Range - To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-x-auto mb-6">
          <Table>
            <TableHeader className="sticky top-0 bg-gray-50">
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead className="text-center">Days in Stock</TableHead>
                <TableHead className="text-center">Available Quantity</TableHead>
                <TableHead className="text-right">DP (₹)</TableHead>
                <TableHead className="text-right">Stock Value (₹)</TableHead>
                <TableHead>Aging Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgingData.map((record) => (
                <TableRow key={record.sku} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm font-medium">{record.sku}</TableCell>
                  <TableCell>{record.productName}</TableCell>
                  <TableCell>{record.brand}</TableCell>
                  <TableCell>{formatDate(record.purchaseDate)}</TableCell>
                  <TableCell className="text-center font-semibold">{record.daysInStock} days</TableCell>
                  <TableCell className="text-center">{record.availableQuantity} units</TableCell>
                  <TableCell className="text-right">₹ {record.dp.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right font-semibold">
                    ₹ {record.stockValue.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell>{getAgingBadge(record.agingStatus)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <FileDown size={16} className="mr-2" />
            Download PDF
          </Button>
          <Button className="bg-[#1e3a8a] hover:bg-blue-900" onClick={handleExportExcel}>
            <FileSpreadsheet size={16} className="mr-2" />
            Export Report (Excel)
          </Button>
        </div>
      </Card>
    </div>
  );
};
