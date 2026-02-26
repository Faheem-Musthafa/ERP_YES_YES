import React, { useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { useNavigate } from 'react-router';
import { ArrowLeft, Lock, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';

interface OrderItem {
  id: string;
  product: string;
  brand: string;
  sku: string;
  stock: string;
  quantity: number;
  dp: number;
  discount: number;
  amount: number;
  approvedDP?: number;
  approvedDiscount?: number;
  approvedAmount?: number;
}

export const OrderReview = () => {
  const navigate = useNavigate();

  // Mock order data with multiple products
  const orderDetails = {
    orderId: 'ORD-3001',
    customerType: 'Existing',
    customerName: 'ABC Corp',
    createdBy: 'Rajesh Kumar (Sales Staff)',
    createdDate: '2026-02-03',
    deliveryDate: '2026-02-06',
    siteAddress: '123 Business Park, Sector 18\nGurgaon, Haryana - 122015',
    remarks: 'Urgent delivery required. Handle with care.',
    status: 'Pending Approval'
  };

  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    {
      id: '1',
      product: 'Product 1',
      brand: 'Brand A',
      sku: 'SKU-10001',
      stock: '150 units',
      quantity: 50,
      dp: 12500,
      discount: 5,
      amount: 593750,
      approvedDP: 12500,
      approvedDiscount: 5,
      approvedAmount: 593750
    },
    {
      id: '2',
      product: 'Product 3',
      brand: 'Brand C',
      sku: 'SKU-10003',
      stock: '75 units',
      quantity: 20,
      dp: 8500,
      discount: 10,
      amount: 153000,
      approvedDP: 8500,
      approvedDiscount: 10,
      approvedAmount: 153000
    },
    {
      id: '3',
      product: 'Product 2',
      brand: 'Brand B',
      sku: 'SKU-10002',
      stock: '200 units',
      quantity: 30,
      dp: 15000,
      discount: 0,
      amount: 450000,
      approvedDP: 15000,
      approvedDiscount: 0,
      approvedAmount: 450000
    }
  ]);

  const handleApprovedDPChange = (id: string, value: string) => {
    setOrderItems(orderItems.map(item => 
      item.id === id ? { ...item, approvedDP: Number(value) || 0 } : item
    ));
  };

  const handleApprovedDiscountChange = (id: string, value: string) => {
    setOrderItems(orderItems.map(item => 
      item.id === id ? { ...item, approvedDiscount: Number(value) || 0 } : item
    ));
  };

  const handleApprovedAmountChange = (id: string, value: string) => {
    setOrderItems(orderItems.map(item => 
      item.id === id ? { ...item, approvedAmount: Number(value) || 0 } : item
    ));
  };

  // Auto-calculate approved amounts
  React.useEffect(() => {
    setOrderItems(orderItems.map(item => {
      if (item.approvedDP !== undefined && item.approvedDiscount !== undefined) {
        const discountedPrice = item.approvedDP * (1 - item.approvedDiscount / 100);
        const calculatedAmount = discountedPrice * item.quantity;
        return { ...item, approvedAmount: Number(calculatedAmount.toFixed(2)) };
      }
      return item;
    }));
  }, [orderItems.map(item => `${item.approvedDP}-${item.approvedDiscount}`).join(',')]);

  // Calculate summary from approved values
  const requestedSubtotal = orderItems.reduce((sum, item) => sum + (item.dp * item.quantity), 0);
  const requestedDiscount = orderItems.reduce((sum, item) => {
    const discAmount = (item.dp * item.quantity * item.discount) / 100;
    return sum + discAmount;
  }, 0);
  const requestedTotal = orderItems.reduce((sum, item) => sum + item.amount, 0);

  const approvedSubtotal = orderItems.reduce((sum, item) => sum + ((item.approvedDP || 0) * item.quantity), 0);
  const approvedDiscount = orderItems.reduce((sum, item) => {
    const discAmount = ((item.approvedDP || 0) * item.quantity * (item.approvedDiscount || 0)) / 100;
    return sum + discAmount;
  }, 0);
  const approvedTotal = orderItems.reduce((sum, item) => sum + (item.approvedAmount || 0), 0);

  const handleApprove = () => {
    alert('Order approved and converted to sale! Invoice Number and Date have been generated.');
    navigate('/accounts/sales');
  };

  const handleReject = () => {
    if (confirm('Are you sure you want to reject this order?')) {
      alert('Order rejected!');
      navigate('/accounts');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <aside className="w-64 bg-[#1e3a8a] text-white flex flex-col">
        <div className="p-6 border-b border-blue-700">
          <h1 className="text-xl font-bold">YES YES MARKETING</h1>
          <p className="text-sm text-blue-200 mt-1">Accounts Staff</p>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <li>
              <button 
                onClick={() => navigate('/accounts')}
                className="w-full text-left px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Dashboard
              </button>
            </li>
            <li>
              <button className="w-full text-left px-4 py-2 rounded bg-blue-700 font-medium">
                Pending Orders
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/accounts/sales')}
                className="w-full text-left px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Sales
              </button>
            </li>
            <li>
              <button className="w-full text-left px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                Payments
              </button>
            </li>
            <li>
              <button className="w-full text-left px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                Inventory
              </button>
            </li>
            <li>
              <button className="w-full text-left px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                Reports
              </button>
            </li>
          </ul>
        </nav>
        <div className="p-4 border-t border-blue-700">
          <button 
            onClick={() => navigate('/login')}
            className="w-full text-left px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-6 flex justify-between items-start">
            <div>
              <Button variant="ghost" onClick={() => navigate('/accounts')} className="mb-4 -ml-4">
                <ArrowLeft size={20} className="mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-2xl font-semibold text-gray-900">Order Review</h1>
              <p className="text-gray-600 mt-1">Review order pricing and approve conversion to sale</p>
            </div>
            <Badge className="bg-orange-500 text-white hover:bg-orange-600 text-sm px-4 py-2">
              Order Status: Pending Approval
            </Badge>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT CARD - Order Details */}
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 pb-4 border-b text-gray-900">Order Details</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-gray-600 text-sm">Order ID:</span>
                    <span className="font-medium text-sm">{orderDetails.orderId}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-gray-600 text-sm">Customer Type:</span>
                    <span className="font-medium text-sm">{orderDetails.customerType}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-gray-600 text-sm">Customer Name:</span>
                    <span className="font-medium text-sm">{orderDetails.customerName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-gray-600 text-sm">Created By:</span>
                    <span className="font-medium text-sm">{orderDetails.createdBy}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-gray-600 text-sm">Created Date:</span>
                    <span className="font-medium text-sm">{new Date(orderDetails.createdDate).toLocaleDateString()}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-gray-600 text-sm">Delivery Date:</span>
                    <span className="font-medium text-sm">{new Date(orderDetails.deliveryDate).toLocaleDateString()}</span>
                  </div>
                  <div className="pt-3 border-t">
                    <span className="text-gray-600 text-sm block mb-2">Site Address:</span>
                    <p className="font-medium text-sm whitespace-pre-line">{orderDetails.siteAddress}</p>
                  </div>
                  <div className="pt-3 border-t">
                    <span className="text-gray-600 text-sm block mb-2">Remarks:</span>
                    <p className="font-medium text-sm">{orderDetails.remarks}</p>
                  </div>
                </div>
              </Card>

              {/* Ordered Products Section */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 pb-4 border-b text-gray-900">Ordered Products</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left text-xs font-semibold text-gray-700 p-2">Product</th>
                        <th className="text-left text-xs font-semibold text-gray-700 p-2">Brand</th>
                        <th className="text-left text-xs font-semibold text-gray-700 p-2">SKU</th>
                        <th className="text-right text-xs font-semibold text-gray-700 p-2">Qty</th>
                        <th className="text-right text-xs font-semibold text-gray-700 p-2">DP (₹)</th>
                        <th className="text-right text-xs font-semibold text-gray-700 p-2">Disc%</th>
                        <th className="text-right text-xs font-semibold text-gray-700 p-2">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-gray-900">{item.product}</td>
                          <td className="p-2 text-gray-700">{item.brand}</td>
                          <td className="p-2 text-gray-700">{item.sku}</td>
                          <td className="p-2 text-right font-medium">{item.quantity}</td>
                          <td className="p-2 text-right font-medium">{item.dp.toLocaleString()}</td>
                          <td className="p-2 text-right text-orange-600">{item.discount}%</td>
                          <td className="p-2 text-right font-semibold">{item.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-50 font-semibold">
                        <td colSpan={6} className="p-2 text-right text-gray-900">Requested Total:</td>
                        <td className="p-2 text-right text-[#1e3a8a]">₹ {requestedTotal.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            </div>

            {/* RIGHT CARD - Pricing Approval */}
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 pb-4 border-b text-gray-900">Pricing Approval</h3>
                <p className="text-sm text-gray-600 mb-4">Review and adjust pricing for each product line item</p>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left text-xs font-semibold text-gray-700 p-2">Product</th>
                        <th className="text-right text-xs font-semibold text-gray-700 p-2">Qty</th>
                        <th className="text-right text-xs font-semibold text-gray-700 p-2">DP (₹)</th>
                        <th className="text-right text-xs font-semibold text-gray-700 p-2">Disc%</th>
                        <th className="text-right text-xs font-semibold text-gray-700 p-2">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-2 text-gray-900 font-medium">{item.product}</td>
                          <td className="p-2 text-right text-gray-700">{item.quantity}</td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.approvedDP}
                              onChange={(e) => handleApprovedDPChange(item.id, e.target.value)}
                              className="h-8 text-right text-sm w-24"
                            />
                          </td>
                          <td className="p-2">
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={item.approvedDiscount}
                                onChange={(e) => handleApprovedDiscountChange(item.id, e.target.value)}
                                className="h-8 text-right text-sm w-20 pr-6"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.approvedAmount}
                              onChange={(e) => handleApprovedAmountChange(item.id, e.target.value)}
                              className="h-8 text-right text-sm w-28 bg-blue-50"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Order Summary Comparison */}
              <Card className="p-6 bg-gray-50 border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">Order Summary</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-2 font-medium">Sales Requested</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Subtotal:</span>
                        <span className="font-medium">₹ {requestedSubtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Discount:</span>
                        <span className="font-medium text-orange-600">- ₹ {requestedDiscount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="font-semibold">Total:</span>
                        <span className="font-bold">₹ {requestedTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 mb-2 font-medium">Approved Amount</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Subtotal:</span>
                        <span className="font-medium">₹ {approvedSubtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Discount:</span>
                        <span className="font-medium text-orange-600">- ₹ {approvedDiscount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="font-semibold">Total:</span>
                        <span className="font-bold text-[#1e3a8a]">₹ {approvedTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-lg text-gray-900">Grand Total (Approved):</span>
                    <span className="font-bold text-2xl text-[#1e3a8a]">₹ {approvedTotal.toLocaleString()}</span>
                  </div>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleApprove}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle size={20} className="mr-2" />
                  Approve & Convert to Sale
                </Button>
                <Button
                  onClick={handleReject}
                  variant="outline"
                  className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                >
                  <XCircle size={20} className="mr-2" />
                  Reject Order
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};