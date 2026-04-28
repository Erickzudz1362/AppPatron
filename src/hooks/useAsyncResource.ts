import { useState, useEffect, useCallback, useRef } from 'react';

type Options = {
  /** Si es false, no ejecuta la carga automática (por defecto true). */
  enabled?: boolean;
};

/**
 * Carga asíncrona con:
 * - showSkeleton: solo en la primera carga (evita parpadeo al refrescar).
 * - refresh: reutilizable para pull-to-refresh o reintentar.
 */
export function useAsyncResource<T>(factory: () => Promise<T>, options?: Options) {
  const enabled = options?.enabled !== false;
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const factoryRef = useRef(factory);
  factoryRef.current = factory;
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await factoryRef.current();
      if (mountedRef.current) setData(result);
    } catch (e: unknown) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void load();
  }, [enabled, load]);

  const showSkeleton = loading && data === undefined;
  const isRefreshing = loading && data !== undefined;

  return { data, loading, error, refresh: load, showSkeleton, isRefreshing };
}
