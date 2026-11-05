import { use } from "react";
import { api } from "@/lib/estates/client";
import type { TemplateKind } from "@/lib/estates/svg";

/**
 * Premade SVG templates (floor plans, maps) from GET /api/estates/:id/{plan,map}.svg.
 * One promise per URL for the page's lifetime: a template has no state baked in, so the
 * same markup serves every mode and only the wrapper's data attributes change.
 */
const promises = new Map<string, Promise<string>>();

export const templateUrl = (kind: TemplateKind, id: string) => `/api/estates/${encodeURIComponent(id)}/${kind}.svg`;

export function svgTemplatePromise(kind: TemplateKind, id: string): Promise<string> {
  const url = templateUrl(kind, id);
  let p = promises.get(url);
  if (!p) {
    p = api<string>(url, { label: `${kind} ${id}`, as: "text" });
    p.catch(() => promises.delete(url));
    promises.set(url, p);
  }
  return p;
}

export const prefetchTemplate = (kind: TemplateKind, id: string) => void svgTemplatePromise(kind, id).catch(() => {});

/** Suspends until the template's markup is loaded. Render under <Suspense>. */
export function useSvgTemplate(kind: TemplateKind, id: string): string {
  return use(svgTemplatePromise(kind, id));
}
