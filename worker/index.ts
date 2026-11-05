import { app } from "./app";
import type { Env, IngestMessage } from "./env";
import { handleIngestBatch, requeueSqlSources } from "./ingest/consumer";

/**
 * The Cloudflare entry. Static assets (the Vite SPA) are served by Cloudflare before this runs;
 * only /api/* reaches the Worker (see "run_worker_first" in wrangler.jsonc).
 *
 *   fetch      the API in worker/app.ts
 *   queue      estates-ingest: extract → chunk → structure → apply
 *   scheduled  re-sync SQL sources daily
 */
export default {
  fetch: app.fetch,
  queue: (batch, env) => handleIngestBatch(batch, env),
  scheduled: (_controller, env, ctx) => ctx.waitUntil(requeueSqlSources(env)),
} satisfies ExportedHandler<Env, IngestMessage>;
