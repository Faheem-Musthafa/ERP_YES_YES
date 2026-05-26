import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { AlertTriangle, Boxes, History, Package, PlusCircle, Upload, Download } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import { DataCard, EmptyState, FormSection, PageHeader, SearchBar } from '@/app/components/ui/primitives';
import type { CompanyEnum, GodownEnum } from '@/app/types/database';
import { COMPANY_LIST, isCompanyEnum } from '@/app/companyProfiles';
import { DEFAULT_MASTER_DATA_SETTINGS, loadMasterDataSettings } from '@/app/settings';
import {
  LIMITS,
  sanitizeMultilineText,
  sanitizeNonNegativeDecimal,
  sanitizeNonNegativeInteger,
  sanitizeText,
  validateNonNegativeAmount,
  validatePositiveAmount,
  validateRequired,
} from '@/app/validation';

interface ProductWithStock {
  id: string;
  name: string;
  sku: string;
  brand_id: string | null;
  brands: { name: string } | null;
  locationStocks: Record<string, number>;
  total_stock: number;
}

interface BrandRow {
  id: string;
  name: string;
}

interface AdjustmentRow {
  id: string;
  quantity: number;
  type: 'Addition' | 'Subtraction';
  reason: string | null;
  invoice_no: string | null;
  invoice_date: string | null;
  company: CompanyEnum | null;
  created_at: string;
  products: { name: string; sku: string } | null;
}

interface ImportRow {
  rowIndex: number;
  companyRaw: string;
  company: CompanyEnum | null;
  brand: string;
  productName: string;
  godownQty: Record<string, number>;
  totalQty: number;
  error?: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const generateAutoSku = () => {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase();
  return `AUTO-${stamp}-${rand}`;
};

const normalizeHeader = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, '');

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
      if (row.some(cell => cell.length > 0)) rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some(cell => cell.length > 0)) rows.push(row);
  }
  return rows;
};

