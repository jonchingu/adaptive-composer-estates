"use client";

import type { RankData } from "@/lib/parse/rank";
import { Chip, Field, Meta, Missing } from "./shared";
import type { CardProps } from "./types";

export function RankCard({ data }: CardProps<RankData>) {
  return (
    <div className="flex flex-col gap-3">
      <Field index={0} className="flex flex-wrap items-center gap-2">
        <Chip>{data.criterion}</Chip>
        {data.area ? <Chip>{data.area}</Chip> : <Missing>地區</Missing>}
      </Field>
      <Field index={1} className="flex flex-col gap-2">
        <Meta>排序結果 · 簡述原因</Meta>
        <ol className="flex flex-col gap-2">
          {data.items.slice(0, 5).map((item, i) => (
            <li
              key={item.id}
              className="flex gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2.5"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-card text-[13px] font-[550] tabular-nums text-foreground shadow-[var(--shadow-rest)]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[14px] font-[550] text-foreground">{item.name}</span>
                  <span className="text-[12px] tabular-nums text-muted-foreground">{item.score.toFixed(1)}</span>
                </div>
                {data.brief && <p className="mt-0.5 text-[12.5px] leading-[18px] text-ink-2">{item.reason}</p>}
              </div>
            </li>
          ))}
        </ol>
      </Field>
    </div>
  );
}
