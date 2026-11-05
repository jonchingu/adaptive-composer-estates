"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/intents/shared";
import { affordableWan, coverageKm, fmt, INTENTS, MODE_META, TRAVEL } from "@/lib/estates/rank";
import { type IntentKey, MODES, type Mode, type SearchParams, TRAVEL_MODES, type TravelMode } from "@/lib/estates/types";
import { cn } from "@/lib/utils";
import { Kbd } from "./Graphics";

/**
 * The top card: mode tabs, the query line and one control panel per mode.
 * Controls are fully controlled; they echo values back up via callbacks and compute
 * only instant, local feedback (coverage, affordability). Ranking comes from the server.
 */

const EASE = [0.2, 0.8, 0.2, 1] as const;

export function ModeTabs({
  mode,
  auto,
  progress,
  onSelect,
  onToggleAuto,
}: {
  mode: Mode;
  auto: boolean;
  progress: number;
  onSelect: (m: Mode) => void;
  onToggleAuto: () => void;
}) {
  return (
    <div className="mt-3.5 flex items-center gap-1.5 rounded-full bg-white/8 p-1" role="tablist">
      {MODES.map((m) => {
        const on = m === mode;
        return (
          <button
            key={m}
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(m)}
            className="relative cursor-pointer overflow-hidden rounded-full px-3.5 py-[7px] text-[12.5px] leading-4 font-medium"
          >
            {on && (
              <motion.span
                layoutId="estates-tab"
                className="absolute inset-0 rounded-full bg-white"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              />
            )}
            <span className={cn("relative transition-colors duration-200", on ? "text-[rgb(31,31,31)]" : "text-white/80")}>
              {MODE_META[m].label}
            </span>
            <span
              className="absolute inset-x-3.5 bottom-[3px] h-0.5 rounded-sm bg-black/10 transition-opacity"
              style={{ opacity: on && auto ? 1 : 0 }}
              aria-hidden
            >
              <span
                className="block h-full rounded-sm bg-[rgb(31,31,31)] transition-[width] duration-100 ease-linear"
                style={{ width: `${on ? progress : 0}%` }}
              />
            </span>
          </button>
        );
      })}
      <button
        onClick={onToggleAuto}
        className="cursor-pointer rounded-full px-3 py-[7px] text-xs leading-4 font-medium text-white/70 hover:text-white"
      >
        {auto ? "❚❚ Auto" : "▶ Auto"}
      </button>
    </div>
  );
}

function QueryLine({ query, typing }: { query: string; typing: boolean }) {
  return (
    <div className="flex min-h-10 items-center gap-3">
      <span className="text-lg leading-none text-[rgb(222,58,84)]">✦</span>
      <div className="min-w-0 flex-1 text-lg leading-[26px] font-medium text-[rgb(31,31,31)]">
        {query}
        {(typing || !query) && (
          <span
            className="ms-0.5 inline-block h-[22px] w-0.5 animate-[osBlink_1s_steps(1)_infinite] bg-[rgb(222,40,60)] align-[-4px]"
            aria-hidden
          />
        )}
        {!query && <span className="font-normal text-[rgb(170,170,170)]">想住邊？試下問通勤、預算或者生活需要</span>}
      </div>
      <div className="grid size-10 flex-none place-items-center rounded-full bg-[rgb(241,241,239)]" aria-hidden>
        <div className="-mt-0.5 -ml-0.5 size-[11px] rounded-full border-[1.6px] border-[rgb(60,60,60)]" />
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "h-8 cursor-pointer rounded-full border px-3.5 text-[13px] leading-4 font-medium text-[rgb(40,40,40)] transition-colors duration-200",
        on ? "border-[rgb(204,204,242)] bg-[rgb(238,238,252)]" : "border-[rgb(230,230,228)] bg-white",
      )}
    >
      {children}
    </button>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <div className="flex h-8 items-center rounded-full bg-[rgb(241,241,239)] px-3 text-[13px] text-[rgb(60,60,60)]">{children}</div>;
}

