import { Hono } from "hono";
import type { AppEnv } from "../env";

const REPO = "anishfn/shapeshift";

/** GET /api/stars → { stars }. Cached at the edge for an hour; a failed fetch returns null. */
export const stars = new Hono<AppEnv>().get("/", async (c) => {
  const cache = caches.default;
  const key = new Request(new URL("/api/stars", c.req.url));
  const hit = await cache.match(key);
  if (hit) return hit;

  let count: number | null = null;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "shapeshift-worker" },
    });
    if (res.ok) count = ((await res.json()) as { stargazers_count?: number }).stargazers_count ?? null;
  } catch {
    // keep null
  }

  const out = Response.json({ stars: count }, { headers: { "cache-control": `public, max-age=${count === null ? 60 : 3600}` } });
  c.executionCtx.waitUntil(cache.put(key, out.clone()));
  return out;
});
