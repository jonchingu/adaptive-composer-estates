import { Hono } from "hono";
import type { AppEnv } from "./env";
import { onError } from "./http";
import { estates } from "./routes/estates";
import { ingest } from "./routes/ingest";
import { intent } from "./routes/intent";
import { stars } from "./routes/stars";

/**
 * The HTTP API, shared by both hosts:
 *   worker/index.ts   Cloudflare Worker (plus the ingest queue consumer and the daily cron)
 *   worker/vercel.ts  Vercel Function (fixtures-backed; ingestion is Cloudflare-only for now)
 *
 *   /api/intent · /api/estates · /api/ingest · /api/stars
 */
export const app = new Hono<AppEnv>()
  .basePath("/api")
  .route("/intent", intent)
  .route("/estates", estates)
  .route("/ingest", ingest)
  .route("/stars", stars)
  .notFound((c) => c.json({ error: "Not found" }, 404))
  .onError(onError);
