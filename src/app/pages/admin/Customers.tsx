import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/app/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Plus, Search, Phone, MapPin, Edit2, ToggleLeft, ToggleRight, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export const Customers = () => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchCustomers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('customers')
            .select('id, name, place, address, phone, pincode, gst_pan, is_active, created_at')
            .order('name');
        if (error) toast.error('Failed to load customers');
        else setCustomers(data ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchCustomers(); }, []);

    const toggleActive = async (id: string, current: boolean) => {
        const { error } = await supabase.from('customers').update({ is_active: !current }).eq('id', id);
        if (error) toast.error('Failed to update status');
        else { toast.success(`Customer ${current ? 'deactivated' : 'activated'}`); fetchCustomers(); }
    };

    const deleteCustomer = async (id: string, name: string) => {
        if (!window.confirm(`Delete "${name}" permanently? This cannot be undone.`)) return;
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) toast.error('Failed to delete customer');
        else { toast.success('Customer deleted'); fetchCustomers(); }
    };

    const filtered = customers.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        c.place?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customers</h1>
                    <p className="text-gray-500 mt-1 text-sm">{customers.length} total customers</p>
                </div>
                <Link to="/admin/customers/new">
                    <Button className="bg-[#34b0a7] hover:bg-[#2a9d94] text-white flex items-center gap-2 rounded-xl">
                        <Plus size={18} /> Add Customer
                    </Button>
                </Link>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                    placeholder="Search by name, phone, or place..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 rounded-xl"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="w-8 h-8 border-4 border-[#34b0a7] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                        <Users size={36} className="mb-2 opacity-30" />
                        <p>No customers found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Name</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Place</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Phone</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Pincode</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">GSTIN</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            <span className="flex items-center gap-1"><MapPin size={13} className="text-[#34b0a7]" /> {c.place || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            <span className="flex items-center gap-1"><Phone size={13} className="text-[#34b0a7]" /> {c.phone}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{c.pincode || '—'}</td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">{c.gst_pan || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                                {c.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link to={`/admin/customers/${c.id}/edit`}>
                                                    <Button variant="ghost" size="sm" className="text-[#34b0a7] hover:bg-teal-50 h-8 w-8 p-0">
                                                        <Edit2 size={15} />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleActive(c.id, c.is_active)}
                                                    className={`h-8 w-8 p-0 ${c.is_active ? 'text-gray-400 hover:text-red-500' : 'text-gray-400 hover:text-green-500'}`}
                                                    title={c.is_active ? 'Deactivate' : 'Activate'}
                                                >
                                                    {c.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => deleteCustomer(c.id, c.name)}
                                                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                                                    title="Delete permanently"
                                                >
                                                    <Trash2 size={15} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
