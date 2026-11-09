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
    // A rejection stays cached so use() throws it to the nearest error boundary. Dropping it
    // here instead would hand React's retry a fresh pending promise and refetch in a loop.
    // The boundary calls forgetTemplate() once it has caught the error, so a later mount retries.
    p = api<string>(url, { label: `${kind} ${id}`, as: "text" });
    promises.set(url, p);
  }
  return p;
}

/** Drop a cached (failed) template so the next render fetches it again. */
export const forgetTemplate = (kind: TemplateKind, id: string) => void promises.delete(templateUrl(kind, id));

export const prefetchTemplate = (kind: TemplateKind, id: string) => void svgTemplatePromise(kind, id).catch(() => {});

/** Suspends until the template's markup is loaded. Render under <Suspense>. */
export function useSvgTemplate(kind: TemplateKind, id: string): string {
  return use(svgTemplatePromise(kind, id));
}
