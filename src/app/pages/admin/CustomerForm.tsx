import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { supabase } from '@/app/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { ArrowLeft, Save, UserCircle, Upload, Building2, Phone, MapPin, FileText, ChevronRight, Compass, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { PageHeader, FormCard, FormSection, Spinner, CustomTooltip } from '@/app/components/ui/primitives';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { DEFAULT_MASTER_DATA_SETTINGS, loadMasterDataSettings } from '@/app/settings';

export const CustomerForm = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = Boolean(id);

    const [form, setForm] = useState({
        name: '', place: '', address: '', phone: '', pincode: '', gst_pan: '', location: null as string | null, assigned_to: null as string | null, opening_balance: 0,
    });
    const [districtOptions, setDistrictOptions] = useState<string[]>(DEFAULT_MASTER_DATA_SETTINGS.districts);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [salesReps, setSalesReps] = useState<any[]>([]);

    useEffect(() => {
        void loadMasterDataSettings()
            .then((settings) => setDistrictOptions(settings.districts))
            .catch(() => {
                // Keep default districts if settings read fails.
            });
    }, []);

    useEffect(() => {
        if (!isEdit || !id) return;
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
                location: data.location ?? null, assigned_to: data.assigned_to ?? '', opening_balance: data.opening_balance ?? 0,
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
                location: (form.location || null) as any,
                assigned_to: form.assigned_to?.trim() || null,
                opening_balance: parseFloat(form.opening_balance?.toString() || '0') || 0,
            };
            if (isEdit) {
                if (!id) throw new Error('Customer ID is missing');
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
                    location: locationIdx >= 0 && districtOptions.includes(cols[locationIdx])
                        ? (cols[locationIdx] as any)
                        : null,
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
        <div className="space-y-8 pb-24 animate-in fade-in duration-500 max-w-4xl mx-auto">
            
            {/* Premium Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-xl py-4 border-b border-border/40 -mx-4 px-4 sm:-mx-6 sm:px-6 mb-6">
                <div>
                    <button onClick={handleCancel} className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors">
                        <ArrowLeft size={14} /> Back to Directory
                    </button>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3">
                        <UserCircle className="h-8 w-8 text-primary shadow-sm rounded-full bg-primary/10 p-1" />
                        {isEdit ? 'Update Customer Profile' : 'Register New Customer'}
                    </h1>
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                        {isEdit ? 'Modify identity and configuration details below.' : 'Establish a new client identity in the operations ledger.'}
                    </p>
                </div>
                <div className="flex gap-3">
                    {!isEdit && (
                        <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)} className="gap-2 h-10 rounded-xl font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                            <Upload size={16} className="text-primary" /> Multi-Import
                        </Button>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 relative">
                
                {/* Section 1: Basic Information */}
                <div className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md shadow-sm overflow-hidden transition-all hover:border-slate-300/80 dark:hover:border-slate-700">
                    <div className="px-6 md:px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-blue-50/50 dark:bg-blue-900/10 flex items-center gap-4">
                        <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl shadow-inner">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-0.5">Primary Identity</h3>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Base entity and contact</p>
                        </div>
                    </div>
                    <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                        <div className="md:col-span-2 space-y-2 group">
                            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Customer Name <span className="text-rose-500">*</span></Label>
                            <Input value={form.name} onChange={field('name')} placeholder="Full business or legal name" required className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 font-semibold" />
                        </div>
                        <div className="space-y-2 group">
                            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Geocode (Place)</Label>
                            <Input value={form.place} onChange={field('place')} placeholder="e.g. Kochi Terminal" className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50" />
                        </div>
                        <div className="space-y-2 group">
                            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">District Zone</Label>
                            <Select value={form.location ?? ''} onValueChange={(v) => setForm(f => ({ ...f, location: v || null }))}>
                                <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50"><SelectValue placeholder="Allocate operation sector" /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {districtOptions.map((district) => (
                                        <SelectItem key={district} value={district}>{district}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 group">
                            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Telecom Number <span className="text-rose-500">*</span></Label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"><Phone size={16} /></div>
                                <Input type="tel" value={form.phone} onChange={field('phone')} placeholder="Primary contact string" required className="pl-11 h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 font-mono tracking-widest" />
                            </div>
                        </div>
                        <div className="space-y-2 group">
                            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Sales Node Assignment</Label>
                            <Select value={form.assigned_to ?? ''} onValueChange={(v) => setForm(f => ({ ...f, assigned_to: v || null }))}>
                                <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 font-semibold text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-900 border-dashed"><SelectValue placeholder="Agnostic / Unassigned" /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="unassigned" className="text-slate-400 italic">Clear Assignment</SelectItem>
                                    {salesReps.map(rep => (
                                        <SelectItem key={rep.id} value={rep.id}>{rep.full_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Section 2: Address Details */}
                <div className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md shadow-sm overflow-hidden transition-all hover:border-slate-300/80 dark:hover:border-slate-700">
                    <div className="px-6 md:px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-emerald-50/50 dark:bg-emerald-900/10 flex items-center gap-4">
                        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl shadow-inner">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-0.5">Geographic Anchor</h3>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Invoicing & routing vector</p>
                        </div>
                    </div>
                    <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                        <div className="md:col-span-2 space-y-2 group">
                            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Absolute Address Path <span className="text-rose-500">*</span></Label>
                            <Textarea value={form.address} onChange={field('address')} placeholder="Suite, Building, Street mapping..." rows={3} required className="resize-none rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4" />
                        </div>
                        <div className="space-y-2 group">
                            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Pin / Zip Code</Label>
                            <Input value={form.pincode} onChange={field('pincode')} placeholder="e.g. 682001" maxLength={6} className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 font-mono tracking-widest" />
                        </div>
                    </div>
                </div>

                {/* Section 3: Tax Information */}
                <div className="rounded-[2rem] border border-violet-200/50 dark:border-violet-900/30 bg-gradient-to-tr from-violet-50/20 to-purple-50/10 dark:from-violet-950/10 dark:to-purple-950/10 backdrop-blur-md shadow-sm overflow-hidden relative">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-violet-400/10 blur-3xl rounded-full pointer-events-none" />
                    <div className="px-6 md:px-8 py-5 border-b border-violet-200/40 dark:border-violet-800/40 bg-white/40 dark:bg-slate-900/40 flex items-center gap-4 relative z-10">
                        <div className="p-2.5 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded-xl shadow-inner">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-0.5">Financial & Tax Binding</h3>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Legal identifier & initial state</p>
                        </div>
                    </div>
                    
                    <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div className="space-y-2 group">
                            <Label className="text-xs uppercase tracking-wider text-violet-700 dark:text-violet-400 font-bold">GSTIN / PAN Code</Label>
                            <Input value={form.gst_pan} onChange={field('gst_pan')} placeholder="Enter verified tax code" className="h-12 rounded-xl bg-white dark:bg-slate-900 uppercase font-mono tracking-widest shadow-inner border-violet-200 dark:border-violet-800 focus-visible:ring-violet-500/30" />
                        </div>
                        <div className="space-y-2 group">
                            <Label className="text-xs uppercase tracking-wider text-violet-700 dark:text-violet-400 font-bold">Opening Reference Amount</Label>
                            <Input type="number" value={form.opening_balance} onChange={(e) => setForm(f => ({ ...f, opening_balance: parseFloat(e.target.value) || 0 }))} placeholder="0.00" step="0.01" min="0" className="h-12 rounded-xl bg-white dark:bg-slate-900 font-mono tracking-widest text-lg shadow-inner border-violet-200 dark:border-violet-800 focus-visible:ring-violet-500/30" />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 dark:bg-amber-950/20 px-5 py-4 text-xs font-medium text-amber-700 dark:text-amber-500 flex items-center gap-3 w-max max-w-full">
                    <ShieldCheck size={18} className="shrink-0 text-amber-600/80" />
                    <span>Fields denoted with <span className="text-rose-500 font-black">*</span> are absolute parameters. Ensure telecom numbers are verifiable.</span>
                </div>

                {/* Floating Action Controller */}
                <div className="sticky bottom-4 z-30 bg-background/90 backdrop-blur-xl shadow-2xl rounded-[1.5rem] border border-slate-200/80 dark:border-slate-700 p-4 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between transform transition-all hover:bg-background/95">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-2 hidden md:block">
                        {isEdit ? 'Mutation commits permanently to the ledger.' : 'New identities instantiate instantly across terminal views.'}
                    </p>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button type="button" variant="outline" onClick={handleCancel} className="flex-1 sm:flex-none h-12 px-6 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold transition-all">
                            Discard
                        </Button>
                        <Button type="submit" disabled={loading} className="flex-1 sm:flex-none h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold tracking-wide shadow-lg hover:shadow-primary/25 transition-all w-full sm:min-w-[200px] text-sm">
                            {loading ? (
                                <div className="flex items-center gap-2 justify-center">
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Executing
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 justify-center">
                                    {isEdit ? 'Commit Update' : 'Initialize Profile'} <ChevronRight size={16} />
                                </div>
                            )}
                        </Button>
                    </div>
                </div>
            </form>

            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-2xl p-0 overflow-hidden">
                    <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-slate-900 p-6 md:p-8">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white">Bulk Data Ingestion</DialogTitle>
                            <DialogDescription className="text-slate-500 font-medium">Inject raw CSV arrays directly into the customer persistence layer.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                            <div className="p-6 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-2xl bg-white/50 dark:bg-slate-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex flex-col items-center justify-center gap-4 group">
                                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full group-hover:scale-110 transition-transform">
                                   <Upload size={24} />
                                </div>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleCSVUpload(file);
                                    }}
                                    disabled={uploadLoading}
                                    className="block w-full max-w-sm text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer text-center"
                                />
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-xs text-slate-500 font-medium leading-relaxed">
                                <p className="mb-2"><span className="font-bold text-slate-700 dark:text-slate-300">Absolute schemas:</span> name, phone, address</p>
                                <p className="mb-2"><span className="font-bold text-slate-700 dark:text-slate-300">Optional vectors:</span> place, location, pincode, gst_pan</p>
                                <p><span className="font-bold text-slate-700 dark:text-slate-300">Auto-allocation:</span> The <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">sales_rep</code> column supports exact email or full name matching for implicit relationship mapping.</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}