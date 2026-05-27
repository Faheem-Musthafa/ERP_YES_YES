import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import {
  AlertTriangle, Boxes, History, Package, Upload, Download,
  Plus, Trash2, ChevronsUpDown, PackagePlus, Layers,
  Receipt, FileText, MinusCircle, PlusCircle,
  CheckCircle2, CircleDashed, ChevronDown, Search,
} from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import { DataCard, EmptyState, FormSection, PageHeader, SearchBar } from '@/app/components/ui/primitives';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/app/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import type { CompanyEnum, GodownEnum } from '@/app/types/database';
import { COMPANY_LIST, isCompanyEnum } from '@/app/companyProfiles';
import { DEFAULT_MASTER_DATA_SETTINGS, loadMasterDataSettings } from '@/app/settings';
import { LOW_STOCK_THRESHOLD } from '@/app/stockHealth';
import { restoreRecoverableRecord } from '@/app/recovery';

const MAX_IMPORT_QTY_PER_CELL = 1_000_000;
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

type LineMode = 'existing' | 'new';

interface AdjustmentLine {
  id: string;
  mode: LineMode;
  productId: string;
  newName: string;
  newBrandId: string;
  newDealerPrice: string;
  location: string;
  quantity: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const generateAutoSku = () => {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase();
  return `AUTO-${stamp}-${rand}`;
};

const generateLineId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const makeBlankLine = (defaultLocation: string): AdjustmentLine => ({
  id: generateLineId(),
  mode: 'existing',
  productId: '',
  newName: '',
  newBrandId: '',
  newDealerPrice: '',
  location: defaultLocation,
  quantity: '',
});

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
  const [activeTab, setActiveTab] = useState<'adjust' | 'import'>('adjust');

  // Shared header (applies to every line)
  const [type, setType] = useState<'Addition' | 'Subtraction'>('Addition');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [company, setCompany] = useState<CompanyEnum | ''>('');
  const [reason, setReason] = useState('');

  // Line items
  const [lines, setLines] = useState<AdjustmentLine[]>(() => [makeBlankLine('')]);
  const [saving, setSaving] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState<Record<string, boolean>>({});

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

      // Backfill missing line.location with first available godown
      setLines((current) => current.map((line) =>
        line.location && nextLocationOptions.includes(line.location)
          ? line
          : { ...line, location: nextLocationOptions[0] || '' },
      ));

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

  const getLocationStock = (product: ProductWithStock, location: string) =>
    product.locationStocks[location] ?? 0;

