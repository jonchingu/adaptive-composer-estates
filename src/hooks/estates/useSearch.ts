"use client";

import { useEffect, useRef, useState } from "react";
import { api, isAbort } from "@/lib/estates/client";
import { type SearchParams, type SearchResponse, toQueryString } from "@/lib/estates/types";
import { LRU } from "@/lib/lru";

const cache = new LRU<string, SearchResponse>(200);
const THROTTLE_MS = 140;
/** Older requests beyond this many in flight are aborted; the newest always lands. */
const MAX_IN_FLIGHT = 2;

export type SearchState = { data: SearchResponse; pending: boolean; error: string | null };

/**
 * Ranked results for the composer's params.
 *
 * Keeps the previous result on screen while a new one loads (rows animate from old order
 * to new instead of flashing a skeleton), throttles bursts like slider drags, caps the
 * number of concurrent requests by aborting the oldest, and drops out-of-order responses.
 */
export function useSearch(params: SearchParams, initial: SearchResponse): SearchState {
  const key = toQueryString(params);
  const [state, setState] = useState<SearchState>({ data: initial, pending: false, error: null });
  const seq = useRef(0);
  const applied = useRef(0);
  const inFlight = useRef<{ id: number; ctrl: AbortController }[]>([]);
  const lastFire = useRef(0);

  useEffect(() => {
    cache.set(toQueryString(initial.params), initial);
  }, [initial]);

  useEffect(() => {
    const hit = cache.get(key);
    const id = ++seq.current;
    if (hit) {
      applied.current = id;
      const raf = requestAnimationFrame(() => setState({ data: hit, pending: inFlight.current.length > 0, error: null }));
      return () => cancelAnimationFrame(raf);
    }

    const fire = async () => {
      lastFire.current = performance.now();
      const ctrl = new AbortController();
      inFlight.current.push({ id, ctrl });
      while (inFlight.current.length > MAX_IN_FLIGHT) inFlight.current.shift()!.ctrl.abort();
      setState((s) => ({ ...s, pending: true }));
      try {
        const data = await api<SearchResponse>(`/api/estates?${key}`, { label: "search", signal: ctrl.signal });
        cache.set(key, data);
        if (id > applied.current) {
          applied.current = id;
          setState((s) => ({ ...s, data, error: null }));
        }
      } catch (err) {
        if (!isAbort(err)) setState((s) => ({ ...s, error: err instanceof Error ? err.message : "Search failed" }));
      } finally {
        inFlight.current = inFlight.current.filter((r) => r.id !== id);
        if (inFlight.current.length === 0) setState((s) => ({ ...s, pending: false }));
      }
    };

    // Leading-edge throttle: the first change fires at once, a burst fires every THROTTLE_MS,
    // and the cleanup below cancels a scheduled call that a newer change replaced.
    const wait = Math.max(0, THROTTLE_MS - (performance.now() - lastFire.current));
    const timer = setTimeout(fire, wait);
    return () => clearTimeout(timer);
  }, [key]);

  useEffect(() => () => inFlight.current.forEach((r) => r.ctrl.abort()), []);

  return state;
}
