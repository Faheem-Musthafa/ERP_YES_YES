import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/app/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Settings, Save, RotateCcw, Database, Building2, MapPin, Truck, AlertCircle, Check, Briefcase, Calculator, Building, Phone, Mail, BadgePercent, CalendarDays, FileText, Pencil } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { toast } from 'sonner';
import {
  FormCard, CustomTooltip, Spinner,
} from '@/app/components/ui/primitives';
import { DEFAULT_MASTER_DATA_SETTINGS } from '@/app/settings';
import { COMPANY_LIST, cloneCompanyProfiles, readCompanyProfiles, type CompanyProfile, type CompanyProfiles } from '@/app/companyProfiles';
import type { CompanyEnum, Json } from '@/app/types/database';
import { LIMITS, sanitizeDigits, sanitizeEmail, sanitizeMultilineText, sanitizePhone, sanitizeText, sanitizeUpperAlnum, validateEmail, validateGSTIN, validatePhone, validateRequired } from '@/app/validation';

interface SystemConfig {
  default_invoice_type: string;
  enable_auto_approval: boolean;
  max_discount_percentage: number;
  financial_year_start: number;
  financial_year_end: number;
}

const DEFAULT_CONFIG: SystemConfig = {
  default_invoice_type: 'GST',
  enable_auto_approval: false,
  max_discount_percentage: 20,
  financial_year_start: 4,
  financial_year_end: 3,
};

const GodownS = [...DEFAULT_MASTER_DATA_SETTINGS.Godowns];
const DISTRICTS = [...DEFAULT_MASTER_DATA_SETTINGS.districts];
const VEHICLE_TYPES = [...DEFAULT_MASTER_DATA_SETTINGS.vehicleTypes];
const SYSTEM_CONFIG_KEYS = new Set<keyof SystemConfig>([
  'default_invoice_type',
  'enable_auto_approval',
  'max_discount_percentage',
  'financial_year_start',
  'financial_year_end',
]);

type MasterSettingKey = 'Godowns' | 'districts' | 'vehicle_types';

const MASTER_SETTING_LABELS: Record<MasterSettingKey, string> = {
  Godowns: 'Godown',
  districts: 'District',
  vehicle_types: 'Vehicle type',
};

const normalizeMasterLookupKey = (value: string) => value.trim().toLowerCase();
const normalizeMasterInput = (value: string) => sanitizeText(value, LIMITS.mediumText);

const normalizeMasterList = (values: readonly string[]) => {
  const unique = new Set<string>();
  const normalized: string[] = [];
  values.forEach((value) => {
    const cleaned = value.trim();
    if (cleaned.length === 0) return;
    const lookup = normalizeMasterLookupKey(cleaned);
    if (unique.has(lookup)) return;
    unique.add(lookup);
    normalized.push(cleaned);
  });
  return normalized;
};

const hasMasterValue = (values: readonly string[], candidate: string, ignoreValue?: string) => {
  const candidateKey = normalizeMasterLookupKey(candidate);
  const ignoreKey = ignoreValue ? normalizeMasterLookupKey(ignoreValue) : null;

  return values.some((value) => {
    const valueKey = normalizeMasterLookupKey(value);
    if (ignoreKey && valueKey === ignoreKey) return false;
    return valueKey === candidateKey;
  });
};

const toMasterList = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return normalizeMasterList(value.filter((item): item is string => typeof item === 'string'));
};

const isMissingCrudRpc = (err: { code?: string; message?: string }) =>
  err.code === '42883' || /does not exist|Could not find the function/i.test(err.message ?? '');

const Godown_RPC_MISSING_ERROR =
  'Godown management RPC is missing. Run docs/ENUM_TO_DYNAMIC_SETTINGS_MIGRATION.sql and retry.';

const isStringArray = (value: Json | null): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isJsonObject = (value: Json | null): value is Record<string, Json> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const readString = (value: Json | null, fallback = '') => typeof value === 'string' ? value : fallback;
const readBoolean = (value: Json | null, fallback = false) => typeof value === 'boolean' ? value : fallback;
const readNumber = (value: Json | null, fallback = 0) => typeof value === 'number' ? value : fallback;
const applySystemSetting = (
  current: SystemConfig,
  key: keyof SystemConfig,
  value: Json | null,
): SystemConfig => {
  switch (key) {
    case 'default_invoice_type':
      return { ...current, default_invoice_type: readString(value, DEFAULT_CONFIG.default_invoice_type) };
    case 'enable_auto_approval':
      return { ...current, enable_auto_approval: readBoolean(value, DEFAULT_CONFIG.enable_auto_approval) };
    case 'max_discount_percentage':
      return { ...current, max_discount_percentage: readNumber(value, DEFAULT_CONFIG.max_discount_percentage) };
    case 'financial_year_start':
      return { ...current, financial_year_start: readNumber(value, DEFAULT_CONFIG.financial_year_start) };
    case 'financial_year_end':
      return { ...current, financial_year_end: readNumber(value, DEFAULT_CONFIG.financial_year_end) };
    default:
      return current;
  }
};

