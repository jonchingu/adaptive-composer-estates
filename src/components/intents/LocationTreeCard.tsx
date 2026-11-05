"use client";

import { ChevronRight, MapPin } from "lucide-react";
import type { LocationData, LocationNode } from "@/lib/parse/location";
import { Chip, Field, Meta, Missing } from "./shared";
import type { CardProps } from "./types";

function Branch({ node, depth = 0 }: { node: LocationNode; depth?: number }) {
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[14px] leading-5" style={{ paddingInlineStart: depth * 12 }}>
        {depth > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
        <span className={depth === 0 ? "font-[550] text-foreground" : "text-ink-2"}>{node.label}</span>
        {node.labelEn && <span className="text-[12px] text-muted-foreground">{node.labelEn}</span>}
        {node.tags?.includes("renovated") && (
          <span className="rounded-full bg-brand-soft px-1.5 text-[11px] font-medium text-brand">大維修</span>
        )}
      </div>
      {node.children && node.children.length > 0 && (
        <ul className="flex flex-col gap-1">
          {node.children.map((c) => (
            <Branch key={c.id} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function LocationTreeCard({ data }: CardProps<LocationData>) {
  const crumbs = data.path;
  return (
    <div className="flex flex-col gap-3">
      <Field index={0} className="flex flex-wrap items-center gap-2">
        {crumbs.length ? (
          crumbs.map((c, i) => (
            <span key={c} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />}
              <Chip icon={i === 0 ? MapPin : undefined}>{c}</Chip>
            </span>
          ))
        ) : (
          <Missing>選擇地區 / 屋苑</Missing>
        )}
        {data.filter && <Chip>{data.filter}</Chip>}
      </Field>
      <Field index={1}>
        <Meta className="mb-2">地區 → 屋苑 → 大廈</Meta>
        <ul className="max-h-48 overflow-y-auto rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
          {data.tree.map((n) => (
            <Branch key={n.id} node={n} />
          ))}
        </ul>
      </Field>
    </div>
  );
}