function PanelHead({ icon, title, accent }: { icon: string; title: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3.5">
      <div
        className={cn(
          "grid size-11 place-items-center rounded-xl bg-[rgb(244,244,242)] text-[15px] font-semibold",
          accent && "text-[rgb(222,58,84)]",
        )}
      >
        {icon}
      </div>
      <div className="text-sm text-[rgb(40,40,40)]">{title}</div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  ends,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: React.ReactNode;
  ends: [string, string];
}) {
  const pct = (value - min) / (max - min);
  return (
    <>
      <div className="mt-[22px] flex items-end justify-between">
        <div className="pb-1 text-[12.5px] text-[rgb(70,70,70)]">{label}</div>
        <div className="flex items-baseline gap-1">{display}</div>
      </div>
      <div className="relative mt-2.5 h-5">
        <div className="absolute inset-x-0 top-2 h-1 rounded bg-[rgb(238,238,236)]" />
        <div className="absolute top-2 left-0 h-1 rounded bg-[rgb(31,31,31)]" style={{ width: `${pct * 100}%` }} />
        <div
          className="absolute top-0.5 size-4 rounded-full border-[1.5px] border-[rgb(31,31,31)] bg-white"
          style={{ left: `calc(${pct * 100}% - ${pct * 16}px)` }}
        />
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          className="absolute inset-0 m-0 w-full cursor-pointer appearance-none opacity-0"
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-[rgb(120,120,120)]">
        <span>{ends[0]}</span>
        <span>{ends[1]}</span>
      </div>
    </>
  );
}

function Summary({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3.5 flex h-11 items-center justify-between rounded-[14px] bg-[rgb(248,248,246)] px-3.5">
      <span className="text-[12.5px] text-[rgb(70,70,70)]">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{children}</span>
    </div>
  );
}

const bigNum = "text-[28px] leading-[30px] font-semibold tabular-nums";

export type PanelHandlers = {
  onParams: (patch: Partial<SearchParams>) => void;
  onCycleWeight: (k: IntentKey) => void;
};

function TransitPanel({ p, onParams }: { p: SearchParams } & PanelHandlers) {
  return (
    <>
      <PanelHead icon="通" title="通勤距離" />
      <div className="mt-4 flex flex-wrap gap-2">
        {TRAVEL_MODES.map((k: TravelMode) => (
          <Chip key={k} on={k === p.travelMode} onClick={() => onParams({ travelMode: k })}>
            {TRAVEL[k].label}
          </Chip>
        ))}
        <Pill>{TRAVEL[p.travelMode].dest}</Pill>
      </div>
      <Slider
        label="最長通勤時間"
        value={p.maxMinutes}
        min={1}
        max={45}
        step={1}
        onChange={(v) => onParams({ maxMinutes: v })}
        ends={["1 分", "45 分"]}
        display={
          <>
            <span className={bigNum}>{p.maxMinutes}</span>
            <span className="text-[13px] text-[rgb(90,90,90)]">分</span>
          </>
        }
      />
      <Summary label="約可覆蓋距離">
        <AnimatedNumber value={coverageKm(p.maxMinutes, p.travelMode)} format={(n) => `${n.toFixed(1)} km`} />
      </Summary>
    </>
  );
}

function PricePanel({ p, onParams }: { p: SearchParams } & PanelHandlers) {
  return (
    <>
      <PanelHead icon="$" title="樓價計算" />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="me-0.5 text-[12.5px] text-[rgb(90,90,90)]">首期</span>
        {[0.1, 0.2, 0.3].map((d) => (
          <Chip key={d} on={Math.abs(d - p.downPayment) < 1e-6} onClick={() => onParams({ downPayment: d })}>
            {Math.round(d * 100)}%
          </Chip>
        ))}
        <Pill>30年 · 3.75%</Pill>
      </div>
      <Slider
        label="每月供款上限"
        value={p.monthly}
        min={10_000}
        max={60_000}
        step={500}
        onChange={(v) => onParams({ monthly: v })}
        ends={["$10,000", "$60,000"]}
        display={
          <>
            <span className="text-[13px] text-[rgb(90,90,90)]">HK$</span>
            <span className={bigNum}>{fmt(p.monthly)}</span>
          </>
        }
      />
      <Summary label="可負擔樓價約">
        <AnimatedNumber value={affordableWan(p.monthly, p.downPayment)} format={(n) => `${fmt(n)} 萬`} />
      </Summary>
    </>
  );
}

