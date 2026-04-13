import { supabase } from '@/app/supabase';
import type { Database, Json } from '@/app/types/database';

type RecoverableTable = 'brands' | 'products' | 'customers' | 'users' | 'delivery_agents';
type RecoverableAction = 'archived' | 'restored' | 'voided' | 'reversed';

type RecoverableTableUpdate<T extends RecoverableTable> = Database['public']['Tables'][T]['Update'];

type RecoveryActor = {
  id: string | null;
  name: string | null;
};

type RecoveryParams<T extends RecoverableTable> = {
  table: T;
  id: string;
  entityLabel: string;
  reason?: string | null;
  metadata?: Json;
};

const isMissingRecoveryColumnError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const message = `${(error as { code?: string }).code ?? ''} ${(error as { message?: string }).message ?? ''}`.toLowerCase();
  return (
    message.includes('deleted_at')
    || message.includes('deleted_by')
    || message.includes('delete_reason')
    || message.includes('restored_at')
    || message.includes('restored_by')
    || message.includes('column')
  );
};

const isMissingRecoveryEventsTableError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const text = `${(error as { code?: string }).code ?? ''} ${(error as { message?: string }).message ?? ''}`.toLowerCase();
  return text.includes('data_recovery_events') || text.includes('relation') || text.includes('could not find');
};

const getRecoveryActor = async (): Promise<RecoveryActor> => {
  const { data: authData } = await supabase.auth.getUser();
  const actorId = authData.user?.id ?? null;

  if (!actorId) {
    return { id: null, name: null };
  }

  const { data } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', actorId)
    .maybeSingle();

  return {
    id: actorId,
    name: data?.full_name ?? null,
  };
};

const logRecoveryEvent = async (
  action: RecoverableAction,
  table: RecoverableTable,
  entityId: string,
  entityLabel: string,
  reason?: string | null,
  metadata?: Json,
) => {
  const actor = await getRecoveryActor();
  const { error } = await supabase.from('data_recovery_events').insert({
    entity_table: table,
    entity_id: entityId,
    entity_label: entityLabel,
    action,
    reason: reason?.trim() || null,
    actor_id: actor.id,
    actor_name: actor.name,
    metadata: metadata ?? null,
  });

  if (error && !isMissingRecoveryEventsTableError(error)) {
    throw error;
  }
};

const updateRecoverableRecord = async <T extends RecoverableTable>(
  table: T,
  id: string,
  payload: RecoverableTableUpdate<T>,
  fallbackPayload: RecoverableTableUpdate<T>,
) => {
  const { error } = await (supabase.from(table as never) as any).update(payload).eq('id', id);

  if (!error) {
    return;
  }

  if (!isMissingRecoveryColumnError(error)) {
    throw error;
  }

  const { error: fallbackError } = await (supabase.from(table as never) as any).update(fallbackPayload).eq('id', id);
  if (fallbackError) {
    throw fallbackError;
  }
};

export const archiveRecoverableRecord = async <T extends RecoverableTable>({
  table,
  id,
  entityLabel,
  reason,
  metadata,
}: RecoveryParams<T>) => {
  const actor = await getRecoveryActor();
  const now = new Date().toISOString();

  await updateRecoverableRecord(
    table,
    id,
    {
      is_active: false,
      deleted_at: now,
      deleted_by: actor.id,
      delete_reason: reason?.trim() || null,
      restored_at: null,
      restored_by: null,
    } as RecoverableTableUpdate<T>,
    {
      is_active: false,
    } as RecoverableTableUpdate<T>,
  );

  await logRecoveryEvent('archived', table, id, entityLabel, reason, metadata);
};

export const restoreRecoverableRecord = async <T extends RecoverableTable>({
  table,
  id,
  entityLabel,
  reason,
  metadata,
}: RecoveryParams<T>) => {
  const actor = await getRecoveryActor();
  const now = new Date().toISOString();

  await updateRecoverableRecord(
    table,
    id,
    {
      is_active: true,
      restored_at: now,
      restored_by: actor.id,
    } as RecoverableTableUpdate<T>,
    {
      is_active: true,
    } as RecoverableTableUpdate<T>,
  );

  await logRecoveryEvent('restored', table, id, entityLabel, reason, metadata);
};
