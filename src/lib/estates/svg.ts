import type { FloorPlan, MapSketch } from "./types";

/**
 * The design's vector graphics as SVG *templates*: plain markup with no state baked in.
 *
 * Every state the UI needs (highlighted rooms, sea-facing window, door, the commute route)
 * is drawn up front and switched by CSS on an ancestor's data attributes:
 *
 *   <div data-hl="door bed win all" data-route="walk|mtr|bus|none" data-size="big">
 *     <svg …template…/>
 *   </div>
 *
 * so a template is fetched once per estate and toggling a mode only flips attributes, which
 * keeps the CSS transitions running instead of re-mounting the drawing.
 *
 * `scripts/export-templates.ts` writes these to template/; the Worker serves them from
 * GET /api/estates/:id/plan.svg and /map.svg (falling back to rendering here for estates
 * that have no premade file).
 */

export const ACCENT = "rgb(108,110,214)";

const ROOM_LABEL = { bed: "睡房", bath: "浴室", kit: "廚房", liv: "客飯廳" } as const;

const esc = (v: string | number) =>
  String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Only path commands and numbers may reach a `d` attribute. */
const safePath = (d: string) => (/^[MLHVCSQTAZmlhvcsqtaz0-9.,\s-]*$/.test(d) ? d : "");

const ease = "cubic-bezier(.2,.8,.2,1)";

/** Shared by every plan template. Identical rules, so inlining several on one page is harmless. */
const PLAN_STYLE = `
.es-room{fill:transparent;stroke:rgb(196,196,192);stroke-width:.7;transition:fill 400ms ${ease},stroke 400ms ${ease}}
[data-hl~="all"] .es-room,[data-hl~="bed"] .es-room-bed{fill:rgba(108,110,214,.22);stroke:${ACCENT}}
.es-outline{fill:none;stroke:rgb(40,40,40);stroke-width:1.3;stroke-linejoin:round}
.es-win{stroke:${ACCENT};stroke-width:2.6;stroke-linecap:round;opacity:0;transition:opacity 400ms ${ease}}
[data-hl~="win"] .es-win{opacity:1}
.es-door{fill:#fff;stroke:rgb(40,40,40);stroke-width:1;transition:fill 400ms ${ease},stroke 400ms ${ease}}
[data-hl~="door"] .es-door{fill:${ACCENT};stroke:${ACCENT}}
.es-label{display:none;font:2.4px Inter,"PingFang HK",sans-serif;fill:rgb(110,110,110)}
[data-size="big"] .es-label{display:inline}`.trim();

export function renderPlanSvg(id: string, plan: FloorPlan): string {
  const rooms = plan.rooms
    .map((r) => `<rect class="es-room es-room-${esc(r.type)}" x="${+r.x}" y="${+r.y}" width="${+r.w}" height="${+r.h}"/>`)
    .join("\n  ");
  const labels = plan.rooms
    .map((r) => `<text class="es-label" x="${+r.x + r.w / 2}" y="${+r.y + r.h / 2 + 1}" text-anchor="middle">${ROOM_LABEL[r.type]}</text>`)
    .join("\n  ");
  const [x1, y1, x2, y2] = plan.window.map(Number);
  const [dx, dy] = plan.door.map(Number);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 30" overflow="visible" data-template="plan" data-estate="${esc(id)}" aria-hidden="true">
<style>${PLAN_STYLE}</style>
  ${rooms}
  <path class="es-outline" d="${safePath(plan.outline)}"/>
  <line class="es-win" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>
  <circle class="es-door" cx="${dx}" cy="${dy}" r="2.2"/>
  ${labels}
</svg>
`;
}

/** Destination pin is fixed (中環 / station); the route curves from the estate to it. */
const DEST = { x: 215, y: 30 };

const MAP_STYLE = `
.es-sea{fill:rgb(214,222,236)}
.es-road{stroke:#fff}
.es-route{fill:none;stroke-linecap:round;stroke:rgb(90,90,90);stroke-width:2;stroke-dasharray:2 3;opacity:0;transition:stroke 300ms,opacity 300ms}
[data-route="walk"] .es-route,[data-route="mtr"] .es-route,[data-route="bus"] .es-route{opacity:1}
[data-route="mtr"] .es-route{stroke:${ACCENT};stroke-width:3;stroke-dasharray:none}
[data-route="bus"] .es-route{stroke:rgb(40,40,40);stroke-width:3;stroke-dasharray:none}
.es-dest{fill:#fff;stroke:rgb(40,40,40);stroke-width:1.6;opacity:0;transition:opacity 300ms}
[data-route="walk"] .es-dest,[data-route="mtr"] .es-dest,[data-route="bus"] .es-dest{opacity:1}
.es-halo{fill:rgba(108,110,214,.16)}
.es-pin{fill:${ACCENT};stroke:#fff;stroke-width:2}`.trim();

export function renderMapSvg(id: string, map: MapSketch): string {
  const x = Number(map.x);
  const y = Number(map.y);
  const mid = { x: (x + DEST.x) / 2, y: Math.min(y, DEST.y) + 8 };
  const h = [30, 75, 120].map((ry, i) => `<line class="es-road" x1="0" y1="${ry}" x2="260" y2="${ry + (i - 1) * 6}" stroke-width="5"/>`);
  const v = [50, 130, 205].map((rx, i) => `<line class="es-road" x1="${rx}" y1="0" x2="${rx + (i - 1) * 10}" y2="150" stroke-width="4"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 150" preserveAspectRatio="xMidYMid slice" data-template="map" data-estate="${esc(id)}" aria-hidden="true">
<style>${MAP_STYLE}</style>
  ${map.coast ? `<path class="es-sea" d="${safePath(map.coast)}"/>` : ""}
  ${h.join("\n  ")}
  ${v.join("\n  ")}
  <path class="es-route" d="M${x} ${y} Q${mid.x} ${mid.y} ${DEST.x} ${DEST.y}"/>
  <circle class="es-dest" cx="${DEST.x}" cy="${DEST.y}" r="5"/>
  <circle class="es-halo" cx="${x}" cy="${y}" r="16"/>
  <circle class="es-pin" cx="${x}" cy="${y}" r="6"/>
</svg>
`;
}

export type TemplateKind = "plan" | "map";
export const templatePath = (kind: TemplateKind, id: string) => `${kind === "plan" ? "plans" : "maps"}/${id}.svg`;
