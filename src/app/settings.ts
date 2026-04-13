import { supabase } from '@/app/supabase';
import type { InvoiceTypeEnum, Json } from '@/app/types/database';

type SettingsMap = Record<string, Json>;
type MasterSettingRpcKey = 'godowns' | 'districts' | 'vehicle_types';
type SettingsEntryRow = {
  key: string;
  value?: Json | null;
};

const ORDER_SETTINGS_KEYS = ['default_invoice_type', 'max_discount_percentage', 'godowns'] as const;
const MASTER_SETTINGS_KEYS = ['godowns', 'districts', 'vehicle_types'] as const;
const MASTER_SETTING_KEY_SET = new Set<string>(MASTER_SETTINGS_KEYS);

const ORDER_INVOICE_TYPES: InvoiceTypeEnum[] = [
  'GST',
  'NGST',
  'IGST',
  'Delivery Challan Out',
  'Delivery Challan In',
];

export const DEFAULT_GODOWNS: readonly string[] = [];
export const DEFAULT_DISTRICTS: readonly string[] = [];
export const DEFAULT_VEHICLE_TYPES: readonly string[] = [];

export interface OrderFormSettings {
  defaultInvoiceType: InvoiceTypeEnum;
  maxDiscountPercentage: number;
  godowns: string[];
}

export interface MasterDataSettings {
  godowns: string[];
  districts: string[];
  vehicleTypes: string[];
}

export const DEFAULT_ORDER_FORM_SETTINGS: OrderFormSettings = {
  defaultInvoiceType: 'GST',
  maxDiscountPercentage: 20,
  godowns: [...DEFAULT_GODOWNS],
};

export const DEFAULT_MASTER_DATA_SETTINGS: MasterDataSettings = {
  godowns: [...DEFAULT_GODOWNS],
  districts: [...DEFAULT_DISTRICTS],
  vehicleTypes: [...DEFAULT_VEHICLE_TYPES],
};

const isJsonObject = (value: Json | null): value is Record<string, Json> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isSettingsEntryRow = (value: Json | null): value is SettingsEntryRow =>
  isJsonObject(value) && typeof value.key === 'string';

const isStringArray = (value: Json | null): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const readString = (value: Json | null, fallback = '') =>
  typeof value === 'string' ? value : fallback;

const readNumber = (value: Json | null, fallback = 0) =>
  typeof value === 'number' ? value : fallback;

const isInvoiceType = (value: string): value is InvoiceTypeEnum =>
  ORDER_INVOICE_TYPES.includes(value as InvoiceTypeEnum);

const normalizeStringList = (value: Json | null, fallback: readonly string[]): string[] => {
  if (!isStringArray(value)) {
    return [...fallback];
  }

  const cleaned = value
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  const seen = new Set<string>();
  const unique: string[] = [];
  cleaned.forEach((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(item);
  });
  return unique.length > 0 ? unique : [...fallback];
};

const normalizeRuntimeStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const unique: string[] = [];
  value.forEach((item) => {
    if (typeof item !== 'string') return;
    const cleaned = item.trim();
    if (cleaned.length > 0) {
      const key = cleaned.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(cleaned);
    }
  });

  return unique;
};

const loadMasterOptionsByRpc = async (key: MasterSettingRpcKey): Promise<string[]> => {
  const { data, error } = await supabase.rpc('get_master_setting_options', { p_key: key });
  if (error) {
    return [];
  }
  return normalizeRuntimeStringList(data);
};

const loadMasterOptionsFromTable = async (key: MasterSettingRpcKey): Promise<string[]> => {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    return [];
  }

  return normalizeStringList((data?.value ?? null) as Json | null, []);
};

const loadMasterOptions = async (key: MasterSettingRpcKey): Promise<string[]> => {
  const rpcOptions = await loadMasterOptionsByRpc(key);
  if (rpcOptions.length > 0) {
    return rpcOptions;
  }

  return loadMasterOptionsFromTable(key);
};

