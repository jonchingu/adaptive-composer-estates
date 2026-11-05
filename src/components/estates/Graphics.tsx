import { commuteLegs, TRAVEL } from "@/lib/estates/rank";
import type { EstateSummary, FloorPlan as Plan, MapSketch, SearchParams, TravelMode } from "@/lib/estates/types";

/** Pure SVG/presentational pieces. No state, no data fetching: props in, pixels out. */

export const ACCENT = "rgb(108,110,214)";
const EASE = "400ms cubic-bezier(.2,.8,.2,1)";

export type PlanHighlight = { door?: boolean; all?: boolean; bed?: boolean; win?: boolean };

export function highlightFor(p: SearchParams): PlanHighlight {
  if (p.mode === "transit") return { door: true };
  if (p.mode === "price") return { all: true };
  return { bed: p.weights.two > 0.5, win: p.weights.sea > 0.5 };
}

const ROOM_LABEL = { bed: "睡房", bath: "浴室", kit: "廚房", liv: "客飯廳" } as const;

export function FloorPlan({ plan, hl, big }: { plan: Plan; hl: PlanHighlight; big?: boolean }) {
  return (
    <svg width={big ? 168 : 48} height={big ? 126 : 36} viewBox="0 0 40 30" className="block overflow-visible" aria-hidden>
      {plan.rooms.map((r, i) => {
        const on = hl.all || (hl.bed && r.type === "bed");
        return (
          <rect
            key={i}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill={on ? "rgba(108,110,214,0.22)" : "transparent"}
            stroke={on ? ACCENT : "rgb(196,196,192)"}
            strokeWidth={0.7}
            style={{ transition: `fill ${EASE}, stroke ${EASE}` }}
          />
        );
      })}
      <path d={plan.outline} fill="none" stroke="rgb(40,40,40)" strokeWidth={1.3} strokeLinejoin="round" />
      <line
        x1={plan.window[0]}
        y1={plan.window[1]}
        x2={plan.window[2]}
        y2={plan.window[3]}
        stroke={ACCENT}
        strokeWidth={2.6}
        strokeLinecap="round"
        style={{ opacity: hl.win ? 1 : 0, transition: `opacity ${EASE}` }}
      />
      <circle
        cx={plan.door[0]}
        cy={plan.door[1]}
        r={2.2}
        fill={hl.door ? ACCENT : "#fff"}
        stroke={hl.door ? ACCENT : "rgb(40,40,40)"}
        strokeWidth={1}
        style={{ transition: `fill ${EASE}` }}
      />
      {big &&
        plan.rooms.map((r, i) => (
          <text key={`t${i}`} x={r.x + r.w / 2} y={r.y + r.h / 2 + 1} textAnchor="middle" fontSize={2.4} fill="rgb(110,110,110)">
            {ROOM_LABEL[r.type]}
          </text>
        ))}
    </svg>
  );
}

export function MiniMap({ map, mode, showRoute }: { map: MapSketch; mode: TravelMode; showRoute: boolean }) {
  const dest = { x: 215, y: 30 };
  const mid = { x: (map.x + dest.x) / 2, y: Math.min(map.y, dest.y) + 8 };
  const line =
    mode === "walk"
      ? { s: "rgb(90,90,90)", d: "2 3", w: 2 }
      : mode === "mtr"
        ? { s: ACCENT, d: "", w: 3 }
        : { s: "rgb(40,40,40)", d: "", w: 3 };
  return (
    <svg viewBox="0 0 260 150" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 block size-full" aria-hidden>
      {map.coast && <path d={map.coast} fill="rgb(214,222,236)" />}
      {[30, 75, 120].map((y, i) => (
        <line key={`h${i}`} x1={0} y1={y} x2={260} y2={y + (i - 1) * 6} stroke="#fff" strokeWidth={5} />
      ))}
      {[50, 130, 205].map((x, i) => (
        <line key={`v${i}`} x1={x} y1={0} x2={x + (i - 1) * 10} y2={150} stroke="#fff" strokeWidth={4} />
      ))}
      {showRoute && (
        <>
          <path
            d={`M${map.x} ${map.y} Q${mid.x} ${mid.y} ${dest.x} ${dest.y}`}
            fill="none"
            stroke={line.s}
            strokeWidth={line.w}
            strokeDasharray={line.d}
            strokeLinecap="round"
            style={{ transition: "stroke 300ms" }}
          />
          <circle cx={dest.x} cy={dest.y} r={5} fill="#fff" stroke="rgb(40,40,40)" strokeWidth={1.6} />
        </>
      )}
      <circle cx={map.x} cy={map.y} r={16} fill="rgba(108,110,214,0.16)" />
      <circle cx={map.x} cy={map.y} r={6} fill={ACCENT} stroke="#fff" strokeWidth={2} />
    </svg>
  );
}

const LEG = {
  walk: { l: "步", line: "2px dotted rgb(120,120,120)" },
  mtr: { l: "鐵", line: `3px solid ${ACCENT}` },
  bus: { l: "巴", line: "3px solid rgb(40,40,40)" },
} as const;

/** Walk / ride / walk timeline; flex-grow animates as the travel mode changes. */
export function CommuteLegs({ estate, mode, ok }: { estate: EstateSummary; mode: TravelMode; ok: boolean }) {
  return (
    <div
      className="flex w-[150px] flex-none items-start gap-[3px] max-sm:hidden"
      aria-label={`${TRAVEL[mode].label} ${estate.travel[mode]} 分`}
    >
      {commuteLegs(estate, mode).map((leg, i) => (
        <div
          key={i}
          className="flex min-w-[18px] basis-0 flex-col gap-[5px]"
          style={{ flexGrow: leg.minutes, transition: "flex-grow 500ms cubic-bezier(.2,.8,.2,1)" }}
        >
          <div className="h-0 rounded-[2px]" style={{ borderTop: LEG[leg.kind].line }} />
          <div
            className="text-center text-[10px] leading-3 whitespace-nowrap tabular-nums"
            style={{ color: ok ? "rgb(110,110,110)" : "rgb(170,170,170)" }}
          >
            {LEG[leg.kind].l}
            {leg.minutes}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Kbd({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={
        dark
          ? "rounded-[5px] bg-white/15 px-1.5 py-px text-[11px] text-white/85"
          : "rounded-[5px] bg-[rgb(241,241,239)] px-1.5 py-px text-[11px] text-[rgb(70,70,70)]"
      }
    >
      {children}
    </span>
  );
}
