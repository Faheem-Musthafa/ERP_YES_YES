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
import { Settings, Save, RotateCcw, Database, Building2, MapPin, Truck, AlertCircle, Check } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { toast } from 'sonner';
import {
  PageHeader, FormCard, FormSection, CustomTooltip, Spinner,
} from '@/app/components/ui/primitives';
import type { Json } from '@/app/types/database';

interface SystemConfig {
  company_name: string;
  company_gstin: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  default_invoice_type: string;
  enable_auto_approval: boolean;
  max_discount_percentage: number;
  financial_year_start: number;
  financial_year_end: number;
}

const DEFAULT_CONFIG: SystemConfig = {
  company_name: 'YES YES',
  company_gstin: '',
  company_address: '',
  company_phone: '',
  company_email: '',
  default_invoice_type: 'GST',
  enable_auto_approval: false,
  max_discount_percentage: 20,
  financial_year_start: 4,
  financial_year_end: 3,
};

const GODOWNS = ['Kottakkal', 'Chenakkal'];
const DISTRICTS = [
  'Kasaragod', 'Kannur', 'Wayanad', 'Kozhikode', 'Malappuram',
  'Palakkad', 'Thrissur', 'Ernakulam', 'Idukki', 'Kottayam',
  'Alappuzha', 'Pathanamthitta', 'Kollam', 'Thiruvananthapuram',
];
const VEHICLE_TYPES = ['2-Wheeler', '3-Wheeler', '4-Wheeler', 'Truck', 'Others'];
const SYSTEM_CONFIG_KEYS = new Set<keyof SystemConfig>([
  'company_name',
  'company_gstin',
  'company_address',
  'company_phone',
  'company_email',
  'default_invoice_type',
  'enable_auto_approval',
  'max_discount_percentage',
  'financial_year_start',
  'financial_year_end',
]);

