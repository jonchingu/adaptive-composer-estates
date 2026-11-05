"use client";

import { type Dispatch, useEffect } from "react";
import type { Action } from "@/components/estates/state";
import { INTENTS, MODE_META } from "@/lib/estates/rank";
import { MODES, type Mode } from "@/lib/estates/types";

/**
 * Scripted walkthrough: types each mode's question, then drags its controls the way a
 * person would. It only dispatches ordinary composer actions, so every animation and
 * fetch it triggers is the real code path. Any manual input turns `running` off, which
 * aborts the script mid-step.
 */
export function useAutoplay(
  dispatch: Dispatch<Action>,
  { running, startMode, holdMs }: { running: boolean; startMode: Mode; holdMs: number },
) {
  useEffect(() => {
    if (!running) return;
    const ctrl = new AbortController();
    const { signal } = ctrl;

    const wait = (ms: number) =>
      new Promise<void>((res, rej) => {
        const t = setTimeout(res, ms);
        signal.addEventListener("abort", () => (clearTimeout(t), rej(signal.reason)), { once: true });
      });

    const tween = (from: number, to: number, ms: number, set: (v: number) => void) =>
      new Promise<void>((res, rej) => {
        const t0 = performance.now();
        const step = (now: number) => {
          if (signal.aborted) return rej(signal.reason);
          const k = Math.min(1, (now - t0) / ms);
          set(from + (to - from) * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(step);
          else res();
        };
        requestAnimationFrame(step);
      });

    const type = async (text: string) => {
      dispatch({ type: "query", query: "", typing: true });
      await wait(260);
      for (let i = 1; i <= text.length; i++) {
        dispatch({ type: "query", query: text.slice(0, i) });
        await wait(52);
      }
      await wait(320);
    };

    let progressTimer: ReturnType<typeof setInterval> | undefined;
    const run = async () => {
      let i = MODES.indexOf(startMode);
      while (true) {
        const mode = MODES[i];
        const t0 = Date.now();
        const total = 4200 + holdMs * 2;
        clearInterval(progressTimer);
        progressTimer = setInterval(() => dispatch({ type: "progress", value: Math.min(100, ((Date.now() - t0) / total) * 100) }), 100);

        await type(MODE_META[mode].query);
        if (mode === "transit") {
          dispatch({ type: "params", patch: { mode, travelMode: "walk", maxMinutes: 30 } });
          await wait(380);
          await tween(30, 10, 1000, (v) => dispatch({ type: "params", patch: { maxMinutes: Math.round(v) } }));
          await wait(holdMs);
          dispatch({ type: "params", patch: { travelMode: "mtr" } });
          await wait(500);
          await tween(10, 20, 800, (v) => dispatch({ type: "params", patch: { maxMinutes: Math.round(v) } }));
        } else if (mode === "price") {
          dispatch({ type: "params", patch: { mode, downPayment: 0.2, monthly: 15_000 } });
          await wait(380);
          await tween(15_000, 28_000, 1100, (v) => dispatch({ type: "params", patch: { monthly: Math.round(v / 500) * 500 } }));
          await wait(holdMs);
          dispatch({ type: "params", patch: { downPayment: 0.3 } });
        } else {
          dispatch({ type: "params", patch: { mode, weights: { quiet: 0, school: 0, sea: 0, two: 0 } } });
          await wait(380);
          const target = { quiet: 3, school: 2, sea: 3, two: 2 };
          for (const it of INTENTS) await tween(0, target[it.key], 420, (v) => dispatch({ type: "weight", key: it.key, value: v }));
          await wait(holdMs);
          dispatch({ type: "weight", key: "sea", value: 1 });
          dispatch({ type: "weight", key: "school", value: 3 });
        }
        await wait(holdMs);
        i = (i + 1) % MODES.length;
      }
    };

    run().catch(() => {});
    return () => {
      ctrl.abort();
      clearInterval(progressTimer);
    };
    // startMode/holdMs are read once per run; changing them mid-run shouldn't restart the script.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, dispatch]);
}
