import React, { useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useNavigate } from 'react-router';
import { Search, Eye } from 'lucide-react';

interface SalesRecord {
  invoiceNumber: string;
  invoiceDate: string;
  orderId: string;
  company: string;
  invoiceType: string;
  customerName: string;
  customerType: string;
  itemsCount: string;
  quantityTotal: number;
  grandTotal: number;
  status: string;
  createdBy: string;
  deliveryDate: string;
}

export const SalesRecords = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Sample sales records data
  const salesRecords: SalesRecord[] = [
    {
      invoiceNumber: 'INV-2026-001',
      invoiceDate: '03 Feb 2026',
      orderId: 'ORD-3001',
      company: 'YES YES',
      invoiceType: 'GST',
      customerName: 'ABC Corp',
      customerType: 'Existing',
      itemsCount: '3 items',
      quantityTotal: 100,
      grandTotal: 1196750,
      status: 'Billed',
      createdBy: 'Rajesh Kumar',
      deliveryDate: '06 Feb 2026'
    },
    {
      invoiceNumber: 'INV-2026-002',
      invoiceDate: '04 Feb 2026',
      orderId: 'ORD-3002',
      company: 'LLP',
      invoiceType: 'IGST',
      customerName: 'XYZ Industries',
      customerType: 'New',
      itemsCount: '5 items',
      quantityTotal: 250,
      grandTotal: 2456300,
      status: 'Billed',
      createdBy: 'Priya Sharma',
      deliveryDate: '07 Feb 2026'
    },
    {
      invoiceNumber: 'INV-2026-003',
      invoiceDate: '05 Feb 2026',
      orderId: 'ORD-3003',
      company: 'Zekon',
      invoiceType: 'GST',
      customerName: 'Demo Trading Co',
      customerType: 'Existing',
      itemsCount: '2 items',
      quantityTotal: 75,
      grandTotal: 895500,
      status: 'Delivered',
      createdBy: 'Amit Patel',
      deliveryDate: '05 Feb 2026'
    },
    {
      invoiceNumber: 'INV-2026-004',
      invoiceDate: '06 Feb 2026',
      orderId: 'ORD-3004',
      company: 'YES YES',
      invoiceType: 'Credit Note',
      customerName: 'Tech Solutions Ltd',
      customerType: 'Existing',
      itemsCount: '4 items',
      quantityTotal: 180,
      grandTotal: 1785400,
      status: 'Billed',
      createdBy: 'Rajesh Kumar',
      deliveryDate: '09 Feb 2026'
    },
    {
      invoiceNumber: 'INV-2026-005',
      invoiceDate: '07 Feb 2026',
      orderId: 'ORD-3005',
      company: 'LLP',
      invoiceType: 'NGST',
      customerName: 'Global Enterprises',
      customerType: 'New',
      itemsCount: '6 items',
      quantityTotal: 320,
      grandTotal: 3125000,
      status: 'Billed',
      createdBy: 'Priya Sharma',
      deliveryDate: '10 Feb 2026'
    },
    {
      invoiceNumber: 'INV-2026-006',
      invoiceDate: '08 Feb 2026',
      orderId: 'ORD-3006',
      company: 'YES YES',
      invoiceType: 'GST',
      customerName: 'Metro Retail',
      customerType: 'Existing',
      itemsCount: '3 items',
      quantityTotal: 150,
      grandTotal: 1567800,
      status: 'Delivered',
      createdBy: 'Amit Patel',
      deliveryDate: '08 Feb 2026'
    }
  ];

  // Filter logic
  const filteredRecords = salesRecords.filter(record => {
    const matchesSearch = searchQuery === '' || 
      record.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.orderId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCompany = companyFilter === '' || record.company === companyFilter;
    const matchesInvoiceType = invoiceTypeFilter === '' || record.invoiceType === invoiceTypeFilter;
    const matchesStatus = statusFilter === '' || record.status === statusFilter;
    
    return matchesSearch && matchesCompany && matchesInvoiceType && matchesStatus;
  });

  const handleViewOrder = (orderId: string) => {
    // Navigate to order details or review page
    navigate(`/accounts/order-review/${orderId}`);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Sales</h1>
        <p className="text-gray-600 mt-1">Approved and converted sales orders list</p>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search by Invoice No / Customer"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              <SelectItem value="LLP">LLP</SelectItem>
              <SelectItem value="YES YES">YES YES</SelectItem>
              <SelectItem value="Zekon">Zekon</SelectItem>
            </SelectContent>
          </Select>

          <Select value={invoiceTypeFilter} onValueChange={setInvoiceTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Invoice Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="GST">GST</SelectItem>
              <SelectItem value="NGST">NGST</SelectItem>
              <SelectItem value="IGST">IGST</SelectItem>
              <SelectItem value="Credit Note">Credit Note</SelectItem>
              <SelectItem value="Delivery Challan Out">Delivery Challan Out</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Billed">Billed</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
              className="w-1/2"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
              className="w-1/2"
            />
          </div>
        </div>
      </Card>

      {/* Sales Records Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Invoice Number</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Invoice Date</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Order ID</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Company</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Invoice Type</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Customer Name</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Customer Type</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Items Count</th>
                <th className="text-right text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Quantity Total</th>
                <th className="text-right text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Grand Total (₹)</th>
                <th className="text-center text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Status</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Created By</th>
                <th className="text-left text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Delivery Date</th>
                <th className="text-center text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-sm font-medium text-[#1e3a8a]">{record.invoiceNumber}</td>
                  <td className="p-3 text-sm text-gray-700">{record.invoiceDate}</td>
                  <td className="p-3 text-sm text-gray-700">{record.orderId}</td>
                  <td className="p-3 text-sm text-gray-700">{record.company}</td>
                  <td className="p-3 text-sm">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {record.invoiceType}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-gray-700">{record.customerName}</td>
                  <td className="p-3 text-sm text-gray-700">{record.customerType}</td>
                  <td className="p-3 text-sm text-gray-700">{record.itemsCount}</td>
                  <td className="p-3 text-sm text-right text-gray-700">{record.quantityTotal}</td>
                  <td className="p-3 text-sm text-right font-semibold text-gray-900">
                    ₹ {record.grandTotal.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      record.status === 'Billed' 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-gray-700">{record.createdBy}</td>
                  <td className="p-3 text-sm text-gray-700">{record.deliveryDate}</td>
                  <td className="p-3 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewOrder(record.orderId)}
                      className="h-8"
                    >
                      <Eye size={14} className="mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No sales records found matching your filters.</p>
          </div>
        )}
      </Card>

      {/* Helper Note */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Records appear here after clicking "Approve & Convert to Sale" button in Order Review screen. 
          Invoice Number and Invoice Date are generated during approval.
        </p>
      </div>
    </div>
  );
};