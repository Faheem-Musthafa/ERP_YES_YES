import React, { useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useNavigate } from 'react-router';
import { Search, Eye, Pencil, Plus, Wallet } from 'lucide-react';

interface ReceiptRecord {
  receiptNo: string;
  receivedDate: string;
  company: string;
  brand: string;
  customerName: string;
  modeOfReceipt: 'Cash' | 'Bank' | 'Cheque';
  invoiceNumber: string;
  receivedAmount: number;
  enteredBy: string;
  createdDate: string;
  status: 'Pending' | 'Credited' | 'Bounced';
  creditedDate?: string;
}

export const MyCollection = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Sample receipt data
  const receiptRecords: ReceiptRecord[] = [
    {
      receiptNo: 'RCPT-1001',
      receivedDate: '15-02-2026',
      company: 'YES YES',
      brand: 'MITSUBISHI',
      customerName: 'ABC Corp',
      modeOfReceipt: 'Bank',
      invoiceNumber: 'INV-2024-001',
      receivedAmount: 125000,
      enteredBy: 'Rajesh Kumar',
      createdDate: '15-02-2026',
      status: 'Credited',
      creditedDate: '16-02-2026'
    },
    {
      receiptNo: 'RCPT-1002',
      receivedDate: '16-02-2026',
      company: 'LLP',
      brand: 'PANASONIC',
      customerName: 'XYZ Industries',
      modeOfReceipt: 'Cheque',
      invoiceNumber: 'INV-2024-002',
      receivedAmount: 85000,
      enteredBy: 'Priya Sharma',
      createdDate: '16-02-2026',
      status: 'Pending'
    },
    {
      receiptNo: 'RCPT-1003',
      receivedDate: '17-02-2026',
      company: 'Zekon',
      brand: 'DAIKIN',
      customerName: 'Demo Trading Co',
      modeOfReceipt: 'Cash',
      invoiceNumber: 'INV-2024-003',
      receivedAmount: 45000,
      enteredBy: 'Amit Patel',
      createdDate: '17-02-2026',
      status: 'Credited',
      creditedDate: '18-02-2026'
    },
    {
      receiptNo: 'RCPT-1004',
      receivedDate: '17-02-2026',
      company: 'YES YES',
      brand: 'LG',
      customerName: 'Tech Solutions Ltd',
      modeOfReceipt: 'Bank',
      invoiceNumber: 'INV-2024-004',
      receivedAmount: 195000,
      enteredBy: 'Rajesh Kumar',
      createdDate: '17-02-2026',
      status: 'Credited',
      creditedDate: '18-02-2026'
    },
    {
      receiptNo: 'RCPT-1005',
      receivedDate: '17-02-2026',
      company: 'LLP',
      brand: 'DULOWSIDE',
      customerName: 'Global Enterprises',
      modeOfReceipt: 'Cheque',
      invoiceNumber: 'INV-2024-005',
      receivedAmount: 320000,
      enteredBy: 'Priya Sharma',
      createdDate: '17-02-2026',
      status: 'Bounced'
    }
  ];

  // Filter logic
  const filteredRecords = receiptRecords.filter(record => {
    const matchesSearch = searchQuery === '' || 
      record.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCompany = companyFilter === '' || companyFilter === 'all' || record.company === companyFilter;
    const matchesBrand = brandFilter === '' || brandFilter === 'all' || record.brand === brandFilter;
    const matchesMode = modeFilter === '' || modeFilter === 'all' || record.modeOfReceipt === modeFilter;
    
    return matchesSearch && matchesCompany && matchesBrand && matchesMode;
  });

  const handleViewReceipt = (receiptNo: string) => {
    // Navigate to receipt details view
    console.log('View receipt:', receiptNo);
    // navigate(`/sales/receipt/${receiptNo}`);
  };

  const handleEditReceipt = (receiptNo: string) => {
    // Navigate to edit receipt
    console.log('Edit receipt:', receiptNo);
    // navigate(`/sales/receipt/edit/${receiptNo}`);
  };

  const handleNewReceipt = () => {
    navigate('/sales/receipt');
  };

  const getModeColor = (mode: 'Cash' | 'Bank' | 'Cheque') => {
    switch (mode) {
      case 'Cash':
        return 'bg-green-100 text-green-700';
      case 'Bank':
        return 'bg-blue-100 text-blue-700';
      case 'Cheque':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: 'Pending' | 'Credited' | 'Bounced') => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'Credited':
        return 'bg-green-100 text-green-700';
      case 'Bounced':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Collection</h1>
          <p className="text-gray-600 mt-1">View all saved receipt entries</p>
        </div>
        <Button 
          onClick={handleNewReceipt}
          className="bg-[#f97316] hover:bg-[#ea580c] text-white"
        >
          <Plus size={18} className="mr-2" />
          New Receipt
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search by Receipt No / Invoice No / Customer"
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

          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              <SelectItem value="MITSUBISHI">MITSUBISHI</SelectItem>
              <SelectItem value="PANASONIC">PANASONIC</SelectItem>
              <SelectItem value="LG">LG</SelectItem>
              <SelectItem value="TRANE">TRANE</SelectItem>
              <SelectItem value="DAIKIN">DAIKIN</SelectItem>
              <SelectItem value="DULOWSIDE">DULOWSIDE</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={modeFilter} onValueChange={setModeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Bank">Bank</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
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

      {/* Receipt Collection Table */}
      <Card className="overflow-hidden">
        {filteredRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Receipt No</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Received Date</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Company</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Brand</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Customer Name</th>
                  <th className="text-center text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Mode of Receipt</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Invoice Number</th>
                  <th className="text-right text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Received Amount (₹)</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Entered By</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Created Date</th>
                  <th className="text-center text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Status of Receipt</th>
                  <th className="text-center text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Credited Date</th>
                  <th className="text-center text-xs font-semibold text-gray-700 p-3 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm font-medium text-[#1e3a8a]">{record.receiptNo}</td>
                    <td className="p-3 text-sm text-gray-700">{record.receivedDate}</td>
                    <td className="p-3 text-sm text-gray-700">{record.company}</td>
                    <td className="p-3 text-sm text-gray-700">{record.brand}</td>
                    <td className="p-3 text-sm text-gray-700">{record.customerName}</td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getModeColor(record.modeOfReceipt)}`}>
                        {record.modeOfReceipt}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-700">{record.invoiceNumber}</td>
                    <td className="p-3 text-sm text-right font-semibold text-gray-900">
                      ₹ {record.receivedAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-sm text-gray-700">{record.enteredBy}</td>
                    <td className="p-3 text-sm text-gray-700">{record.createdDate}</td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="p-3 text-center text-sm text-gray-700">
                      {record.creditedDate || '-'}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReceipt(record.receiptNo)}
                          className="h-8"
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditReceipt(record.receiptNo)}
                          className="h-8"
                        >
                          <Pencil size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="flex flex-col items-center justify-center">
              <Wallet size={48} className="text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg mb-4">No receipts recorded yet</p>
              <Button 
                onClick={handleNewReceipt}
                className="bg-[#f97316] hover:bg-[#ea580c] text-white"
              >
                <Plus size={18} className="mr-2" />
                Create First Receipt
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};