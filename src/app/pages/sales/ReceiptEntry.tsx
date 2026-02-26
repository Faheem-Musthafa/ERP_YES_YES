import React, { useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useNavigate } from 'react-router';
import { ArrowLeft, Info } from 'lucide-react';

// Customer master data
const customerMasterData: Record<string, { phone: string; address: string; gstPan?: string }> = {
  'ABC Corp': {
    phone: '+91 9876543210',
    address: '123 Business Park, Andheri East, Mumbai, Maharashtra 400001',
    gstPan: '27AABCU9603R1ZX'
  },
  'XYZ Ltd': {
    phone: '+91 9876543211',
    address: '456 Industrial Area, Sector 18, Delhi, Delhi 110001',
    gstPan: '07AACCP5678D1Z5'
  },
  'Demo Industries': {
    phone: '+91 9876543212',
    address: '789 Tech Hub, Electronic City, Bangalore, Karnataka 560001'
  },
  'Test Company': {
    phone: '+91 9876543213',
    address: '321 Corporate Center, Hinjewadi, Pune, Maharashtra 411001',
    gstPan: '27AAACT4321M1ZP'
  }
};

// Invoice list
const invoiceList = [
  { number: 'INV-2024-001', customer: 'ABC Corp', amount: 125000, date: '2024-02-10' },
  { number: 'INV-2024-002', customer: 'XYZ Ltd', amount: 85000, date: '2024-02-12' },
  { number: 'INV-2024-003', customer: 'Demo Industries', amount: 210000, date: '2024-02-15' },
  { number: 'INV-2024-004', customer: 'Test Company', amount: 95000, date: '2024-02-16' },
];