  const productById = useMemo(() => {
    const map = new Map<string, ProductWithStock>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const productSearchEntries = useMemo(() => products.map((p) => ({
    product: p,
    searchStr: `${p.name} ${p.sku} ${p.brands?.name ?? ''}`.toLowerCase(),
  })), [products]);

  const addLine = () => {
    setLines((current) => [...current, makeBlankLine(locationOptions[0] || '')]);
  };

  const removeLine = (id: string) => {
    setLines((current) => (current.length === 1 ? current : current.filter((l) => l.id !== id)));
  };

  const updateLine = (id: string, patch: Partial<AdjustmentLine>) => {
    setLines((current) => current.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const setLineMode = (id: string, mode: LineMode) => {
    if (mode === 'new' && type === 'Subtraction') {
      toast.error('Cannot create a new product on a Subtraction. Switch type to Addition first.');
      return;
    }
    updateLine(id, mode === 'existing'
      ? { mode, newName: '', newBrandId: '', newDealerPrice: '' }
      : { mode, productId: '' },
    );
  };

  const resetForm = () => {
    setType('Addition');
    setInvoiceNo('');
    setInvoiceDate(todayIso());
    setCompany('');
    setReason('');
    setLines([makeBlankLine(locationOptions[0] || '')]);
    setProductPickerOpen({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let normalizedInvoiceNo = '';
    let normalizedReason = '';
    try {
      normalizedInvoiceNo = sanitizeText(invoiceNo, LIMITS.shortText);
      validateRequired(normalizedInvoiceNo, 'Invoice No');
      validateRequired(invoiceDate, 'Invoice Date');
      validateRequired(company, 'Company');
      normalizedReason = sanitizeMultilineText(reason, LIMITS.reason);
    } catch (err: any) {
      toast.error(err?.message || 'Header is incomplete');
      return;
    }

    if (lines.length === 0) {
      toast.error('Add at least one line');
      return;
    }

    type PreparedLine =
      | { kind: 'existing'; lineId: string; productId: string; productName: string; location: string; qty: number }
      | { kind: 'new'; lineId: string; name: string; brandId: string | null; dealerPrice: number; location: string; qty: number };

    const prepared: PreparedLine[] = [];

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const ordinal = i + 1;
      try {
        validateRequired(line.location, `Line ${ordinal}: Location`);
        validateRequired(line.quantity, `Line ${ordinal}: Quantity`);
        const qty = Number(line.quantity);
        validatePositiveAmount(qty, `Line ${ordinal}: Quantity`);

        if (line.mode === 'existing') {
          validateRequired(line.productId, `Line ${ordinal}: Product`);
          const product = productById.get(line.productId);
          if (!product) throw new Error(`Line ${ordinal}: product no longer exists`);
          prepared.push({
            kind: 'existing',
            lineId: line.id,
            productId: line.productId,
            productName: product.name,
            location: line.location,
            qty,
          });
        } else {
          if (type === 'Subtraction') {
            throw new Error(`Line ${ordinal}: cannot create a new product on a Subtraction`);
          }
          const productName = sanitizeText(line.newName, LIMITS.longText);
          validateRequired(productName, `Line ${ordinal}: Product Name`);
          const dealerPrice = Number(line.newDealerPrice || 0);
          validateNonNegativeAmount(dealerPrice, `Line ${ordinal}: Dealer price`);
          prepared.push({
            kind: 'new',
            lineId: line.id,
            name: productName,
            brandId: line.newBrandId || null,
            dealerPrice,
            location: line.location,
            qty,
          });
        }
      } catch (err: any) {
        toast.error(err?.message || `Line ${ordinal}: invalid`);
        return;
      }
    }

    if (type === 'Subtraction') {
      const summary = prepared
        .map((p) => `${p.kind === 'existing' ? p.productName : '(new)'} @ ${p.location} − ${p.qty}`)
        .join('\n');
      const confirmed = window.confirm(
        `You are reducing stock for ${prepared.length} line${prepared.length === 1 ? '' : 's'}:\n${summary}\n\nContinue?`,
      );
      if (!confirmed) return;
    }

    const Godowns = locationOptions;
    if (Godowns.length === 0) {
      toast.error('No Godown configured in Settings. Add at least one Godown first.');
      return;
    }

    const finalReason = normalizedReason || `Stock ${type.toLowerCase()} from invoice ${normalizedInvoiceNo}`;

    setSaving(true);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < prepared.length; i += 1) {
      const item = prepared[i];
      const ordinal = i + 1;
      let createdProductId: string | null = null;
      try {
        let productId: string;
        if (item.kind === 'existing') {
          productId = item.productId;
        } else {
          if (!Godowns.includes(item.location)) {
            throw new Error('selected location is not a configured Godown');
          }
          const { data: created, error: insertErr } = await supabase
            .from('products')
            .insert({
              name: item.name,
              brand_id: item.brandId,
              sku: generateAutoSku(),
              dealer_price: item.dealerPrice,
              stock_qty: 0,
              is_active: true,
            })
            .select('id')
            .single();
          if (insertErr) throw new Error(insertErr.message);
          if (!created?.id) throw new Error('product creation failed');
          createdProductId = created.id;
          const stockSeedRows = Godowns.map((location) => ({
            product_id: created.id,
            location,
            stock_qty: 0,
          }));
          const { error: seedErr } = await supabase
            .from('product_stock_locations')
            .insert(stockSeedRows);
          if (seedErr) throw new Error(seedErr.message);
          productId = created.id;
        }

        const { error: adjErr } = await supabase.rpc('create_stock_adjustment_atomic', {
          p_product_id: productId,
          p_location: item.location as GodownEnum,
          p_quantity: item.qty,
          p_type: type,
          p_reason: finalReason,
          p_user_id: user?.id ?? null,
          p_invoice_no: normalizedInvoiceNo,
          p_invoice_date: invoiceDate,
          p_company: company as CompanyEnum,
        });
        if (adjErr) throw new Error(adjErr.message);

        success += 1;
      } catch (err: any) {
        failed += 1;
        if (createdProductId) {
          await supabase.from('product_stock_locations').delete().eq('product_id', createdProductId);
          await supabase.from('products').delete().eq('id', createdProductId);
        }
        errors.push(`Line ${ordinal}: ${err?.message || 'unknown error'}`);
      }
    }

    setSaving(false);

    if (failed === 0) {
      toast.success(`Applied ${success} line${success === 1 ? '' : 's'} against invoice ${normalizedInvoiceNo}`);
      resetForm();
    } else if (success === 0) {
      toast.error(`All ${failed} line${failed === 1 ? '' : 's'} failed. First error: ${errors[0]}`);
    } else {
      toast.warning(`${success} applied, ${failed} failed. First error: ${errors[0]}`);
    }
    fetchData();
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

      const rawHeaders = allRows[0];
      const headers = rawHeaders.map(normalizeHeader);

      const headerGroups = new Map<string, string[]>();
      headers.forEach((h, i) => {
        if (!h) return;
        const group = headerGroups.get(h) ?? [];
        group.push(rawHeaders[i]);
        headerGroups.set(h, group);
      });
      const duplicates = Array.from(headerGroups.entries()).filter(([, raws]) => raws.length > 1);
      if (duplicates.length > 0) {
        const summary = duplicates.map(([, raws]) => raws.map(r => `"${r}"`).join(' / ')).join('; ');
        throw new Error(`Duplicate column headers after normalisation: ${summary}. Rename so headers don't collide.`);
      }

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

      let truncatedCells = 0;
      let cappedCells = 0;
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
          let safe = 0;
          if (Number.isFinite(q) && q > 0) {
            const floored = Math.floor(q);
            if (floored !== q) truncatedCells += 1;
            if (floored > MAX_IMPORT_QTY_PER_CELL) {
              safe = MAX_IMPORT_QTY_PER_CELL;
              cappedCells += 1;
            } else {
              safe = floored;
            }
          }
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
      if (truncatedCells > 0) {
        toast.warning(`${truncatedCells} cell${truncatedCells === 1 ? '' : 's'} had decimal qty truncated to integer`);
      }
      if (cappedCells > 0) {
        toast.warning(`${cappedCells} cell${cappedCells === 1 ? '' : 's'} exceeded ${MAX_IMPORT_QTY_PER_CELL.toLocaleString('en-IN')} and were capped`);
      }
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

        let resolvedBrandId: string | null = null;
        if (row.brand) {
          const brandKey = row.brand.trim().toLowerCase();
          resolvedBrandId = brandCache.get(brandKey) ?? null;
          if (!resolvedBrandId) {
            const { data: existing, error: lookupErr } = await supabase
              .from('brands')
              .select('id, name, is_active')
              .ilike('name', row.brand.trim())
              .maybeSingle();
            if (lookupErr) throw new Error(`brand "${row.brand}": ${lookupErr.message}`);
            if (existing) {
              if (!existing.is_active) {
                try {
                  await restoreRecoverableRecord({
                    table: 'brands',
                    id: existing.id,
                    entityLabel: existing.name,
                  });
                } catch (restoreErr: any) {
                  throw new Error(`brand "${row.brand}" archived; restore failed: ${restoreErr?.message ?? 'unknown'}`);
                }
              }
              resolvedBrandId = existing.id;
            } else {
              const { data, error } = await supabase
                .from('brands')
                .insert({ name: row.brand, is_active: true })
                .select('id')
                .single();
              if (error) throw new Error(`brand "${row.brand}": ${error.message}`);
              resolvedBrandId = data!.id;
            }
            brandCache.set(brandKey, resolvedBrandId);
          }
        }

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

  const lineSummaries = useMemo(() => lines.map((line) => {
    if (line.mode === 'existing') {
      const product = line.productId ? productById.get(line.productId) : undefined;
      const stock = product ? getLocationStock(product, line.location) : 0;
      const qtyNum = Number(line.quantity) || 0;
      const projected = type === 'Addition' ? stock + qtyNum : Math.max(0, stock - qtyNum);
      return { product, stock, qtyNum, projected, overSubtract: type === 'Subtraction' && qtyNum > stock };
    }
    return { product: undefined, stock: 0, qtyNum: Number(line.quantity) || 0, projected: 0, overSubtract: false };
  }), [lines, productById, type]);

  const lineReadiness = useMemo(() => lines.map((l) => {
    const qty = Number(l.quantity);
    const qtyOk = Number.isFinite(qty) && qty > 0;
    const locOk = !!l.location;
    if (l.mode === 'existing') {
      const productOk = !!l.productId;
      const status: 'ready' | 'empty' | 'invalid' =
        productOk && qtyOk && locOk ? 'ready'
          : !productOk && !qtyOk ? 'empty'
            : 'invalid';
      return { status, qty: qtyOk ? qty : 0 };
    }
    const nameOk = l.newName.trim().length > 0;
    const allowed = type === 'Addition';
    const status: 'ready' | 'empty' | 'invalid' =
      nameOk && qtyOk && locOk && allowed ? 'ready'
        : !nameOk && !qtyOk ? 'empty'
          : 'invalid';
    return { status, qty: qtyOk ? qty : 0 };
  }), [lines, type]);

  const validLineCount = lineReadiness.filter((r) => r.status === 'ready').length;
  const totalQty = lineReadiness.reduce((sum, r) => sum + (r.status === 'ready' ? r.qty : 0), 0);

  const recentGroups = useMemo(() => {
    const groups = new Map<string, { invoiceNo: string | null; invoiceDate: string | null; company: CompanyEnum | null; type: 'Addition' | 'Subtraction'; createdAt: string; rows: AdjustmentRow[] }>();
    recentAdjustments.forEach((row) => {
      const key = `${row.invoice_no ?? '∅'}|${row.invoice_date ?? '∅'}|${row.company ?? '∅'}|${row.type}`;
      const bucket = groups.get(key);
      if (bucket) {
        bucket.rows.push(row);
      } else {
        groups.set(key, {
          invoiceNo: row.invoice_no,
          invoiceDate: row.invoice_date,
          company: row.company,
          type: row.type,
          createdAt: row.created_at,
          rows: [row],
        });
      }
    });
    return Array.from(groups.values());
  }, [recentAdjustments]);

  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  const typeIsSub = type === 'Subtraction';
  const accentColor = typeIsSub ? '#dc2626' : '#34b0a7';
  const accentBg = typeIsSub ? 'bg-red-50' : 'bg-teal-50';
  const accentBorder = typeIsSub ? 'border-red-200' : 'border-teal-200';
  const accentText = typeIsSub ? 'text-red-700' : 'text-teal-700';

  const statusDot = (status: 'ready' | 'empty' | 'invalid') => {
    if (status === 'ready') return <CheckCircle2 size={14} className="text-emerald-500" />;
    if (status === 'invalid') return <AlertTriangle size={14} className="text-amber-500" />;
    return <CircleDashed size={14} className="text-gray-300" />;
  };

  return (
    <div className="space-y-5 pb-24">
      {/* ── Hero strip ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-white to-teal-50/60 px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${accentColor}14`, color: accentColor }}
            >
              <Layers size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-gray-900">Stock Adjustment</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                One invoice, many lines. Mix existing and new products in a single save.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${accentBg} ${accentText} border ${accentBorder}`}
            >
              {typeIsSub ? <MinusCircle size={12} /> : <PlusCircle size={12} />}
              {type}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
              <Layers size={12} />
              {validLineCount}/{lines.length} ready
            </span>
            {totalQty > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                {typeIsSub ? '−' : '+'}{totalQty} units
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Form Card ─────────────────────────────────────── */}
      <DataCard className="p-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'adjust' | 'import')}>
          <div className="px-5 pt-4 border-b border-gray-100 bg-gray-50/50">
            <TabsList className="bg-transparent p-0 h-auto gap-1 mb-[-1px]">
              <TabsTrigger
                value="adjust"
                className="data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:border-b-white data-[state=active]:shadow-none border border-transparent rounded-t-lg rounded-b-none px-4 py-2.5 gap-2 text-sm"
              >
                <Layers size={14} /> Adjust Stock
              </TabsTrigger>
              <TabsTrigger
                value="import"
                className="data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:border-b-white data-[state=active]:shadow-none border border-transparent rounded-t-lg rounded-b-none px-4 py-2.5 gap-2 text-sm"
              >
                <Upload size={14} /> Bulk Import
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="adjust" className="p-5 space-y-5 m-0">
            <form onSubmit={handleSubmit} className="space-y-5" id="stock-adjust-form">
              {/* Invoice Header */}
              <section className={`rounded-xl border ${typeIsSub ? 'border-red-200/70' : 'border-gray-200'} bg-white overflow-hidden`}>
                <div className={`px-4 py-2.5 border-b ${typeIsSub ? 'border-red-200/70 bg-red-50/50' : 'border-gray-100 bg-gray-50/70'} flex items-center justify-between`}>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-700">
                    <Receipt size={14} className={typeIsSub ? 'text-red-600' : 'text-teal-600'} />
                    Invoice Header
                  </div>
                  <span className="text-[11px] text-gray-500">Shared by every line</span>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Company *</Label>
                    <Select value={company} onValueChange={(v) => setCompany(v as CompanyEnum)}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select company" /></SelectTrigger>
                      <SelectContent>
                        {COMPANY_LIST.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Type *</Label>
                    <Select value={type} onValueChange={(v) => setType(v as 'Addition' | 'Subtraction')}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Addition">
                          <span className="inline-flex items-center gap-2"><PlusCircle size={13} className="text-emerald-600" /> Addition</span>
                        </SelectItem>
                        <SelectItem value="Subtraction">
                          <span className="inline-flex items-center gap-2"><MinusCircle size={13} className="text-red-600" /> Subtraction</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Invoice No *</Label>
                    <Input
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(sanitizeText(e.target.value, LIMITS.shortText))}
                      placeholder="INV-2026-001"
                      maxLength={LIMITS.shortText}
                      className="h-10 font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Invoice Date *</Label>
                    <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="h-10" required />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                    <Label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold flex items-center gap-1.5">
                      <FileText size={12} /> Reason (optional)
                    </Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(sanitizeMultilineText(e.target.value, LIMITS.reason))}
                      placeholder={`Defaults to "Stock ${type.toLowerCase()} from invoice ${invoiceNo || '...'}"`}
                      rows={2}
                      maxLength={LIMITS.reason}
                      className="resize-none"
                    />
                  </div>
                </div>
                {typeIsSub && (
                  <div className="mx-4 mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span><strong>Heads up:</strong> Subtraction is destructive. New-product rows are disabled and a final confirm is required.</span>
                  </div>
                )}
              </section>

              {/* Line Items */}
              <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-700">
                    <Layers size={14} className="text-teal-600" />
                    Line Items
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCircle2 size={12} /> {validLineCount} ready
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-500">{lines.length} total</span>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {lines.map((line, index) => {
                    const summary = lineSummaries[index];
                    const readiness = lineReadiness[index];
                    const isNew = line.mode === 'new';
                    const selectedProduct = !isNew && line.productId ? productById.get(line.productId) : undefined;
                    const popoverOpen = !!productPickerOpen[line.id];
                    const stripeColor =
                      readiness.status === 'ready' ? 'bg-emerald-400'
                        : readiness.status === 'invalid' ? 'bg-amber-400'
                          : 'bg-gray-200';
                    return (
                      <div key={line.id} className="relative group">
                        <span className={`absolute left-0 top-0 bottom-0 w-1 ${stripeColor} transition-colors`} aria-hidden />
                        <div className="pl-5 pr-4 py-4">
                          {/* Line header */}
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-[11px] font-bold text-gray-600">
                                {index + 1}
                              </span>
                              {statusDot(readiness.status)}
                              <div className="inline-flex rounded-md border border-gray-200 overflow-hidden text-[11px] shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setLineMode(line.id, 'existing')}
                                  className={`px-2.5 py-1 font-semibold transition-colors flex items-center gap-1 ${line.mode === 'existing' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                >
                                  <Package size={11} /> Existing
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLineMode(line.id, 'new')}
                                  disabled={typeIsSub}
                                  className={`px-2.5 py-1 font-semibold transition-colors flex items-center gap-1 border-l border-gray-200 ${line.mode === 'new' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'}`}
                                  title={typeIsSub ? 'Disabled during Subtraction' : 'Create a new product on this line'}
                                >
                                  <PackagePlus size={11} /> New
                                </button>
                              </div>
                              {readiness.status === 'ready' && readiness.qty > 0 && (
                                <span className="text-[11px] font-mono text-gray-500 hidden md:inline">
                                  {typeIsSub ? '−' : '+'}{readiness.qty}
                                </span>
                              )}
                            </div>
                            {lines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeLine(line.id)}
                                className="h-7 w-7 rounded-md flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                aria-label={`Remove line ${index + 1}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>

                          {/* Line fields */}
                          {isNew ? (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                              <div className="md:col-span-5 space-y-1">
                                <Label className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Stock Name *</Label>
                                <Input
                                  value={line.newName}
                                  onChange={(e) => updateLine(line.id, { newName: sanitizeText(e.target.value, LIMITS.longText) })}
                                  placeholder="e.g. Premium Widget 2000"
                                  maxLength={LIMITS.longText}
                                  className="h-10"
                                />
                              </div>
                              <div className="md:col-span-3 space-y-1">
                                <Label className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Brand</Label>
                                <Select value={line.newBrandId} onValueChange={(v) => updateLine(line.id, { newBrandId: v })}>
                                  <SelectTrigger className="h-10"><SelectValue placeholder="Select brand" /></SelectTrigger>
                                  <SelectContent>
                                    {brands.map((b) => (
                                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="md:col-span-4 space-y-1">
                                <Label className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Dealer Price (₹)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="10000000"
                                  step="0.01"
                                  value={line.newDealerPrice}
                                  onChange={(e) => updateLine(line.id, { newDealerPrice: sanitizeNonNegativeDecimal(e.target.value) })}
                                  placeholder="0.00"
                                  className="h-10 font-mono text-right"
                                />
                              </div>
                              <div className="md:col-span-6 space-y-1">
                                <Label className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Location *</Label>
                                <Select value={line.location} onValueChange={(v) => updateLine(line.id, { location: v })}>
                                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {locationOptions.map((location) => (
                                      <SelectItem key={location} value={location}>{location}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="md:col-span-3 space-y-1">
                                <Label className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Quantity *</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={line.quantity}
                                  onChange={(e) => updateLine(line.id, { quantity: sanitizeNonNegativeInteger(e.target.value) })}
                                  placeholder="0"
                                  className="h-10 font-mono text-right font-bold text-base"
                                />
                              </div>
                              <div className="md:col-span-3 flex items-end pb-1">
                                <p className="text-[11px] text-gray-500 leading-snug">
                                  Auto SKU. Zero-seeded across all godowns before adjustment.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                              <div className="md:col-span-6 space-y-1">
                                <Label className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Product *</Label>
                                <Popover
                                  open={popoverOpen}
                                  onOpenChange={(open) => setProductPickerOpen((prev) => ({ ...prev, [line.id]: open }))}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      role="combobox"
                                      className="w-full justify-between font-medium h-10 truncate"
                                    >
                                      <span className="inline-flex items-center gap-2 min-w-0 truncate">
                                        <Search size={13} className="text-gray-400 shrink-0" />
                                        <span className="truncate">{selectedProduct ? selectedProduct.name : 'Search product or SKU…'}</span>
                                      </span>
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[--radix-popover-trigger-width] md:w-[440px] p-0" align="start">
                                    <Command>
                                      <CommandInput placeholder="Search by name, SKU, or brand…" className="h-10" />
                                      <CommandList className="max-h-[280px]">
                                        <CommandEmpty>
                                          <div className="py-6 text-center">
                                            <Package className="mx-auto h-6 w-6 text-gray-300 mb-1" />
                                            <p className="text-sm font-medium text-gray-600">No product found</p>
                                            <p className="text-xs text-gray-400">Try a different keyword, or switch to "New" mode.</p>
                                          </div>
                                        </CommandEmpty>
                                        <CommandGroup>
                                          {productSearchEntries.map(({ product, searchStr }) => {
                                            const isLow = product.total_stock <= LOW_STOCK_THRESHOLD;
                                            return (
                                              <CommandItem
                                                key={product.id}
                                                value={searchStr}
                                                onSelect={() => {
                                                  updateLine(line.id, { productId: product.id });
                                                  setProductPickerOpen((prev) => ({ ...prev, [line.id]: false }));
                                                }}
                                                className="flex items-center justify-between border-b border-gray-50 py-2"
                                              >
                                                <div className="flex flex-col min-w-0 pr-4">
                                                  <span className="font-medium text-gray-900 truncate">{product.name}</span>
                                                  <span className="text-xs text-gray-500">
                                                    {product.brands?.name ?? 'No brand'} • <span className="font-mono">{product.sku}</span>
                                                  </span>
                                                </div>
                                                <span className={`shrink-0 text-xs font-mono font-bold px-2 py-0.5 rounded-full ${isLow ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                                  {product.total_stock}
                                                </span>
                                              </CommandItem>
                                            );
                                          })}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                                {selectedProduct && (
                                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                                    {locationOptions.map((loc) => {
                                      const qty = getLocationStock(selectedProduct, loc);
                                      const active = loc === line.location;
                                      const low = qty <= LOW_STOCK_THRESHOLD;
                                      return (
                                        <button
                                          key={loc}
                                          type="button"
                                          onClick={() => updateLine(line.id, { location: loc })}
                                          className={`text-[11px] px-2 py-0.5 rounded-md border font-medium transition-colors ${
                                            active
                                              ? 'border-teal-500 bg-teal-500 text-white shadow-sm'
                                              : low
                                                ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                                          }`}
                                          title={`Set location to ${loc}`}
                                        >
                                          {loc}: <span className="font-mono font-bold">{qty}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="md:col-span-3 space-y-1">
                                <Label className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Location *</Label>
                                <Select value={line.location} onValueChange={(v) => updateLine(line.id, { location: v })}>
                                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {locationOptions.map((location) => (
                                      <SelectItem key={location} value={location}>
                                        <span className="inline-flex items-center justify-between gap-3 w-full">
                                          <span>{location}</span>
                                          {selectedProduct && (
                                            <span className="font-mono text-xs text-gray-500">{getLocationStock(selectedProduct, location)}</span>
                                          )}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="md:col-span-3 space-y-1">
                                <Label className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Quantity *</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={line.quantity}
                                  onChange={(e) => updateLine(line.id, { quantity: sanitizeNonNegativeInteger(e.target.value) })}
                                  placeholder="0"
                                  className={`h-10 font-mono text-right font-bold text-base ${summary.overSubtract ? 'border-red-300 bg-red-50 text-red-700 focus-visible:ring-red-300' : ''}`}
                                />
                                {selectedProduct && Number(line.quantity) > 0 && (
                                  <p className={`text-[11px] mt-0.5 ${summary.overSubtract ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                    After: <span className="font-mono font-bold">{summary.projected}</span> @ {line.location}
                                    {summary.overSubtract && ' (insufficient)'}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 border-t border-gray-100 bg-gray-50/40">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addLine}
                    className="w-full rounded-lg border-dashed gap-2 h-10 text-gray-600 hover:text-gray-900 hover:border-teal-300 hover:bg-teal-50/30"
                  >
                    <Plus size={14} /> Add another line
                  </Button>
                </div>
              </section>
            </form>
          </TabsContent>

          <TabsContent value="import" className="p-5 space-y-4 m-0">
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Bulk Import Stock</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Upload a CSV. Brands and products are created automatically. Each batch is tagged with an auto-generated invoice number and today's date.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="rounded-lg gap-2 h-9" onClick={downloadTemplate}>
                  <Download size={14} /> Template
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
                  className="rounded-lg gap-2 h-9"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  <Upload size={14} /> {importFileName ? `Replace (${importFileName})` : 'Select CSV'}
                </Button>
              </div>

              <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="font-semibold mb-1 text-gray-800">Expected columns</p>
                <p className="font-mono break-words text-[11px]">
                  Company, Brand, Stock Name, {locationOptions.join(', ')}
                </p>
                <p className="mt-1.5 text-[11px]">
                  Company must be one of: <span className="font-mono">{COMPANY_LIST.join(', ')}</span>
                </p>
              </div>

              {importRows.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold flex justify-between">
                    <span>{importRows.length} rows parsed — <span className="text-emerald-700">{importRows.filter(r => !r.error).length} valid</span></span>
                    {importProgress && <span className="text-teal-600">Importing {importProgress.done}/{importProgress.total}…</span>}
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
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    className="w-full sm:w-auto rounded-lg bg-[#34b0a7] hover:bg-[#2a9d94]"
                    onClick={() => void executeImport()}
                    disabled={importing || importRows.every(r => r.error)}
                  >
                    {importing ? `Importing ${importProgress?.done ?? 0}/${importProgress?.total ?? 0}…` : `Import ${importRows.filter(r => !r.error).length} Rows`}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto rounded-lg"
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
          </TabsContent>
        </Tabs>
      </DataCard>

      {/* ── Side-by-side: Stock view + Recent ───────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <DataCard className="p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Boxes size={15} className="text-teal-600" />
              <h3 className="text-sm font-bold text-gray-900">Current Stock Levels</h3>
              <span className="text-[11px] text-gray-500">({products.length})</span>
            </div>
            <SearchBar
              placeholder="Search…"
              value={search}
              onChange={setSearch}
              className="w-full sm:w-64"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Boxes}
                message="No products match your search"
                sub="Try a different product name or SKU."
              />
            </div>
          ) : (
            <div className="overflow-y-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-white sticky top-0 border-b border-gray-100 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide">Product</th>
                    <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide">Brand</th>
                    {locationOptions.map((location) => (
                      <th key={location} className="text-right px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide">{location}</th>
                    ))}
                    <th className="text-right px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-3 py-2 font-medium text-xs text-gray-900">{p.name}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{p.brands?.name ?? '—'}</td>
                      {locationOptions.map((location) => {
                        const locationQty = getLocationStock(p, location);
                        return (
                          <td key={location} className={`px-3 py-2 text-right font-mono font-semibold text-xs ${locationQty <= LOW_STOCK_THRESHOLD ? 'text-amber-600' : 'text-gray-700'}`}>{locationQty}</td>
                        );
                      })}
                      <td className={`px-3 py-2 text-right font-mono font-bold text-xs ${p.total_stock <= LOW_STOCK_THRESHOLD ? 'text-amber-600' : 'text-emerald-700'}`}>{p.total_stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataCard>

        <DataCard className="p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={15} className="text-teal-600" />
              <h3 className="text-sm font-bold text-gray-900">Recent Adjustments</h3>
              <span className="text-[11px] text-gray-500">({recentAdjustments.length})</span>
            </div>
          </div>
          {recentGroups.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={History}
                message="No adjustments recorded yet"
                sub="Completed stock adjustments will be listed here."
              />
            </div>
          ) : (
            <div className="overflow-y-auto max-h-96 divide-y divide-gray-100">
              {recentGroups.map((group, gIdx) => {
                const groupKey = `${group.invoiceNo ?? '∅'}|${group.invoiceDate ?? '∅'}|${gIdx}`;
                const expanded = expandedInvoice === groupKey;
                const total = group.rows.reduce((s, r) => s + r.quantity, 0);
                const isAdd = group.type === 'Addition';
                return (
                  <div key={groupKey}>
                    <button
                      type="button"
                      onClick={() => setExpandedInvoice(expanded ? null : groupKey)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50/70 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`inline-flex items-center justify-center h-7 w-7 rounded-lg shrink-0 ${isAdd ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {isAdd ? <PlusCircle size={14} /> : <MinusCircle size={14} />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 font-mono truncate">{group.invoiceNo ?? '—'}</p>
                          <p className="text-[11px] text-gray-500 truncate">
                            {group.company ?? '—'} · {group.invoiceDate ? new Date(group.invoiceDate).toLocaleDateString() : '—'} · {group.rows.length} item{group.rows.length === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-mono font-bold ${isAdd ? 'text-emerald-700' : 'text-red-700'}`}>
                          {isAdd ? '+' : '−'}{total}
                        </span>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {expanded && (
                      <div className="bg-gray-50/40 px-4 py-2">
                        <table className="w-full text-xs">
                          <tbody className="divide-y divide-gray-100">
                            {group.rows.map((r) => (
                              <tr key={r.id}>
                                <td className="py-1.5 pr-2 font-medium text-gray-800">
                                  {(r.products as { name: string } | null)?.name ?? '—'}
                                </td>
                                <td className={`py-1.5 text-right font-mono font-bold ${r.type === 'Addition' ? 'text-emerald-700' : 'text-red-700'}`}>
                                  {r.type === 'Addition' ? '+' : '−'}{r.quantity}
                                </td>
                              </tr>
                            ))}
                            {group.rows[0]?.reason && (
                              <tr>
                                <td colSpan={2} className="pt-2 text-[11px] text-gray-500 italic">
                                  {group.rows[0].reason}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DataCard>
      </div>

      {/* ── Sticky action footer ───────────────────────────── */}
      {activeTab === 'adjust' && (
        <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.12)] z-20">
          <div className="mx-auto w-full max-w-[1600px] flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 flex items-center gap-3 text-sm flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-gray-600">
                <Layers size={14} className="text-gray-400" />
                <span className="font-semibold text-gray-900">{validLineCount}</span>
                <span className="text-gray-500">/ {lines.length} ready</span>
              </span>
              {totalQty > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold font-mono border border-emerald-200">
                  {typeIsSub ? '−' : '+'}{totalQty} units
                </span>
              )}
              {invoiceNo && (
                <span className="hidden md:inline-flex items-center gap-1 text-xs text-gray-500">
                  <Receipt size={12} /> <span className="font-mono">{invoiceNo}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg h-10"
                onClick={resetForm}
                disabled={saving}
              >
                Reset
              </Button>
              <Button
                type="submit"
                form="stock-adjust-form"
                className={`rounded-lg h-10 px-5 font-semibold ${typeIsSub ? 'bg-red-600 hover:bg-red-700' : 'bg-[#34b0a7] hover:bg-[#2a9d94]'}`}
                disabled={saving || validLineCount === 0}
              >
                {saving
                  ? 'Saving…'
                  : typeIsSub
                    ? `Confirm Subtraction · ${validLineCount}`
                    : `Apply ${validLineCount} line${validLineCount === 1 ? '' : 's'}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function escapeCsv(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  if (/^[=+\-@]/.test(s)) return `'${s}`;
  return s;
}