const loadMasterSettingsFallback = async (
  keys: readonly string[],
): Promise<Partial<Record<MasterSettingRpcKey, string[]>>> => {
  const masterKeys = keys.filter((key): key is MasterSettingRpcKey => MASTER_SETTING_KEY_SET.has(key));
  if (masterKeys.length === 0) {
    return {};
  }

  const entries = await Promise.all(masterKeys.map(async (key) => (
    [key, await loadMasterOptions(key)] as const
  )));

  return entries.reduce<Partial<Record<MasterSettingRpcKey, string[]>>>((acc, [key, value]) => {
    if (value.length > 0) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const toMapFromRows = (rows: Array<{ key: string; value: Json | null }>): SettingsMap => {
  const next: SettingsMap = {};
  rows.forEach((row) => {
    if (typeof row.key === 'string' && row.key.length > 0) {
      next[row.key] = row.value;
    }
  });
  return next;
};

const toMapFromJson = (value: Json | null): SettingsMap => {
  if (Array.isArray(value)) {
    const rows: Array<{ key: string; value: Json | null }> = [];
    value.forEach((entry) => {
      if (!isSettingsEntryRow(entry)) {
        return;
      }
      const key = entry.key;
      if (typeof key !== 'string' || key.length === 0) {
        return;
      }
      rows.push({
        key,
        value: (entry.value ?? null) as Json | null,
      });
    });
    return toMapFromRows(rows);
  }

  if (!isJsonObject(value)) {
    return {};
  }

  if (isSettingsEntryRow(value)) {
    return {
      [value.key]: (value.value ?? null) as Json | null,
    };
  }

  const nestedSettings = value.settings ?? value.data ?? null;
  if (nestedSettings) {
    const nestedMap = toMapFromJson(nestedSettings as Json);
    if (Object.keys(nestedMap).length > 0) {
      return nestedMap;
    }
  }

  return value as SettingsMap;
};

export const loadSettingsMap = async (keys: readonly string[]): Promise<SettingsMap> => {
  let map: SettingsMap = {};

  const { data: masterData, error } = await supabase.rpc('get_master_settings');
  if (!error) {
    map = toMapFromJson(masterData as Json);
  }

  const masterFallbackMap = await loadMasterSettingsFallback(keys);
  if (Object.keys(masterFallbackMap).length > 0) {
    Object.entries(masterFallbackMap).forEach(([key, value]) => {
      map[key] = value as Json;
    });
  }

  const missingKeys = keys.filter((key) => !(key in map));
  if (missingKeys.length > 0) {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', missingKeys);

    if (error) {
      if (Object.keys(map).length === 0) {
        throw error;
      }
      return map;
    }

    map = {
      ...map,
      ...toMapFromRows((data ?? []) as Array<{ key: string; value: Json | null }>),
    };
  }

  return map;
};

export const loadOrderFormSettings = async (): Promise<OrderFormSettings> => {
  let settings: SettingsMap = {};
  try {
    settings = await loadSettingsMap(ORDER_SETTINGS_KEYS);
  } catch {
    settings = {};
  }

  const invoiceTypeRaw = readString(
    settings.default_invoice_type ?? null,
    DEFAULT_ORDER_FORM_SETTINGS.defaultInvoiceType,
  );
  const defaultInvoiceType = isInvoiceType(invoiceTypeRaw)
    ? invoiceTypeRaw
    : DEFAULT_ORDER_FORM_SETTINGS.defaultInvoiceType;

  const maxDiscountPercentage = Math.max(
    0,
    Math.min(
      100,
      readNumber(settings.max_discount_percentage ?? null, DEFAULT_ORDER_FORM_SETTINGS.maxDiscountPercentage),
    ),
  );

  let godowns = normalizeStringList(settings.godowns ?? null, DEFAULT_ORDER_FORM_SETTINGS.godowns);
  if (godowns.length === 0) {
    const rpcGodowns = await loadMasterOptions('godowns');
    if (rpcGodowns.length > 0) {
      godowns = rpcGodowns;
    }
  }

  return {
    defaultInvoiceType,
    maxDiscountPercentage,
    godowns,
  };
};

export const loadMasterDataSettings = async (): Promise<MasterDataSettings> => {
  let settings: SettingsMap = {};
  try {
    settings = await loadSettingsMap(MASTER_SETTINGS_KEYS);
  } catch {
    settings = {};
  }

  let godowns = normalizeStringList(settings.godowns ?? null, DEFAULT_MASTER_DATA_SETTINGS.godowns);
  let districts = normalizeStringList(settings.districts ?? null, DEFAULT_MASTER_DATA_SETTINGS.districts);
  let vehicleTypes = normalizeStringList(settings.vehicle_types ?? null, DEFAULT_MASTER_DATA_SETTINGS.vehicleTypes);

  if (godowns.length === 0) {
    const rpcGodowns = await loadMasterOptions('godowns');
    if (rpcGodowns.length > 0) {
      godowns = rpcGodowns;
    }
  }

  if (districts.length === 0) {
    const rpcDistricts = await loadMasterOptions('districts');
    if (rpcDistricts.length > 0) {
      districts = rpcDistricts;
    }
  }

  if (vehicleTypes.length === 0) {
    const rpcVehicleTypes = await loadMasterOptions('vehicle_types');
    if (rpcVehicleTypes.length > 0) {
      vehicleTypes = rpcVehicleTypes;
    }
  }

  return {
    godowns,
    districts,
    vehicleTypes,
  };
};
