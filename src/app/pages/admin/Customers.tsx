import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/app/supabase';
import { Button } from '@/app/components/ui/button';
import { Plus, Phone, MapPin, Edit2, ToggleLeft, ToggleRight, UserCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    PageHeader, SearchBar, DataCard,
    StyledThead, StyledTh, StyledTr, StyledTd,
    EmptyState, Spinner, StatusBadge, IconBtn,
} from '@/app/components/ui/primitives';

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
            <PageHeader
                title="Customers"
                subtitle={`${customers.length} total customers`}
                actions={
                    <Link to="/admin/customers/new">
                        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                            <Plus size={15} /> Add Customer
                        </Button>
                    </Link>
                }
            />

            <SearchBar
                placeholder="Search by name, phone, or place..."
                value={search}
                onChange={setSearch}
                className="max-w-sm"
            />

            <DataCard>
                {loading ? <Spinner /> :
                    filtered.length === 0 ? (
                        <EmptyState icon={UserCircle} message="No customers found" sub={search ? 'Try a different search' : 'Add your first customer to get started'} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <StyledThead>
                                    <tr>
                                        <StyledTh>Name</StyledTh>
                                        <StyledTh>Place</StyledTh>
                                        <StyledTh>Phone</StyledTh>
                                        <StyledTh>Pincode</StyledTh>
                                        <StyledTh>GSTIN/PAN</StyledTh>
                                        <StyledTh>Status</StyledTh>
                                        <StyledTh right>Actions</StyledTh>
                                    </tr>
                                </StyledThead>
                                <tbody>
                                    {filtered.map(c => (
                                        <StyledTr key={c.id}>
                                            <StyledTd>
                                                <div>
                                                    <p className="font-semibold text-foreground">{c.name}</p>
                                                    {c.address && <p className="text-xs text-muted-foreground truncate max-w-[180px]" title={c.address}>{c.address}</p>}
                                                </div>
                                            </StyledTd>
                                            <StyledTd>
                                                {c.place ? (
                                                    <span className="flex items-center gap-1 text-muted-foreground">
                                                        <MapPin size={11} className="text-primary" />{c.place}
                                                    </span>
                                                ) : '—'}
                                            </StyledTd>
                                            <StyledTd>
                                                <span className="flex items-center gap-1 text-muted-foreground">
                                                    <Phone size={11} className="text-primary" />{c.phone}
                                                </span>
                                            </StyledTd>
                                            <StyledTd mono className="text-muted-foreground">{c.pincode || '—'}</StyledTd>
                                            <StyledTd mono className="text-xs text-muted-foreground">{c.gst_pan || '—'}</StyledTd>
                                            <StyledTd>
                                                <StatusBadge status={c.is_active ? 'Active' : 'Inactive'} />
                                            </StyledTd>
                                            <StyledTd right>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link to={`/admin/customers/${c.id}/edit`}>
                                                        <IconBtn title="Edit"><Edit2 size={14} /></IconBtn>
                                                    </Link>
                                                    <IconBtn
                                                        onClick={() => toggleActive(c.id, c.is_active)}
                                                        title={c.is_active ? 'Deactivate' : 'Activate'}
                                                    >
                                                        {c.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                                    </IconBtn>
                                                    <IconBtn
                                                        onClick={() => deleteCustomer(c.id, c.name)}
                                                        title="Delete permanently"
                                                        danger
                                                    >
                                                        <Trash2 size={14} />
                                                    </IconBtn>
                                                </div>
                                            </StyledTd>
                                        </StyledTr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                }
            </DataCard>
        </div>
    );
};
