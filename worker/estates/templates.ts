import { renderMapSvg, renderPlanSvg, type TemplateKind, templatePath } from "@/lib/estates/svg";
import type { EstateDetail } from "@/lib/estates/types";

/**
 * The premade SVGs in template/, bundled into the Worker at build time (Vite inlines them as
 * strings). Keyed by "plans/tk.svg", "maps/tk.svg", …
 */
const PREMADE: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>("../../template/**/*.svg", { query: "?raw", import: "default", eager: true })).map(
    ([path, svg]) => [path.replace("../../template/", ""), svg],
  ),
);

/** Premade file if there is one, else render from the estate's stored geometry (e.g. an estate added by ingestion). */
export function templateFor(
  kind: TemplateKind,
  id: string,
  load: () => Promise<EstateDetail | null>,
): Promise<{ svg: string; premade: boolean } | null> {
  const premade = PREMADE[templatePath(kind, id)];
  if (premade) return Promise.resolve({ svg: premade, premade: true });
  return load().then((e) =>
    e ? { svg: kind === "plan" ? renderPlanSvg(e.id, e.plan) : renderMapSvg(e.id, e.map), premade: false } : null,
  );
}
