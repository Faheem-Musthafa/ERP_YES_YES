/**
 * Server-side paginated query hook on top of react-query + supabase.
 *
 * Replaces the ubiquitous "fetch entire table, then `.slice(start, end)` in JS"
 * anti-pattern. Page-changes don't re-fetch the world; filter changes reset to
 * page 1 automatically.
 *
 * Caller supplies a `buildQuery` factory that returns a supabase query builder
 * with all filters applied but NO `.range()` / `.order()` of the row id —
 * those are layered on inside the hook.
 *
 * Usage:
 *   const { rows, totalItems, isLoading, page, setPage } = usePagedQuery({
 *     key: ['orders', search, statusFilter],
 *     pageSize: 20,
 *     buildQuery: () => supabase
 *       .from('orders')
 *       .select('id, order_number, ...', { count: 'exact' })
 *       .ilike('order_number', `%${search}%`)
 *       .order('created_at', { ascending: false }),
 *   });
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

interface PagedQueryOpts<TRow> {
  /** Cache key — include every filter/search input. */
  key: readonly unknown[];
  pageSize: number;
  /** Builder that returns a supabase PostgrestFilterBuilder. The builder is
   *  awaited after `range()` is applied. Typed loosely as `any` because
   *  PostgrestFilterBuilder's generic chain is unstable across supabase-js
   *  minor versions and adds no safety here — caller's `TRow` row type still
   *  flows through. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildQuery: () => any;
  /** Wait until this is truthy before firing. Useful for `user?.id`-gated queries. */
  enabled?: boolean;
}

export function usePagedQuery<TRow>({ key, pageSize, buildQuery, enabled = true }: PagedQueryOpts<TRow>) {
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever any filter (key) changes.
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, key);

  const query = useQuery({
    queryKey: [...key, 'page', page, 'size', pageSize],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, count, error } = await buildQuery().range(from, to);
      if (error) throw new Error(error.message);
      return { rows: (data ?? []) as TRow[], count: count ?? 0 };
    },
  });

  return {
    rows: query.data?.rows ?? [],
    totalItems: query.data?.count ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    page,
    setPage,
    refetch: query.refetch,
  };
}