const LEVEL = ["—", "低", "中", "高"];

function SemanticPanel({ p, onCycleWeight, strongCount }: { p: SearchParams; strongCount: number } & PanelHandlers) {
  return (
    <>
      <PanelHead icon="✦" title="語意排序 · 已解析條件" accent />
      <div className="mt-4 grid grid-cols-2 gap-2">
        {INTENTS.map((it) => {
          const v = p.weights[it.key];
          const on = v > 0.5;
          return (
            <button
              key={it.key}
              onClick={() => onCycleWeight(it.key)}
              className={cn(
                "cursor-pointer rounded-[14px] border px-3 py-2.5 text-left transition-colors duration-200",
                on ? "border-[rgb(214,214,244)] bg-[rgb(246,246,253)]" : "border-[rgb(232,232,230)] bg-white",
              )}
            >
              <div className="flex items-center justify-between text-[13px] text-[rgb(40,40,40)]">
                <span className="font-medium">{it.label}</span>
                <span className="text-[11.5px] text-[rgb(110,110,110)]">{LEVEL[Math.round(v)]}</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded bg-[rgb(236,236,234)]">
                <div className="h-full rounded bg-[rgb(31,31,31)]" style={{ width: `${(v / 3) * 100}%` }} />
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-[11px] text-[rgb(120,120,120)]">點擊條件調整權重</div>
      <Summary label="配對度 ≥ 70% 的樓盤">{strongCount} 個</Summary>
    </>
  );
}

/** Height follows the active panel; panels crossfade + slide in the direction of travel. */
function PanelStack({ mode, children }: { mode: Mode; children: React.ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  // Direction of travel through the tabs, derived during render from the previous mode.
  const [seen, setSeen] = useState({ mode, dir: 1 });
  if (seen.mode !== mode) setSeen({ mode, dir: MODES.indexOf(mode) >= MODES.indexOf(seen.mode) ? 1 : -1 });
  const dir = seen.mode !== mode ? (MODES.indexOf(mode) >= MODES.indexOf(seen.mode) ? 1 : -1) : seen.dir;

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode]);

  return (
    <motion.div className="relative mt-2.5" animate={{ height }} transition={{ duration: 0.46, ease: EASE }}>
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.div
          key={mode}
          ref={inner}
          custom={dir}
          className="absolute inset-x-0 top-0"
          variants={{
            enter: (d: number) => ({ opacity: 0, y: 10 * d }),
            center: { opacity: 1, y: 0 },
            exit: (d: number) => ({ opacity: 0, y: -10 * d }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ opacity: { duration: 0.3 }, y: { duration: 0.46, ease: EASE } }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

export function ComposerCard({
  query,
  typing,
  params,
  strongCount,
  ...handlers
}: { query: string; typing: boolean; params: SearchParams; strongCount: number } & PanelHandlers) {
  const Panel = { transit: TransitPanel, price: PricePanel, semantic: SemanticPanel }[params.mode];
  return (
    <div className="mt-3.5 w-full max-w-[568px] rounded-[26px] bg-white p-[3px] shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
      <div className="rounded-[23px] border-[1.5px] border-[rgb(122,124,222)] px-5 pt-[18px] pb-4">
        <QueryLine query={query} typing={typing} />
        <PanelStack mode={params.mode}>
          <Panel p={params} strongCount={strongCount} {...handlers} />
        </PanelStack>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12.5px] text-[rgb(90,90,90)]">
            <Kbd>Esc</Kbd>to cancel
          </div>
          <button className="flex h-[34px] cursor-pointer items-center gap-2 rounded-full bg-[rgb(38,38,38)] ps-4 pe-3.5 text-[13.5px] leading-4 font-medium text-white">
            {MODE_META[params.mode].save}
            <span className="opacity-70">↵</span>
          </button>
        </div>
      </div>
    </div>
  );
}
