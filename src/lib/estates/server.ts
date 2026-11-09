import { ESTATES } from "./fixtures";
import { rankEstates } from "./rank";
import type { EstateDetail, EstateSummary, LatencyProfile, SavedResponse, SearchParams, SearchResponse } from "./types";

/**
 * The mock backend. Route handlers and the server page call these functions; swapping
 * in a real data source means replacing the bodies here and nothing else.
 *
 * Latency is simulated per call so loading states, aborts and optimistic updates
 * are exercised in the UI. Tune it per request with headers (the in-page HUD sets them):
 *   x-mock-latency: off | normal | slow   (default from ESTATES_MOCK_LATENCY, else "normal")
 *   x-mock-fail:    0–1                   chance a write fails (default 0)
 */

export type MockOptions = { latency: LatencyProfile; failRate: number; signal?: AbortSignal };

const RANGES: Record<"search" | "detail" | "save" | "template", [number, number]> = {
  search: [120, 360],
  template: [80, 220],
  detail: [220, 520],
  save: [150, 320],
};
const SCALE: Record<LatencyProfile, number> = { off: 0, normal: 1, slow: 3.5 };

export class MockAbortError extends Error {
  constructor() {
    super("aborted");
  }
}
export class MockFailureError extends Error {
  status = 503;
  constructor() {
    super("Simulated backend failure");
  }
}

export function mockOptionsFrom(request: Request): MockOptions {
  const h = request.headers.get("x-mock-latency") ?? process.env.ESTATES_MOCK_LATENCY ?? "normal";
  const latency: LatencyProfile = h === "off" || h === "slow" ? h : "normal";
  const fail = Number(request.headers.get("x-mock-fail") ?? 0);
  return { latency, failRate: Number.isFinite(fail) ? Math.min(1, Math.max(0, fail)) : 0, signal: request.signal };
}

/** Sleep for a jittered latency; rejects early if the client aborts. Returns the ms actually waited. */
export async function simulate(kind: keyof typeof RANGES, { latency, signal }: MockOptions): Promise<number> {
  const [lo, hi] = RANGES[kind];
  const ms = Math.round((lo + Math.random() * (hi - lo)) * SCALE[latency]);
  if (ms === 0) return 0;
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new MockAbortError());
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new MockAbortError());
      },
      { once: true },
    );
  });
  return ms;
}

const summaries: EstateSummary[] = ESTATES.map(({ id, name, area, spec, price, travel, affinity, plan }) => ({
  id,
  name,
  area,
  spec,
  price,
  travel,
  affinity,
  plan,
}));
const summaryById = Object.fromEntries(summaries.map((e) => [e.id, e]));

export async function searchEstates(params: SearchParams, opts: MockOptions): Promise<SearchResponse> {
  const serverMs = await simulate("search", opts);
  return { params, ...rankEstates(summaries, params), estates: summaryById, serverMs };
}

export async function getEstateDetail(id: string, opts: MockOptions): Promise<(EstateDetail & { serverMs: number }) | null> {
  const serverMs = await simulate("detail", opts);
  const e = ESTATES.find((x) => x.id === id);
  return e ? { ...e, serverMs } : null;
}

// In-memory per-process store. On Vercel each lambda instance has its own copy, which is fine
// for a mock: the client treats its optimistic state as the source of truth between calls.
const savedByClient = new Map<string, Set<string>>();
const bucket = (clientId: string) => {
  let s = savedByClient.get(clientId);
  if (!s) savedByClient.set(clientId, (s = new Set()));
  if (savedByClient.size > 1000) savedByClient.delete(savedByClient.keys().next().value!);
  return s;
};

export async function listSaved(clientId: string, opts: MockOptions): Promise<SavedResponse> {
  const serverMs = await simulate("save", opts);
  return { saved: [...bucket(clientId)], serverMs };
}

export async function setSaved(clientId: string, id: string, saved: boolean, opts: MockOptions): Promise<SavedResponse> {
  const serverMs = await simulate("save", opts);
  if (Math.random() < opts.failRate) throw new MockFailureError();
  if (!summaryById[id]) throw new Error(`Unknown estate ${id}`);
  const s = bucket(clientId);
  if (saved) s.add(id);
  else s.delete(id);
  return { saved: [...s], serverMs };
}
