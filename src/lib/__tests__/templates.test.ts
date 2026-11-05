import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { ESTATES } from "@/lib/estates/fixtures";
import { renderMapSvg, renderPlanSvg, templatePath } from "@/lib/estates/svg";

const read = (p: string) => readFileSync(new URL(`../../../template/${p}`, import.meta.url), "utf8");

describe("premade SVG templates", () => {
  test("template/ matches the renderer (run `bun run templates` if this fails)", () => {
    for (const e of ESTATES) {
      expect(read(templatePath("plan", e.id))).toBe(renderPlanSvg(e.id, e.plan));
      expect(read(templatePath("map", e.id))).toBe(renderMapSvg(e.id, e.map));
    }
  });

  test("plans draw every room plus window and door, with no state baked in", () => {
    const e = ESTATES[0];
    const svg = renderPlanSvg(e.id, e.plan);
    expect(svg.match(/class="es-room /g)).toHaveLength(e.plan.rooms.length);
    expect(svg).toContain('class="es-win"');
    expect(svg).toContain('class="es-door"');
    expect(svg).not.toContain("data-hl=");
  });

  test("maps carry one route and only draw the sea when there is a coast", () => {
    const inland = ESTATES.find((e) => !e.map.coast)!;
    expect(renderMapSvg(inland.id, inland.map)).not.toContain('class="es-sea"');
    expect(renderMapSvg("x", { x: 1, y: 2, coast: "M0 0Z" }).match(/class="es-route"/g)).toHaveLength(1);
  });

  test("untrusted geometry can't inject markup", () => {
    const svg = renderPlanSvg('"><script>', { ...ESTATES[0].plan, outline: '"/><script>alert(1)</script>' });
    expect(svg).not.toContain("<script>");
  });
});
