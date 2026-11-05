import { Hono } from "hono";
import { z } from "zod";
import { parseSearchParams } from "@/lib/estates/types";
import type { AppEnv } from "../env";
import { simulate } from "@/lib/estates/server";
import { estatesRepo } from "../estates/repo";
import { templateFor } from "../estates/templates";
import { clientId, HttpError, latencyFrom } from "../http";

const noStore = { "cache-control": "no-store" };
const savedBody = z.object({ id: z.string().min(1).max(16), saved: z.boolean() });

/** Same paths and shapes as the old Next route handlers, so src/lib/estates/client.ts is unchanged. */
export const estates = new Hono<AppEnv>()
  // GET /api/estates?mode=transit&travelMode=walk&maxMinutes=10… → ranked rows + summaries
  .get("/", async (c) => {
    const params = parseSearchParams(new URL(c.req.url).searchParams);
    return c.json(await estatesRepo(c.env).search(params, latencyFrom(c)), 200, noStore);
  })
  // GET /api/estates/saved → ids saved by this client
  .get("/saved", async (c) => c.json(await estatesRepo(c.env).listSaved(clientId(c), latencyFrom(c)), 200, noStore))
  // POST /api/estates/saved { id, saved } → the new saved set. Honours x-mock-fail.
  .post("/saved", async (c) => {
    const body = savedBody.parse(await c.req.json());
    return c.json(await estatesRepo(c.env).setSaved(clientId(c), body.id, body.saved, latencyFrom(c)), 200, noStore);
  })
  // GET /api/estates/:id/plan.svg · /map.svg → the design's vector graphics as SVG templates (see src/lib/estates/svg.ts)
  .get("/:id/:file{(plan|map)\\.svg}", async (c) => {
    const id = c.req.param("id");
    const kind = c.req.param("file") === "plan.svg" ? "plan" : "map";
    const opts = latencyFrom(c);
    const [found] = await Promise.all([
      templateFor(kind, id, () => estatesRepo(c.env).detail(id, { ...opts, latency: "off" })),
      simulate("template", opts),
    ]);
    if (!found) throw new HttpError(404, "Not found");
    return c.body(found.svg, 200, {
      "content-type": "image/svg+xml; charset=utf-8",
      // Premade files only change on deploy; rendered ones follow the database, so keep those short.
      "cache-control": found.premade ? "public, max-age=3600" : "public, max-age=60",
      "x-template": found.premade ? "premade" : "rendered",
    });
  })
  // GET /api/estates/:id → full detail (map, photos, facts) for the sheet
  .get("/:id", async (c) => {
    const detail = await estatesRepo(c.env).detail(c.req.param("id"), latencyFrom(c));
    if (!detail) throw new HttpError(404, "Not found");
    return c.json(detail, 200, noStore);
  });
