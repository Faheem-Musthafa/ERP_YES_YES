import React, { useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { useNavigate } from 'react-router';
import { ArrowLeft, Lock, Plus, Trash2, Info } from 'lucide-react';

interface OrderItem {
  id: string;
  product: string;
  brand: string;
  sku: string;
  stock: string;
  quantity: string;
  dp: number;
  discount: string;
  amount: string;
  lastEdited?: 'discount' | 'amount' | 'quantity' | 'dp'; // Track which field was last edited
}

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
    // No GST/PAN stored for this customer
  },
  'Test Company': {
    phone: '+91 9876543213',
    address: '321 Corporate Center, Hinjewadi, Pune, Maharashtra 411001',
    gstPan: '27AAACT4321M1ZP'
  }
};

export const CreateOrder = () => {
  const navigate = useNavigate();
  const [company, setCompany] = useState('');
  const [invoiceType, setInvoiceType] = useState('');
  const [gstPanNo, setGstPanNo] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGst, setCustomerGst] = useState('');
  const [phoneAutoFilled, setPhoneAutoFilled] = useState(false);
  const [addressAutoFilled, setAddressAutoFilled] = useState(false);
  const [gstAutoFilled, setGstAutoFilled] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    {
      id: '1',
      product: '',
      brand: '',
      sku: '',
      stock: '',
      quantity: '',
      dp: 0,
      discount: '',
      amount: ''
    }
  ]);
  const [siteAddress, setSiteAddress] = useState('');
  const [remarks, setRemarks] = useState('');
  const [deliveryOption, setDeliveryOption] = useState('today');

  const customers = ['ABC Corp', 'XYZ Ltd', 'Demo Industries', 'Test Company'];
  const products = ['Product 1', 'Product 2', 'Product 3', 'Product 4'];
  const brandMapping: Record<string, string> = {
    'Product 1': 'Brand A',
    'Product 2': 'Brand B',
    'Product 3': 'Brand C',
    'Product 4': 'Brand D'
  };
  const skuMapping: Record<string, string> = {
    'Product 1': 'SKU-10001',
    'Product 2': 'SKU-10002',
    'Product 3': 'SKU-10003',
    'Product 4': 'SKU-10004'
  };
  const stockMapping: Record<string, string> = {
    'Product 1': '150 units',
    'Product 2': '200 units',
    'Product 3': '75 units',
    'Product 4': '300 units'
  };
  const priceMapping: Record<string, number> = {
    'Product 1': 12500,
    'Product 2': 15000,
    'Product 3': 8500,
    'Product 4': 20000
  };

  // Handle customer selection and auto-fill
  const handleCustomerSelect = (customer: string) => {
    setSelectedCustomer(customer);
    
    if (customerMasterData[customer]) {
      setCustomerPhone(customerMasterData[customer].phone);
      setCustomerAddress(customerMasterData[customer].address);
      setPhoneAutoFilled(true);
      setAddressAutoFilled(true);
      
      // Auto-fill GST/PAN if available
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
    setPhoneAutoFilled(false); // Remove auto-fill state when user edits
  };

  // Handle address change
  const handleAddressChange = (value: string) => {
    setCustomerAddress(value);
    setAddressAutoFilled(false); // Remove auto-fill state when user edits
  };

  // Handle GST change
  const handleGstChange = (value: string) => {
    setCustomerGst(value);
    setGstAutoFilled(false); // Remove auto-fill state when user edits
  };

  // Handle customer type change
  const handleCustomerTypeChange = (type: string) => {
    setCustomerType(type);
    // Reset fields when switching customer type
    setSelectedCustomer('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerGst('');
    setPhoneAutoFilled(false);
    setAddressAutoFilled(false);
    setGstAutoFilled(false);
  };

  const handleAddItem = () => {
    const newId = (Number(orderItems[orderItems.length - 1].id) + 1).toString();
    setOrderItems([...orderItems, {
      id: newId,
      product: '',
      brand: '',
      sku: '',
      stock: '',
      quantity: '',
      dp: 0,
      discount: '',
      amount: ''
    }]);
  };

  const handleRemoveItem = (id: string) => {
    setOrderItems(orderItems.filter(item => item.id !== id));
  };

  const handleProductChange = (id: string, product: string) => {
    const brand = brandMapping[product] || '';
    const sku = skuMapping[product] || '';
    const stock = stockMapping[product] || '';
    const dp = priceMapping[product] || 0;
    setOrderItems(orderItems.map(item => item.id === id ? { ...item, product, brand, sku, stock, dp } : item));
  };

  const handleQuantityChange = (id: string, quantity: string) => {
    setOrderItems(orderItems.map(item => item.id === id ? { ...item, quantity, lastEdited: 'quantity' } : item));
  };

  const handleDpChange = (id: string, dp: string) => {
    setOrderItems(orderItems.map(item => item.id === id ? { ...item, dp: Number(dp) || 0, lastEdited: 'dp' } : item));
  };

  const handleDiscountChange = (id: string, discount: string) => {
    setOrderItems(orderItems.map(item => item.id === id ? { ...item, discount, lastEdited: 'discount' } : item));
  };

  const handleAmountChange = (id: string, amount: string) => {
    setOrderItems(orderItems.map(item => item.id === id ? { ...item, amount, lastEdited: 'amount' } : item));
  };

  // Auto-calculate based on which field was last edited
  React.useEffect(() => {
    setOrderItems(prevItems => prevItems.map(item => {
      const qty = Number(item.quantity) || 0;
      const dp = item.dp || 0;
      
      if (!qty || !dp) {
        return item;
      }

      // If Amount was manually edited, calculate Discount %
      if (item.lastEdited === 'amount' && item.amount !== '') {
        const amount = Number(item.amount) || 0;
        const maxAmount = dp * qty;
        
        if (maxAmount > 0) {
          // Discount % = ((DP × Qty - Amount) / (DP × Qty)) × 100
          const calculatedDiscount = ((maxAmount - amount) / maxAmount) * 100;
          const roundedDiscount = Math.max(0, Math.min(100, calculatedDiscount)).toFixed(2);
          
          return { ...item, discount: roundedDiscount, lastEdited: undefined };
        }
      }
      
      // If DP, Discount % or Quantity was edited, calculate Amount
      if (item.lastEdited === 'discount' || item.lastEdited === 'quantity' || item.lastEdited === 'dp' || item.lastEdited === undefined) {
        const disc = Number(item.discount) || 0;
        // Amount = DP × Qty × (1 - Discount%/100)
        const calculatedAmount = (dp * qty * (1 - disc / 100)).toFixed(2);
        
        return { ...item, amount: calculatedAmount, lastEdited: undefined };
      }

      return item;
    }));
  }, [orderItems.map(item => `${item.id}-${item.quantity}-${item.discount}-${item.amount}-${item.dp}-${item.lastEdited}`).join(',')]);

  // Calculate order summary
  const subtotal = orderItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    return sum + (item.dp * qty);
  }, 0);

  const totalDiscount = orderItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const disc = Number(item.discount) || 0;
    const discountAmount = (item.dp * qty * disc) / 100;
    return sum + discountAmount;
  }, 0);

  const grandTotal = orderItems.reduce((sum, item) => {
    return sum + (Number(item.amount) || 0);
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    alert('Order created successfully!');
    navigate('/sales/my-orders');
  };

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/sales')} className="mb-4">
          <ArrowLeft size={20} className="mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-semibold text-gray-900">Create Sales Order</h1>
        <p className="text-gray-600 mt-1">Fill in the details to create a new order</p>
      </div>

      <Card className="p-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Configuration Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Invoice Configuration</h3>
            
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
                <Label htmlFor="invoiceType">Invoice Type *</Label>
                <Select value={invoiceType} onValueChange={setInvoiceType} required>
                  <SelectTrigger id="invoiceType">
                    <SelectValue placeholder="Select invoice type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gst">GST</SelectItem>
                    <SelectItem value="ngst">NGST</SelectItem>
                    <SelectItem value="igst">IGST</SelectItem>
                    <SelectItem value="challan_out">Delivery Challan Out</SelectItem>
                    <SelectItem value="challan_in">Delivery Challan In</SelectItem>
                    <SelectItem value="stock_transfer">Stock Transfer</SelectItem>
                    <SelectItem value="credit_note">Credit Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="customerType">Customer Type *</Label>
              <Select value={customerType} onValueChange={handleCustomerTypeChange}>
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
                <Label htmlFor="customer">Customer *</Label>
                <Select value={selectedCustomer} onValueChange={handleCustomerSelect}>
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

          {/* Order Items Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Order Items</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left text-sm font-semibold text-gray-700 p-3">Product</th>
                    <th className="text-left text-sm font-semibold text-gray-700 p-3">Brand</th>
                    <th className="text-left text-sm font-semibold text-gray-700 p-3">SKU</th>
                    <th className="text-right text-sm font-semibold text-gray-700 p-3">Stock</th>
                    <th className="text-right text-sm font-semibold text-gray-700 p-3">Qty</th>
                    <th className="text-right text-sm font-semibold text-gray-700 p-3">DP</th>
                    <th className="text-right text-sm font-semibold text-gray-700 p-3">Disc%</th>
                    <th className="text-right text-sm font-semibold text-gray-700 p-3">Amount</th>
                    <th className="text-center text-sm font-semibold text-gray-700 p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item, index) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <Select 
                          value={item.product} 
                          onValueChange={(value) => handleProductChange(item.id, value)}
                        >
                          <SelectTrigger className="h-9 min-w-[150px]">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product} value={product}>
                                {product}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          value={item.brand}
                          disabled
                          className="h-9 bg-gray-50 text-gray-600 min-w-[100px]"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={item.sku}
                          disabled
                          className="h-9 bg-gray-50 text-gray-600 min-w-[100px]"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={item.stock}
                          disabled
                          className="h-9 bg-gray-50 text-gray-600 text-right min-w-[90px]"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                          placeholder="0"
                          className="h-9 text-right min-w-[70px]"
                        />
                      </td>
                      <td className="p-2">
                        <div className="relative min-w-[110px]">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 text-sm">₹</span>
                          <Input
                            type="number"
                            value={item.dp}
                            onChange={(e) => handleDpChange(item.id, e.target.value)}
                            placeholder="0"
                            className="h-9 text-right pl-6"
                          />
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="relative min-w-[80px]">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => handleDiscountChange(item.id, e.target.value)}
                            placeholder="0"
                            className="h-9 text-right pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="relative min-w-[120px]">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 text-sm">₹</span>
                          <Input
                            type="number"
                            value={item.amount}
                            onChange={(e) => handleAmountChange(item.id, e.target.value)}
                            placeholder="0.00"
                            className="h-9 text-right pl-6 bg-blue-50"
                          />
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        {orderItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleAddItem}
              className="mt-2"
            >
              <Plus size={16} className="mr-2" />
              Add Product Row
            </Button>
          </div>

          {/* Order Summary Section */}
          <Card className="bg-blue-50 border-blue-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Order Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Subtotal:</span>
                <span className="font-semibold">₹ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Total Discount:</span>
                <span className="font-semibold text-orange-600">- ₹ {totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
                <span className="text-gray-900">Grand Total:</span>
                <span className="text-[#1e3a8a]">₹ {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="address">Site Address *</Label>
            <Textarea
              id="address"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="Enter delivery site address"
              required
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter any additional remarks"
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label>Delivery Options *</Label>
            <RadioGroup value={deliveryOption} onValueChange={setDeliveryOption}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="today" id="today" />
                <Label htmlFor="today" className="font-normal cursor-pointer">Today</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tomorrow" id="tomorrow" />
                <Label htmlFor="tomorrow" className="font-normal cursor-pointer">Tomorrow</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="select" id="select" />
                <Label htmlFor="select" className="font-normal cursor-pointer">Select Date</Label>
              </div>
            </RadioGroup>
            {deliveryOption === 'select' && (
              <Input type="date" className="mt-2" />
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90">
              Submit Order
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/sales')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};