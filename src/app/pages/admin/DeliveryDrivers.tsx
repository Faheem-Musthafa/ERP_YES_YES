import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Plus, Pencil, Power, PowerOff, Car, Phone } from 'lucide-react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';
import {
  PageHeader, SearchBar, DataCard,
  StyledThead, StyledTh, StyledTr, StyledTd,
  EmptyState, Spinner, StatusBadge, IconBtn, TablePagination,
  CustomTooltip,
} from '@/app/components/ui/primitives';

interface Agent {
  id: string;
  name: string;
  vehicle_number: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

const emptyForm = { name: '', vehicle_number: '', phone: '' };

export const DeliveryDrivers = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Agent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchAgents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('delivery_agents')
      .select('id, name, vehicle_number, phone, is_active, created_at')
      .order('name');
    if (error) toast.error(error.message);
    setAgents(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAgents(); }, []);

  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setOpen(true); };

  const openEdit = (agent: Agent) => {
    setEditTarget(agent);
    setForm({ name: agent.name, vehicle_number: agent.vehicle_number ?? '', phone: agent.phone ?? '' });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Driver name is required'); return; }
    setSaving(true);
    try {
      if (editTarget) {
        const { error } = await supabase
          .from('delivery_agents')
          .update({
            name: form.name.trim(),
            vehicle_number: form.vehicle_number.trim().toUpperCase() || null,
            phone: form.phone.trim() || null,
          })
          .eq('id', editTarget.id);
        if (error) throw error;
        toast.success('Driver updated');
      } else {
        const { error } = await supabase.from('delivery_agents').insert({
          name: form.name.trim(),
          vehicle_number: form.vehicle_number.trim().toUpperCase() || null,
          phone: form.phone.trim() || null,
          is_active: true,
          created_by: user?.id ?? null,
        });
        if (error) throw error;
        toast.success('Driver added');
      }
      setOpen(false);
      fetchAgents();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const toggleActive = async (agent: Agent) => {
    const { error } = await supabase
      .from('delivery_agents')
      .update({ is_active: !agent.is_active })
      .eq('id', agent.id);
    if (error) toast.error(error.message);
    else { toast.success(`Driver ${agent.is_active ? 'deactivated' : 'activated'}`); fetchAgents(); }
  };

  const filtered = agents.filter(a =>
    !search ||
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.vehicle_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (a.phone ?? '').includes(search)
  );
  useEffect(() => { setCurrentPage(1); }, [search, agents.length]);
  const page = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const activeCount = agents.filter(a => a.is_active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Drivers"
        subtitle="Manage drivers and vehicle number plates used in deliveries"
        actions={
          <CustomTooltip content="Register a new delivery driver" side="bottom">
            <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-9 text-sm">
              <Plus size={16} className="mr-2" />Add Driver
            </Button>
          </CustomTooltip>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Drivers', value: agents.length, color: 'text-gray-900' },
          { label: 'Active', value: activeCount, color: 'text-green-600' },
          { label: 'Inactive', value: agents.length - activeCount, color: 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <SearchBar placeholder="Search by name, plate or phone..." value={search} onChange={setSearch} />

      <DataCard>
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Car} message="No drivers found" />
        ) : (
          <>
            <table className="w-full text-sm">
              <StyledThead>
                <tr>
                  <StyledTh>Driver Name</StyledTh>
                  <StyledTh>Vehicle / Number Plate</StyledTh>
                  <StyledTh>Phone</StyledTh>
                  <StyledTh className="text-center">Status</StyledTh>
                  <StyledTh className="text-center">Actions</StyledTh>
                </tr>
              </StyledThead>
              <tbody className="divide-y divide-border">
                {paginated.map(agent => (
                  <StyledTr key={agent.id}>
                    <StyledTd>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Car size={14} className="text-primary" />
                        </div>
                        <span className="font-semibold text-gray-800">{agent.name}</span>
                      </div>
                    </StyledTd>
                    <StyledTd>
                      {agent.vehicle_number ? (
                        <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg tracking-wider">
                          {agent.vehicle_number}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </StyledTd>
                    <StyledTd>
                      {agent.phone ? (
                        <span className="flex items-center gap-1.5 text-gray-600 text-xs">
                          <Phone size={12} className="text-gray-400" />{agent.phone}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </StyledTd>
                    <StyledTd className="text-center">
                      <StatusBadge status={agent.is_active ? 'Active' : 'Inactive'} />
                    </StyledTd>
                    <StyledTd className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <CustomTooltip content={`Edit ${agent.name}`} side="top">
                          <IconBtn onClick={() => openEdit(agent)}>
                            <Pencil size={14} />
                          </IconBtn>
                        </CustomTooltip>
                        <CustomTooltip content={agent.is_active ? 'Deactivate driver' : 'Activate driver'} side="top">
                          <IconBtn
                            onClick={() => toggleActive(agent)}
                            className={!agent.is_active ? 'hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30' : ''}
                            danger={agent.is_active}
                          >
                            {agent.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                          </IconBtn>
                        </CustomTooltip>
                      </div>
                    </StyledTd>
                  </StyledTr>
                ))}
              </tbody>
            </table>
            <TablePagination
              totalItems={filtered.length}
              currentPage={page}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="drivers"
            />
          </>
        )}
      </DataCard>

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setEditTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car size={18} className="text-primary" />
              {editTarget ? 'Edit Driver' : 'Add New Driver'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Driver Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Ravi Kumar"
              />
            </div>
            <div className="space-y-2">
              <Label>Vehicle Number Plate</Label>
              <Input
                value={form.vehicle_number}
                onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value.toUpperCase() }))}
                placeholder="e.g. MH12AB1234"
                className="font-mono tracking-wider"
              />
              <p className="text-xs text-gray-400">Auto-fills when this driver is selected in a delivery.</p>
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="e.g. 9876543210"
                type="tel"
              />
            </div>
          </div>
          <DialogFooter>
            <CustomTooltip content="Close without saving" side="top">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </CustomTooltip>
            <CustomTooltip content={editTarget ? 'Update driver details' : 'Add new driver'} side="top">
              <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                {saving ? 'Saving...' : editTarget ? 'Update Driver' : 'Add Driver'}
              </Button>
            </CustomTooltip>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
