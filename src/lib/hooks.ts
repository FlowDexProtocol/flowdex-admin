// ══════════════════════════════════════════════════
// src/lib/hooks.ts
// Lightweight fetch hook — no external data-fetching lib needed
// for a dashboard this size.
// ══════════════════════════════════════════════════

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface FetchResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
}

// Runs `fetcher` whenever `deps` changes. Pass `intervalMs > 0` to also poll.
export function useFetch<T>(fetcher: () => Promise<T>, deps: React.DependencyList, intervalMs = 0): FetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const load = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
    if (!intervalMs) return;
    const id = setInterval(load, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload: load };
}

// Delays reflecting `value` until it's been stable for `delayMs` — for
// search inputs that shouldn't refetch on every keystroke.
export function useDebouncedValue<T>(value: T, delayMs = 500): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
