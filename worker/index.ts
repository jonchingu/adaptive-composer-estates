import { Hono } from "hono";
import type { AppEnv, Env, IngestMessage } from "./env";
import { onError } from "./http";
import { handleIngestBatch, requeueSqlSources } from "./ingest/consumer";
import { estates } from "./routes/estates";
import { ingest } from "./routes/ingest";
import { intent } from "./routes/intent";
import { stars } from "./routes/stars";

/**
 * The whole backend. Static assets (the Vite SPA) are served by Cloudflare before this runs;
 * only /api/* reaches the Worker (see "run_worker_first" in wrangler.jsonc).
 *
 *   fetch      /api/intent · /api/estates · /api/ingest · /api/stars
 *   queue      estates-ingest: extract → chunk → structure → apply
 *   scheduled  re-sync SQL sources daily
 */
const app = new Hono<AppEnv>()
  .basePath("/api")
  .route("/intent", intent)
  .route("/estates", estates)
  .route("/ingest", ingest)
  .route("/stars", stars)
  .notFound((c) => c.json({ error: "Not found" }, 404))
  .onError(onError);

export default {
  fetch: app.fetch,
  queue: (batch, env) => handleIngestBatch(batch, env),
  scheduled: (_controller, env, ctx) => ctx.waitUntil(requeueSqlSources(env)),
} satisfies ExportedHandler<Env, IngestMessage>;
