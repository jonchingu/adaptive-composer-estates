import { Suspense } from "react";
import { useSvgTemplate } from "@/hooks/estates/useSvgTemplate";
import { commuteLegs, TRAVEL } from "@/lib/estates/rank";
import { ACCENT, type TemplateKind } from "@/lib/estates/svg";
import type { EstateSummary, SearchParams, TravelMode } from "@/lib/estates/types";
import { cn } from "@/lib/utils";

/**
 * Presentational pieces. Floor plans and maps are the design's premade vector graphics,
 * fetched as SVG templates (see src/lib/estates/svg.ts); everything else is drawn here.
 */

export { ACCENT };

export type PlanHighlight = { door?: boolean; all?: boolean; bed?: boolean; win?: boolean };

export function highlightFor(p: SearchParams): PlanHighlight {
  if (p.mode === "transit") return { door: true };
  if (p.mode === "price") return { all: true };
  return { bed: p.weights.two > 0.5, win: p.weights.sea > 0.5 };
}

const hlAttr = (hl: PlanHighlight) => (Object.keys(hl) as (keyof PlanHighlight)[]).filter((k) => hl[k]).join(" ") || undefined;

/**
 * Inlines a fetched SVG template. The markup never changes for a given estate, so React
 * leaves the DOM alone across renders and only the wrapper's data attributes move; the
 * template's own CSS transitions do the animating.
 */
function Template({ kind, id }: { kind: TemplateKind; id: string }) {
  const svg = useSvgTemplate(kind, id);
  return <div className="contents" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Floor plan from GET /api/estates/:id/plan.svg; highlights via data-hl. */
export function FloorPlan({ id, hl, big }: { id: string; hl: PlanHighlight; big?: boolean }) {
  return (
    <div
      data-hl={hlAttr(hl)}
      data-size={big ? "big" : undefined}
      className={cn("[&_svg]:block [&_svg]:size-full", big ? "h-[126px] w-[168px]" : "h-9 w-12")}
    >
      <Suspense fallback={<div className="size-full animate-pulse rounded-[3px] bg-black/5" />}>
        <Template kind="plan" id={id} />
      </Suspense>
    </div>
  );
}

/** Map sketch from GET /api/estates/:id/map.svg; the route shows when data-route is a travel mode. */
export function MiniMap({ id, mode, showRoute }: { id: string; mode: TravelMode; showRoute: boolean }) {
  return (
    <div data-route={showRoute ? mode : "none"} className="absolute inset-0 [&_svg]:block [&_svg]:size-full">
      <Suspense fallback={<div className="size-full animate-pulse bg-black/5" />}>
        <Template kind="map" id={id} />
      </Suspense>
    </div>
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
