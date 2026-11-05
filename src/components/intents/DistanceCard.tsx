"use client";

import { Bus, Footprints, TrainFront } from "lucide-react";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { type DistanceData, type DistanceMode, MODE_SPEED_M_PER_MIN } from "@/lib/parse/distance";
import { cn } from "@/lib/utils";
import { AnimatedNumber, Chip, Field, HeroNumber, Meta, Missing } from "./shared";
import type { CardProps } from "./types";

const MODES: { id: DistanceMode; label: string; icon: typeof Footprints }[] = [
  { id: "walk", label: "步行", icon: Footprints },
  { id: "mtr", label: "港鐵", icon: TrainFront },
  { id: "bus", label: "巴士", icon: Bus },
];

export function DistanceCard({ data, interactive }: CardProps<DistanceData>) {
  const [minutes, setMinutes] = useState<number | null>(null);
  const [mode, setMode] = useState<DistanceMode | null>(null);
  const [prev, setPrev] = useState(data);
  if (prev.minutes !== data.minutes || prev.mode !== data.mode) {
    setPrev(data);
    setMinutes(null);
    setMode(null);
  }

  const mins = minutes ?? data.minutes;
  const activeMode = mode ?? data.mode;
  const reachM = Math.round(mins * MODE_SPEED_M_PER_MIN[activeMode]);
  const ModeIcon = MODES.find((m) => m.id === activeMode)?.icon ?? Footprints;

  return (
    <div className="flex flex-col gap-4">
      <Field index={0} className="flex flex-wrap items-center gap-2">
        {MODES.map((m) => {
          const Icon = m.icon;
          const on = activeMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              disabled={!interactive}
              aria-pressed={on}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setMode(m.id)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-[background-color,border-color,color,scale] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.96] disabled:opacity-60",
                on ? "border-brand/40 bg-brand-soft text-foreground" : "border-border bg-card text-ink-2 hover:border-line-strong",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {m.label}
            </button>
          );
        })}
        {data.destination ? <Chip>{data.destination}</Chip> : data.area ? <Chip>{data.area}</Chip> : <Missing>目的地</Missing>}
        {data.rooms ? <Chip>{data.rooms} 房</Chip> : null}
      </Field>

      <Field index={1} className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <Meta>最長通勤時間</Meta>
          <HeroNumber className="text-[28px]">
            <AnimatedNumber value={mins} format={(v) => `${Math.round(v)}`} />
            <span className="ms-1 text-[15px] font-[450] text-muted-foreground">分</span>
          </HeroNumber>
        </div>
        <Slider
          min={1}
          max={45}
          step={1}
          value={[mins]}
          disabled={!interactive}
          aria-label="通勤分鐘"
          onValueChange={(v) => setMinutes(Array.isArray(v) ? v[0]! : mins)}
          className="py-1"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>1 分</span>
          <span>45 分</span>
        </div>
      </Field>

      <Field index={2} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
        <span className="flex items-center gap-2 text-[13px] text-ink-2">
          <ModeIcon className="size-4 text-muted-foreground" aria-hidden />
          約可覆蓋距離
        </span>
        <span className="text-[15px] font-[550] tabular-nums text-foreground">
          {reachM >= 1000 ? `${(reachM / 1000).toFixed(1)} km` : `${reachM} m`}
        </span>
      </Field>
    </div>
  );
}
