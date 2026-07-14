"use client";

import { useEffect, useRef, useState } from "react";
import type { Result } from "@/lib/result";

/**
 * useAsync — hook para operações async com loading + error + data.
 * Race-condition safe via cancelled flag, refetch() via nonce state.
 */
interface AsyncState<T> {
  data: T | null; loading: boolean; error: Error | null; refetch: () => void;
}

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[] = []
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: resets loading state on each refetch
    setLoading(true);
    setError(null);
    fn()
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e instanceof Error ? e : new Error(String(e))); setLoading(false); } });
    return () => { cancelled = true; };
  }, [...deps, nonce]);

  return { data, loading, error, refetch: () => setNonce((n) => n + 1) };
}

export function useAsyncResult<T>(
  fn: () => Promise<T>,
  deps: unknown[] = []
): { result: Result<T, Error> | null; loading: boolean; refetch: () => void } {
  const [result, setResult] = useState<Result<T, Error> | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: resets loading state on each refetch
    setLoading(true);
    fn()
      .then((d) => { if (!cancelled) { setResult({ ok: true, data: d }); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setResult({ ok: false, error: e instanceof Error ? e : new Error(String(e)) }); setLoading(false); } });
    return () => { cancelled = true; };
  }, [...deps, nonce]);

  return { result, loading, refetch: () => setNonce((n) => n + 1) };
}
