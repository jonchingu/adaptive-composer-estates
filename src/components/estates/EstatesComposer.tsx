"use client";

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useAutoplay } from "@/hooks/estates/useAutoplay";
import { prefetchDetail } from "@/hooks/estates/useEstateDetail";
import { useSaved } from "@/hooks/estates/useSaved";
import { useSearch } from "@/hooks/estates/useSearch";
import type { SearchResponse } from "@/lib/estates/types";
import { ComposerCard, ModeTabs } from "./Composer";
import { DetailSheet, SHEET_SPRING } from "./DetailSheet";
import { NetworkHud } from "./NetworkHud";
import { ResultList } from "./ResultList";
import { initialState, reducer } from "./state";

/**
 * Root of the estates page (client). Owns UI state (reducer) and composes the three
 * server-data hooks; every child below is presentational and talks back via callbacks.
 *
 *   EstatesComposer ── useReducer(state)        UI: mode, params, focus, sheet…
 *     ├─ useSearch(params, initial)              GET /api/estates        ranked rows
 *     ├─ useSaved()                              GET|POST /api/estates/saved  optimistic
 *     ├─ useAutoplay(dispatch)                   scripted walkthrough
 *     ├─ ModeTabs / ComposerCard                 controls → dispatch
 *     ├─ ResultList                              rows → focus / menu / save
 *     ├─ DetailSheet ── useEstateDetail(id)      GET /api/estates/:id   Suspense
 *     └─ NetworkHud                              request log + mock knobs
 */

type Toast = { text: string; sub: string; key: number } | null;

export function EstatesComposer({
  initial,
  autoplay = true,
  holdMs = 2600,
}: {
  initial: SearchResponse;
  autoplay?: boolean;
  holdMs?: number;
}) {
  const [s, dispatch] = useReducer(reducer, autoplay, initialState);
  const { data, pending, error } = useSearch(s.params, initial);
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((text: string, sub: string) => {
    clearTimeout(toastTimer.current);
    setToast({ text, sub, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const onSaveSettled = useCallback(
    (t: { id: string; saved: boolean }, err: string | null) => {
      const name = data.estates[t.id]?.name ?? t.id;
      if (err) showToast("未能儲存，已還原", err);
      else if (!t.saved) showToast("已從收藏清單移除", name);
    },
    [data.estates, showToast],
  );
  const { saved, toggle } = useSaved(onSaveSettled);

  useAutoplay(dispatch, { running: s.auto, startMode: s.params.mode, holdMs });

  const total = data.rows.length;
  const focusIdx = Math.max(0, s.focus);
  const row = data.rows[focusIdx];
  const estate = row ? data.estates[row.id] : undefined;

  const stopAuto = useCallback(() => dispatch({ type: "auto", on: false }), []);
  const act = useCallback(
    (kind: "view" | "save") => {
      if (!row || !estate) return;
      dispatch({ type: "menu", open: false });
      if (kind === "view") {
        dispatch({ type: "sheet", open: true });
        showToast(`正在開啟 ${estate.name}`, estate.area);
      } else {
        if (!saved.includes(row.id)) showToast("已加入收藏清單", estate.name);
        toggle(row.id);
      }
    },
    [row, estate, saved, toggle, showToast],
  );

  // Prefetch the focused estate's detail so the sheet usually opens without a skeleton.
  useEffect(() => {
    if (s.focus >= 0 && row) prefetchDetail(row.id);
  }, [s.focus, row]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName);
      if (e.key === "Escape") {
        if (s.menu) return dispatch({ type: "menu", open: false });
        if (s.sheet) return dispatch({ type: "sheet", open: false });
        return stopAuto();
      }
      if (e.key === " " && !inField) {
        e.preventDefault();
        stopAuto();
        return dispatch({ type: "sheet" });
      }
      if (e.key === "Enter" && s.focus >= 0) {
        e.preventDefault();
        if (!s.menu) return dispatch({ type: "menu", open: true });
        return act(e.ctrlKey || e.metaKey ? "save" : "view");
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        stopAuto();
        dispatch({ type: "moveFocus", delta: e.key === "ArrowDown" ? 1 : -1, total });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.menu, s.sheet, s.focus, total, act, stopAuto]);

  return (
    <MotionConfig reducedMotion="user">
      <motion.main
        className="flex min-h-screen flex-col items-center bg-[linear-gradient(180deg,rgb(98,103,106)_0%,rgb(58,64,69)_45%,rgb(30,35,40)_100%)] px-4 pt-7 [font-family:var(--font-geist-sans),'PingFang_HK','Noto_Sans_HK',sans-serif] text-[rgb(31,31,31)]"
        animate={{ paddingBottom: s.sheet ? 460 : 80 }}
        transition={SHEET_SPRING}
      >
        <div className="text-base leading-6 font-medium tracking-[0.2px] text-white/90">尋找理想居所 · Find your place</div>

        <ModeTabs
          mode={s.params.mode}
          auto={s.auto}
          progress={s.progress}
          onSelect={(mode) => dispatch({ type: "manualMode", mode })}
          onToggleAuto={() => dispatch({ type: "auto", on: !s.auto })}
        />

        <ComposerCard
          query={s.query}
          typing={s.typing}
          params={s.params}
          strongCount={data.strongCount}
          onParams={(patch) => {
            stopAuto();
            dispatch({ type: "params", patch });
          }}
          onCycleWeight={(key) => {
            stopAuto();
            dispatch({ type: "weight", key, value: (Math.round(s.params.weights[key]) % 3) + 1 });
          }}
        />

        <ResultList
          data={data}
          params={s.params}
          pending={pending}
          error={error}
          focus={s.focus}
          menu={s.menu}
          saved={saved}
          onFocus={(index) => dispatch({ type: "focus", index, total })}
          onView={() => act("view")}
          onToggleSave={() => act("save")}
        />

        <DetailSheet
          open={s.sheet}
          row={row}
          estate={estate}
          params={s.params}
          title={data.title}
          saved={!!row && saved.includes(row.id)}
        />

        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.key}
              className="pointer-events-none fixed left-1/2 z-20 flex h-10 items-center gap-2.5 rounded-full bg-white px-4 text-[13px] font-medium text-[rgb(31,31,31)] shadow-[0_12px_30px_rgba(0,0,0,0.3)]"
              initial={{ opacity: 0, x: "-50%", y: 14 }}
              animate={{ opacity: 1, x: "-50%", y: 0, bottom: s.sheet ? 440 : 28 }}
              exit={{ opacity: 0, y: 14, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              role="status"
            >
              {toast.text}
              <span className="font-normal text-[rgb(120,120,120)]">{toast.sub}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <NetworkHud />
      </motion.main>
    </MotionConfig>
  );
}
