/**
 * Notification-poll service + react-query hook. Layout used to mount this
 * inside a per-route Layout component, so every navigation re-fired the
 * 4-query poll. With react-query the data is shared across renders, gated on
 * tab visibility, and refetched at 60s intervals only when needed.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/supabase';
import { loadStockHealthSummary } from '@/app/stockHealth';
import { todayLocalISO } from '@/app/dates';

export type NotificationTone = 'rose' | 'amber' | 'blue';

export interface NotificationEntry {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: NotificationTone;
}

export interface NotificationCounts {
  lowStock: number;
  pendingOrders: number;
  overdueCollections: number;
  failedDeliveries: number;
}

async function fetchNotificationCounts(): Promise<NotificationCounts> {
  const [stockHealth, pendingOrdersResult, overdueCollectionsResult, failedDeliveriesResult] = await Promise.all([
    loadStockHealthSummary(5, 3).catch(() => null),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
    supabase
      .from('collections')
      .select('id', { count: 'exact', head: true })
      .or(`status.eq.Overdue,and(status.eq.Pending,due_date.lt.${todayLocalISO()})`),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).eq('status', 'Failed'),
  ]);
  return {
    lowStock: stockHealth?.lowStockCount ?? 0,
    pendingOrders: pendingOrdersResult.count ?? 0,
    overdueCollections: overdueCollectionsResult.count ?? 0,
    failedDeliveries: failedDeliveriesResult.count ?? 0,
  };
}

function buildEntries(role: string, counts: NotificationCounts): NotificationEntry[] {
  const out: NotificationEntry[] = [];
  const { lowStock, pendingOrders, overdueCollections, failedDeliveries } = counts;

  if (lowStock > 0 && ['admin', 'inventory', 'accounts', 'sales', 'procurement'].includes(role)) {
    out.push({
      id: 'low-stock',
      title: `${lowStock} low stock alert${lowStock === 1 ? '' : 's'}`,
      detail: 'Products are at or below the reorder threshold.',
      href: role === 'inventory' || role === 'admin' ? '/inventory/stock' : '/stock',
      tone: 'rose',
    });
  }
  if (pendingOrders > 0 && ['admin', 'accounts'].includes(role)) {
    out.push({
      id: 'pending-orders',
      title: `${pendingOrders} order${pendingOrders === 1 ? '' : 's'} awaiting review`,
      detail: 'Pending orders need approval or follow-up.',
      href: '/accounts/pending-orders',
      tone: 'amber',
    });
  }
  if (overdueCollections > 0 && ['admin', 'accounts', 'sales'].includes(role)) {
    out.push({
      id: 'overdue-collections',
      title: `${overdueCollections} collection${overdueCollections === 1 ? '' : 's'} overdue`,
      detail: 'Receivables need attention before they age further.',
      href: role === 'accounts' || role === 'admin' ? '/accounts/collection-status' : '/sales/collection-status',
      tone: 'blue',
    });
  }
  if (failedDeliveries > 0 && ['admin', 'inventory'].includes(role)) {
    out.push({
      id: 'failed-deliveries',
      title: `${failedDeliveries} delivery failure${failedDeliveries === 1 ? '' : 's'}`,
      detail: 'Some dispatches need reattempt or reassignment.',
      href: '/inventory/delivery',
      tone: 'amber',
    });
  }
  return out;
}

/** Shared notification feed. Refetches every 60s while tab is visible. */
export function useNotifications(role: string | undefined) {
  const query = useQuery({
    queryKey: ['notifications', role],
    queryFn: fetchNotificationCounts,
    enabled: !!role,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });
  const notifications = role && query.data ? buildEntries(role, query.data) : [];
  return { notifications, isLoading: query.isLoading };
}
