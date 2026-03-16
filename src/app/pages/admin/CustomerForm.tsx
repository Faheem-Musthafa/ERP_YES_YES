import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { supabase } from '@/app/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { ArrowLeft, Save, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, FormCard, FormSection, Spinner } from '@/app/components/ui/primitives';

export const CustomerForm = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = Boolean(id);

    const [form, setForm] = useState({
        name: '', place: '', address: '', phone: '', pincode: '', gst_pan: '',
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);

    useEffect(() => {
        if (!isEdit) return;
        (async () => {
            const { data, error } = await supabase
                .from('customers')
                .select('name, place, address, phone, pincode, gst_pan')
                .eq('id', id)
                .single();
            if (error) { toast.error('Failed to load customer'); navigate('/admin/customers'); return; }
            setForm({
                name: data.name ?? '', place: data.place ?? '', address: data.address ?? '',
                phone: data.phone ?? '', pincode: data.pincode ?? '', gst_pan: data.gst_pan ?? '',
            });
            setFetching(false);
        })();
    }, [id, isEdit, navigate]);

    const field = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Customer name is required'); return; }
        if (!form.phone.trim()) { toast.error('Phone number is required'); return; }
        if (!form.address.trim()) { toast.error('Address is required'); return; }
        setLoading(true);
        try {
            const payload = {
                name: form.name.trim(), place: form.place.trim() || null,
                address: form.address.trim(), phone: form.phone.trim(),
                pincode: form.pincode.trim() || null, gst_pan: form.gst_pan.trim() || null,
            };
            if (isEdit) {
                const { error } = await supabase.from('customers').update(payload).eq('id', id);
                if (error) throw error;
                toast.success('Customer updated!');
            } else {
                const { error } = await supabase.from('customers').insert(payload);
                if (error) throw error;
                toast.success('Customer added!');
            }
            navigate('/admin/customers');
        } catch (err: any) {
            toast.error(err.message || 'Failed to save customer');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <Spinner />;

    const hasChanges = Boolean(
        form.name.trim() || form.place.trim() || form.address.trim() || form.phone.trim() || form.pincode.trim() || form.gst_pan.trim()
    );

    const handleCancel = () => {
        if (!hasChanges || window.confirm('Discard current changes?')) {
            navigate('/admin/customers');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={isEdit ? 'Edit Customer' : 'Add New Customer'}
                subtitle={isEdit ? 'Update customer information below.' : 'Fill in the details to add a new customer.'}
                actions={
                    <Button variant="ghost" size="sm" onClick={handleCancel} className="gap-2">
                        <ArrowLeft size={15} /> Back to Customers
                    </Button>
                }
            />

            <FormCard>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <FormSection title="Basic Information" subtitle="Capture customer identity and contact details clearly.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 space-y-1.5">
                                <Label>Customer Name <span className="text-destructive">*</span></Label>
                                <Input value={form.name} onChange={field('name')} placeholder="Full name or company name" required />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Place</Label>
                                <Input value={form.place} onChange={field('place')} placeholder="e.g. Kochi, Chennai" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Phone Number <span className="text-destructive">*</span></Label>
                                <Input type="tel" value={form.phone} onChange={field('phone')} placeholder="10-digit mobile number" required />
                            </div>
                        </div>
                    </FormSection>

                    <FormSection title="Address Details" subtitle="Use complete address data for invoicing and delivery operations.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 space-y-1.5">
                                <Label>Full Address <span className="text-destructive">*</span></Label>
                                <Textarea value={form.address} onChange={field('address')} placeholder="Building, Street, Area..." rows={3} required />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Pin Code</Label>
                                <Input value={form.pincode} onChange={field('pincode')} placeholder="e.g. 682001" maxLength={6} />
                            </div>
                        </div>
                    </FormSection>

                    <FormSection title="Tax Information" subtitle="Optional — leave blank if not applicable">
                        <div className="space-y-1.5">
                            <Label>GSTIN / PAN</Label>
                            <Input value={form.gst_pan} onChange={field('gst_pan')} placeholder="e.g. 22AAAAA0000A1Z5" className="uppercase" />
                        </div>
                    </FormSection>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        Fields marked with * are required. Verify phone number and address before saving.
                    </div>

                    <div className="sticky bottom-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 rounded-xl border border-border p-3 flex flex-col-reverse sm:flex-row gap-3 sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">{isEdit ? 'Updating this customer will affect future transactions.' : 'New customer will be available immediately in sales forms.'}</p>
                        <div className="flex gap-3">
                        <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                            <Save size={15} />
                            {loading ? 'Saving...' : isEdit ? 'Update Customer' : 'Add Customer'}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
                        </div>
                    </div>
                </form>
            </FormCard>
        </div>
    );
};