export const AdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingCompany, setSavingCompany] = useState<CompanyEnum | null>(null);
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [companyProfiles, setCompanyProfiles] = useState<CompanyProfiles>(cloneCompanyProfiles());
  const [originalCompanyProfiles, setOriginalCompanyProfiles] = useState<CompanyProfiles>(cloneCompanyProfiles());
  const [resetConfirm, setResetConfirm] = useState(false);

  // Dialog states for master data
  const [GodownDialog, setGodownDialog] = useState(false);
  const [newGodown, setNewGodown] = useState('');
  const [GodownList, setGodownList] = useState<string[]>(GodownS);
  const [originalGodownList, setOriginalGodownList] = useState<string[]>(GodownS);

  const [districtDialog, setDistrictDialog] = useState(false);
  const [newDistrict, setNewDistrict] = useState('');
  const [districtList, setDistrictList] = useState<string[]>(DISTRICTS);
  const [originalDistrictList, setOriginalDistrictList] = useState<string[]>(DISTRICTS);

  const [vehicleDialog, setVehicleDialog] = useState(false);
  const [newVehicle, setNewVehicle] = useState('');
  const [vehicleList, setVehicleList] = useState<string[]>(VEHICLE_TYPES);
  const [originalVehicleList, setOriginalVehicleList] = useState<string[]>(VEHICLE_TYPES);

  const [editMasterDialog, setEditMasterDialog] = useState(false);
  const [editMasterKey, setEditMasterKey] = useState<MasterSettingKey>('Godowns');
  const [editMasterOriginalValue, setEditMasterOriginalValue] = useState('');
  const [editMasterValue, setEditMasterValue] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load all settings from database
      const { data, error } = await supabase
        .from('settings')
        .select('key, value');

      if (error) throw error;

      if (data && data.length > 0) {
        let newConfig = { ...DEFAULT_CONFIG };
        let profiles = cloneCompanyProfiles();
        let hasCompanyProfilesKey = false;
        let legacyYesYesProfile = { ...profiles['YES YES'] };
        let hasLegacyCompanyValues = false;
        let nextGodowns = [...GodownS];
        let nextDistricts = [...DISTRICTS];
        let nextVehicleTypes = [...VEHICLE_TYPES];

        for (const setting of data) {
          if (SYSTEM_CONFIG_KEYS.has(setting.key as keyof SystemConfig)) {
            newConfig = applySystemSetting(newConfig, setting.key as keyof SystemConfig, setting.value);
          } else if (setting.key === 'company_profiles') {
            profiles = readCompanyProfiles(setting.value);
            hasCompanyProfilesKey = true;
          } else if (setting.key === 'company_name') {
            legacyYesYesProfile.company_name = readString(setting.value, legacyYesYesProfile.company_name);
            hasLegacyCompanyValues = true;
          } else if (setting.key === 'company_gstin') {
            legacyYesYesProfile.company_gstin = readString(setting.value, legacyYesYesProfile.company_gstin);
            hasLegacyCompanyValues = true;
          } else if (setting.key === 'company_address') {
            legacyYesYesProfile.company_address = readString(setting.value, legacyYesYesProfile.company_address);
            hasLegacyCompanyValues = true;
          } else if (setting.key === 'company_phone') {
            legacyYesYesProfile.company_phone = readString(setting.value, legacyYesYesProfile.company_phone);
            hasLegacyCompanyValues = true;
          } else if (setting.key === 'company_email') {
            legacyYesYesProfile.company_email = readString(setting.value, legacyYesYesProfile.company_email);
            hasLegacyCompanyValues = true;
          } else if (setting.key === 'Godowns') {
            nextGodowns = isStringArray(setting.value) ? normalizeMasterList(setting.value) : GodownS;
          } else if (setting.key === 'districts') {
            nextDistricts = isStringArray(setting.value) ? normalizeMasterList(setting.value) : DISTRICTS;
          } else if (setting.key === 'vehicle_types') {
            nextVehicleTypes = isStringArray(setting.value) ? normalizeMasterList(setting.value) : VEHICLE_TYPES;
          }
        }

        if (!hasCompanyProfilesKey && hasLegacyCompanyValues) {
          profiles = {
            ...profiles,
            'YES YES': legacyYesYesProfile,
          };
        }

        if (nextGodowns.length === 0) {
          const { data: rpcGodowns, error: rpcGodownsError } = await supabase.rpc('get_master_setting_options', {
            p_key: 'Godowns',
          });
          if (!rpcGodownsError) {
            const parsed = toMasterList(rpcGodowns);
            if (parsed.length > 0) {
              nextGodowns = parsed;
            }
          }
        }

        setConfig(newConfig);
        setOriginalConfig(newConfig);
        setCompanyProfiles(profiles);
        setOriginalCompanyProfiles(profiles);
        setGodownList(nextGodowns);
        setOriginalGodownList(nextGodowns);
        setDistrictList(nextDistricts);
        setOriginalDistrictList(nextDistricts);
        setVehicleList(nextVehicleTypes);
        setOriginalVehicleList(nextVehicleTypes);
      }
    } catch (err: any) {
      toast.error('Failed to load settings: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBusiness = async () => {
    setSavingBusiness(true);
    try {
      if (config.max_discount_percentage < 0 || config.max_discount_percentage > 100) {
        toast.error('Discount percentage must be between 0 and 100');
        return;
      }

      const businessSettings = [
        { key: 'default_invoice_type', value: config.default_invoice_type },
        { key: 'enable_auto_approval', value: config.enable_auto_approval },
        { key: 'max_discount_percentage', value: config.max_discount_percentage },
        { key: 'financial_year_start', value: config.financial_year_start },
        { key: 'financial_year_end', value: config.financial_year_end },
        { key: 'Godowns', value: GodownList },
        { key: 'districts', value: districtList },
        { key: 'vehicle_types', value: vehicleList },
      ];

      for (const setting of businessSettings) {
        const { error } = await supabase
          .from('settings')
          .upsert({
            key: setting.key,
            value: setting.value,
          }, { onConflict: 'key' });

        if (error) throw error;
      }

      setOriginalConfig(config);
      setOriginalGodownList(GodownList);
      setOriginalDistrictList(districtList);
      setOriginalVehicleList(vehicleList);
      toast.success('Business settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSavingBusiness(false);
    }
  };

  const getMasterListByKey = (key: MasterSettingKey) => {
    if (key === 'Godowns') return GodownList;
    if (key === 'districts') return districtList;
    return vehicleList;
  };

  const applyMasterListByKey = (key: MasterSettingKey, values: readonly string[]) => {
    const cleaned = normalizeMasterList(values);
    if (key === 'Godowns') {
      setGodownList(cleaned);
      setOriginalGodownList(cleaned);
      return;
    }
    if (key === 'districts') {
      setDistrictList(cleaned);
      setOriginalDistrictList(cleaned);
      return;
    }
    setVehicleList(cleaned);
    setOriginalVehicleList(cleaned);
  };

  const saveMasterListFallback = async (key: MasterSettingKey, values: readonly string[]) => {
    const cleaned = normalizeMasterList(values);
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value: cleaned }, { onConflict: 'key' });

    if (error) throw error;
    return cleaned;
  };

  const createMasterOption = async (key: MasterSettingKey, rawValue: string) => {
    const current = getMasterListByKey(key);
    const value = normalizeMasterInput(rawValue);
    const label = MASTER_SETTING_LABELS[key];

    if (!value) {
      toast.error(`${label} is required`);
      return false;
    }

    if (hasMasterValue(current, value)) {
      toast.error(`${label} already exists`);
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('create_master_setting_option', {
        p_key: key,
        p_value: value,
      });

      const next = error
        ? await (async () => {
            if (!isMissingCrudRpc(error)) throw error;
            if (key === 'Godowns') {
              throw new Error(Godown_RPC_MISSING_ERROR);
            }
            return saveMasterListFallback(key, [...current, value]);
          })()
        : (() => {
            const parsed = toMasterList(data);
            return parsed.length > 0 ? parsed : normalizeMasterList([...current, value]);
          })();

      applyMasterListByKey(key, next);
      toast.success(`${label} added`);
      return true;
    } catch (err: any) {
      toast.error(err.message || `Failed to add ${label.toLowerCase()}`);
      return false;
    }
  };

  const deleteMasterOption = async (key: MasterSettingKey, value: string) => {
    const current = getMasterListByKey(key);
    const label = MASTER_SETTING_LABELS[key];

    try {
      const { data, error } = await supabase.rpc('delete_master_setting_option', {
        p_key: key,
        p_value: value,
      });

      const next = error
        ? await (async () => {
            if (!isMissingCrudRpc(error)) throw error;
            if (key === 'Godowns') {
              throw new Error(Godown_RPC_MISSING_ERROR);
            }
            if (current.length <= 1) {
              throw new Error(`You must keep at least one ${label.toLowerCase()}`);
            }
            return saveMasterListFallback(key, current.filter((item) => item !== value));
          })()
        : (() => {
            const parsed = toMasterList(data);
            return parsed.length > 0 ? parsed : current.filter((item) => item !== value);
          })();

      applyMasterListByKey(key, next);
      toast.success(`${label} removed`);
      return true;
    } catch (err: any) {
      toast.error(err.message || `Failed to remove ${label.toLowerCase()}`);
      return false;
    }
  };

  const openEditMasterItem = (key: MasterSettingKey, value: string) => {
    setEditMasterKey(key);
    setEditMasterOriginalValue(value);
    setEditMasterValue(value);
    setEditMasterDialog(true);
  };

  const handleUpdateMasterItem = async () => {
    const label = MASTER_SETTING_LABELS[editMasterKey];
    const current = getMasterListByKey(editMasterKey);
    const nextValue = normalizeMasterInput(editMasterValue);

    if (!nextValue) {
      toast.error(`${label} is required`);
      return;
    }

    if (normalizeMasterLookupKey(nextValue) === normalizeMasterLookupKey(editMasterOriginalValue)) {
      setEditMasterDialog(false);
      return;
    }

    if (hasMasterValue(current, nextValue, editMasterOriginalValue)) {
      toast.error(`${label} already exists`);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('update_master_setting_option', {
        p_key: editMasterKey,
        p_old_value: editMasterOriginalValue,
        p_new_value: nextValue,
      });

      const next = error
        ? await (async () => {
            if (!isMissingCrudRpc(error)) throw error;
            if (editMasterKey === 'Godowns') {
              throw new Error(Godown_RPC_MISSING_ERROR);
            }
            const fallback = current.map((item) => (item === editMasterOriginalValue ? nextValue : item));
            return saveMasterListFallback(editMasterKey, fallback);
          })()
        : (() => {
            const parsed = toMasterList(data);
            return parsed.length > 0
              ? parsed
              : current.map((item) => (item === editMasterOriginalValue ? nextValue : item));
          })();

      applyMasterListByKey(editMasterKey, next);
      setEditMasterDialog(false);
      toast.success(`${label} updated`);
    } catch (err: any) {
      toast.error(err.message || `Failed to update ${label.toLowerCase()}`);
    }
  };

  const handleSaveCompanyProfile = async (company: CompanyEnum) => {
    const profile = companyProfiles[company];
    const normalizedProfile: CompanyProfile = {
      company_name: sanitizeText(profile.company_name, LIMITS.longText),
      company_gstin: sanitizeUpperAlnum(profile.company_gstin, LIMITS.gstin),
      company_address: sanitizeMultilineText(profile.company_address, LIMITS.address),
      company_phone: sanitizePhone(profile.company_phone),
      company_email: sanitizeEmail(profile.company_email),
    };
    const sanitizedProfiles: CompanyProfiles = {
      ...companyProfiles,
      [company]: normalizedProfile,
    };
    const companyDisplayName = normalizedProfile.company_name || company;
    if (!normalizedProfile.company_name) {
      toast.error(`${companyDisplayName} company name is required`);
      return;
    }
    if (!normalizedProfile.company_address) {
      toast.error(`${companyDisplayName} company address is required`);
      return;
    }
    try {
      if (normalizedProfile.company_phone) validatePhone(normalizedProfile.company_phone, 'Company phone');
      if (normalizedProfile.company_email) validateEmail(normalizedProfile.company_email);
      if (normalizedProfile.company_gstin) validateGSTIN(normalizedProfile.company_gstin);
    } catch (err: any) {
      toast.error(err?.message || 'Invalid company profile');
      return;
    }

    setSavingCompany(company);
    try {
      const { error: profilesError } = await supabase
        .from('settings')
        .upsert(
          {
            key: 'company_profiles',
            value: sanitizedProfiles as unknown as Json,
          },
          { onConflict: 'key' },
        );

      if (profilesError) throw profilesError;

      if (company === 'YES YES') {
        const legacySettings = [
          { key: 'company_name', value: normalizedProfile.company_name },
          { key: 'company_gstin', value: normalizedProfile.company_gstin },
          { key: 'company_address', value: normalizedProfile.company_address },
          { key: 'company_phone', value: normalizedProfile.company_phone },
          { key: 'company_email', value: normalizedProfile.company_email },
        ];

        for (const setting of legacySettings) {
          const { error } = await supabase
            .from('settings')
            .upsert(
              {
                key: setting.key,
                value: setting.value,
              },
              { onConflict: 'key' },
            );

          if (error) throw error;
        }
      }

      setCompanyProfiles(sanitizedProfiles);
      setOriginalCompanyProfiles(sanitizedProfiles);
      toast.success(`${companyDisplayName} profile saved`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save company profile');
    } finally {
      setSavingCompany(null);
    }
  };

  const handleReset = () => {
    setConfig(originalConfig);
    setCompanyProfiles(originalCompanyProfiles);
    setGodownList(originalGodownList);
    setDistrictList(originalDistrictList);
    setVehicleList(originalVehicleList);
    setResetConfirm(false);
    toast.success('Settings reset to last saved state');
  };

  const handleAddGodown = async () => {
    const ok = await createMasterOption('Godowns', newGodown);
    if (ok) {
      setNewGodown('');
      setGodownDialog(false);
    }
  };

  const handleRemoveGodown = async (name: string) => {
    await deleteMasterOption('Godowns', name);
  };

  const handleAddDistrict = async () => {
    const ok = await createMasterOption('districts', newDistrict);
    if (ok) {
      setNewDistrict('');
      setDistrictDialog(false);
    }
  };

  const handleRemoveDistrict = async (name: string) => {
    await deleteMasterOption('districts', name);
  };

  const handleAddVehicle = async () => {
    const ok = await createMasterOption('vehicle_types', newVehicle);
    if (ok) {
      setNewVehicle('');
      setVehicleDialog(false);
    }
  };

  const handleRemoveVehicle = async (name: string) => {
    await deleteMasterOption('vehicle_types', name);
  };

  const hasBusinessChanges =
    JSON.stringify(config) !== JSON.stringify(originalConfig)
    || JSON.stringify(GodownList) !== JSON.stringify(originalGodownList)
    || JSON.stringify(districtList) !== JSON.stringify(originalDistrictList)
    || JSON.stringify(vehicleList) !== JSON.stringify(originalVehicleList);

  const hasCompanyChanges = JSON.stringify(companyProfiles) !== JSON.stringify(originalCompanyProfiles);
  const hasChanges = hasBusinessChanges || hasCompanyChanges;

  const isCompanyDirty = (company: CompanyEnum) =>
    JSON.stringify(companyProfiles[company]) !== JSON.stringify(originalCompanyProfiles[company]);

  const updateCompanyProfile = (company: CompanyEnum, key: keyof CompanyProfile, value: string) => {
    const normalizedValue = (() => {
      if (key === 'company_gstin') return sanitizeUpperAlnum(value, LIMITS.gstin);
      if (key === 'company_phone') return sanitizePhone(value);
      if (key === 'company_email') return sanitizeEmail(value);
      if (key === 'company_address') return sanitizeMultilineText(value, LIMITS.address);
      return sanitizeText(value, LIMITS.longText);
    })();
    setCompanyProfiles((prev) => ({
      ...prev,
      [company]: {
        ...prev[company],
        [key]: normalizedValue,
      },
    }));
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">System Settings</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xl">
            Configure system rules, manage company identities, and update master references in one secure place.
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <CustomTooltip content="Reset all changes to last saved state" side="bottom">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetConfirm(true)}
              disabled={!hasChanges || savingBusiness || savingCompany !== null}
              className="gap-2 transition-all shadow-sm hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 dark:hover:border-rose-500/30"
            >
              <RotateCcw size={15} /> Reset
            </Button>
          </CustomTooltip>
          {(hasBusinessChanges || hasCompanyChanges) && (
            <Button
              size="sm"
              onClick={handleSaveBusiness}
              disabled={!hasBusinessChanges || savingBusiness}
              className="gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-all shadow-md active:scale-[0.98]"
            >
              <Save size={15} /> {savingBusiness ? 'Saving...' : 'Save Business & Master Details'}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200/60 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800/30 px-5 py-4 text-sm text-blue-800 dark:text-blue-300 flex items-start gap-4 shadow-sm backdrop-blur-xl transition-all hover:bg-blue-50/80">
        <div className="p-2 bg-blue-100 dark:bg-blue-800/40 rounded-full shrink-0">
          <AlertCircle size={18} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div className="pt-0.5">
          <p className="font-semibold text-base">Profile-Based Identity Enabled</p>
          <p className="text-sm mt-1 opacity-90 leading-relaxed max-w-2xl">
            Billing and invoice outputs can now leverage individual profile setups for <span className="font-semibold">{companyProfiles.LLP.company_name || 'LLP'}</span>, <span className="font-semibold">{companyProfiles['YES YES'].company_name || 'YES YES'}</span>, and <span className="font-semibold">{companyProfiles.Zekon.company_name || 'Zekon'}</span> independently. Configuration under the "Company Profiles" tab takes precedence.
          </p>
        </div>
      </div>

      <Tabs defaultValue="business" className="w-full">
        <TabsList className="grid w-full grid-cols-3 p-1.5 h-auto bg-slate-100/80 dark:bg-slate-800/50 rounded-2xl mb-8 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50">
          <TabsTrigger value="business" className="py-2.5 gap-2.5 rounded-xl text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white">
            <Settings size={16} className="opacity-70" /> Business Rules
          </TabsTrigger>
          <TabsTrigger value="profiles" className="py-2.5 gap-2.5 rounded-xl text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white">
            <Briefcase size={16} className="opacity-70" /> Company Profiles
          </TabsTrigger>
          <TabsTrigger value="master" className="py-2.5 gap-2.5 rounded-xl text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white">
            <Database size={16} className="opacity-70" /> Master Data
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 rounded-3xl">
          {/* BUSINESS RULES TAB */}
          <TabsContent value="business" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <FormCard className="lg:col-span-1 p-0 overflow-hidden border-border/60 bg-white dark:bg-slate-900/40 shadow-sm rounded-2xl group transition-all hover:border-slate-300 dark:hover:border-slate-700">
                <div className="p-6 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                      <FileText size={16} className="text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Invoice Settings</h3>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 pl-12">Manage default configurations for system-generated invoices.</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300 font-medium">Default Invoice Type</Label>
                    <Select
                      value={config.default_invoice_type}
                      onValueChange={(v) => setConfig({ ...config, default_invoice_type: v })}
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="GST">GST</SelectItem>
                        <SelectItem value="NGST">NGST</SelectItem>
                        <SelectItem value="IGST">IGST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                      <BadgePercent size={14} className="text-slate-400" /> Max Discount Percentage (%)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={config.max_discount_percentage}
                      onChange={(e) => setConfig({ ...config, max_discount_percentage: Math.max(0, Math.min(100, Number(sanitizeDigits(e.target.value, 3)) || 0)) })}
                      placeholder="0-100"
                      className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200/60 dark:border-slate-700/60 gap-4 mt-2 transition-all hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Enable Auto-Approval</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Automatically approve standard orders that fall within safe operational limits.</p>
                    </div>
                    <Switch
                      checked={config.enable_auto_approval}
                      onCheckedChange={(v) => setConfig({ ...config, enable_auto_approval: v })}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                </div>
              </FormCard>

              <FormCard className="lg:col-span-1 p-0 overflow-hidden border-border/60 bg-white dark:bg-slate-900/40 shadow-sm rounded-2xl group transition-all hover:border-slate-300 dark:hover:border-slate-700">
                <div className="p-6 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                      <CalendarDays size={16} className="text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Financial Year Details</h3>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 pl-12">Define the starting and ending months for the operational business year.</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300 font-medium">Start Month</Label>
                    <Select
                      value={config.financial_year_start.toString()}
                      onValueChange={(v) => setConfig({ ...config, financial_year_start: Number(v) })}
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300 font-medium">End Month</Label>
                    <Select
                      value={config.financial_year_end.toString()}
                      onValueChange={(v) => setConfig({ ...config, financial_year_end: Number(v) })}
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </FormCard>
            </div>
          </TabsContent>

          {/* COMPANY PROFILES TAB */}
          <TabsContent value="profiles" className="focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {COMPANY_LIST.map((company) => {
                const profile = companyProfiles[company];
                const dirty = isCompanyDirty(company);
                const isSavingThisCompany = savingCompany === company;
                const companyDisplayName = profile.company_name || company;

                return (
                  <div key={company} className="relative flex flex-col bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md">
                    <div className="flex items-center justify-between p-5 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 border-b border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center font-bold text-lg border border-primary/20">
                          {companyDisplayName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">{companyDisplayName}</p>
                          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">Profile Identity</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => void handleSaveCompanyProfile(company)}
                        disabled={!dirty || savingCompany !== null || savingBusiness}
                        className={dirty ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm animate-pulse" : "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"}
                      >
                        <Save size={14} className={dirty ? "mr-1.5" : ""} /> {isSavingThisCompany ? 'Saving' : dirty ? 'Save' : ''}
                      </Button>
                    </div>

                    <div className="p-5 space-y-5 flex-1 bg-white dark:bg-transparent">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Building size={12} /> Company Name *
                        </Label>
                        <Input
                          value={profile.company_name}
                          onChange={(e) => updateCompanyProfile(company, 'company_name', e.target.value)}
                          placeholder={`Legal Name for ${companyDisplayName}`}
                          required
                          maxLength={LIMITS.longText}
                          className="h-10 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/60"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Calculator size={12} /> GSTIN
                        </Label>
                        <Input
                          value={profile.company_gstin}
                          onChange={(e) => updateCompanyProfile(company, 'company_gstin', e.target.value)}
                          placeholder="e.g. 32AABCT1234F1Z5"
                          maxLength={LIMITS.gstin}
                          className="h-10 uppercase rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/60 font-mono tracking-wider text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <Phone size={12} /> Phone
                          </Label>
                          <Input
                            value={profile.company_phone}
                            onChange={(e) => updateCompanyProfile(company, 'company_phone', e.target.value)}
                            placeholder="+91..."
                            maxLength={LIMITS.phone}
                            className="h-10 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/60"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <Mail size={12} /> Email
                          </Label>
                          <Input
                            type="email"
                            value={profile.company_email}
                            onChange={(e) => updateCompanyProfile(company, 'company_email', e.target.value)}
                            placeholder="mail@..."
                            maxLength={LIMITS.email}
                            className="h-10 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/60"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin size={12} /> Registered Address *
                        </Label>
                        <Textarea
                          value={profile.company_address}
                          onChange={(e) => updateCompanyProfile(company, 'company_address', e.target.value)}
                          placeholder="Full operational address for invoices"
                          rows={3}
                          required
                          maxLength={LIMITS.address}
                          className="rounded-xl resize-none bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/60 text-sm leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* MASTER DATA TAB */}
          <TabsContent value="master" className="focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Godowns */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm flex flex-col overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 rounded-lg">
                      <Building2 size={16} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">Godowns</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{GodownList.length} locations</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800" onClick={() => setGodownDialog(true)}>
                    <span className="text-lg font-light leading-none mb-0.5">+</span>
                  </Button>
                </div>
                <div className="p-3 bg-slate-50/30 dark:bg-transparent flex-1 h-64 overflow-y-auto w-full custom-scrollbar">
                  <div className="space-y-2">
                    {GodownList.map((Godown) => (
                      <div key={Godown} className="group flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/50 text-sm shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-600">
                        <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div> {Godown}
                        </span>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditMasterItem('Godowns', Godown)} className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60">
                            Edit
                          </button>
                          <button onClick={() => handleRemoveGodown(Godown)} className="text-xs font-semibold text-rose-500 hover:text-rose-600 px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10">
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    {GodownList.length === 0 && <p className="text-center text-sm text-slate-400 py-6">No Godowns configured</p>}
                  </div>
                </div>
              </div>

              {/* Districts */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm flex flex-col overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-lg">
                      <MapPin size={16} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">Districts</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{districtList.length} regions</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800" onClick={() => setDistrictDialog(true)}>
                    <span className="text-lg font-light leading-none mb-0.5">+</span>
                  </Button>
                </div>
                <div className="p-3 bg-slate-50/30 dark:bg-transparent flex-1 h-64 overflow-y-auto w-full custom-scrollbar">
                  <div className="space-y-2">
                    {districtList.map((district) => (
                      <div key={district} className="group flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/50 text-sm shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-600">
                        <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div> {district}
                        </span>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditMasterItem('districts', district)} className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60">
                            Edit
                          </button>
                          <button onClick={() => handleRemoveDistrict(district)} className="text-xs font-semibold text-rose-500 hover:text-rose-600 px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10">
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    {districtList.length === 0 && <p className="text-center text-sm text-slate-400 py-6">No districts configured</p>}
                  </div>
                </div>
              </div>

              {/* Vehicle Types */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm flex flex-col overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 rounded-lg">
                      <Truck size={16} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">Vehicle Types</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{vehicleList.length} modes</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800" onClick={() => setVehicleDialog(true)}>
                    <span className="text-lg font-light leading-none mb-0.5">+</span>
                  </Button>
                </div>
                <div className="p-3 bg-slate-50/30 dark:bg-transparent flex-1 h-64 overflow-y-auto w-full custom-scrollbar">
                  <div className="space-y-2">
                    {vehicleList.map((vehicle) => (
                      <div key={vehicle} className="group flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/50 text-sm shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-600">
                        <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div> {vehicle}
                        </span>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditMasterItem('vehicle_types', vehicle)} className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60">
                            Edit
                          </button>
                          <button onClick={() => handleRemoveVehicle(vehicle)} className="text-xs font-semibold text-rose-500 hover:text-rose-600 px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10">
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    {vehicleList.length === 0 && <p className="text-center text-sm text-slate-400 py-6">No vehicle types configured</p>}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={GodownDialog} onOpenChange={setGodownDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 rounded-xl"><Building2 size={20} /></div>
                Add Godown
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="Godown-name" className="text-slate-600 font-medium">Godown Location Name</Label>
                <Input
                  id="Godown-name"
                  value={newGodown}
                  onChange={(e) => setNewGodown(normalizeMasterInput(e.target.value))}
                  placeholder="e.g. Main Godown"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGodown()}
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
                  autoFocus
                />
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setGodownDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleAddGodown} className="gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
              <Check size={16} /> Add Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={districtDialog} onOpenChange={setDistrictDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-xl"><MapPin size={20} /></div>
                Add District
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="district-name" className="text-slate-600 font-medium">District Name</Label>
                <Input
                  id="district-name"
                  value={newDistrict}
                  onChange={(e) => setNewDistrict(normalizeMasterInput(e.target.value))}
                  placeholder="e.g. Kottayam"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDistrict()}
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
                  autoFocus
                />
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setDistrictDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleAddDistrict} className="gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
              <Check size={16} /> Add District
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={vehicleDialog} onOpenChange={setVehicleDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 rounded-xl"><Truck size={20} /></div>
                Add Vehicle Type
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle-name" className="text-slate-600 font-medium">Vehicle Category</Label>
                <Input
                  id="vehicle-name"
                  value={newVehicle}
                  onChange={(e) => setNewVehicle(normalizeMasterInput(e.target.value))}
                  placeholder="e.g. Auto Rickshaw"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddVehicle()}
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
                  autoFocus
                />
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setVehicleDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleAddVehicle} className="gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
              <Check size={16} /> Add Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editMasterDialog} onOpenChange={setEditMasterDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl flex items-center gap-3">
                <div className="p-2 bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300 rounded-xl"><Pencil size={20} /></div>
                Edit {MASTER_SETTING_LABELS[editMasterKey]}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-master-value" className="text-slate-600 font-medium">Updated value</Label>
                <Input
                  id="edit-master-value"
                  value={editMasterValue}
                  onChange={(e) => setEditMasterValue(normalizeMasterInput(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && void handleUpdateMasterItem()}
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
                  autoFocus
                />
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setEditMasterDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={() => void handleUpdateMasterItem()} className="gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
              <Check size={16} /> Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <AlertDialogContent className="rounded-3xl border-0 shadow-2xl">
          <AlertDialogHeader>
            <div className="mx-auto w-16 h-16 bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center rounded-full mb-3 shadow-inner">
              <RotateCcw size={28} className="text-rose-600 dark:text-rose-400" />
            </div>
            <AlertDialogTitle className="text-center text-xl">Discard Unsaved Changes?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-slate-500 text-base mt-2">
              Are you sure you want to revert to the last saved state? You will lose any <span className="font-medium text-slate-700 dark:text-slate-300">unsaved profile or rule edits</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center mt-6 gap-3">
            <AlertDialogCancel className="w-full sm:w-auto h-11 rounded-xl">Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="w-full sm:w-auto h-11 rounded-xl bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 text-white shadow-md border-0"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
