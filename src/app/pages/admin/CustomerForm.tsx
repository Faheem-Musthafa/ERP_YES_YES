import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { supabase } from '@/app/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { ArrowLeft, Save, UserCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { PageHeader, FormCard, FormSection, Spinner, CustomTooltip } from '@/app/components/ui/primitives';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';

export const CustomerForm = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = Boolean(id);

    const [form, setForm] = useState({
        name: '', place: '', address: '', phone: '', pincode: '', gst_pan: '', location: null as string | null, assigned_to: null as string | null, opening_balance: 0,
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [salesReps, setSalesReps] = useState<any[]>([]);

    useEffect(() => {
        if (!isEdit) return;
        (async () => {
            const { data, error } = await supabase
                .from('customers')
                .select('name, place, address, phone, pincode, gst_pan, location, assigned_to, opening_balance')
                .eq('id', id)
                .single();
            if (error) { toast.error('Failed to load customer'); navigate('/admin/customers'); return; }
            setForm({
                name: data.name ?? '', place: data.place ?? '', address: data.address ?? '',
                phone: data.phone ?? '', pincode: data.pincode ?? '', gst_pan: data.gst_pan ?? '',
                location: data.location ?? '', assigned_to: data.assigned_to ?? '', opening_balance: data.opening_balance ?? 0,
            });
            setFetching(false);
        })();
    }, [id, isEdit, navigate]);

    useEffect(() => {
        (async () => {
            const { data } = await supabase
                .from('users')
                .select('id, full_name')
                .eq('role', 'sales')
                .eq('is_active', true)
                .order('full_name');
            setSalesReps(data ?? []);
        })();
    }, []);

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
                location: form.location.trim() || null,
                assigned_to: form.assigned_to.trim() || null,
                opening_balance: parseFloat(form.opening_balance?.toString() || '0') || 0,
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

    const handleCSVUpload = async (file: File) => {
        setUploadLoading(true);
        try {
            const text = await file.text();
            const lines = text.trim().split('\n');
            if (lines.length < 2) { toast.error('CSV must have at least a header and one row'); return; }

            const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
            const nameIdx = headers.indexOf('name');
            const phoneIdx = headers.indexOf('phone');
            const addressIdx = headers.indexOf('address');
            const placeIdx = headers.indexOf('place');
            const locationIdx = headers.indexOf('location');
            const pincodeIdx = headers.indexOf('pincode');
            const gstIdx = headers.indexOf('gst_pan');
            const salesRepIdx = headers.indexOf('sales_rep') !== -1 ? headers.indexOf('sales_rep') : headers.indexOf('assigned_to');

            if (nameIdx === -1 || phoneIdx === -1 || addressIdx === -1) {
                toast.error('CSV must have columns: name, phone, address');
                return;
            }

            // Fetch all sales reps for mapping
            const { data: allSalesReps } = await supabase
                .from('users')
                .select('id, full_name, email')
                .eq('role', 'sales')
                .eq('is_active', true);

            const salesRepMap = new Map<string, string>();
            allSalesReps?.forEach(rep => {
                salesRepMap.set(rep.full_name.toLowerCase(), rep.id);
                salesRepMap.set(rep.email.toLowerCase(), rep.id);
            });

            const toInsert = lines.slice(1).map(line => {
                const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
                let assignedToId = null;

                if (salesRepIdx >= 0 && cols[salesRepIdx]) {
                    const repLookup = cols[salesRepIdx].toLowerCase();
                    assignedToId = salesRepMap.get(repLookup) || null;
                }

                return {
                    name: cols[nameIdx] || '',
                    phone: cols[phoneIdx] || '',
                    address: cols[addressIdx] || '',
                    place: placeIdx >= 0 ? cols[placeIdx] || null : null,
                    location: locationIdx >= 0 ? cols[locationIdx] || null : null,
                    pincode: pincodeIdx >= 0 ? cols[pincodeIdx] || null : null,
                    gst_pan: gstIdx >= 0 ? cols[gstIdx] || null : null,
                    assigned_to: assignedToId,
                    is_active: true,
                };
            }).filter(r => r.name && r.phone && r.address);

            if (toInsert.length === 0) { toast.error('No valid rows to import'); return; }

            const { error } = await supabase.from('customers').insert(toInsert);
            if (error) throw error;

            toast.success(`Imported ${toInsert.length} customers successfully!`);
            setUploadOpen(false);
            setTimeout(() => navigate('/admin/customers'), 1000);
        } catch (err: any) {
            toast.error(err.message || 'Failed to import CSV');
        } finally {
            setUploadLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={isEdit ? 'Edit Customer' : 'Add New Customer'}
                subtitle={isEdit ? 'Update customer information below.' : 'Fill in the details to add a new customer.'}
                actions={
                    <div className="flex gap-2">
                        {!isEdit && (
                            <CustomTooltip content="Import multiple customers from CSV file" side="bottom">
                                <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)} className="gap-2">
                                    <Upload size={15} /> Bulk Import
                                </Button>
                            </CustomTooltip>
                        )}
                        <CustomTooltip content="Go back to customer list" side="bottom">
                            <Button variant="ghost" size="sm" onClick={handleCancel} className="gap-2">
                                <ArrowLeft size={15} /> Back to Customers
                            </Button>
                        </CustomTooltip>
                    </div>
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
                                <Label>Location (District)</Label>
                                <Select value={form.location ?? ''} onValueChange={(v) => setForm(f => ({ ...f, location: v || null }))}>
                                    <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Kasaragod">Kasaragod</SelectItem>
                                        <SelectItem value="Kannur">Kannur</SelectItem>
                                        <SelectItem value="Wayanad">Wayanad</SelectItem>
                                        <SelectItem value="Kozhikode">Kozhikode</SelectItem>
                                        <SelectItem value="Malappuram">Malappuram</SelectItem>
                                        <SelectItem value="Palakkad">Palakkad</SelectItem>
                                        <SelectItem value="Thrissur">Thrissur</SelectItem>
                                        <SelectItem value="Ernakulam">Ernakulam</SelectItem>
                                        <SelectItem value="Idukki">Idukki</SelectItem>
                                        <SelectItem value="Kottayam">Kottayam</SelectItem>
                                        <SelectItem value="Alappuzha">Alappuzha</SelectItem>
                                        <SelectItem value="Pathanamthitta">Pathanamthitta</SelectItem>
                                        <SelectItem value="Kollam">Kollam</SelectItem>
                                        <SelectItem value="Thiruvananthapuram">Thiruvananthapuram</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Phone Number <span className="text-destructive">*</span></Label>
                                <Input type="tel" value={form.phone} onChange={field('phone')} placeholder="10-digit mobile number" required />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <Label>Assign to Sales Rep</Label>
                                <Select value={form.assigned_to ?? ''} onValueChange={(v) => setForm(f => ({ ...f, assigned_to: v || null }))}>
                                    <SelectTrigger><SelectValue placeholder="Select sales rep (optional)" /></SelectTrigger>
                                    <SelectContent>
                                        {salesReps.map(rep => (
                                            <SelectItem key={rep.id} value={rep.id}>{rep.full_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>GSTIN / PAN</Label>
                                <Input value={form.gst_pan} onChange={field('gst_pan')} placeholder="e.g. 22AAAAA0000A1Z5" className="uppercase" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Opening Balance</Label>
                                <Input type="number" value={form.opening_balance} onChange={(e) => setForm(f => ({ ...f, opening_balance: parseFloat(e.target.value) || 0 }))} placeholder="0.00" step="0.01" min="0" />
                            </div>
                        </div>
                    </FormSection>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        Fields marked with * are required. Verify phone number and address before saving.
                    </div>

                    <div className="sticky bottom-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 rounded-xl border border-border p-3 flex flex-col-reverse sm:flex-row gap-3 sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">{isEdit ? 'Updating this customer will affect future transactions.' : 'New customer will be available immediately in sales forms.'}</p>
                        <div className="flex gap-3">
                            <CustomTooltip content={isEdit ? 'Update customer information' : 'Save new customer'} side="top">
                                <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                                    <Save size={15} />
                                    {loading ? 'Saving...' : isEdit ? 'Update Customer' : 'Add Customer'}
                                </Button>
                            </CustomTooltip>
                            <CustomTooltip content="Discard changes and go back" side="top">
                                <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
                            </CustomTooltip>
                        </div>
                    </div>
                </form>
            </FormCard>

            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bulk Import Customers</DialogTitle>
                        <DialogDescription>Upload a CSV file with columns: name, phone, address, place, location, pincode, gst_pan</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleCSVUpload(file);
                            }}
                            disabled={uploadLoading}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        />
                        <p className="text-xs text-muted-foreground">
                            <strong>Required columns:</strong> name, phone, address<br />
                            <strong>Optional columns:</strong> place, location, pincode, gst_pan, sales_rep<br />
                            <strong>Sales Rep column:</strong> Use sales rep full name or email to auto-assign
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
