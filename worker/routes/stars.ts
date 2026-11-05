import { Hono } from "hono";
import type { AppEnv } from "../env";

const REPO = "anishfn/shapeshift";
const HOUR = 3600_000;

/**
 * Kept in module memory so this runs on any host (Workers, Vercel). Each instance asks GitHub
 * at most once an hour (once a minute after a failure); the CDN caches the response on top.
 */
let memo: { stars: number | null; until: number } | null = null;

/** GET /api/stars → { stars }. A failed fetch returns null. */
export const stars = new Hono<AppEnv>().get("/", async (c) => {
  if (!memo || Date.now() > memo.until) {
    let count: number | null = null;
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}`, {
        headers: { Accept: "application/vnd.github+json", "User-Agent": "shapeshift-worker" },
      });
      if (res.ok) count = ((await res.json()) as { stargazers_count?: number }).stargazers_count ?? null;
    } catch {
      // keep null
    }
    memo = { stars: count, until: Date.now() + (count === null ? 60_000 : HOUR) };
  }
  const maxAge = memo.stars === null ? 60 : 3600;
  return c.json({ stars: memo.stars }, 200, { "cache-control": `public, max-age=${maxAge}, s-maxage=${maxAge}` });
});
