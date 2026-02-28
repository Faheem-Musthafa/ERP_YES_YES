import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/app/supabase';
import { Card } from '@/app/components/ui/card';
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
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="text-[#34b0a7]" size={28} /> Customers
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">{customers.length} total customers</p>
                </div>
                <Link to="/admin/customers/new">
                    <Button className="bg-[#34b0a7] hover:bg-[#2a9d94] text-white flex items-center gap-2">
                        <Plus size={18} /> Add Customer
                    </Button>
                </Link>
            </div>

            {/* Search */}
            <Card className="p-4 mb-4">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                        placeholder="Search by name, phone, or place..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden">
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
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Place</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Phone</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Pincode</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">GSTIN</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
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
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
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
            </Card>
        </div>
    );
};