export const ReceiptEntry = () => {
  const navigate = useNavigate();
  
  // Receipt Details
  const [company, setCompany] = useState('');
  const [modeOfReceipt, setModeOfReceipt] = useState('');
  
  // Brand Details
  const [brand, setBrand] = useState('');
  const [otherBrandName, setOtherBrandName] = useState('');
  
  // Customer Type
  const [customerType, setCustomerType] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGst, setCustomerGst] = useState('');
  const [phoneAutoFilled, setPhoneAutoFilled] = useState(false);
  const [addressAutoFilled, setAddressAutoFilled] = useState(false);
  const [gstAutoFilled, setGstAutoFilled] = useState(false);
  
  // Receipt Financial Details
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [againstInvoiceNo, setAgainstInvoiceNo] = useState('');
  
  // Conditional fields
  const [lowSideDetails, setLowSideDetails] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');

  const customers = ['ABC Corp', 'XYZ Ltd', 'Demo Industries', 'Test Company'];
  
  const brands = [
    'MITSUBISHI',
    'PANASONIC',
    'LG',
    'TRANE',
    'ESPA',
    'KSB',
    'HELLA',
    'BONTON',
    'BOSCH',
    'STB',
    'SWH',
    'Vedion-WLC',
    'INV-BT',
    'INV-DU',
    'LOWSIDE',
    'MIT Switch-Gear',
    'DAIKIN',
    'Lucker',
    'HAIER',
    'Other'
  ];

  // Handle customer selection and auto-fill
  const handleCustomerSelect = (customer: string) => {
    setSelectedCustomer(customer);
    
    if (customerMasterData[customer]) {
      setCustomerPhone(customerMasterData[customer].phone);
      setCustomerAddress(customerMasterData[customer].address);
      setPhoneAutoFilled(true);
      setAddressAutoFilled(true);
      
      if (customerMasterData[customer].gstPan) {
        setCustomerGst(customerMasterData[customer].gstPan);
        setGstAutoFilled(true);
      } else {
        setCustomerGst('');
        setGstAutoFilled(false);
      }
    }
  };

  // Handle phone change
  const handlePhoneChange = (value: string) => {
    setCustomerPhone(value);
    setPhoneAutoFilled(false);
  };

  // Handle address change
  const handleAddressChange = (value: string) => {
    setCustomerAddress(value);
    setAddressAutoFilled(false);
  };

  // Handle GST change
  const handleGstChange = (value: string) => {
    setCustomerGst(value);
    setGstAutoFilled(false);
  };

  // Handle customer type change
  const handleCustomerTypeChange = (type: string) => {
    setCustomerType(type);
    setSelectedCustomer('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerGst('');
    setPhoneAutoFilled(false);
    setAddressAutoFilled(false);
    setGstAutoFilled(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Receipt saved successfully!');
    navigate('/sales');
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-gray-600">
        <span>Dashboard</span>
        <span className="mx-2">/</span>
        <span>Sales</span>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">Receipt</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={20} className="mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-gray-900">Receipt Entry</h1>
        <p className="text-gray-600 mt-1">Record customer receipt against invoice</p>
      </div>

      {/* Main Form Card */}
      <Card className="p-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Receipt Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Receipt Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Select value={company} onValueChange={setCompany} required>
                  <SelectTrigger id="company">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llp">LLP</SelectItem>
                    <SelectItem value="yesyes">YES YES</SelectItem>
                    <SelectItem value="zekon">Zekon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="modeOfReceipt">Mode of Receipt *</Label>
                <Select value={modeOfReceipt} onValueChange={setModeOfReceipt} required>
                  <SelectTrigger id="modeOfReceipt">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Brand Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Brand</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand *</Label>
                <Select value={brand} onValueChange={setBrand} required>
                  <SelectTrigger id="brand">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {brand === 'Other' && (
                <div className="space-y-2">
                  <Label htmlFor="otherBrand">Enter Brand Name *</Label>
                  <Input
                    id="otherBrand"
                    value={otherBrandName}
                    onChange={(e) => setOtherBrandName(e.target.value)}
                    placeholder="Enter brand name"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Customer Type Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Customer Type</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="customerType">Customer Type *</Label>
                <Select value={customerType} onValueChange={handleCustomerTypeChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existing">Existing</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {customerType === 'existing' && (
                <div className="space-y-2">
                  <Label htmlFor="customer">Select Customer *</Label>
                  <Select value={selectedCustomer} onValueChange={handleCustomerSelect} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer} value={customer}>
                          {customer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {customerType === 'new' && (
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    required
                  />
                </div>
              )}
            </div>

            {/* Phone and GST/PAN fields - shown for both customer types */}
            {customerType && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone *</Label>
                  <div className="relative">
                    <Input
                      id="customerPhone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="Enter phone number"
                      required
                      className={phoneAutoFilled ? 'bg-blue-50 pr-10' : 'pr-10'}
                    />
                    {phoneAutoFilled && (
                      <Info className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  {phoneAutoFilled && (
                    <p className="text-xs text-gray-500">Auto-filled from customer master — editable</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerGst">GST / PAN No.</Label>
                  <div className="relative">
                    <Input
                      id="customerGst"
                      value={customerGst}
                      onChange={(e) => handleGstChange(e.target.value)}
                      placeholder="Enter GST or PAN number"
                      className={gstAutoFilled ? 'bg-blue-50 pr-10' : 'pr-10'}
                    />
                    {gstAutoFilled && (
                      <Info className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  {gstAutoFilled ? (
                    <p className="text-xs text-gray-500">Auto-filled from customer master — editable</p>
                  ) : (
                    <p className="text-xs text-gray-500">Optional — enter only if available</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="customerAddress">Address *</Label>
                  <div className="relative">
                    <Textarea
                      id="customerAddress"
                      value={customerAddress}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      placeholder="Enter customer address"
                      required
                      rows={3}
                      className={addressAutoFilled ? 'bg-blue-50 pr-10' : 'pr-10'}
                    />
                    {addressAutoFilled && (
                      <Info className="absolute right-3 top-3 h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  {addressAutoFilled && (
                    <p className="text-xs text-gray-500">Auto-filled from customer master — editable</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Receipt Financials Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Receipt Financials</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="receivedAmount">Received Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">₹</span>
                  <Input
                    id="receivedAmount"
                    type="number"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receivedDate">Received Date *</Label>
                <Input
                  id="receivedDate"
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">Date when payment is received</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="againstInvoice">Against Invoice Number *</Label>
                <Select value={againstInvoiceNo} onValueChange={setAgainstInvoiceNo} required>
                  <SelectTrigger id="againstInvoice">
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoiceList.map((invoice) => (
                      <SelectItem key={invoice.number} value={invoice.number}>
                        <div className="flex flex-col py-1">
                          <span className="font-medium">{invoice.number}</span>
                          <span className="text-xs text-gray-500">
                            {invoice.customer} • ₹{invoice.amount.toLocaleString()} • {invoice.date}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Conditional Section - Brand Specific (DULOWSIDE) */}
          {brand === 'DULOWSIDE' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Low Side Details</h3>
              
              <div className="space-y-2">
                <Label htmlFor="lowSideDetails">Low Side Details</Label>
                <Textarea
                  id="lowSideDetails"
                  value={lowSideDetails}
                  onChange={(e) => setLowSideDetails(e.target.value)}
                  placeholder="Enter low side material details"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Conditional Section - Cheque Details */}
          {modeOfReceipt === 'cheque' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Cheque Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="chequeNumber">Cheque Number *</Label>
                  <Input
                    id="chequeNumber"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    placeholder="Enter cheque number"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chequeDate">Cheque Date *</Label>
                  <Input
                    id="chequeDate"
                    type="date"
                    value={chequeDate}
                    onChange={(e) => setChequeDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Save Receipt
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};