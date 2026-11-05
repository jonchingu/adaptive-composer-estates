import { Hono } from "hono";
import { z } from "zod";
import { parseSearchParams } from "@/lib/estates/types";
import type { AppEnv } from "../env";
import { estatesRepo } from "../estates/repo";
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
  // GET /api/estates/:id → full detail (map, photos, facts) for the sheet
  .get("/:id", async (c) => {
    const detail = await estatesRepo(c.env).detail(c.req.param("id"), latencyFrom(c));
    if (!detail) throw new HttpError(404, "Not found");
    return c.json(detail, 200, noStore);
  });
