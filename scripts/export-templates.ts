/**
 * Writes the design's premade vector graphics to template/ — one floor plan and one map
 * sketch per estate — from src/lib/estates/fixtures.ts. The Worker serves these files as-is.
 * Re-run after editing fixtures or the renderer in src/lib/estates/svg.ts:
 *
 *   bun run templates
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { ESTATES } from "../src/lib/estates/fixtures";
import { renderMapSvg, renderPlanSvg, templatePath } from "../src/lib/estates/svg";

const root = new URL("../template/", import.meta.url);
for (const dir of ["plans", "maps"]) mkdirSync(new URL(dir, root), { recursive: true });

for (const e of ESTATES) {
  writeFileSync(new URL(templatePath("plan", e.id), root), renderPlanSvg(e.id, e.plan));
  writeFileSync(new URL(templatePath("map", e.id), root), renderMapSvg(e.id, e.map));
}
console.log(`Wrote ${ESTATES.length * 2} templates to template/`);
