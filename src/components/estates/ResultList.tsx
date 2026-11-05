"use client";

import { AnimatePresence, motion } from "motion/react";
import type { RankedRow, SearchParams, SearchResponse } from "@/lib/estates/types";
import { prefetchDetail } from "@/hooks/estates/useEstateDetail";
import { cn } from "@/lib/utils";
import { CommuteLegs, FloorPlan, highlightFor, Kbd } from "./Graphics";

/**
 * Ranked list. Rows are absolutely positioned at `rank * ROW` and spring to their new
 * slot whenever a response re-orders them, with a small per-rank stagger. DOM order never
 * changes (keyed by estate id), so focus, hover and the star animation survive re-ranking.
 */

export const ROW = 66;
const POP = { type: "spring", stiffness: 520, damping: 30 } as const;
const SLIDE = { type: "spring", stiffness: 260, damping: 32, mass: 0.9 } as const;

export function ResultList({
  data,
  params,
  pending,
  error,
  focus,
  menu,
  saved,
  onFocus,
  onView,
  onToggleSave,
}: {
  data: SearchResponse;
  params: SearchParams;
  pending: boolean;
  error: string | null;
  focus: number;
  menu: boolean;
  saved: string[];
  onFocus: (rank: number) => void;
  onView: () => void;
  onToggleSave: () => void;
}) {
  const hl = highlightFor(params);
  const total = data.rows.length;
  const focusedId = data.rows[focus]?.id;
  const nearBottom = focus >= total - 2;
  const menuTop = nearBottom ? Math.max(0, focus) * ROW - 50 : Math.max(0, focus) * ROW + 62;
  // Stable DOM order: render in fixture order, position by rank.
  const rows = [...data.rows].sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="relative mt-12 w-full max-w-[560px] overflow-hidden rounded-[22px] bg-white px-2 pt-1.5 pb-2 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
      <PendingBar on={pending} />
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 text-xs text-[rgb(120,120,120)]">
        <span>{error ? <span className="text-[rgb(200,40,60)]">載入失敗 · {error}</span> : data.title}</span>
        <span className="flex items-center gap-2">
          <span className="flex gap-[3px]">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
          </span>
          <span className="tabular-nums">
            {data.okCount} / {data.total} 個樓盤
          </span>
        </span>
      </div>

      <div className="relative" style={{ height: total * ROW }}>
        <motion.div
          className="absolute inset-x-0 h-16 rounded-[14px] bg-[rgb(247,247,252)] shadow-[inset_0_0_0_1px_rgb(214,214,244),0_6px_18px_rgba(108,110,214,0.14)]"
          initial={false}
          animate={{ y: Math.max(0, focus) * ROW, opacity: focus < 0 ? 0 : 1 }}
          transition={{ y: { type: "spring", stiffness: 380, damping: 26 }, opacity: { duration: 0.2 } }}
        />

        <AnimatePresence>
          {menu && focus >= 0 && (
            <motion.div
              key="menu"
              className="absolute left-[88px] z-[5] flex gap-1.5 rounded-[14px] bg-[rgb(31,31,31)] p-[5px] shadow-[0_12px_30px_rgba(0,0,0,0.28)]"
              style={{ top: menuTop }}
              initial={{ opacity: 0, y: nearBottom ? 6 : -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
              transition={POP}
            >
              <button
                onClick={onView}
                className="flex h-[34px] cursor-pointer items-center gap-2 rounded-[10px] bg-white px-3 text-[13px] leading-4 font-medium text-[rgb(31,31,31)]"
              >
                查看樓盤 <Kbd>↵</Kbd>
              </button>
              <button
                onClick={onToggleSave}
                className="flex h-[34px] cursor-pointer items-center gap-2 rounded-[10px] bg-white/10 px-3 text-[13px] leading-4 font-medium text-white"
              >
                {focusedId && saved.includes(focusedId) ? "移出收藏" : "加入收藏清單"} <Kbd dark>Ctrl ↵</Kbd>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {rows.map((row) => (
          <Row
            key={row.id}
            row={row}
            estate={data.estates[row.id]}
            params={params}
            hl={hl}
            focused={row.rank === focus}
            saved={saved.includes(row.id)}
            onHover={() => {
              prefetchDetail(row.id);
              onFocus(row.rank);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Row({
  row,
  estate,
  params,
  hl,
  focused,
  saved,
  onHover,
}: {
  row: RankedRow;
  estate: SearchResponse["estates"][string];
  params: SearchParams;
  hl: ReturnType<typeof highlightFor>;
  focused: boolean;
  saved: boolean;
  onHover: () => void;
}) {
  return (
    <motion.div
      onMouseEnter={onHover}
      className="absolute inset-x-0 top-0 flex h-16 cursor-pointer items-center gap-3.5 rounded-[14px] px-3"
      initial={false}
      animate={{ y: row.rank * ROW, opacity: row.ok ? 1 : 0.36 }}
      transition={{ y: { ...SLIDE, delay: row.rank * 0.028 }, opacity: { duration: 0.36 } }}
    >
      <motion.div
        className={cn(
          "relative flex h-12 w-[62px] flex-none items-center justify-center rounded-xl transition-[background,box-shadow] duration-200",
          focused ? "bg-white shadow-[0_2px_8px_rgba(31,31,31,0.10)]" : "bg-[rgb(246,246,244)]",
        )}
        animate={{ scale: focused ? 1.06 : 1 }}
        transition={POP}
      >
        <FloorPlan id={estate.id} hl={hl} />
        <motion.div
          className="absolute -top-[5px] -right-[5px] grid size-[18px] place-items-center rounded-full border-2 border-white bg-[rgb(108,110,214)] text-[9px] text-white"
          initial={false}
          animate={{ opacity: saved ? 1 : 0, scale: saved ? 1 : 0.4 }}
          transition={{ type: "spring", stiffness: 600, damping: 18 }}
          aria-label={saved ? "已收藏" : undefined}
        >
          ★
        </motion.div>
        <div
          className={cn(
            "absolute -top-[5px] -left-[5px] grid size-5 place-items-center rounded-full border-2 border-white text-[10.5px] font-semibold transition-colors duration-300",
            row.ok && row.rank === 0 ? "bg-[rgb(31,31,31)] text-white" : "bg-[rgb(244,244,242)] text-[rgb(40,40,40)]",
          )}
        >
          {row.ok ? row.rank + 1 : "–"}
        </div>
      </motion.div>

      <motion.div className="min-w-0 flex-1" animate={{ x: focused ? 3 : 0 }} transition={POP}>
        <div className={cn("truncate text-[15px] leading-5 text-[rgb(31,31,31)]", focused ? "font-semibold" : "font-medium")}>
          {estate.name}
        </div>
        <div className="truncate text-xs leading-[18px] text-[rgb(130,130,130)]">{row.sub}</div>
      </motion.div>

      {params.mode === "transit" && <CommuteLegs estate={estate} mode={params.travelMode} ok={row.ok} />}

      <div className="flex w-[76px] flex-none flex-col items-end gap-[5px]">
        <div className="text-[13px] whitespace-nowrap text-[rgb(70,70,70)] tabular-nums">{row.meta}</div>
        <div className="h-[3px] w-16 overflow-hidden rounded-[3px] bg-[rgb(238,238,236)]">
          <motion.div
            className="h-full bg-[rgb(31,31,31)]"
            initial={false}
            animate={{ width: `${Math.round(row.bar * 100)}%` }}
            transition={SLIDE}
          />
        </div>
      </div>
    </motion.div>
  );
}

/** Thin indeterminate bar while a ranking request is in flight; old rows stay put underneath. */
function PendingBar({ on }: { on: boolean }) {
  return (
    <AnimatePresence>
      {on && (
        <motion.div
          className="absolute inset-x-0 top-0 h-0.5 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.12 } }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          aria-hidden
        >
          <motion.div
            className="h-full w-1/3 rounded-full bg-[rgb(108,110,214)]"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
