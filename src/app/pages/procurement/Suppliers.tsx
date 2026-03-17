import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Plus, Eye, Phone, Mail, Users } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { PageHeader, SearchBar, DataCard, EmptyState, Spinner } from '@/app/components/ui/primitives';

interface SupplierRow {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  purchase_orders: { id: string }[] | null;
}

export const Suppliers = () => {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('suppliers')
        .select('id, name, contact_person, phone, email, status, purchase_orders(id)')
        .order('name', { ascending: true });
      setSuppliers((data ?? []) as SupplierRow[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => suppliers.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.contact_person ?? '').toLowerCase().includes(q) || (s.phone ?? '').includes(q);
  }), [suppliers, search]);

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
        value={search} onChange={setSearch}
        className="max-w-sm"
      />

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <DataCard>
          <EmptyState icon={Users} message="No suppliers found" sub="Add your first supplier to begin" />
        </DataCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <DataCard key={s.id} className="p-5 flex flex-col hover:border-primary/30 transition-colors group">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{s.name}</h3>
                  <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {s.status}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title={`View supplier ${s.name}`}
                  aria-label={`View supplier ${s.name}`}
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                >
                  <Eye size={15} />
                </Button>
              </div>

              <div className="space-y-3 flex-1">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Contact Person</p>
                  <p className="text-sm font-semibold text-foreground">{s.contact_person ?? '—'}</p>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone size={13} className="text-primary/70 shrink-0" />
                  <span className="truncate">{s.phone ?? '—'}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail size={13} className="text-primary/70 shrink-0" />
                  <span className="truncate">{s.email ?? '—'}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-border mt-4 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Orders</span>
                <span className="text-sm font-bold font-mono text-foreground">{(s.purchase_orders ?? []).length}</span>
              </div>
            </DataCard>
          ))}
        </div>
      )}
    </div>
  );
};
