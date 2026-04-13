import { supabase } from '@/app/supabase';
import { loadSettingsMap } from '@/app/settings';
import type { CompanyEnum, Json } from '@/app/types/database';

export interface CompanyProfile {
  company_name: string;
  company_gstin: string;
  company_address: string;
  company_phone: string;
  company_email: string;
}

export type CompanyProfiles = Record<CompanyEnum, CompanyProfile>;

export const COMPANY_LIST: CompanyEnum[] = ['LLP', 'YES YES', 'Zekon'];

const DEFAULT_COMPANY_PROFILES: CompanyProfiles = {
  LLP: {
    company_name: 'LLP',
    company_gstin: '',
    company_address: '',
    company_phone: '',
    company_email: '',
  },
  'YES YES': {
    company_name: 'YES YES',
    company_gstin: '',
    company_address: '',
    company_phone: '',
    company_email: '',
  },
  Zekon: {
    company_name: 'Zekon',
    company_gstin: '',
    company_address: '',
    company_phone: '',
    company_email: '',
  },
};

export const cloneCompanyProfiles = (): CompanyProfiles => ({
  LLP: { ...DEFAULT_COMPANY_PROFILES.LLP },
  'YES YES': { ...DEFAULT_COMPANY_PROFILES['YES YES'] },
  Zekon: { ...DEFAULT_COMPANY_PROFILES.Zekon },
});

export const isCompanyEnum = (value: string): value is CompanyEnum =>
  COMPANY_LIST.includes(value as CompanyEnum);

export const getCompanyDisplayName = (
  company: string | null | undefined,
  profiles: CompanyProfiles,
  fallback = '—',
): string => {
  if (!company) return fallback;
  if (!isCompanyEnum(company)) return company;

  const configuredName = profiles[company]?.company_name?.trim();
  return configuredName || company;
};

export const getPrimaryCompanyName = (profiles: CompanyProfiles): string =>
  getCompanyDisplayName('YES YES', profiles, 'YES YES');

const isJsonObject = (value: Json | null): value is Record<string, Json> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const readString = (value: Json | null, fallback = '') =>
  typeof value === 'string' ? value : fallback;

const readProfileFromJson = (value: Json | null, fallback: CompanyProfile): CompanyProfile => {
  if (!isJsonObject(value)) {
    return { ...fallback };
  }

  return {
    company_name: readString(value.company_name ?? null, fallback.company_name),
    company_gstin: readString(value.company_gstin ?? null, fallback.company_gstin),
    company_address: readString(value.company_address ?? null, fallback.company_address),
    company_phone: readString(value.company_phone ?? null, fallback.company_phone),
    company_email: readString(value.company_email ?? null, fallback.company_email),
  };
};

export const readCompanyProfiles = (value: Json | null): CompanyProfiles => {
  const next = cloneCompanyProfiles();
  if (!isJsonObject(value)) {
    return next;
  }

  COMPANY_LIST.forEach((company) => {
    next[company] = readProfileFromJson(value[company] ?? null, next[company]);
  });

  return next;
};

export const loadCompanyProfiles = async (): Promise<CompanyProfiles> => {
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_company_profiles');

  if (!rpcError) {
    return readCompanyProfiles(rpcData as Json);
  }

  const settingKeys = ['company_profiles', 'company_name', 'company_gstin', 'company_address', 'company_phone', 'company_email'] as const;

  let settings: Record<string, Json> = {};
  try {
    settings = await loadSettingsMap(settingKeys);
  } catch {
    throw rpcError;
  }

  let profiles = cloneCompanyProfiles();
  let hasCompanyProfiles = false;
  let legacyYesYes = { ...profiles['YES YES'] };

  if (settings.company_profiles !== undefined) {
    profiles = readCompanyProfiles(settings.company_profiles);
    hasCompanyProfiles = true;
  }

  if (settings.company_name !== undefined) legacyYesYes.company_name = readString(settings.company_name, legacyYesYes.company_name);
  if (settings.company_gstin !== undefined) legacyYesYes.company_gstin = readString(settings.company_gstin);
  if (settings.company_address !== undefined) legacyYesYes.company_address = readString(settings.company_address);
  if (settings.company_phone !== undefined) legacyYesYes.company_phone = readString(settings.company_phone);
  if (settings.company_email !== undefined) legacyYesYes.company_email = readString(settings.company_email);

  if (!hasCompanyProfiles) {
    profiles = {
      ...profiles,
      'YES YES': legacyYesYes,
    };
  }

  return profiles;
};
