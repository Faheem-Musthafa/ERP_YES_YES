import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useNavigate } from 'react-router';
import { FileText, Plus } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import {
  PageHeader, SearchBar, DataCard,
  StyledThead, StyledTh, StyledTr, StyledTd,
  StatusBadge, EmptyState, Spinner
} from '@/app/components/ui/primitives';

export const MyOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, status, company, invoice_type, grand_total, delivery_date, created_at, customers(name)')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      setOrders(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.order_number.toLowerCase().includes(search.toLowerCase()) || (o.customers?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Orders"
        subtitle="Track all your submitted orders"
        actions={
          <Button size="sm" onClick={() => navigate('/sales/create-order')} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus size={15} /> Create Order
          </Button>
        }
      />

      <div className="flex gap-3 flex-wrap">
        <SearchBar
          placeholder="Search by order no / customer..."
          value={search} onChange={setSearch}
          className="min-w-[280px]"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Billed">Billed</SelectItem>
            <SelectItem value="Delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataCard>
        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState icon={FileText} message="No orders found" sub="Submit your first order to see it here" action={<Button onClick={() => navigate('/sales/create-order')} variant="outline" size="sm" className="mt-4">Create Order</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <StyledThead>
                <tr>
                  <StyledTh>Order No</StyledTh>
                  <StyledTh>Customer</StyledTh>
                  <StyledTh>Company</StyledTh>
                  <StyledTh>Invoice Type</StyledTh>
                  <StyledTh right>Grand Total</StyledTh>
                  <StyledTh>Delivery Date</StyledTh>
                  <StyledTh>Status</StyledTh>
                  <StyledTh>Created</StyledTh>
                </tr>
              </StyledThead>
              <tbody>
                {filtered.map(order => (
                  <StyledTr key={order.id} onClick={() => { /* View details later */ }} className="cursor-pointer group">
                    <StyledTd className="font-semibold text-primary group-hover:underline">{order.order_number}</StyledTd>
                    <StyledTd className="font-medium text-foreground">{order.customers?.name ?? '—'}</StyledTd>
                    <StyledTd className="text-muted-foreground">{order.company}</StyledTd>
                    <StyledTd className="text-muted-foreground">{order.invoice_type}</StyledTd>
                    <StyledTd right mono className="font-bold">₹{order.grand_total?.toLocaleString('en-IN')}</StyledTd>
                    <StyledTd mono className="text-xs text-muted-foreground">{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '—'}</StyledTd>
                    <StyledTd><StatusBadge status={order.status} /></StyledTd>
                    <StyledTd mono className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</StyledTd>
                  </StyledTr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>
    </div>
  );
};
