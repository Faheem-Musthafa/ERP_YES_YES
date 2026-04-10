/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseTimeoutMs = Number(import.meta.env.VITE_SUPABASE_TIMEOUT_MS ?? 15000);
const supabaseReadRetries = Number(import.meta.env.VITE_SUPABASE_READ_RETRIES ?? 2);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

const timeoutFetch: typeof fetch = async (input, init) => {
  const method = (init?.method ?? 'GET').toUpperCase();
  const canRetry = method === 'GET' || method === 'HEAD';

  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new DOMException('Supabase request timeout', 'TimeoutError')), supabaseTimeoutMs);

    const incomingSignal = init?.signal;
    if (incomingSignal) {
      if (incomingSignal.aborted) {
        controller.abort(incomingSignal.reason);
      } else {
        incomingSignal.addEventListener('abort', () => controller.abort(incomingSignal.reason), { once: true });
      }
    }

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });

      const shouldRetryStatus = response.status === 502 || response.status === 503 || response.status === 504;
      if (!canRetry || !shouldRetryStatus || attempt >= supabaseReadRetries) {
        return response;
      }
    } catch (error: any) {
      const timedOut = error?.name === 'TimeoutError';
      const networkFailure = error instanceof TypeError;
      const shouldRetry = canRetry && (timedOut || networkFailure) && attempt < supabaseReadRetries;
      if (!shouldRetry) {
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }

    // Exponential backoff with a small cap keeps retries quick but controlled.
    const delayMs = Math.min(150 * 2 ** attempt, 1000);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: timeoutFetch,
  },
});
