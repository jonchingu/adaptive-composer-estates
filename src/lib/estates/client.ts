"use client";

import type { LatencyProfile } from "./types";

/**
 * Browser-side fetch layer for the estates mock API.
 *
 * - Adds the mock-control headers (latency profile, failure rate) the HUD sets.
 * - Records every request in a tiny observable log so the HUD can show pending /
 *   aborted / failed calls live. Components never call fetch() directly.
 */

export type MockControls = { latency: LatencyProfile; failRate: number };
export type RequestEntry = {
  id: number;
  label: string;
  status: "pending" | "ok" | "aborted" | "error";
  startedAt: number;
  ms?: number;
  serverMs?: number;
};

type Store<T> = { get: () => T; set: (next: T) => void; subscribe: (fn: () => void) => () => void };
function store<T>(initial: T): Store<T> {
  let value = initial;
  const subs = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      value = next;
      subs.forEach((fn) => fn());
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

export const mockControls = store<MockControls>({ latency: "normal", failRate: 0 });
export const requestLog = store<RequestEntry[]>([]);

let seq = 0;
const LOG_MAX = 7;
function track(label: string) {
  const entry: RequestEntry = { id: ++seq, label, status: "pending", startedAt: performance.now() };
  requestLog.set([entry, ...requestLog.get()].slice(0, LOG_MAX));
  return (patch: Partial<RequestEntry>) =>
    requestLog.set(
      requestLog.get().map((e) => (e.id === entry.id ? { ...e, ms: Math.round(performance.now() - e.startedAt), ...patch } : e)),
    );
}

function clientId() {
  const KEY = "estates.clientId";
  let id = localStorage.getItem(KEY);
  if (!id) localStorage.setItem(KEY, (id = crypto.randomUUID()));
  return id;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const isAbort = (err: unknown) => err instanceof DOMException && err.name === "AbortError";

export async function api<T extends { serverMs?: number }>(
  path: string,
  { label, signal, method = "GET", body }: { label: string; signal?: AbortSignal; method?: "GET" | "POST"; body?: unknown },
): Promise<T> {
  const done = track(label);
  const { latency, failRate } = mockControls.get();
  try {
    const res = await fetch(path, {
      method,
      signal,
      headers: {
        "x-mock-latency": latency,
        "x-mock-fail": String(failRate),
        "x-client-id": clientId(),
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const msg = ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? res.statusText;
      throw new ApiError(res.status, msg);
    }
    const data = (await res.json()) as T;
    done({ status: "ok", serverMs: data.serverMs });
    return data;
  } catch (err) {
    done({ status: isAbort(err) ? "aborted" : "error" });
    throw err;
  }
}
