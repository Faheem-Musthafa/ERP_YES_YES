import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Plus, Pencil, Search } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { toast } from 'sonner';

export const Brands = () => {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchBrands = async () => {
    setLoading(true);
    const { data } = await supabase.from('brands').select('id, name, is_active, created_at').order('name');
    setBrands(data ?? []);
    setLoading(false);
  };
  useEffect(() => { fetchBrands(); }, []);

  const openAdd = () => { setEditing(null); setName(''); setOpen(true); };
  const openEdit = (b: any) => { setEditing(b); setName(b.name); setOpen(true); };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Brand name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from('brands').update({ name: name.trim() }).eq('id', editing.id);
        if (error) throw error;
        toast.success('Brand updated!');
      } else {
        const { error } = await supabase.from('brands').insert({ name: name.trim(), is_active: true });
        if (error) throw error;
        toast.success('Brand added!');
      }
      setOpen(false);
      fetchBrands();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save brand');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (b: any) => {
    await supabase.from('brands').update({ is_active: !b.is_active }).eq('id', b.id);
    fetchBrands();
  };

  const filtered = brands.filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Brands</h1>
          <p className="text-gray-600 mt-1">Manage product brands</p>
        </div>
        <Button onClick={openAdd} className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"><Plus size={18} className="mr-2" />Add Brand</Button>
      </div>

      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input placeholder="Search brands..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">Brand Name</th>
                  <th className="text-center text-xs font-semibold text-gray-700 p-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-700 p-3">Added On</th>
                  <th className="text-center text-xs font-semibold text-gray-700 p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm font-medium">{b.name}</td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{b.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="p-3 text-sm text-gray-500">{new Date(b.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(b)} className="h-8"><Pencil size={14} /></Button>
                        <Button size="sm" variant="outline" onClick={() => toggleActive(b)} className={`h-8 text-xs ${b.is_active ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}>
                          {b.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Brand' : 'Add New Brand'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Brand Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Enter brand name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
