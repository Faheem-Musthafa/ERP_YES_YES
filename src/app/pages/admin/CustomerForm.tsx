import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { supabase } from '@/app/supabase';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

export const CustomerForm = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = Boolean(id);

    const [form, setForm] = useState({
        name: '',
        place: '',
        address: '',
        phone: '',
        pincode: '',
        gst_pan: '',
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);

    useEffect(() => {
        if (!isEdit) return;
        const fetchCustomer = async () => {
            const { data, error } = await supabase
                .from('customers')
                .select('name, place, address, phone, pincode, gst_pan')
                .eq('id', id)
                .single();
            if (error) { toast.error('Failed to load customer'); navigate('/admin/customers'); return; }
            setForm({
                name: data.name ?? '',
                place: data.place ?? '',
                address: data.address ?? '',
                phone: data.phone ?? '',
                pincode: data.pincode ?? '',
                gst_pan: data.gst_pan ?? '',
            });
            setFetching(false);
        };
        fetchCustomer();
    }, [id, isEdit, navigate]);

    const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [field]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Customer name is required'); return; }
        if (!form.phone.trim()) { toast.error('Phone number is required'); return; }
        if (!form.address.trim()) { toast.error('Address is required'); return; }

        setLoading(true);
        try {
            const payload = {
                name: form.name.trim(),
                place: form.place.trim() || null,
                address: form.address.trim(),
                phone: form.phone.trim(),
                pincode: form.pincode.trim() || null,
                gst_pan: form.gst_pan.trim() || null,
            };

            if (isEdit) {
                const { error } = await supabase.from('customers').update(payload).eq('id', id);
                if (error) throw error;
                toast.success('Customer updated successfully!');
            } else {
                const { error } = await supabase.from('customers').insert(payload);
                if (error) throw error;
                toast.success('Customer added successfully!');
            }
            navigate('/admin/customers');
        } catch (err: any) {
            toast.error(err.message || 'Failed to save customer');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-4 border-[#34b0a7] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div>
            {/* Breadcrumb */}
            <div className="mb-4 text-sm text-gray-500">
                <span>Admin</span><span className="mx-2">/</span>
                <span className="cursor-pointer hover:text-[#34b0a7]" onClick={() => navigate('/admin/customers')}>Customers</span>
                <span className="mx-2">/</span>
                <span className="text-gray-900 font-medium">{isEdit ? 'Edit Customer' : 'New Customer'}</span>
            </div>

            <div className="mb-6">
                <Button variant="ghost" onClick={() => navigate('/admin/customers')} className="mb-3">
                    <ArrowLeft size={18} className="mr-2" /> Back
                </Button>
                <h1 className="text-2xl font-semibold text-gray-900">
                    {isEdit ? 'Edit Customer' : 'Add New Customer'}
                </h1>
                <p className="text-gray-500 mt-1 text-sm">
                    {isEdit ? 'Update customer information below.' : 'Fill in the details to add a new customer.'}
                </p>
            </div>

            <Card className="p-6 max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-base font-semibold text-gray-800 border-b pb-2">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 space-y-1.5">
                                <Label>Customer Name *</Label>
                                <Input value={form.name} onChange={set('name')} placeholder="Enter full name or company name" required />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Place *</Label>
                                <Input value={form.place} onChange={set('place')} placeholder="e.g. Kochi, Chennai" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Phone Number *</Label>
                                <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="10-digit mobile number" required />
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-4">
                        <h3 className="text-base font-semibold text-gray-800 border-b pb-2">Address Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 space-y-1.5">
                                <Label>Full Address *</Label>
                                <Textarea
                                    value={form.address}
                                    onChange={set('address')}
                                    placeholder="Building, Street, Area..."
                                    rows={3}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Pin Code</Label>
                                <Input
                                    value={form.pincode}
                                    onChange={set('pincode')}
                                    placeholder="e.g. 682001"
                                    maxLength={6}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tax Info */}
                    <div className="space-y-4">
                        <h3 className="text-base font-semibold text-gray-800 border-b pb-2">Tax Information <span className="text-gray-400 font-normal text-sm">(Optional)</span></h3>
                        <div className="space-y-1.5">
                            <Label>GSTIN / PAN</Label>
                            <Input
                                value={form.gst_pan}
                                onChange={set('gst_pan')}
                                placeholder="e.g. 22AAAAA0000A1Z5"
                                className="uppercase"
                            />
                            <p className="text-xs text-gray-400">Leave blank if not applicable</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-[#34b0a7] hover:bg-[#2a9d94] text-white flex items-center gap-2"
                        >
                            <Save size={16} /> {loading ? 'Saving...' : isEdit ? 'Update Customer' : 'Add Customer'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => navigate('/admin/customers')}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};
