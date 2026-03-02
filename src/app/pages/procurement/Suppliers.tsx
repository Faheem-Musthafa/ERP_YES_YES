import React from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Search, Plus, Eye, Phone, Mail } from 'lucide-react';

export const Suppliers = () => {
  const suppliers = [
    { id: 1, name: 'Supplier A', contact: 'Rajesh Kumar', phone: '+91 98765 43210', email: 'rajesh@suppliera.com', totalPOs: 45, status: 'Active' },
    { id: 2, name: 'Supplier B', contact: 'Priya Sharma', phone: '+91 98765 43211', email: 'priya@supplierb.com', totalPOs: 32, status: 'Active' },
    { id: 3, name: 'Supplier C', contact: 'Amit Patel', phone: '+91 98765 43212', email: 'amit@supplierc.com', totalPOs: 28, status: 'Active' },
    { id: 4, name: 'Supplier D', contact: 'Neha Gupta', phone: '+91 98765 43213', email: 'neha@supplierd.com', totalPOs: 19, status: 'Active' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Suppliers Management</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage supplier information and relationships</p>
        </div>
        <Button className="bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl">
          <Plus size={16} className="mr-2" />
          Add Supplier
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input
          placeholder="Search suppliers..."
          className="pl-10 rounded-xl"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">{supplier.name}</h3>
                <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  {supplier.status}
                </span>
              </div>
              <Button variant="outline" size="sm">
                <Eye size={14} />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Contact Person</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{supplier.contact}</p>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Phone size={14} className="text-gray-400" />
                <span>{supplier.phone}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Mail size={14} className="text-gray-400" />
                <span>{supplier.email}</span>
              </div>

              <div className="pt-3 border-t border-gray-50 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Total Purchase Orders</span>
                  <span className="text-sm font-bold text-gray-900">{supplier.totalPOs}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
