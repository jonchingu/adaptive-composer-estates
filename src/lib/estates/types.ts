import { z } from "zod";

/**
 * Domain types for the estates composer. Shared by the mock backend (route handlers),
 * the server page and the client components, so every boundary speaks one shape.
 */

export const MODES = ["transit", "price", "semantic"] as const;
export type Mode = (typeof MODES)[number];

export const TRAVEL_MODES = ["walk", "mtr", "bus"] as const;
export type TravelMode = (typeof TRAVEL_MODES)[number];

export const INTENT_KEYS = ["quiet", "school", "sea", "two"] as const;
export type IntentKey = (typeof INTENT_KEYS)[number];

export type Weights = Record<IntentKey, number>;

export type RoomType = "bed" | "bath" | "kit" | "liv";

/** Floor plan on a 40×30 grid. */
export type FloorPlan = {
  outline: string;
  rooms: { x: number; y: number; w: number; h: number; type: RoomType }[];
  /** Sea-facing edge [x1, y1, x2, y2]. */
  window: [number, number, number, number];
  door: [number, number];
};

export type MapSketch = { x: number; y: number; coast: string };

/** What the list needs: cheap, always fetched with a ranking. */
export type EstateSummary = {
  id: string;
  name: string;
  area: string;
  spec: string;
  /** Price in 萬 (HK$10,000). */
  price: number;
  travel: Record<TravelMode, number>;
  affinity: Weights;
  plan: FloorPlan;
};

/** What the detail sheet adds: fetched lazily per estate, cached on the client. */
export type EstateDetail = EstateSummary & {
  map: MapSketch;
  photos: { id: string; label: string; hue: number }[];
  facts: { k: string; v: string }[];
};

/** The composer's controls. Every mode keeps its own params so switching back restores them. */
export type SearchParams = {
  mode: Mode;
  travelMode: TravelMode;
  maxMinutes: number;
  monthly: number;
  downPayment: number;
  weights: Weights;
};

export const searchParamsSchema = z.object({
  mode: z.enum(MODES).default("transit"),
  travelMode: z.enum(TRAVEL_MODES).default("walk"),
  maxMinutes: z.coerce.number().int().min(1).max(45).default(10),
  monthly: z.coerce.number().min(10_000).max(60_000).default(28_000),
  downPayment: z.coerce.number().min(0.1).max(0.3).default(0.2),
  quiet: z.coerce.number().min(0).max(3).default(0),
  school: z.coerce.number().min(0).max(3).default(0),
  sea: z.coerce.number().min(0).max(3).default(0),
  two: z.coerce.number().min(0).max(3).default(0),
});

export function parseSearchParams(input: URLSearchParams | Record<string, string | undefined>): SearchParams {
  const raw = input instanceof URLSearchParams ? Object.fromEntries(input) : input;
  const p = searchParamsSchema.parse(raw);
  return {
    mode: p.mode,
    travelMode: p.travelMode,
    maxMinutes: p.maxMinutes,
    monthly: p.monthly,
    downPayment: p.downPayment,
    weights: { quiet: p.quiet, school: p.school, sea: p.sea, two: p.two },
  };
}

export function toQueryString(p: SearchParams): string {
  const q = new URLSearchParams({
    mode: p.mode,
    travelMode: p.travelMode,
    maxMinutes: String(p.maxMinutes),
    monthly: String(p.monthly),
    downPayment: String(p.downPayment),
  });
  // Weights tween continuously during autoplay; round so near-identical requests share a cache key.
  for (const k of INTENT_KEYS) q.set(k, p.weights[k].toFixed(1));
  return q.toString();
}

/** One ranked row as the backend returns it. */
export type RankedRow = {
  id: string;
  rank: number;
  ok: boolean;
  /** 0–1, drives the row's bar. */
  bar: number;
  meta: string;
  sub: string;
  score: number;
  monthlyPayment: number;
};

export type SearchResponse = {
  params: SearchParams;
  title: string;
  okCount: number;
  strongCount: number;
  total: number;
  rows: RankedRow[];
  estates: Record<string, EstateSummary>;
  serverMs: number;
};

export type LatencyProfile = "off" | "normal" | "slow";

export type SavedResponse = { saved: string[]; serverMs: number };

/** Where the composer starts (and where autoplay rewinds to). */
export const DEFAULT_PARAMS: SearchParams = {
  mode: "transit",
  travelMode: "walk",
  maxMinutes: 30,
  monthly: 15_000,
  downPayment: 0.2,
  weights: { quiet: 0, school: 0, sea: 0, two: 0 },
};
