import React, { useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

interface DeliveryRecord {
  invoiceNo: string;
  customerName: string;
  company: string;
  brand: string;
  grandTotal: number;
  transporter: string;
  customTransporter?: string;
  deliveryStatus: 'Pending' | 'Delivered' | 'Cancel' | 'Returned';
  deliveredDate: string;
}

export const DeliveryManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTransporter, setFilterTransporter] = useState<string>('all');

  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecord[]>([
    {
      invoiceNo: 'INV-2026-001',
      customerName: 'ABC Corp',
      company: 'YES YES',
      brand: 'Mitsubishi',
      grandTotal: 125000,
      transporter: 'Razak',
      deliveryStatus: 'Pending',
      deliveredDate: '',
    },
    {
      invoiceNo: 'INV-2026-002',
      customerName: 'XYZ Industries',
      company: 'LLP',
      brand: 'Panasonic',
      grandTotal: 85000,
      transporter: 'Bus',
      deliveryStatus: 'Delivered',
      deliveredDate: '2026-02-18',
    },
    {
      invoiceNo: 'INV-2026-003',
      customerName: 'Tech Solutions',
      company: 'Zekon',
      brand: 'LG',
      grandTotal: 210000,
      transporter: 'Sideeque',
      deliveryStatus: 'Returned',
      deliveredDate: '2026-02-17',
    },
  ]);

  const [originalRecords] = useState<DeliveryRecord[]>(JSON.parse(JSON.stringify(deliveryRecords)));

  const handleTransporterChange = (invoiceNo: string, value: string) => {
    setDeliveryRecords((prev) =>
      prev.map((record) =>
        record.invoiceNo === invoiceNo
          ? { ...record, transporter: value, customTransporter: value === 'Other' ? '' : undefined }
          : record
      )
    );
  };

  const handleCustomTransporterChange = (invoiceNo: string, value: string) => {
    setDeliveryRecords((prev) =>
      prev.map((record) =>
        record.invoiceNo === invoiceNo ? { ...record, customTransporter: value } : record
      )
    );
  };

  const handleDeliveryStatusChange = (invoiceNo: string, value: 'Pending' | 'Delivered' | 'Cancel' | 'Returned') => {
    setDeliveryRecords((prev) =>
      prev.map((record) =>
        record.invoiceNo === invoiceNo
          ? {
              ...record,
              deliveryStatus: value,
              deliveredDate: value === 'Cancel' || value === 'Pending' ? '' : record.deliveredDate,
            }
          : record
      )
    );
  };

  const handleDeliveredDateChange = (invoiceNo: string, value: string) => {
    setDeliveryRecords((prev) =>
      prev.map((record) => (record.invoiceNo === invoiceNo ? { ...record, deliveredDate: value } : record))
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Delivered':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Delivered</Badge>;
      case 'Cancel':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Cancel</Badge>;
      case 'Returned':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Returned</Badge>;
      case 'Pending':
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">{status}</Badge>;
    }
  };

  const isDateEnabled = (status: string) => {
    return status === 'Delivered' || status === 'Returned';
  };

  const handleSaveUpdates = () => {
    // Validate required fields
    const hasErrors = deliveryRecords.some((record) => {
      if (record.deliveryStatus === 'Delivered') {
        if (!record.deliveredDate) {
          toast.error(`Delivered Date is required for ${record.invoiceNo}`);
          return true;
        }
        if (!record.transporter) {
          toast.error(`Transporter is required for ${record.invoiceNo}`);
          return true;
        }
        if (record.transporter === 'Other' && !record.customTransporter) {
          toast.error(`Custom transporter name is required for ${record.invoiceNo}`);
          return true;
        }
      }
      return false;
    });

    if (!hasErrors) {
      toast.success('Delivery updates saved successfully');
      console.log('Saved delivery records:', deliveryRecords);
    }
  };

  const handleResetChanges = () => {
    setDeliveryRecords(JSON.parse(JSON.stringify(originalRecords)));
    toast.info('Changes have been reset');
  };

  const filteredRecords = deliveryRecords.filter((record) => {
    const matchesSearch =
      record.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || record.deliveryStatus === filterStatus;
    const matchesTransporter = filterTransporter === 'all' || record.transporter === filterTransporter;
    return matchesSearch && matchesStatus && matchesTransporter;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Delivery Management</h1>
        <p className="text-gray-600 mt-1">Manage sales delivery updates and transporter details</p>
      </div>

      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Delivery List</h2>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Search */}
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Search by Invoice / Customer"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filter by Delivery Status */}
          <div>
            <Label className="text-sm text-gray-700 mb-1.5 block">Filter by Delivery Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
                <SelectItem value="Cancel">Cancel</SelectItem>
                <SelectItem value="Returned">Returned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter by Transporter */}
          <div>
            <Label className="text-sm text-gray-700 mb-1.5 block">Filter by Transporter</Label>
            <Select value={filterTransporter} onValueChange={setFilterTransporter}>
              <SelectTrigger>
                <SelectValue placeholder="All Transporters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transporters</SelectItem>
                <SelectItem value="Razak">Razak</SelectItem>
                <SelectItem value="Bus">Bus</SelectItem>
                <SelectItem value="Sideeque">Sideeque</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">Grand Total (₹)</TableHead>
                <TableHead>Transporter</TableHead>
                <TableHead>Delivery Status</TableHead>
                <TableHead>Delivered Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.invoiceNo} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm font-medium">{record.invoiceNo}</TableCell>
                  <TableCell>{record.customerName}</TableCell>
                  <TableCell>{record.company}</TableCell>
                  <TableCell>{record.brand}</TableCell>
                  <TableCell className="text-right font-semibold">
                    ₹ {record.grandTotal.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Select
                        value={record.transporter}
                        onValueChange={(value) => handleTransporterChange(record.invoiceNo, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Razak">Razak</SelectItem>
                          <SelectItem value="Bus">Bus</SelectItem>
                          <SelectItem value="Sideeque">Sideeque</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {record.transporter === 'Other' && (
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Enter Transporter Name</Label>
                          <Input
                            placeholder="Type transporter name"
                            value={record.customTransporter || ''}
                            onChange={(e) => handleCustomTransporterChange(record.invoiceNo, e.target.value)}
                            className="w-40 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={record.deliveryStatus}
                      onValueChange={(value: any) => handleDeliveryStatusChange(record.invoiceNo, value)}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                            Pending
                          </div>
                        </SelectItem>
                        <SelectItem value="Delivered">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Delivered
                          </div>
                        </SelectItem>
                        <SelectItem value="Cancel">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            Cancel
                          </div>
                        </SelectItem>
                        <SelectItem value="Returned">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            Returned
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="mt-2">{getStatusBadge(record.deliveryStatus)}</div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={record.deliveredDate}
                      onChange={(e) => handleDeliveredDateChange(record.invoiceNo, e.target.value)}
                      disabled={!isDateEnabled(record.deliveryStatus)}
                      className={`w-40 ${
                        !isDateEnabled(record.deliveryStatus) ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90">
                      Update
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={handleResetChanges}>
            Reset Changes
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={handleSaveUpdates}>
            Save Delivery Updates
          </Button>
        </div>
      </Card>
    </div>
  );
};
