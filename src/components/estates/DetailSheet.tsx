"use client";

import { AnimatePresence, motion } from "motion/react";
import { Component, Suspense, useDeferredValue, useState } from "react";
import { AnimatedNumber } from "@/components/intents/shared";
import { useEstateDetail } from "@/hooks/estates/useEstateDetail";
import { fmt, TRAVEL } from "@/lib/estates/rank";
import type { EstateSummary, RankedRow, SearchParams } from "@/lib/estates/types";
import { cn } from "@/lib/utils";
import { FloorPlan, highlightFor, Kbd, MiniMap } from "./Graphics";

/**
 * Bottom sheet for the focused estate. Three data sources, three loading behaviours:
 *  - header + floor plan: the list's summary, already on the client → renders instantly.
 *  - stats: derived from summary + current params → recomputed on every control change.
 *  - photos + map: `useEstateDetail` suspends on first view. `useDeferredValue` keeps the
 *    previous estate's media on screen (dimmed) while the next one loads, instead of
 *    falling back to the skeleton on every ↑/↓.
 */

export const SHEET_SPRING = { type: "spring", stiffness: 300, damping: 34 } as const;

export function DetailSheet({
  open,
  row,
  estate,
  params,
  title,
  saved,
}: {
  open: boolean;
  row: RankedRow | undefined;
  estate: EstateSummary | undefined;
  params: SearchParams;
  title: string;
  saved: boolean;
}) {
  const id = estate?.id ?? "";
  const deferredId = useDeferredValue(id);
  const stale = deferredId !== id;
  // Media is client-only and lazy: nothing is fetched (or rendered on the server) until the sheet first opens.
  const [seen, setSeen] = useState(false);
  if (open && !seen) setSeen(true);

  return (
    <motion.div
      className="fixed bottom-0 left-1/2 z-15 w-[calc(100%-24px)] max-w-[760px] rounded-t-3xl bg-white px-5 pt-2.5 shadow-[0_-18px_50px_rgba(0,0,0,0.32)]"
      initial={false}
      animate={{ x: "-50%", y: open ? 0 : "calc(100% + 30px)" }}
      transition={SHEET_SPRING}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="mx-auto mb-3 h-1 w-9 rounded bg-[rgb(226,226,224)]" />
      {row && estate && (
        <>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-[rgb(120,120,120)]">
                第 {row.rank + 1} 名 · {title}
              </div>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={estate.id}
                  className="text-xl leading-[26px] font-semibold text-[rgb(31,31,31)]"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
                >
                  {estate.name}
                </motion.div>
              </AnimatePresence>
              <div className="mt-0.5 text-[12.5px] text-[rgb(110,110,110)]">
                {estate.area} · {estate.spec}
              </div>
            </div>
            <div className="flex flex-none items-baseline gap-1">
              <AnimatedNumber value={estate.price} format={fmt} className="text-2xl font-semibold" />
              <span className="text-[13px] text-[rgb(90,90,90)]">萬</span>
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5">
            <div className="flex h-[170px] flex-col items-center justify-center gap-2.5 rounded-2xl bg-[rgb(246,246,244)]">
              <FloorPlan plan={estate.plan} hl={params.mode === "price" ? { all: true } : highlightFor(params)} big />
              <div className="flex gap-2.5 text-[10.5px] text-[rgb(110,110,110)]">
                <span>{estate.spec}</span>
                <span>{planNote(params)}</span>
              </div>
            </div>
            {seen && deferredId ? (
              <ErrorBoundary key={deferredId}>
                <Suspense fallback={<MediaSkeleton />}>
                  <div className={cn("contents", stale && "[&>*]:opacity-60")}>
                    <DetailMedia id={deferredId} params={params} />
                  </div>
                </Suspense>
              </ErrorBoundary>
            ) : (
              <MediaSkeleton />
            )}
          </div>

          <Stats estate={estate} row={row} params={params} />

          <div className="flex flex-wrap items-center gap-3.5 pt-3 pb-3.5 text-[11.5px] text-[rgb(110,110,110)]">
            <span className="flex items-center gap-1.5">
              <Kbd>Space</Kbd>收起
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>↑↓</Kbd>切換樓盤
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>↵</Kbd>查看 / 收藏
            </span>
            <span className="ms-auto">{saved ? "★ 已收藏" : ""}</span>
          </div>
        </>
      )}
    </motion.div>
  );
}

