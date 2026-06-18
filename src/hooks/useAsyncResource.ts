import { useCallback, useEffect, useRef, useState } from 'react';

let resourceCache = new WeakMap<() => Promise<unknown>, unknown>();
let resourceInFlight = new WeakMap<() => Promise<unknown>, Promise<unknown>>();
let resourceLoadedAt = new WeakMap<() => Promise<unknown>, number>();

type Options = {
  enabled?: boolean;
  minSilentIntervalMs?: number;
  timeoutMs?: number;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('La conexion esta tardando demasiado. Intenta nuevamente.')), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  }) as Promise<T>;
}

export function useAsyncResource<T>(factory: () => Promise<T>, options?: Options) {
  const enabled = options?.enabled !== false;
  const cached = resourceCache.get(factory as () => Promise<unknown>) as T | undefined;
  const [data, setData] = useState<T | undefined>(cached);
  const [loading, setLoading] = useState(cached === undefined);
  const [error, setError] = useState<string | null>(null);
  const factoryRef = useRef(factory);
  factoryRef.current = factory;
  const mountedRef = useRef(true);
  const dataRef = useRef<T | undefined>(cached);
  const lastSilentRunRef = useRef(0);
  dataRef.current = data;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async (silent = false, force = false) => {
      const factoryKey = factoryRef.current as () => Promise<unknown>;
      const minSilentInterval = options?.minSilentIntervalMs ?? 3500;
      const timeoutMs = options?.timeoutMs ?? 8000;

      if (silent && !force && Date.now() - lastSilentRunRef.current < minSilentInterval) return;
      if (silent) lastSilentRunRef.current = Date.now();

      const shouldShowLoading = !silent || dataRef.current === undefined;
      if (shouldShowLoading) setLoading(true);
      setError(null);

      try {
        let pending = resourceInFlight.get(factoryKey) as Promise<T> | undefined;
        if (!pending || force) {
          pending = withTimeout(factoryRef.current(), timeoutMs);
          resourceInFlight.set(factoryKey, pending as Promise<unknown>);
        }

        const result = await pending;
        resourceCache.set(factoryKey, result);
        resourceLoadedAt.set(factoryKey, Date.now());
        if (mountedRef.current) setData(result);
      } catch (e: unknown) {
        if (mountedRef.current) setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        resourceInFlight.delete(factoryKey);
        if (mountedRef.current && shouldShowLoading) setLoading(false);
      }
    },
    [options?.minSilentIntervalMs, options?.timeoutMs]
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void load(false);
  }, [enabled, load]);

  const showSkeleton = loading && data === undefined;
  const isRefreshing = loading && data !== undefined;

  return {
    data,
    loading,
    error,
    refresh: () => load(false, true),
    refreshSilently: () => load(true),
    showSkeleton,
    isRefreshing,
  };
}

export function clearAsyncResourceCache() {
  resourceCache = new WeakMap<() => Promise<unknown>, unknown>();
  resourceInFlight = new WeakMap<() => Promise<unknown>, Promise<unknown>>();
  resourceLoadedAt = new WeakMap<() => Promise<unknown>, number>();
}