export const StockAdjustment = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [recentAdjustments, setRecentAdjustments] = useState<AdjustmentRow[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>(DEFAULT_MASTER_DATA_SETTINGS.Godowns);
  const [activeTab, setActiveTab] = useState<'existing' | 'new' | 'import'>('existing');

  // Existing-stock tab state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [type, setType] = useState<'Addition' | 'Subtraction'>('Addition');
  const [reason, setReason] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [company, setCompany] = useState<CompanyEnum | ''>('');
  const [saving, setSaving] = useState(false);

  // New-product tab state
  const [newForm, setNewForm] = useState({ name: '', brand_id: '', dealer_price: '' });
  const [newLocation, setNewLocation] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newInvoiceNo, setNewInvoiceNo] = useState('');
  const [newInvoiceDate, setNewInvoiceDate] = useState(todayIso());
  const [newCompany, setNewCompany] = useState<CompanyEnum | ''>('');
  const [newReason, setNewReason] = useState('');
  const [creating, setCreating] = useState(false);

  // Bulk import tab state
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      const [settings, prodRes, brRes, adjRes] = await Promise.all([
        loadMasterDataSettings().catch(() => DEFAULT_MASTER_DATA_SETTINGS),
        supabase.from('products').select('id, name, sku, brand_id, brands(name)').eq('is_active', true).order('name'),
        supabase.from('brands').select('id, name').eq('is_active', true).order('name'),
        supabase.from('stock_adjustments').select('id, quantity, type, reason, invoice_no, invoice_date, company, created_at, products(name, sku)').order('created_at', { ascending: false }).limit(20),
      ]);

      if (prodRes.error) throw prodRes.error;
      if (brRes.error) throw brRes.error;
      if (adjRes.error) throw adjRes.error;
      const prod = prodRes.data;
      const br = brRes.data;
      const adj = adjRes.data;

      const productIds = (prod ?? []).map(p => p.id);
      const { data: stockData, error: stockError } = await supabase
        .from('product_stock_locations')
        .select('product_id, location, stock_qty')
        .in('product_id', productIds);

      if (stockError) throw stockError;

      const configuredLocations = Array.from(
        new Set(
          settings.Godowns
            .map((location) => location.trim())
            .filter((location) => location.length > 0),
        ),
      );
      const detectedLocations = Array.from(
        new Set(
          (stockData ?? [])
            .map((row: any) => (typeof row.location === 'string' ? row.location.trim() : ''))
            .filter((value: string) => value.length > 0),
        ),
      );
      const nextLocationOptions = configuredLocations.length > 0
        ? configuredLocations
        : detectedLocations;
      setLocationOptions(nextLocationOptions);
      setSelectedLocation((current) => {
        if (current && nextLocationOptions.includes(current)) return current;
        return nextLocationOptions[0] || '';
      });
      setNewLocation((current) => {
        if (current && nextLocationOptions.includes(current)) return current;
        return nextLocationOptions[0] || '';
      });

      const stockByProduct = new Map<string, Record<string, number>>();
      (stockData ?? []).forEach((row: any) => {
        const location = typeof row.location === 'string' ? row.location.trim() : '';
        if (!location) return;
        const existing = stockByProduct.get(row.product_id) ?? {};
        existing[location] = row.stock_qty ?? 0;
        stockByProduct.set(row.product_id, existing);
      });

      const productsWithStock: ProductWithStock[] = (prod ?? []).map(p => {
        const locationStocks = stockByProduct.get(p.id) ?? {};
        const total_stock = nextLocationOptions.reduce(
          (sum, location) => sum + (locationStocks[location] ?? 0),
          0,
        );
        return { ...p, locationStocks, total_stock };
      });

      setProducts(productsWithStock);
      setBrands((br ?? []) as BrandRow[]);
      setRecentAdjustments((adj ?? []) as AdjustmentRow[]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load data');
    }
  };
  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (selectedLocation && !locationOptions.includes(selectedLocation)) {
      setSelectedLocation('');
    }
  }, [selectedLocation, locationOptions]);

  const getLocationStock = (product: ProductWithStock, location: string) =>
    product.locationStocks[location] ?? 0;

  const formatProductLocationSummary = (product: ProductWithStock) =>
    locationOptions.map((location) => `${location}: ${getLocationStock(product, location)}`).join(' | ');

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const currentLocationStock = selectedProduct
    ? getLocationStock(selectedProduct, selectedLocation)
    : 0;

  const resetExistingForm = () => {
    setSelectedProductId('');
    setQuantity('');
    setReason('');
    setInvoiceNo('');
    setInvoiceDate(todayIso());
    setCompany('');
    setType('Addition');
    setSelectedLocation(locationOptions[0] || '');
  };

  const resetNewForm = () => {
    setNewForm({ name: '', brand_id: '', dealer_price: '' });
    setNewQuantity('');
    setNewInvoiceNo('');
    setNewInvoiceDate(todayIso());
    setNewCompany('');
    setNewReason('');
    setNewLocation(locationOptions[0] || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let qty = 0;
    let normalizedReason = '';
    let normalizedInvoiceNo = '';
    try {
      validateRequired(selectedProductId, 'Product');
      validateRequired(selectedLocation, 'Location');
      validateRequired(quantity, 'Quantity');
      normalizedInvoiceNo = sanitizeText(invoiceNo, LIMITS.shortText);
      validateRequired(normalizedInvoiceNo, 'Invoice No');
      validateRequired(invoiceDate, 'Invoice Date');
      validateRequired(company, 'Company');
      normalizedReason = sanitizeMultilineText(reason, LIMITS.reason);
      validateRequired(normalizedReason, 'Reason');
      qty = Number(quantity);
      validatePositiveAmount(qty, 'Quantity');
    } catch (err: any) {
      toast.error(err?.message || 'All fields required');
      return;
    }
    if (!selectedProduct) return;
    if (type === 'Subtraction') {
      const confirmSubtraction = window.confirm(`You are reducing stock by ${qty} for ${selectedProduct.name} at ${selectedLocation}. Continue?`);
      if (!confirmSubtraction) return;
    }
    setSaving(true);
    try {
      const { data: adjustmentId, error: adjustmentErr } = await supabase.rpc('create_stock_adjustment_atomic', {
        p_product_id: selectedProductId,
        p_location: selectedLocation as GodownEnum,
        p_quantity: qty,
        p_type: type,
        p_reason: normalizedReason,
        p_user_id: user?.id ?? null,
        p_invoice_no: normalizedInvoiceNo,
        p_invoice_date: invoiceDate,
        p_company: company as CompanyEnum,
      });

      if (adjustmentErr) throw adjustmentErr;

      toast.success(`Stock ${type === 'Addition' ? 'increased' : 'decreased'} by ${qty} at ${selectedLocation}. Adjustment ${adjustmentId ? 'saved' : 'applied'}.`);
      resetExistingForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Adjustment failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProductAndAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    let productName = '';
    let dealerPrice = 0;
    let qty = 0;
    let normalizedInvoiceNo = '';
    let normalizedReason = '';
    try {
      productName = sanitizeText(newForm.name, LIMITS.longText);
      validateRequired(productName, 'Product Name');
      dealerPrice = Number(newForm.dealer_price || 0);
      validateNonNegativeAmount(dealerPrice, 'Dealer price');

      validateRequired(newLocation, 'Location');
      validateRequired(newQuantity, 'Quantity');
      qty = Number(newQuantity);
      validatePositiveAmount(qty, 'Quantity');

      normalizedInvoiceNo = sanitizeText(newInvoiceNo, LIMITS.shortText);
      validateRequired(normalizedInvoiceNo, 'Invoice No');
      validateRequired(newInvoiceDate, 'Invoice Date');
      validateRequired(newCompany, 'Company');

      normalizedReason = sanitizeMultilineText(
        newReason || `Initial stock from invoice ${normalizedInvoiceNo}`,
        LIMITS.reason,
      );
      validateRequired(normalizedReason, 'Reason');
    } catch (err: any) {
      toast.error(err?.message || 'Invalid product details');
      return;
    }

    setCreating(true);
    let createdProductId: string | null = null;
    try {
      const masterSettings = await loadMasterDataSettings().catch(() => DEFAULT_MASTER_DATA_SETTINGS);
      const Godowns = masterSettings.Godowns
        .map((location) => location.trim())
        .filter((location) => location.length > 0);

      if (Godowns.length === 0) {
        throw new Error('No Godown configured in Settings. Add at least one Godown before creating products.');
      }
      if (!Godowns.includes(newLocation)) {
        throw new Error('Selected location is not a configured Godown.');
      }

      const { data: createdProduct, error: insertErr } = await supabase
        .from('products')
        .insert({
          name: productName,
          brand_id: newForm.brand_id || null,
          sku: generateAutoSku(),
          dealer_price: dealerPrice,
          stock_qty: 0,
          is_active: true,
        })
        .select('id')
        .single();
      if (insertErr) throw insertErr;
      if (!createdProduct?.id) throw new Error('Product creation failed');
      createdProductId = createdProduct.id;

      const stockSeedRows = Godowns.map((location) => ({
        product_id: createdProduct.id,
        location,
        stock_qty: 0,
      }));
      const { error: seedErr } = await supabase
        .from('product_stock_locations')
        .insert(stockSeedRows);
      if (seedErr) throw seedErr;

      const { error: adjErr } = await supabase.rpc('create_stock_adjustment_atomic', {
        p_product_id: createdProduct.id,
        p_location: newLocation as GodownEnum,
        p_quantity: qty,
        p_type: 'Addition',
        p_reason: normalizedReason,
        p_user_id: user?.id ?? null,
        p_invoice_no: normalizedInvoiceNo,
        p_invoice_date: newInvoiceDate,
        p_company: newCompany as CompanyEnum,
      });
      if (adjErr) throw adjErr;

      toast.success(`Product "${productName}" created with ${qty} units at ${newLocation}.`);
      resetNewForm();
      fetchData();
    } catch (err: any) {
      if (createdProductId) {
        await supabase.from('product_stock_locations').delete().eq('product_id', createdProductId);
        await supabase.from('products').delete().eq('id', createdProductId);
      }
      toast.error(err?.message || 'Failed to create product');
    } finally {
      setCreating(false);
    }
  };

  const handleImportFile = async (file: File) => {
    setImportRows([]);
    setImportFileName(file.name);
    try {
      if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('Only CSV files are allowed');
      if (file.size > LIMITS.csvFileBytes) throw new Error('CSV file too large. Keep under 5 MB');

      const text = (await file.text()).replace(/^﻿/, '');
      const allRows = parseCSV(text);
      if (allRows.length < 2) throw new Error('CSV needs a header row plus at least one data row');

      const headers = allRows[0].map(normalizeHeader);
      const findIndex = (...candidates: string[]) => headers.findIndex(h => candidates.includes(h));

      const companyIdx = findIndex('company', 'supplier', 'suppliername', 'companyname');
      const brandIdx = findIndex('brand', 'brandname');
      const nameIdx = findIndex('stockname', 'productname', 'product', 'name');

      if (companyIdx === -1 || nameIdx === -1) {
        throw new Error('CSV must include: Company, Stock Name');
      }

      const godownIndices: { name: string; idx: number }[] = [];
      locationOptions.forEach((godown) => {
        const idx = headers.findIndex(h => h === normalizeHeader(godown));
        if (idx !== -1) godownIndices.push({ name: godown, idx });
      });
      if (godownIndices.length === 0) {
        throw new Error(`CSV must include at least one godown column (${locationOptions.join(', ')})`);
      }

      const parsed: ImportRow[] = allRows.slice(1).map((cols, i) => {
        const companyRaw = sanitizeText(cols[companyIdx] || '', LIMITS.longText);
        const matchedCompany = COMPANY_LIST.find(
          (c) => c.toLowerCase() === companyRaw.toLowerCase(),
        ) ?? (isCompanyEnum(companyRaw) ? (companyRaw as CompanyEnum) : null);
        const brand = brandIdx >= 0 ? sanitizeText(cols[brandIdx] || '', LIMITS.longText) : '';
        const productName = sanitizeText(cols[nameIdx] || '', LIMITS.longText);
        const godownQty: Record<string, number> = {};
        let totalQty = 0;
        godownIndices.forEach(({ name, idx }) => {
          const q = Number((cols[idx] || '').replace(/[^0-9.\-]/g, ''));
          const safe = Number.isFinite(q) && q > 0 ? Math.floor(q) : 0;
          godownQty[name] = safe;
          totalQty += safe;
        });

        let err: string | undefined;
        if (!companyRaw) err = 'Missing Company';
        else if (!matchedCompany) err = `Unknown Company "${companyRaw}" (allowed: ${COMPANY_LIST.join(', ')})`;
        else if (!productName) err = 'Missing Stock Name';
        else if (totalQty === 0) err = 'No godown quantity provided';

        return {
          rowIndex: i + 2,
          companyRaw,
          company: matchedCompany,
          brand,
          productName,
          godownQty,
          totalQty,
          error: err,
        };
      });

      setImportRows(parsed);
      const valid = parsed.filter(r => !r.error).length;
      const skipped = parsed.length - valid;
      if (skipped > 0) toast.warning(`${parsed.length} rows parsed — ${valid} ready, ${skipped} need attention`);
      else toast.success(`${parsed.length} rows ready to import`);
    } catch (err: any) {
      toast.error(err?.message || 'CSV parse failed');
      setImportRows([]);
    }
  };

  const executeImport = async () => {
    const validRows = importRows.filter(r => !r.error);
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }
    setImporting(true);
    setImportProgress({ done: 0, total: validRows.length });

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    const brandCache = new Map<string, string>();
    brands.forEach(b => brandCache.set(b.name.trim().toLowerCase(), b.id));
    const productCache = new Map<string, ProductWithStock>();
    products.forEach(p => {
      const key = `${p.name.trim().toLowerCase()}|${p.brand_id ?? ''}`;
      productCache.set(key, p);
    });

    const masterSettings = await loadMasterDataSettings().catch(() => DEFAULT_MASTER_DATA_SETTINGS);
    const Godowns = masterSettings.Godowns
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const batchInvoiceDate = todayIso();
    const batchStamp = batchInvoiceDate.replace(/-/g, '');
    const batchRand = Math.random().toString(36).slice(2, 8).toUpperCase();
    const batchInvoiceNo = `BULK-${batchStamp}-${batchRand}`;

    for (let i = 0; i < validRows.length; i += 1) {
      const row = validRows[i];
      try {
        if (!row.company) throw new Error(`invalid company "${row.companyRaw}"`);

        // Brand: lookup or create (if provided)
        let resolvedBrandId: string | null = null;
        if (row.brand) {
          const brandKey = row.brand.trim().toLowerCase();
          resolvedBrandId = brandCache.get(brandKey) ?? null;
          if (!resolvedBrandId) {
            const { data, error } = await supabase
              .from('brands')
              .insert({ name: row.brand, is_active: true })
              .select('id')
              .single();
            if (error) throw new Error(`brand "${row.brand}": ${error.message}`);
            resolvedBrandId = data!.id;
            brandCache.set(brandKey, resolvedBrandId);
          }
        }

        // Product: lookup by name + brand, create if missing
        const productKey = `${row.productName.trim().toLowerCase()}|${resolvedBrandId ?? ''}`;
        let product = productCache.get(productKey);
        if (!product) {
          const { data, error } = await supabase
            .from('products')
            .insert({
              name: row.productName,
              brand_id: resolvedBrandId,
              sku: generateAutoSku(),
              dealer_price: 0,
              stock_qty: 0,
              is_active: true,
            })
            .select('id, name, sku, brand_id, brands(name)')
            .single();
          if (error) throw new Error(`product "${row.productName}": ${error.message}`);

          const stockSeedRows = Godowns.map((location) => ({
            product_id: data!.id,
            location,
            stock_qty: 0,
          }));
          const { error: seedErr } = await supabase
            .from('product_stock_locations')
            .insert(stockSeedRows);
          if (seedErr) {
            await supabase.from('products').delete().eq('id', data!.id);
            throw new Error(`stock seed for "${row.productName}": ${seedErr.message}`);
          }

          product = {
            id: data!.id,
            name: data!.name,
            sku: data!.sku,
            brand_id: data!.brand_id,
            brands: data!.brands as { name: string } | null,
            locationStocks: {},
            total_stock: 0,
          };
          productCache.set(productKey, product);
        }

        // Adjust per godown
        for (const [godown, qty] of Object.entries(row.godownQty)) {
          if (qty <= 0) continue;
          const { error: rpcErr } = await supabase.rpc('create_stock_adjustment_atomic', {
            p_product_id: product.id,
            p_location: godown as GodownEnum,
            p_quantity: qty,
            p_type: 'Addition',
            p_reason: `Bulk import ${batchInvoiceNo}`,
            p_user_id: user?.id ?? null,
            p_invoice_no: batchInvoiceNo,
            p_invoice_date: batchInvoiceDate,
            p_company: row.company,
          });
          if (rpcErr) throw new Error(`adjustment @ ${godown}: ${rpcErr.message}`);
        }

        success += 1;
      } catch (err: any) {
        failed += 1;
        errors.push(`Row ${row.rowIndex}: ${err?.message || 'unknown error'}`);
      }
      setImportProgress({ done: i + 1, total: validRows.length });
    }

    if (failed === 0) toast.success(`Imported ${success} rows successfully`);
    else toast.warning(`${success} imported, ${failed} failed. First error: ${errors[0]}`);

    setImportRows([]);
    setImportFileName('');
    setImporting(false);
    setImportProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fetchData();
  };

  const downloadTemplate = () => {
    const cols = ['Company', 'Brand', 'Stock Name', ...locationOptions];
    const sample = [
      COMPANY_LIST[0],
      'AcmeBrand',
      'Sample Product',
      ...locationOptions.map((_, i) => (i === 0 ? '10' : '0')),
    ];
    const csv = [cols.map(escapeCsv).join(','), sample.map(escapeCsv).join(',')].join('\n');
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Adjustment"
        subtitle="Add or remove stock with a supplier invoice reference"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DataCard className="p-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'existing' | 'new' | 'import')}>
            <TabsList className="w-full justify-start mb-4 flex-wrap">
              <TabsTrigger value="existing" className="gap-2"><Package size={14} /> Existing Stock</TabsTrigger>
              <TabsTrigger value="new" className="gap-2"><PlusCircle size={14} /> New Product</TabsTrigger>
              <TabsTrigger value="import" className="gap-2"><Upload size={14} /> Bulk Import</TabsTrigger>
            </TabsList>

            <TabsContent value="existing">
              <form onSubmit={handleSubmit} className="space-y-5">
                <FormSection
                  title="Adjust Existing Stock"
                  subtitle="All fields marked with * are mandatory. Subtractions require confirmation."
                >
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Product *</Label>
                      <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                        <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {formatProductLocationSummary(p)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {selectedProduct && (
                      <div className="text-sm bg-teal-50 p-3 rounded border border-teal-200">
                        <p className="font-semibold text-teal-900 mb-1">Current Stock Levels:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-teal-700">
                          {locationOptions.map((location) => (
                            <div key={location}>{location}: <strong>{getLocationStock(selectedProduct, location)} units</strong></div>
                          ))}
                        </div>
                        <div className="mt-1 pt-1 border-t border-teal-200">
                          Total: <strong>{selectedProduct.total_stock} units</strong>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Company *</Label>
                      <Select value={company} onValueChange={(v) => setCompany(v as CompanyEnum)}>
                        <SelectTrigger><SelectValue placeholder="Which company receives this stock?" /></SelectTrigger>
                        <SelectContent>
                          {COMPANY_LIST.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Invoice No *</Label>
                        <Input value={invoiceNo} onChange={e => setInvoiceNo(sanitizeText(e.target.value, LIMITS.shortText))} placeholder="e.g. INV-2026-001" maxLength={LIMITS.shortText} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Invoice Date *</Label>
                        <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Location *</Label>
                      <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {locationOptions.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                              {selectedProduct ? ` (Current: ${getLocationStock(selectedProduct, location)})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Adjustment Type *</Label>
                      <Select value={type} onValueChange={v => setType(v as 'Addition' | 'Subtraction')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Addition">Addition (increase stock)</SelectItem>
                          <SelectItem value="Subtraction">Subtraction (decrease stock)</SelectItem>
                        </SelectContent>
                      </Select>
                      {type === 'Subtraction' && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                          <span>Subtraction is a destructive action and will ask for final confirmation on submit.</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input type="number" min="1" step="1" value={quantity} onChange={e => setQuantity(sanitizeNonNegativeInteger(e.target.value))} placeholder="Enter quantity" required />
                      {selectedProduct && quantity && (
                        <p className="text-xs text-gray-600">
                          New stock at {selectedLocation}: {type === 'Addition' ? currentLocationStock + Number(quantity) : Math.max(0, currentLocationStock - Number(quantity))} units
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Reason *</Label>
                      <Textarea value={reason} onChange={e => setReason(sanitizeMultilineText(e.target.value, LIMITS.reason))} placeholder="Reason for adjustment" rows={3} maxLength={LIMITS.reason} required />
                    </div>
                    <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row gap-3">
                      <Button type="submit" className={`w-full sm:w-auto rounded-xl ${type === 'Subtraction' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#34b0a7] hover:bg-[#2a9d94]'}`} disabled={saving}>
                        {saving ? 'Saving...' : type === 'Subtraction' ? 'Confirm Subtraction' : 'Apply Adjustment'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto rounded-xl"
                        onClick={resetExistingForm}
                      >
                        Reset Form
                      </Button>
                    </div>
                  </div>
                </FormSection>
              </form>
            </TabsContent>

            <TabsContent value="new">
              <form onSubmit={handleCreateProductAndAdjust} className="space-y-5">
                <FormSection
                  title="Add New Product with Stock"
                  subtitle="Creates a new product (SKU auto-generated) and records its initial stock against the supplier invoice."
                >
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Stock Name *</Label>
                      <Input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: sanitizeText(e.target.value, LIMITS.longText) }))} placeholder="e.g. Premium Widget 2000" maxLength={LIMITS.longText} required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Brand</Label>
                        <Select value={newForm.brand_id} onValueChange={v => setNewForm(f => ({ ...f, brand_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                          <SelectContent>
                            {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Company *</Label>
                        <Select value={newCompany} onValueChange={(v) => setNewCompany(v as CompanyEnum)}>
                          <SelectTrigger><SelectValue placeholder="Which company receives this stock?" /></SelectTrigger>
                          <SelectContent>
                            {COMPANY_LIST.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Dealer Price (₹)</Label>
                      <Input type="number" min="0" max="10000000" step="0.01" value={newForm.dealer_price} onChange={e => setNewForm(f => ({ ...f, dealer_price: sanitizeNonNegativeDecimal(e.target.value) }))} placeholder="0.00" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Invoice No *</Label>
                        <Input value={newInvoiceNo} onChange={e => setNewInvoiceNo(sanitizeText(e.target.value, LIMITS.shortText))} placeholder="e.g. INV-2026-001" maxLength={LIMITS.shortText} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Invoice Date *</Label>
                        <Input type="date" value={newInvoiceDate} onChange={e => setNewInvoiceDate(e.target.value)} required />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Location *</Label>
                        <Select value={newLocation} onValueChange={setNewLocation}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {locationOptions.map((location) => (
                              <SelectItem key={location} value={location}>{location}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <Input type="number" min="1" step="1" value={newQuantity} onChange={e => setNewQuantity(sanitizeNonNegativeInteger(e.target.value))} placeholder="Initial stock qty" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Reason</Label>
                      <Textarea value={newReason} onChange={e => setNewReason(sanitizeMultilineText(e.target.value, LIMITS.reason))} placeholder={`Defaults to "Initial stock from invoice ${newInvoiceNo || '...'}"`} rows={2} maxLength={LIMITS.reason} />
                    </div>
                    <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row gap-3">
                      <Button type="submit" className="w-full sm:w-auto rounded-xl bg-[#34b0a7] hover:bg-[#2a9d94]" disabled={creating}>
                        {creating ? 'Saving...' : 'Create Product & Add Stock'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto rounded-xl"
                        onClick={resetNewForm}
                      >
                        Reset Form
                      </Button>
                    </div>
                  </div>
                </FormSection>
              </form>
            </TabsContent>

            <TabsContent value="import">
              <FormSection
                title="Bulk Import Stock"
                subtitle={`Upload a CSV with Company (${COMPANY_LIST.join(' / ')}), Brand, Stock Name, and godown qty columns. Brands and products are created automatically if missing. Invoice number is auto-generated per batch.`}
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="outline" className="rounded-xl gap-2" onClick={downloadTemplate}>
                      <Download size={14} /> Download Template
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleImportFile(file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={importing}
                    >
                      <Upload size={14} /> {importFileName ? `Replace (${importFileName})` : 'Select CSV'}
                    </Button>
                  </div>

                  <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="font-semibold mb-1">Expected columns:</p>
                    <p className="font-mono break-words">
                      Company, Brand, Stock Name, {locationOptions.join(', ')}
                    </p>
                    <p className="mt-1">Company value must be one of: <span className="font-mono">{COMPANY_LIST.join(', ')}</span>. Each batch is tagged with an auto-generated invoice number and today's date.</p>
                  </div>

                  {importRows.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold flex justify-between">
                        <span>{importRows.length} rows parsed — {importRows.filter(r => !r.error).length} valid</span>
                        {importProgress && <span>Importing {importProgress.done}/{importProgress.total}...</span>}
                      </div>
                      <div className="overflow-x-auto max-h-72">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="text-left px-2 py-1.5">#</th>
                              <th className="text-left px-2 py-1.5">Company</th>
                              <th className="text-left px-2 py-1.5">Brand</th>
                              <th className="text-left px-2 py-1.5">Stock Name</th>
                              {locationOptions.map(l => <th key={l} className="text-right px-2 py-1.5">{l}</th>)}
                              <th className="text-right px-2 py-1.5">Total</th>
                              <th className="text-left px-2 py-1.5">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importRows.map(r => (
                              <tr key={r.rowIndex} className={r.error ? 'bg-red-50' : ''}>
                                <td className="px-2 py-1.5">{r.rowIndex}</td>
                                <td className="px-2 py-1.5">{r.company ?? r.companyRaw}</td>
                                <td className="px-2 py-1.5">{r.brand || '—'}</td>
                                <td className="px-2 py-1.5">{r.productName}</td>
                                {locationOptions.map(l => (
                                  <td key={l} className="px-2 py-1.5 text-right font-mono">{r.godownQty[l] ?? 0}</td>
                                ))}
                                <td className="px-2 py-1.5 text-right font-mono font-semibold">{r.totalQty}</td>
                                <td className={`px-2 py-1.5 ${r.error ? 'text-red-700' : 'text-emerald-700'}`}>{r.error ?? 'Ready'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {importRows.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        type="button"
                        className="w-full sm:w-auto rounded-xl bg-[#34b0a7] hover:bg-[#2a9d94]"
                        onClick={() => void executeImport()}
                        disabled={importing || importRows.every(r => r.error)}
                      >
                        {importing ? `Importing ${importProgress?.done ?? 0}/${importProgress?.total ?? 0}...` : `Import ${importRows.filter(r => !r.error).length} Rows`}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto rounded-xl"
                        onClick={() => {
                          setImportRows([]);
                          setImportFileName('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        disabled={importing}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              </FormSection>
            </TabsContent>
          </Tabs>
        </DataCard>

        <DataCard className="p-6">
          <FormSection
            title="Current Stock Levels"
            action={(
              <SearchBar
                placeholder="Search products..."
                value={search}
                onChange={setSearch}
                className="w-full sm:w-56"
              />
            )}
          >
            {filtered.length === 0 ? (
              <EmptyState
                icon={Boxes}
                message="No products match your search"
                sub="Try a different product name or SKU."
              />
            ) : (
              <div className="overflow-y-auto max-h-80">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Product</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Brand</th>
                      {locationOptions.map((location) => (
                        <th key={location} className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">{location}</th>
                      ))}
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-3 py-2 font-medium text-xs">{p.name}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{p.brands?.name}</td>
                        {locationOptions.map((location) => {
                          const locationQty = getLocationStock(p, location);
                          return (
                            <td key={location} className={`px-3 py-2 text-right font-bold text-xs ${locationQty <= 5 ? 'text-amber-600' : ''}`}>{locationQty}</td>
                          );
                        })}
                        <td className={`px-3 py-2 text-right font-bold text-xs ${p.total_stock <= 5 ? 'text-amber-600' : 'text-emerald-700'}`}>{p.total_stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </FormSection>
        </DataCard>
      </div>

      <DataCard className="p-6">
        <h3 className="text-base font-bold text-gray-800 mb-4">Recent Adjustments</h3>
        {recentAdjustments.length === 0 ? (
          <EmptyState
            icon={History}
            message="No adjustments recorded yet"
            sub="Completed stock adjustments will be listed here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Company</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Qty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Invoice No</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Invoice Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Reason</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentAdjustments.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold">{(a.products as { name: string } | null)?.name}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs font-semibold">{a.company ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${a.type === 'Addition' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{a.type}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{a.quantity}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs font-mono">{a.invoice_no ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{a.invoice_date ? new Date(a.invoice_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{a.reason}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(a.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>
    </div>
  );
};

function escapeCsv(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  if (/^[=+\-@]/.test(s)) return `'${s}`;
  return s;
}