const isStringArray = (value: Json | null): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const readString = (value: Json | null, fallback = '') => typeof value === 'string' ? value : fallback;
const readBoolean = (value: Json | null, fallback = false) => typeof value === 'boolean' ? value : fallback;
const readNumber = (value: Json | null, fallback = 0) => typeof value === 'number' ? value : fallback;
const applySystemSetting = (
  current: SystemConfig,
  key: keyof SystemConfig,
  value: Json | null,
): SystemConfig => {
  switch (key) {
    case 'company_name':
      return { ...current, company_name: readString(value, DEFAULT_CONFIG.company_name) };
    case 'company_gstin':
      return { ...current, company_gstin: readString(value, DEFAULT_CONFIG.company_gstin) };
    case 'company_address':
      return { ...current, company_address: readString(value, DEFAULT_CONFIG.company_address) };
    case 'company_phone':
      return { ...current, company_phone: readString(value, DEFAULT_CONFIG.company_phone) };
    case 'company_email':
      return { ...current, company_email: readString(value, DEFAULT_CONFIG.company_email) };
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
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [resetConfirm, setResetConfirm] = useState(false);

  // Dialog states for master data
  const [godownDialog, setGodownDialog] = useState(false);
  const [newGodown, setNewGodown] = useState('');
  const [godownList, setGodownList] = useState<string[]>(GODOWNS);

  const [districtDialog, setDistrictDialog] = useState(false);
  const [newDistrict, setNewDistrict] = useState('');
  const [districtList, setDistrictList] = useState<string[]>(DISTRICTS);

  const [vehicleDialog, setVehicleDialog] = useState(false);
  const [newVehicle, setNewVehicle] = useState('');
  const [vehicleList, setVehicleList] = useState<string[]>(VEHICLE_TYPES);

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

        for (const setting of data) {
          if (SYSTEM_CONFIG_KEYS.has(setting.key as keyof SystemConfig)) {
            newConfig = applySystemSetting(newConfig, setting.key as keyof SystemConfig, setting.value);
          } else if (setting.key === 'godowns') {
            setGodownList(isStringArray(setting.value) ? setting.value : GODOWNS);
          } else if (setting.key === 'districts') {
            setDistrictList(isStringArray(setting.value) ? setting.value : DISTRICTS);
          } else if (setting.key === 'vehicle_types') {
            setVehicleList(isStringArray(setting.value) ? setting.value : VEHICLE_TYPES);
          }
        }

        setConfig(newConfig);
        setOriginalConfig(newConfig);
      }
    } catch (err: any) {
      toast.error('Failed to load settings: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate required fields
      if (!config.company_name.trim()) {
        toast.error('Company name is required');
        return;
      }
      if (!config.company_address.trim()) {
        toast.error('Company address is required');
        return;
      }
      if (config.max_discount_percentage < 0 || config.max_discount_percentage > 100) {
        toast.error('Discount percentage must be between 0 and 100');
        return;
      }

      // Save company settings
      const companySettings = [
        { key: 'company_name', value: config.company_name },
        { key: 'company_gstin', value: config.company_gstin },
        { key: 'company_address', value: config.company_address },
        { key: 'company_phone', value: config.company_phone },
        { key: 'company_email', value: config.company_email },
        { key: 'default_invoice_type', value: config.default_invoice_type },
        { key: 'enable_auto_approval', value: config.enable_auto_approval },
        { key: 'max_discount_percentage', value: config.max_discount_percentage },
        { key: 'financial_year_start', value: config.financial_year_start },
        { key: 'financial_year_end', value: config.financial_year_end },
        { key: 'godowns', value: godownList },
        { key: 'districts', value: districtList },
        { key: 'vehicle_types', value: vehicleList },
      ];

      for (const setting of companySettings) {
        const { error } = await supabase
          .from('settings')
          .upsert({
            key: setting.key,
            value: setting.value,
          }, { onConflict: 'key' });

        if (error) throw error;
      }

      setOriginalConfig(config);
      toast.success('Settings saved successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(originalConfig);
    setResetConfirm(false);
    toast.success('Settings reset to last saved state');
  };

  const handleAddGodown = async () => {
    if (!newGodown.trim()) {
      toast.error('Godown name is required');
      return;
    }
    if (godownList.includes(newGodown)) {
      toast.error('Godown already exists');
      return;
    }

    const updatedList = [...godownList, newGodown.trim()];
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'godowns',
          value: updatedList,
        }, { onConflict: 'key' });

      if (error) throw error;
      setGodownList(updatedList);
      setNewGodown('');
      toast.success('Godown added');
      setGodownDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add godown');
    }
  };

  const handleRemoveGodown = async (name: string) => {
    if (godownList.length <= 1) {
      toast.error('You must keep at least one godown');
      return;
    }

    const updatedList = godownList.filter(g => g !== name);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'godowns',
          value: updatedList,
        }, { onConflict: 'key' });

      if (error) throw error;
      setGodownList(updatedList);
      toast.success('Godown removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove godown');
    }
  };

  const handleAddDistrict = async () => {
    if (!newDistrict.trim()) {
      toast.error('District name is required');
      return;
    }
    if (districtList.includes(newDistrict)) {
      toast.error('District already exists');
      return;
    }

    const updatedList = [...districtList, newDistrict.trim()];
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'districts',
          value: updatedList,
        }, { onConflict: 'key' });

      if (error) throw error;
      setDistrictList(updatedList);
      setNewDistrict('');
      toast.success('District added');
      setDistrictDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add district');
    }
  };

  const handleRemoveDistrict = async (name: string) => {
    if (districtList.length <= 1) {
      toast.error('You must keep at least one district');
      return;
    }

    const updatedList = districtList.filter(d => d !== name);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'districts',
          value: updatedList,
        }, { onConflict: 'key' });

      if (error) throw error;
      setDistrictList(updatedList);
      toast.success('District removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove district');
    }
  };

  const handleAddVehicle = async () => {
    if (!newVehicle.trim()) {
      toast.error('Vehicle type is required');
      return;
    }
    if (vehicleList.includes(newVehicle)) {
      toast.error('Vehicle type already exists');
      return;
    }

    const updatedList = [...vehicleList, newVehicle.trim()];
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'vehicle_types',
          value: updatedList,
        }, { onConflict: 'key' });

      if (error) throw error;
      setVehicleList(updatedList);
      setNewVehicle('');
      toast.success('Vehicle type added');
      setVehicleDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add vehicle type');
    }
  };

  const handleRemoveVehicle = async (name: string) => {
    if (vehicleList.length <= 1) {
      toast.error('You must keep at least one vehicle type');
      return;
    }

    const updatedList = vehicleList.filter(v => v !== name);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'vehicle_types',
          value: updatedList,
        }, { onConflict: 'key' });

      if (error) throw error;
      setVehicleList(updatedList);
      toast.success('Vehicle type removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove vehicle type');
    }
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        subtitle="Configure company information, business rules, and master data"
        actions={
          <CustomTooltip content="Reset all changes to last saved state" side="bottom">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetConfirm(true)}
              disabled={!hasChanges || saving}
              className="gap-2"
            >
              <RotateCcw size={15} /> Reset
            </Button>
          </CustomTooltip>
        }
      />

      {/* Company Information */}
      <FormCard>
        <FormSection
          title="Company Information"
          subtitle="Basic company details used in invoices and communications"
          action={
            <CustomTooltip content={hasChanges ? 'Save all changes' : 'No changes to save'} side="top">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CustomTooltip>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Company Name <span className="text-destructive">*</span></Label>
              <Input
                value={config.company_name}
                onChange={(e) => setConfig({ ...config, company_name: e.target.value })}
                placeholder="e.g. YES YES"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Company GSTIN</Label>
              <Input
                value={config.company_gstin}
                onChange={(e) => setConfig({ ...config, company_gstin: e.target.value })}
                placeholder="e.g. 32AABCT1234F1Z5"
                className="uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Company Phone</Label>
              <Input
                value={config.company_phone}
                onChange={(e) => setConfig({ ...config, company_phone: e.target.value })}
                placeholder="e.g. +91 9876543210"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Company Email</Label>
              <Input
                type="email"
                value={config.company_email}
                onChange={(e) => setConfig({ ...config, company_email: e.target.value })}
                placeholder="e.g. info@yesyes.com"
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Company Address <span className="text-destructive">*</span></Label>
              <Textarea
                value={config.company_address}
                onChange={(e) => setConfig({ ...config, company_address: e.target.value })}
                placeholder="Full company address"
                rows={3}
                required
              />
            </div>
          </div>
        </FormSection>
      </FormCard>

      {/* Business Rules */}
      <FormCard>
        <FormSection
          title="Business Rules"
          subtitle="Define system behavior and operational limits"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Default Invoice Type</Label>
              <Select
                value={config.default_invoice_type}
                onValueChange={(v) => setConfig({ ...config, default_invoice_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GST">GST</SelectItem>
                  <SelectItem value="NGST">NGST</SelectItem>
                  <SelectItem value="IGST">IGST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Max Discount Percentage (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={config.max_discount_percentage}
                onChange={(e) => setConfig({ ...config, max_discount_percentage: Number(e.target.value) || 0 })}
                placeholder="0-100"
              />
            </div>
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium">Enable Auto-Approval</p>
                  <p className="text-xs text-muted-foreground">Automatically approve orders above set thresholds</p>
                </div>
                <Switch
                  checked={config.enable_auto_approval}
                  onCheckedChange={(v) => setConfig({ ...config, enable_auto_approval: v })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Financial Year Start (Month)</Label>
              <Select
                value={config.financial_year_start.toString()}
                onValueChange={(v) => setConfig({ ...config, financial_year_start: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Financial Year End (Month)</Label>
              <Select
                value={config.financial_year_end.toString()}
                onValueChange={(v) => setConfig({ ...config, financial_year_end: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FormSection>
      </FormCard>

      {/* Master Data Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Godowns */}
        <FormCard>
          <FormSection
            title="Godown Locations"
            subtitle={`${godownList.length} location${godownList.length !== 1 ? 's' : ''} available`}
            action={
              <CustomTooltip content="Add new godown" side="top">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setGodownDialog(true)}
                  className="gap-1"
                >
                  <Building2 size={14} /> Add
                </Button>
              </CustomTooltip>
            }
          >
            <div className="space-y-2">
              {godownList.map((godown) => (
                <div
                  key={godown}
                  className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg border border-border text-sm"
                >
                  <span className="font-medium">{godown}</span>
                  <button
                    onClick={() => handleRemoveGodown(godown)}
                    className="text-xs text-destructive hover:text-destructive/80"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </FormSection>
        </FormCard>

        {/* Districts */}
        <FormCard>
          <FormSection
            title="Districts"
            subtitle={`${districtList.length} district${districtList.length !== 1 ? 's' : ''} available`}
            action={
              <CustomTooltip content="Add new district" side="top">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDistrictDialog(true)}
                  className="gap-1"
                >
                  <MapPin size={14} /> Add
                </Button>
              </CustomTooltip>
            }
          >
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {districtList.map((district) => (
                <div
                  key={district}
                  className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg border border-border text-sm"
                >
                  <span className="font-medium">{district}</span>
                  <button
                    onClick={() => handleRemoveDistrict(district)}
                    className="text-xs text-destructive hover:text-destructive/80"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </FormSection>
        </FormCard>

        {/* Vehicle Types */}
        <FormCard>
          <FormSection
            title="Vehicle Types"
            subtitle={`${vehicleList.length} type${vehicleList.length !== 1 ? 's' : ''} available`}
            action={
              <CustomTooltip content="Add new vehicle type" side="top">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVehicleDialog(true)}
                  className="gap-1"
                >
                  <Truck size={14} /> Add
                </Button>
              </CustomTooltip>
            }
          >
            <div className="space-y-2">
              {vehicleList.map((vehicle) => (
                <div
                  key={vehicle}
                  className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg border border-border text-sm"
                >
                  <span className="font-medium">{vehicle}</span>
                  <button
                    onClick={() => handleRemoveVehicle(vehicle)}
                    className="text-xs text-destructive hover:text-destructive/80"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </FormSection>
        </FormCard>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-start gap-3">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Settings are system-wide</p>
          <p className="text-xs mt-1">Changes to company information and business rules affect all users and transactions immediately.</p>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={godownDialog} onOpenChange={setGodownDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Godown</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="godown-name">Godown Name</Label>
              <Input
                id="godown-name"
                value={newGodown}
                onChange={(e) => setNewGodown(e.target.value)}
                placeholder="e.g. Kottakkal Branch"
                onKeyDown={(e) => e.key === 'Enter' && handleAddGodown()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGodownDialog(false)}>Cancel</Button>
            <Button onClick={handleAddGodown} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Check size={14} /> Add Godown
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={districtDialog} onOpenChange={setDistrictDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New District</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="district-name">District Name</Label>
              <Input
                id="district-name"
                value={newDistrict}
                onChange={(e) => setNewDistrict(e.target.value)}
                placeholder="e.g. Kottayam"
                onKeyDown={(e) => e.key === 'Enter' && handleAddDistrict()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDistrictDialog(false)}>Cancel</Button>
            <Button onClick={handleAddDistrict} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Check size={14} /> Add District
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={vehicleDialog} onOpenChange={setVehicleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Vehicle Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="vehicle-name">Vehicle Type</Label>
              <Input
                id="vehicle-name"
                value={newVehicle}
                onChange={(e) => setNewVehicle(e.target.value)}
                placeholder="e.g. Auto Rickshaw"
                onKeyDown={(e) => e.key === 'Enter' && handleAddVehicle()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVehicleDialog(false)}>Cancel</Button>
            <Button onClick={handleAddVehicle} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Check size={14} /> Add Vehicle Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will discard all unsaved changes and restore settings to the last saved state.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Reset Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
