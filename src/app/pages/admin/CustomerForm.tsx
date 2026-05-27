import React, { useState, useEffect, useRef } from 'react';
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
import { LIMITS, sanitizeDigits, sanitizeMultilineText, sanitizePhone, sanitizeText, sanitizeUpperAlnum, validateGSTIN, validatePAN, validatePhone, validatePincode, validateRequired } from '@/app/validation';
import { INDIAN_STATES, normalizeStateInput } from '@/app/constants/indianStates';
import { COMPANY_LIST, isCompanyEnum } from '@/app/companyProfiles';
import type { CompanyEnum } from '@/app/types/database';

export const CustomerForm = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = Boolean(id);

    const [form, setForm] = useState({
        name: '', place: '', address: '', phone: '', second_phone: '', pincode: '', gst_pan: '', pan_no: '', location: null as string | null, state: 'Kerala' as string | null, company: null as CompanyEnum | null, opening_invoice: 0, opening_delivery_challan: 0,
    });
    const [districtOptions, setDistrictOptions] = useState<string[]>(DEFAULT_MASTER_DATA_SETTINGS.districts);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        void loadMasterDataSettings()
            .then((settings) => setDistrictOptions(settings.districts))
            .catch(() => {
                // Keep default districts if settings read fails.
            });
    }, []);

    useEffect(() => () => {
        if (navTimerRef.current) {
            clearTimeout(navTimerRef.current);
            navTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!isEdit || !id) return;
        (async () => {
            const { data, error } = await supabase
                .from('customers')
                .select('name, place, address, phone, second_phone, pincode, gst_pan, pan_no, location, state, company, opening_invoice, opening_delivery_challan')
                .eq('id', id)
                .single();
            if (error) { toast.error('Failed to load customer'); navigate('/admin/customers'); return; }
            setForm({
                name: data.name ?? '', place: data.place ?? '', address: data.address ?? '',
                phone: data.phone ?? '', second_phone: data.second_phone ?? '', pincode: data.pincode ?? '', gst_pan: data.gst_pan ?? '', pan_no: data.pan_no ?? '',
                location: data.location ?? null,
                state: data.state ?? null,
                company: data.company ?? null,
                opening_invoice: data.opening_invoice ?? 0,
                opening_delivery_challan: data.opening_delivery_challan ?? 0,
            });
            setFetching(false);
        })();
    }, [id, isEdit, navigate]);

    const field = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                name: sanitizeText(form.name, LIMITS.longText),
                place: sanitizeText(form.place, LIMITS.mediumText) || null,
                address: sanitizeMultilineText(form.address, LIMITS.address),
                phone: sanitizePhone(form.phone),
                second_phone: sanitizePhone(form.second_phone) || null,
                pincode: sanitizeDigits(form.pincode, LIMITS.pincode) || null,
                gst_pan: sanitizeUpperAlnum(form.gst_pan, LIMITS.gstin) || null,
                pan_no: sanitizeUpperAlnum(form.pan_no, LIMITS.pan) || null,
                state: (form.state || null) as any,
                location: ((form.state === 'Kerala' ? form.location : null) || null) as any,
                company: form.company,
                opening_invoice: parseFloat(form.opening_invoice?.toString() || '0') || 0,
                opening_delivery_challan: parseFloat(form.opening_delivery_challan?.toString() || '0') || 0,
            };
            validateRequired(payload.name, 'Customer name');
            validateRequired(payload.phone, 'Phone number');
            validateRequired(payload.address, 'Address');
            validateRequired(payload.company ?? '', 'Owning company');
            validatePhone(payload.phone);
            if (payload.second_phone) validatePhone(payload.second_phone, 'Alternate phone number');
            if (payload.pincode) validatePincode(payload.pincode);
            if (payload.gst_pan) validateGSTIN(payload.gst_pan);
            if (payload.pan_no) validatePAN(payload.pan_no);
            if (!Number.isFinite(payload.opening_invoice)) throw new Error('Invoice opening balance must be a valid number');
            if (!Number.isFinite(payload.opening_delivery_challan)) throw new Error('Delivery challan opening balance must be a valid number');
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
        form.name.trim() || form.place.trim() || form.address.trim() || form.phone.trim() || form.second_phone.trim() || form.pincode.trim() || form.gst_pan.trim() || form.pan_no.trim()
    );

    const handleCancel = () => {
        if (!hasChanges || window.confirm('Discard current changes?')) {
            navigate('/admin/customers');
        }
    };

    const handleCSVUpload = async (file: File) => {
        setUploadLoading(true);
        try {
            if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('Only CSV files are allowed');
            // MIME-type check (browsers report '' or 'text/csv' or 'application/vnd.ms-excel').
            const allowedMime = ['', 'text/csv', 'application/vnd.ms-excel', 'application/csv'];
            if (file.type && !allowedMime.includes(file.type) && !/csv/i.test(file.type)) {
                throw new Error('File is not a recognised CSV');
            }
            if (file.size > LIMITS.csvFileBytes) throw new Error('CSV file is too large. Keep it under 5 MB');
            // Full-text state-machine parser. Required because quoted address
            // cells may contain embedded newlines — splitting on \n before
            // honoring quotes would shred those rows.
            const parseCSV = (input: string): string[][] => {
                const rows: string[][] = [];
                let field = '';
                let row: string[] = [];
                let inQuotes = false;

                for (let i = 0; i < input.length; i += 1) {
                    const ch = input[i];

                    if (inQuotes) {
                        if (ch === '"') {
                            if (input[i + 1] === '"') { field += '"'; i += 1; continue; }
                            inQuotes = false;
                            continue;
                        }
                        field += ch;
                        continue;
                    }

                    if (ch === '"') { inQuotes = true; continue; }
                    if (ch === ',') { row.push(field.trim()); field = ''; continue; }
                    if (ch === '\r') continue;
                    if (ch === '\n') {
                        row.push(field.trim());
                        if (row.some((cell) => cell.length > 0)) rows.push(row);
                        row = [];
                        field = '';
                        continue;
                    }
                    field += ch;
                }

                if (field.length > 0 || row.length > 0) {
                    row.push(field.trim());
                    if (row.some((cell) => cell.length > 0)) rows.push(row);
                }
                return rows;
            };

            const text = (await file.text()).replace(/^﻿/, ''); // strip UTF-8 BOM
            const allRows = parseCSV(text);
            if (allRows.length < 2) { toast.error('CSV must have at least a header and one row'); return; }
            const MAX_CSV_ROWS = 5000;
            if (allRows.length - 1 > MAX_CSV_ROWS) {
                toast.error(`CSV has too many rows. Keep it under ${MAX_CSV_ROWS} rows`);
                return;
            }

            const normalizeHeader = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, '');
            const headers = allRows[0].map(h => normalizeHeader(h));

            const findIndex = (...candidates: string[]) => headers.findIndex((header) => candidates.includes(header));

            const companyIdx = findIndex('company');
            const brandIdx = findIndex('brand');
            const nameIdx = findIndex('customername', 'name');
            const placeIdx = findIndex('place');
            const locationIdx = findIndex('District', 'district', 'location');
            const stateIdx = findIndex('state');
            const pincodeIdx = findIndex('pincode', 'zipcode', 'pin');
            const gstIdx = findIndex('gstin', 'gstpan', 'gst', 'gstno', 'gstnumber');
            const panIdx = findIndex('panno', 'pan', 'pannumber');
            const addressIdx = findIndex('address');
            const openingInvoiceIdx = findIndex('invoice', 'openinginvoice', 'invoiceopening', 'invoicebalance');
            const openingDcIdx = findIndex('deliverychallan', 'deliverychellan', 'dc', 'openingdeliverychallan', 'openingdeliverychellan', 'openingdc', 'deliverychallanbalance', 'deliverychellanbalance', 'dcbalance');
            const legacyOpeningIdx = findIndex('openingbalance', 'opening', 'openingamount');
            const phoneIdx = findIndex('phone', 'phonenumber', 'mobile', 'mobilenumber', 'phoneno', 'mobileno');
            const secondPhoneIdx = findIndex('secondphone', 'secondphoneno', 'secondaryphone', 'phone2', 'alternatenumber', 'alternatephone', 'alternatephonenumber', 'secondmobile', 'secondmobileno');

            if (nameIdx === -1 || addressIdx === -1) {
                toast.error('CSV must include at least: Customer Name, Address');
                return;
            }

            const hasOpeningColumn = openingInvoiceIdx !== -1 || openingDcIdx !== -1 || legacyOpeningIdx !== -1;
            if (companyIdx === -1 || brandIdx === -1 || placeIdx === -1 || locationIdx === -1 || stateIdx === -1 || pincodeIdx === -1 || gstIdx === -1 || !hasOpeningColumn) {
                toast.error('Expected CSV format: Company, Brand, Customer Name, Place, State, District, pincode, GSTIN, Address, Invoice, Delivery Challan');
                return;
            }

            // Use the central validators so a regex bump in validation.ts
            // propagates here. Each try/catch keeps a bad row from killing the
            // whole import.
            const safeValidate = (fn: (v: string) => void, value: string) => {
                try { fn(value); return true; } catch { return false; }
            };
            const parseOpeningBalance = (raw: string | undefined): number | null => {
                if (!raw) return 0;
                const cleaned = raw.replace(/[^0-9.\-]/g, '');
                const n = Number(cleaned);
                if (!Number.isFinite(n)) return null;
                if (Math.abs(n) > 1_000_000_000) return null;
                return n;
            };

            const matchCompany = (raw: string): CompanyEnum | null => {
                const trimmed = (raw || '').trim();
                if (!trimmed) return null;
                const exact = COMPANY_LIST.find((c) => c.toLowerCase() === trimmed.toLowerCase());
                if (exact) return exact;
                return isCompanyEnum(trimmed) ? (trimmed as CompanyEnum) : null;
            };

            const seenPhones = new Set<string>();
            const parsedRows = allRows.slice(1).map(cols => {
                const invoiceParsed = openingInvoiceIdx >= 0
                    ? parseOpeningBalance(cols[openingInvoiceIdx])
                    : null;
                const dcParsed = openingDcIdx >= 0
                    ? parseOpeningBalance(cols[openingDcIdx])
                    : null;
                const legacyParsed = legacyOpeningIdx >= 0
                    ? parseOpeningBalance(cols[legacyOpeningIdx])
                    : null;

                // Priority: explicit invoice/DC columns; otherwise legacy "Opening Balance" maps to invoice.
                const openingInvoiceValue = invoiceParsed != null
                    ? invoiceParsed
                    : (legacyParsed != null && openingInvoiceIdx === -1 ? legacyParsed : 0);
                const openingDcValue = dcParsed != null ? dcParsed : 0;

                const rawPhone = phoneIdx >= 0 ? sanitizePhone(cols[phoneIdx] || '') : '';
                const rawSecondPhone = secondPhoneIdx >= 0 ? sanitizePhone(cols[secondPhoneIdx] || '') : '';
                const rawGstin = gstIdx >= 0 ? sanitizeUpperAlnum(cols[gstIdx] || '', LIMITS.gstin) : '';
                const rawPan = panIdx >= 0 ? sanitizeUpperAlnum(cols[panIdx] || '', LIMITS.pan) : '';
                const rawPincode = pincodeIdx >= 0 ? sanitizeDigits(cols[pincodeIdx] || '', LIMITS.pincode) : '';

                const phoneOk = rawPhone ? safeValidate(validatePhone, rawPhone) : false;
                const dupPhone = phoneOk && seenPhones.has(rawPhone);
                if (phoneOk && !dupPhone) seenPhones.add(rawPhone);

                const rawState = stateIdx >= 0 ? normalizeStateInput(cols[stateIdx] || '') : null;
                const rawLocation = locationIdx >= 0 ? sanitizeText(cols[locationIdx] || '', LIMITS.mediumText) || null : null;
                const rawCompany = companyIdx >= 0 ? matchCompany(cols[companyIdx] || '') : null;
                return {
                    brand: brandIdx >= 0 ? cols[brandIdx] || null : null,
                    name: sanitizeText(cols[nameIdx] || '', LIMITS.longText),
                    phone: phoneOk && !dupPhone ? rawPhone : null,
                    address: sanitizeMultilineText(cols[addressIdx] || '', LIMITS.address),
                    place: placeIdx >= 0 ? sanitizeText(cols[placeIdx] || '', LIMITS.mediumText) || null : null,
                    state: rawState,
                    location: rawState === 'Kerala' ? rawLocation : null,
                    pincode: rawPincode && safeValidate(validatePincode, rawPincode) ? rawPincode : null,
                    gst_pan: rawGstin && safeValidate(validateGSTIN, rawGstin) ? rawGstin : null,
                    pan_no: rawPan && safeValidate(validatePAN, rawPan) ? rawPan : null,
                    second_phone: rawSecondPhone && safeValidate(validatePhone, rawSecondPhone) ? rawSecondPhone : null,
                    company: rawCompany,
                    opening_invoice: openingInvoiceValue,
                    opening_delivery_challan: openingDcValue,
                    is_active: true,
                };
            });

            const totalRows = parsedRows.length;
            const toInsert = parsedRows
                .filter((row) => row.name && row.address)
                .map(({ brand: _brand, ...customer }) => customer);

            const skipped = totalRows - toInsert.length;
            if (toInsert.length === 0) {
                toast.error('No valid rows to import. Every row needs at least a name and an address.');
                return;
            }
            if (skipped > 0) {
                toast.warning(`${skipped} row${skipped === 1 ? '' : 's'} skipped (missing name or address).`);
            }

            const csvBrands = Array.from(
                new Set(
                    parsedRows
                        .map((row) => row.brand?.trim())
                        .filter((brand): brand is string => Boolean(brand))
                        .map((brand) => brand.toLowerCase()),
                ),
            );

            if (csvBrands.length > 0) {
                const { data: existingBrands, error: brandsFetchError } = await supabase
                    .from('brands')
                    .select('name');
                if (brandsFetchError) throw brandsFetchError;

                const existingBrandNames = new Set(
                    (existingBrands ?? [])
                        .map((brand) => brand.name?.trim().toLowerCase())
                        .filter((brandName): brandName is string => Boolean(brandName)),
                );

                const brandsToCreate = parsedRows
                    .map((row) => row.brand?.trim())
                    .filter((brand): brand is string => Boolean(brand))
                    .filter((brand, index, array) => array.findIndex((value) => value.toLowerCase() === brand.toLowerCase()) === index)
                    .filter((brand) => !existingBrandNames.has(brand.toLowerCase()))
                    .map((brand) => ({ name: brand, is_active: true }));

                if (brandsToCreate.length > 0) {
                    const { error: brandInsertError } = await supabase.from('brands').insert(brandsToCreate);
                    if (brandInsertError) throw brandInsertError;
                }
            }

            const { error } = await supabase.from('customers').insert(toInsert);
            if (error) throw error;

            const totalOpeningBalance = toInsert.reduce(
                (sum, row) => sum + (row.opening_invoice || 0) + (row.opening_delivery_challan || 0),
                0,
            );
            const balanceLabel = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 2,
            }).format(totalOpeningBalance);
            toast.success(`Imported ${toInsert.length} customers successfully! Total opening balance: ${balanceLabel}`);
            setUploadOpen(false);
            if (navTimerRef.current) clearTimeout(navTimerRef.current);
            navTimerRef.current = setTimeout(() => {
                navTimerRef.current = null;
                navigate('/admin/customers');
            }, 1000);
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
                            <Upload size={16} className="text-primary" /> Import
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
                            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Owning Company <span className="text-rose-500">*</span></Label>
                            <Select value={form.company ?? ''} onValueChange={(v) => setForm(f => ({ ...f, company: (v as CompanyEnum) || null }))}>
                                <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 font-semibold"><SelectValue placeholder="Which company owns this customer?" /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {COMPANY_LIST.map((c) => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-slate-500">Determines which of your group entities the customer belongs to.</p>
                        </div>
                        <div className="md:col-span-2 space-y-2 group">
                            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Customer Name <span className="text-rose-500">*</span></Label>
                            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: sanitizeText(e.target.value, LIMITS.longText) }))} placeholder="Company or shop name" required maxLength={LIMITS.longText} className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 font-semibold" />
                        </div>
                        <div className="space-y-2 group">
                            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Place <span className="text-rose-500">*</span></Label>
                            <Input value={form.place} onChange={(e) => setForm(f => ({ ...f, place: sanitizeText(e.target.value, LIMITS.mediumText) }))} placeholder="e.g. Kochi Terminal" maxLength={LIMITS.mediumText} className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50" />
                        </div>
                        <div className="space-y-2 group">
                            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">State <span className="text-rose-500">*</span></Label>
                            <Select value={form.state ?? ''} onValueChange={(v) => setForm(f => ({ ...f, state: v || null, location: v === 'Kerala' ? f.location : null }))}>
                                <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50"><SelectValue placeholder="Pick state" /></SelectTrigger>
                                <SelectContent className="rounded-xl max-h-72">
                                    {INDIAN_STATES.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {form.state === 'Kerala' && (
                            <div className="space-y-2 group">
                                <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">District Zone <span className="text-rose-500">*</span></Label>
                                <Select value={form.location ?? ''} onValueChange={(v) => setForm(f => ({ ...f, location: v || null }))}>
                                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50"><SelectValue placeholder="Pick region or district" /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {districtOptions.map((district) => (
                                            <SelectItem key={district} value={district}>{district}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-2 group">
                            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Phone Number <span className="text-rose-500">*</span></Label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"><Phone size={16} /></div>
                                <Input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: sanitizePhone(e.target.value) }))} placeholder="Phone number" required maxLength={LIMITS.phone} className="pl-11 h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 font-mono tracking-widest" />
                            </div>
                        </div>
                        <div className="space-y-2 group ">
                            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Alternate Phone No</Label>
                            <Input type="tel" value={form.second_phone} onChange={(e) => setForm(f => ({ ...f, second_phone: sanitizePhone(e.target.value) }))} placeholder="Other phone (optional)" maxLength={LIMITS.phone} className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 font-mono tracking-widest"  />
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
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-0.5">Address Details</h3>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Invoicing Address</p>
                        </div>
                    </div>
                    <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                        <div className="md:col-span-2 space-y-2 group">
                            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Customer Address <span className="text-rose-500">*</span></Label>
                            <Textarea value={form.address} onChange={(e) => setForm(f => ({ ...f, address: sanitizeMultilineText(e.target.value, LIMITS.address) }))} placeholder="Full address" rows={3} required maxLength={LIMITS.address} className="resize-none rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4" />
                        </div>
                        <div className="space-y-2 group">
                            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold group-focus-within:text-primary transition-colors">Pin / Zip Code</Label>
                            <Input value={form.pincode} onChange={(e) => setForm(f => ({ ...f, pincode: sanitizeDigits(e.target.value, LIMITS.pincode) }))} placeholder="e.g. 682001" maxLength={LIMITS.pincode} className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 font-mono tracking-widest" />
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
                            <Label className="text-xs uppercase tracking-wider text-violet-700 dark:text-violet-400 font-bold">GSTIN</Label>
                            <Input value={form.gst_pan} onChange={(e) => setForm(f => ({ ...f, gst_pan: sanitizeUpperAlnum(e.target.value, LIMITS.gstin) }))} placeholder="Enter verified tax code" maxLength={LIMITS.gstin} className="h-12 rounded-xl bg-white dark:bg-slate-900 uppercase font-mono tracking-widest shadow-inner border-violet-200 dark:border-violet-800 focus-visible:ring-violet-500/30" />
                        </div>
                        <div className="space-y-2 group">
                            <Label className="text-xs uppercase tracking-wider text-violet-700 dark:text-violet-400 font-bold">PAN No</Label>
                            <Input value={form.pan_no} onChange={(e) => setForm(f => ({ ...f, pan_no: sanitizeUpperAlnum(e.target.value, LIMITS.pan) }))} placeholder="Enter PAN number" maxLength={LIMITS.pan} className="h-12 rounded-xl bg-white dark:bg-slate-900 uppercase font-mono tracking-widest shadow-inner border-violet-200 dark:border-violet-800 focus-visible:ring-violet-500/30" />
                        </div>
                        <div className="md:col-span-2 rounded-2xl border border-violet-200/60 dark:border-violet-800/50 bg-white/50 dark:bg-slate-900/40 p-5 md:p-6 space-y-4">
                            <div className="flex items-baseline justify-between gap-4 pb-3 border-b border-violet-200/40 dark:border-violet-800/40">
                                <div>
                                    <Label className="text-xs uppercase tracking-wider text-violet-700 dark:text-violet-400 font-bold">Opening Balance</Label>
                                    <p className="text-[11px] text-violet-600/80 dark:text-violet-300/80 font-medium mt-1">Breakdown by document type. Use + for customer owes us, - for we owe customer.</p>
                                </div>
                                {(() => {
                                    const total = (parseFloat(form.opening_invoice?.toString() || '0') || 0) + (parseFloat(form.opening_delivery_challan?.toString() || '0') || 0);
                                    const tone = total > 0
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : total < 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-slate-500 dark:text-slate-400';
                                    return (
                                        <span className={`font-mono font-bold text-lg ${tone}`}>{total < 0 ? '-' : ''}₹ {Math.abs(total).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                    );
                                })()}
                            </div>
                            <div className="space-y-3 font-mono">
                                <div className="flex items-start gap-2">
                                    <span className="text-violet-400/70 dark:text-violet-600/70 select-none pt-3 text-lg leading-none">├─</span>
                                    <div className="flex-1 space-y-1.5">
                                        <Label className="text-[11px] uppercase tracking-wider text-violet-700/80 dark:text-violet-400/80 font-bold">Invoice</Label>
                                        <Input type="number" min="0" value={form.opening_invoice} onChange={(e) => setForm(f => ({ ...f, opening_invoice: Math.max(0, parseFloat(e.target.value) || 0) }))} placeholder="0.00" step="0.01" className="h-11 rounded-xl bg-white dark:bg-slate-900 font-mono tracking-widest shadow-inner border-violet-200 dark:border-violet-800 focus-visible:ring-violet-500/30" />
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-violet-400/70 dark:text-violet-600/70 select-none pt-3 text-lg leading-none">└─</span>
                                    <div className="flex-1 space-y-1.5">
                                        <Label className="text-[11px] uppercase tracking-wider text-violet-700/80 dark:text-violet-400/80 font-bold">Delivery Challan</Label>
                                        <Input type="number" min="0" value={form.opening_delivery_challan} onChange={(e) => setForm(f => ({ ...f, opening_delivery_challan: Math.max(0, parseFloat(e.target.value) || 0) }))} placeholder="0.00" step="0.01" className="h-11 rounded-xl bg-white dark:bg-slate-900 font-mono tracking-widest shadow-inner border-violet-200 dark:border-violet-800 focus-visible:ring-violet-500/30" />
                                    </div>
                                </div>
                            </div>
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
                                <p className="mb-2"><span className="font-bold text-slate-700 dark:text-slate-300">Expected columns:</span> Company, Brand, Customer Name, Place, State, District, pincode, GSTIN, PAN No, Address, Invoice, Delivery Challan (legacy <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">Opening Balance</code> column still accepted and maps to Invoice). <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">District</code> is stored only when <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">State</code> is <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">Kerala</code>; otherwise the district cell is ignored.</p>
                                <p className="mb-2"><span className="font-bold text-slate-700 dark:text-slate-300">Company:</span> Must be one of <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">{COMPANY_LIST.join(', ')}</code>. Unrecognised values are stored as <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">NULL</code> and can be backfilled later from the customer edit screen. Brand is still accepted for compatibility but not stored on the customer.</p>
                                <p className="mb-2"><span className="font-bold text-slate-700 dark:text-slate-300">Phone fields:</span> <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">Phone</code> is required and must be 7-15 digits with an optional leading <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">+</code> (e.g. <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">9876543210</code>). Rows missing a valid primary phone are skipped. <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">Second Phone No</code> is optional; invalid values are dropped silently.</p>
                                <p className="mb-2"><span className="font-bold text-slate-700 dark:text-slate-300">Tax IDs:</span> <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">GSTIN</code> (15 chars, e.g. <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">32ABCDE1234F1Z5</code>), <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">PAN No</code> (10 chars, e.g. <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">ABCDE1234F</code>) and <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">pincode</code> (6 digits) are all optional. Leave the cell blank if unknown — placeholder text like <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">N/A</code> or <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">Nil</code> is treated as missing. Invalid values are silently stored as <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">NULL</code>.</p>
                                <p><span className="font-bold text-slate-700 dark:text-slate-300">Invoice / Delivery Challan:</span> Use a <span className="font-bold text-emerald-600 dark:text-emerald-400">positive</span> number when the customer owes us (e.g. <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">15000</code>) and a <span className="font-bold text-rose-600 dark:text-rose-400">negative</span> number when we owe the customer (advance paid, e.g. <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">-2500</code>). Each row's two columns are stored separately; their sum is the opening balance. Leave blank for zero.</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
