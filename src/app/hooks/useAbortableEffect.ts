import { DependencyList, useEffect } from 'react';

/**
 * useEffect variant that gives the body an `isCancelled` flag and an
 * AbortSignal. Both go true/abort when deps change or the component unmounts.
 *
 * Use to guard async fetch effects from races where an older response
 * overwrites a newer one when filters change rapidly.
 */
export function useAbortableEffect(
  body: (ctx: { isCancelled: () => boolean; signal: AbortSignal }) => void | Promise<void>,
  deps: DependencyList,
) {
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    void body({ isCancelled: () => cancelled, signal: ctrl.signal });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Lightweight request-sequence guard for cases where AbortController isn't
 * threaded through a supabase call. Returns a `claim()` that the latest
 * caller wins; older callers detect they've been superseded.
 *
 * Usage:
 *   const seq = useRef(0);
 *   const mine = ++seq.current;
 *   const data = await fetch();
 *   if (mine !== seq.current) return; // superseded
 */
