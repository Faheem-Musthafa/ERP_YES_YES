import React from 'react';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Eye } from 'lucide-react';

export const MyOrders = () => {
  const orders = [
    {
      id: 'ORD-2001',
      customer: 'ABC Corp',
      product: 'Product A',
      quantity: 50,
      status: 'Pending',
      date: '2026-01-18',
    },
    {
      id: 'ORD-2002',
      customer: 'XYZ Ltd',
      product: 'Product B',
      quantity: 30,
      status: 'Approved',
      date: '2026-01-17',
    },
    {
      id: 'ORD-2003',
      customer: 'Demo Industries',
      product: 'Product C',
      quantity: 75,
      status: 'Billed',
      date: '2026-01-16',
    },
    {
      id: 'ORD-2004',
      customer: 'Test Company',
      product: 'Product D',
      quantity: 20,
      status: 'Delivered',
      date: '2026-01-15',
    },
    {
      id: 'ORD-2005',
      customer: 'ABC Corp',
      product: 'Product A',
      quantity: 100,
      status: 'Approved',
      date: '2026-01-14',
    },
  ];

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      Pending: 'bg-orange-100 text-orange-700',
      Approved: 'bg-blue-100 text-blue-700',
      Billed: 'bg-purple-100 text-purple-700',
      Delivered: 'bg-green-100 text-green-700',
    };
    return (
      <Badge className={statusStyles[status as keyof typeof statusStyles] || ''}>
        {status}
      </Badge>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My Orders</h1>
        <p className="text-gray-600 mt-1">View and track all your orders</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell>{order.product}</TableCell>
                <TableCell>{order.quantity}</TableCell>
                <TableCell>{getStatusBadge(order.status)}</TableCell>
                <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <Eye size={16} className="mr-2" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};