function planNote(p: SearchParams) {
  if (p.mode === "transit") return "門口位置";
  if (p.mode === "price") return "全屋實用面積";
  return [p.weights.sea > 0.5 && "海景面", p.weights.two > 0.5 && "睡房"].filter(Boolean).join(" · ") || "格局";
}

/** Suspends on the detail fetch. */
function DetailMedia({ id, params }: { id: string; params: SearchParams }) {
  const d = useEstateDetail(id);
  const t = d.travel[params.travelMode];
  return (
    <>
      <div className="relative grid h-[170px] grid-cols-[minmax(0,2fr)_minmax(0,1fr)] grid-rows-2 gap-1 overflow-hidden rounded-2xl transition-opacity duration-200">
        {d.photos.map((ph, i) => (
          <motion.div
            key={ph.id}
            className={cn("flex items-end p-2 text-[10.5px] text-white/90", i === 0 && "row-span-2")}
            style={{ background: `linear-gradient(135deg, hsl(${ph.hue} 32% 62%), hsl(${(ph.hue + 40) % 360} 28% 42%))` }}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
          >
            {ph.label}
          </motion.div>
        ))}
      </div>
      <div className="relative h-[170px] overflow-hidden rounded-2xl bg-[rgb(238,238,233)] transition-opacity duration-200">
        <MiniMap map={d.map} mode={params.travelMode} showRoute={params.mode === "transit"} />
        <div className="absolute bottom-2.5 left-2.5 flex h-6 items-center rounded-full bg-white px-2.5 text-[11px] text-[rgb(60,60,60)] shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
          {params.mode === "transit" ? `${TRAVEL[params.travelMode].label} ${t} 分 → ${TRAVEL[params.travelMode].dest}` : d.area}
        </div>
        <div className="absolute top-2.5 right-2.5 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[10px] text-white/90">
          {d.serverMs}ms
        </div>
      </div>
    </>
  );
}

function MediaSkeleton() {
  return (
    <>
      <div className="h-[170px] animate-pulse rounded-2xl bg-[rgb(240,240,238)]" />
      <div className="h-[170px] animate-pulse rounded-2xl bg-[rgb(240,240,238)]" />
    </>
  );
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="col-span-2 grid h-[170px] place-items-center rounded-2xl bg-[rgb(248,240,240)] text-xs text-[rgb(160,60,70)]">
        <button className="cursor-pointer underline" onClick={() => this.setState({ failed: false })}>
          相片載入失敗 · 重試
        </button>
      </div>
    );
  }
}

/** Derived, not fetched: summary × current params. The active mode's stat leads. */
function Stats({ estate, row, params }: { estate: EstateSummary; row: RankedRow; params: SearchParams }) {
  const tm = TRAVEL[params.travelMode];
  const stats = {
    area: { k: "實用面積", v: <>{estate.spec.split(" · ")[1]}</> },
    transit: { k: `${tm.label}至${tm.dest}`, v: <>{estate.travel[params.travelMode]} 分鐘</> },
    price: {
      k: `每月供款 · 首期${Math.round(params.downPayment * 100)}%`,
      v: <AnimatedNumber value={row.monthlyPayment} format={(n) => `HK$${fmt(n)}`} />,
    },
    semantic: { k: "語意配對度", v: Object.values(params.weights).some((w) => w > 0) ? <>{Math.round(row.score * 100)}%</> : <>—</> },
  };
  const order = [params.mode, ...(["area", "transit", "price", "semantic"] as const).filter((k) => k !== params.mode)];
  return (
    <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-px overflow-hidden rounded-[14px] bg-[rgb(236,236,234)]">
      {order.map((k) => (
        <motion.div layout="position" key={k} className="bg-[rgb(250,250,248)] px-3 py-2.5" transition={SHEET_SPRING}>
          <div className="text-[11px] text-[rgb(120,120,120)]">{stats[k].k}</div>
          <div className="mt-0.5 text-sm font-semibold text-[rgb(31,31,31)] tabular-nums">{stats[k].v}</div>
        </motion.div>
      ))}
    </div>
  );
}
