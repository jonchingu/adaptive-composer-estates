import { type EstateSummary, INTENT_KEYS, type IntentKey, type Mode, type RankedRow, type SearchParams, type TravelMode } from "./types";

/**
 * Pure ranking + finance maths. No I/O, no React: the mock backend runs it per request,
 * the client reuses the small helpers (affordability, coverage) for instant control feedback,
 * and bun tests cover it directly.
 */

export const TRAVEL: Record<TravelMode, { label: string; speedKmPerMin: number; dest: string }> = {
  walk: { label: "步行", speedKmPerMin: 0.08, dest: "港鐵站" },
  mtr: { label: "港鐵", speedKmPerMin: 0.4, dest: "中環站" },
  bus: { label: "巴士", speedKmPerMin: 0.25, dest: "中環" },
};

export const INTENTS: { key: IntentKey; label: string }[] = [
  { key: "quiet", label: "安靜" },
  { key: "school", label: "近名校" },
  { key: "sea", label: "海景" },
  { key: "two", label: "兩房" },
];

export const MODE_META: Record<Mode, { label: string; query: string; save: string }> = {
  transit: { label: "通勤時間", query: "有哪些樓宇10分可以到地鐵站？", save: "Save 通勤距離" },
  price: { label: "樓價計算", query: "每月供款 $28,000 可以買邊度？", save: "Save 預算" },
  semantic: { label: "語意排序", query: "安靜、近名校、有海景嘅兩房", save: "Save 排序" },
};

const RATE = 0.0375 / 12;
/** Annuity factor for a 30-year, 3.75% mortgage. */
const ANNUITY = (1 - Math.pow(1 + RATE, -360)) / RATE;

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export function monthlyPayment(priceWan: number, downPayment: number) {
  return (priceWan * 1e4 * (1 - downPayment)) / ANNUITY;
}

/** Affordable price in 萬 for a monthly budget. */
export function affordableWan(monthly: number, downPayment: number) {
  return (monthly * ANNUITY) / (1 - downPayment) / 1e4;
}

export function coverageKm(minutes: number, mode: TravelMode) {
  return minutes * TRAVEL[mode].speedKmPerMin;
}

export function weightSum(w: SearchParams["weights"]) {
  return INTENT_KEYS.reduce((a, k) => a + w[k], 0);
}

export function semanticScore(e: EstateSummary, w: SearchParams["weights"]) {
  const sum = weightSum(w);
  return sum ? INTENT_KEYS.reduce((a, k) => a + w[k] * e.affinity[k], 0) / sum : 0;
}

export function listTitle(p: Pick<SearchParams, "mode" | "travelMode" | "downPayment">) {
  if (p.mode === "transit") return `按${TRAVEL[p.travelMode].label}時間排序 · 到${TRAVEL[p.travelMode].dest}`;
  if (p.mode === "price") return `按可負擔程度排序 · 首期 ${Math.round(p.downPayment * 100)}%`;
  return "按語意配對度排序";
}

/** Split a door-to-destination trip into walk / ride / walk legs for the row's mini timeline. */
export function commuteLegs(e: EstateSummary, mode: TravelMode): { kind: TravelMode; minutes: number }[] {
  const t = e.travel[mode];
  if (mode === "walk") return [{ kind: "walk", minutes: t }];
  const last = 3;
  const first = mode === "mtr" ? Math.min(e.travel.walk, t - 4) : Math.max(2, Math.round(e.travel.walk / 2));
  return [
    { kind: "walk", minutes: first },
    { kind: mode, minutes: t - first - last },
    { kind: "walk", minutes: last },
  ];
}

type Scored = Omit<RankedRow, "rank"> & { key: number };

function score(e: EstateSummary, p: SearchParams): Scored {
  const pay = monthlyPayment(e.price, p.downPayment);
  const sem = semanticScore(e, p.weights);
  if (p.mode === "transit") {
    const t = e.travel[p.travelMode];
    const ok = t <= p.maxMinutes;
    return {
      id: e.id,
      key: ok ? t : 1000 + t,
      ok,
      bar: Math.max(0.06, 1 - t / 45),
      meta: `${TRAVEL[p.travelMode].label} ${t} 分`,
      sub: `${e.area} · ${e.spec}`,
      score: sem,
      monthlyPayment: pay,
    };
  }
  if (p.mode === "price") {
    const ok = pay <= p.monthly;
    return {
      id: e.id,
      key: ok ? -e.price : 1e5 + e.price,
      ok,
      bar: Math.min(1, pay / p.monthly),
      meta: `$${fmt(pay)}/月`,
      sub: `${e.area} · ${e.spec} · ${e.price}萬`,
      score: sem,
      monthlyPayment: pay,
    };
  }
  const sum = weightSum(p.weights);
  const top = INTENTS.map((it) => ({ l: it.label, v: p.weights[it.key] * e.affinity[it.key] }))
    .sort((a, b) => b.v - a.v)
    .filter((x) => x.v > 0.3)
    .slice(0, 2)
    .map((x) => x.l);
  return {
    id: e.id,
    key: -sem,
    ok: !sum || sem >= 0.5,
    bar: sem,
    meta: sum ? `${Math.round(sem * 100)}% 配對` : "—",
    sub: `${e.area} · ${top.length ? top.join(" · ") : e.spec}`,
    score: sem,
    monthlyPayment: pay,
  };
}

export function rankEstates(estates: EstateSummary[], p: SearchParams) {
  const scored = estates.map((e) => score(e, p));
  // Stable: ties keep fixture order, so rows don't shuffle when keys are equal.
  const rows: RankedRow[] = scored
    .map((s, i) => ({ s, i }))
    .sort((a, b) => a.s.key - b.s.key || a.i - b.i)
    .map(({ s }, rank) => {
      const { key: _key, ...row } = s;
      void _key;
      return { ...row, rank };
    });
  return {
    title: listTitle(p),
    rows,
    okCount: rows.filter((r) => r.ok).length,
    strongCount: rows.filter((r) => r.score >= 0.7).length,
    total: rows.length,
  };
}
