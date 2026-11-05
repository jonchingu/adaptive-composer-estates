import { Component, type ReactNode, Suspense } from "react";
import { forgetTemplate, useSvgTemplate } from "@/hooks/estates/useSvgTemplate";
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

/**
 * Contains a failed template fetch to its own slot, so one bad request leaves a blank tile
 * instead of reaching the app-level boundary. Keyed by kind + id; it forgets the failed
 * fetch once caught, so the next mount (another estate, the sheet reopening) retries.
 */
class TemplateBoundary extends Component<
  { kind: TemplateKind; id: string; fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.warn(`SVG template ${this.props.kind}/${this.props.id} failed to load`, error);
    forgetTemplate(this.props.kind, this.props.id);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Loading and failed states share one quiet placeholder; failure just stops the pulse. */
function TemplateSlot({ kind, id, placeholder }: { kind: TemplateKind; id: string; placeholder: string }) {
  return (
    <TemplateBoundary key={`${kind}:${id}`} kind={kind} id={id} fallback={<div className={cn("size-full bg-black/5", placeholder)} />}>
      <Suspense fallback={<div className={cn("size-full animate-pulse bg-black/5", placeholder)} />}>
        <Template kind={kind} id={id} />
      </Suspense>
    </TemplateBoundary>
  );
}

/** Floor plan from GET /api/estates/:id/plan.svg; highlights via data-hl. */
export function FloorPlan({ id, hl, big }: { id: string; hl: PlanHighlight; big?: boolean }) {
  return (
    <div
      data-hl={hlAttr(hl)}
      data-size={big ? "big" : undefined}
      className={cn("[&_svg]:block [&_svg]:size-full", big ? "h-[126px] w-[168px]" : "h-9 w-12")}
    >
      <TemplateSlot kind="plan" id={id} placeholder="rounded-[3px]" />
    </div>
  );
}

/** Map sketch from GET /api/estates/:id/map.svg; the route shows when data-route is a travel mode. */
export function MiniMap({ id, mode, showRoute }: { id: string; mode: TravelMode; showRoute: boolean }) {
  return (
    <div data-route={showRoute ? mode : "none"} className="absolute inset-0 [&_svg]:block [&_svg]:size-full">
      <TemplateSlot kind="map" id={id} placeholder="" />
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
