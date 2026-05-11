import { useEffect, type DependencyList } from 'react';

/**
 * Like `useEffect` but the callback receives an `AbortSignal` that is aborted
 * when the component unmounts or when the dependency list changes. Pass the
 * signal into network calls (Supabase: `.abortSignal(signal)`) to cancel
 * inflight work and avoid the "setState on unmounted component" warning.
 *
 * Usage:
 *   useAbortableEffect((signal) => {
 *     (async () => {
 *       const { data } = await supabase.from('x').select('*').abortSignal(signal);
 *       if (signal.aborted) return;
 *       setData(data ?? []);
 *     })();
 *   }, [dep]);
 *
 * The callback's return value is ignored. To run extra cleanup, listen for
 * the abort event:
 *   signal.addEventListener('abort', () => clearInterval(timer));
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAbortableEffect(
    effect: (signal: AbortSignal) => void | (() => void) | Promise<void>,
    deps: DependencyList,
): void {
    useEffect(() => {
        const controller = new AbortController();
        const result = effect(controller.signal);
        return () => {
            controller.abort();
            if (typeof result === 'function') result();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

/**
 * Returns `true` once mounted and reverts to `false` on unmount. Useful when
 * an existing `useEffect` cannot be migrated to `useAbortableEffect` but
 * still needs an "is the component still alive?" guard before `setState`.
 *
 * Prefer `useAbortableEffect` for new code — it's strictly better.
 */
import { useRef, useEffect as useEffectMounted } from 'react';
export function useIsMountedRef() {
    const ref = useRef(true);
    useEffectMounted(() => {
        ref.current = true;
        return () => { ref.current = false; };
    }, []);
    return ref;
}
