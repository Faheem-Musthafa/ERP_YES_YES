import React from 'react';
import { Button } from '@/app/components/ui/button';
import { Plus, Eye, Phone, Mail, Users } from 'lucide-react';
import { PageHeader, SearchBar, DataCard, EmptyState } from '@/app/components/ui/primitives';

export const Suppliers = () => {
  const suppliers = [
    { id: 1, name: 'Supplier A', contact: 'Rajesh Kumar', phone: '+91 98765 43210', email: 'rajesh@suppliera.com', totalPOs: 45, status: 'Active' },
    { id: 2, name: 'Supplier B', contact: 'Priya Sharma', phone: '+91 98765 43211', email: 'priya@supplierb.com', totalPOs: 32, status: 'Active' },
    { id: 3, name: 'Supplier C', contact: 'Amit Patel', phone: '+91 98765 43212', email: 'amit@supplierc.com', totalPOs: 28, status: 'Active' },
    { id: 4, name: 'Supplier D', contact: 'Neha Gupta', phone: '+91 98765 43213', email: 'neha@supplierd.com', totalPOs: 19, status: 'Active' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Suppliers Management"
        subtitle="Manage supplier information and relationships"
        actions={
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus size={15} /> Add Supplier
          </Button>
        }
      />

      <SearchBar
        placeholder="Search suppliers..."
        value="" onChange={() => { }}
        className="max-w-sm"
      />

      {suppliers.length === 0 ? (
        <DataCard>
          <EmptyState icon={Users} message="No suppliers found" sub="Add your first supplier to begin" />
        </DataCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <DataCard key={s.id} className="p-5 flex flex-col hover:border-primary/30 transition-colors group">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{s.name}</h3>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {s.status}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                  <Eye size={15} />
                </Button>
              </div>

              <div className="space-y-3 flex-1">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Contact Person</p>
                  <p className="text-sm font-semibold text-foreground">{s.contact}</p>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone size={13} className="text-primary/70 shrink-0" />
                  <span className="truncate">{s.phone}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail size={13} className="text-primary/70 shrink-0" />
                  <span className="truncate">{s.email}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-border mt-4 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Orders</span>
                <span className="text-sm font-bold font-mono text-foreground">{s.totalPOs}</span>
              </div>
            </DataCard>
          ))}
        </div>
      )}
    </div>
  );
};
