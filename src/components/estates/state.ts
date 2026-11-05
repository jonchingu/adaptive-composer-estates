import { MODE_META } from "@/lib/estates/rank";
import { DEFAULT_PARAMS, type IntentKey, type Mode, type SearchParams } from "@/lib/estates/types";

/**
 * All of the composer's UI state in one reducer. The composer owns it; children get
 * slices as props and report intent through callbacks, and autoplay drives the same
 * actions a person would. Server data (results, detail, saved) lives in hooks, not here.
 */

export type ComposerState = {
  params: SearchParams;
  query: string;
  typing: boolean;
  /** Index into the ranked list, -1 for none. */
  focus: number;
  menu: boolean;
  sheet: boolean;
  auto: boolean;
  /** Autoplay progress through the current mode, 0–100. */
  progress: number;
};

export type Action =
  | { type: "params"; patch: Partial<SearchParams> }
  | { type: "weight"; key: IntentKey; value: number }
  | { type: "query"; query: string; typing?: boolean }
  | { type: "manualMode"; mode: Mode }
  | { type: "focus"; index: number; total: number }
  | { type: "moveFocus"; delta: number; total: number }
  | { type: "menu"; open: boolean }
  | { type: "sheet"; open?: boolean }
  | { type: "auto"; on: boolean }
  | { type: "progress"; value: number };

export const initialState = (autoplay: boolean): ComposerState => ({
  params: DEFAULT_PARAMS,
  query: autoplay ? "" : MODE_META.transit.query,
  typing: false,
  focus: -1,
  menu: false,
  sheet: false,
  auto: autoplay,
  progress: 0,
});

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function reducer(s: ComposerState, a: Action): ComposerState {
  switch (a.type) {
    case "params":
      return { ...s, params: { ...s.params, ...a.patch } };
    case "weight":
      return { ...s, params: { ...s.params, weights: { ...s.params.weights, [a.key]: a.value } } };
    case "query":
      return { ...s, query: a.query, typing: a.typing ?? s.typing };
    case "manualMode": {
      // Picking a tab by hand jumps straight to that mode's "answer" so the list has something to show.
      const p = { ...s.params, mode: a.mode };
      if (a.mode === "transit" && p.maxMinutes === DEFAULT_PARAMS.maxMinutes) p.maxMinutes = 10;
      if (a.mode === "price" && p.monthly === DEFAULT_PARAMS.monthly) p.monthly = 28_000;
      if (a.mode === "semantic" && !Object.values(p.weights).some((v) => v > 0)) p.weights = { quiet: 3, school: 2, sea: 3, two: 2 };
      return { ...s, params: p, query: MODE_META[a.mode].query, auto: false, typing: false, progress: 0 };
    }
    case "focus":
      return s.focus === a.index ? s : { ...s, focus: clamp(a.index, 0, a.total - 1), menu: false };
    case "moveFocus":
      return { ...s, menu: false, focus: s.focus < 0 ? 0 : clamp(s.focus + a.delta, 0, a.total - 1) };
    case "menu":
      return { ...s, menu: a.open && s.focus >= 0 };
    case "sheet": {
      const open = a.open ?? !s.sheet;
      return { ...s, sheet: open, menu: false, focus: open && s.focus < 0 ? 0 : s.focus };
    }
    case "auto":
      return { ...s, auto: a.on, typing: a.on && s.typing, progress: a.on ? s.progress : 0 };
    case "progress":
      return { ...s, progress: a.value };
  }
}
