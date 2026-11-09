import type { IncomingMessage, ServerResponse } from "node:http";
import { Hono } from "hono";
import { app } from "./app";
import type { AppEnv, Env } from "./env";
import { onError } from "./http";

/**
 * The Vercel entry: the same API as the Worker (worker/app.ts), run as one Node.js function.
 * Bundled by vite.vercel.config.ts and written to .vercel/output by scripts/build-vercel.ts.
 *
 * Estates come from the in-memory fixtures. D1, R2, Queues and Workers AI don't exist here, so
 * /api/ingest answers 503 until ingestion moves to Vercel-native storage.
 */
const env = (): Env =>
  ({
    ESTATES_SOURCE: "fixtures",
    // Off unless asked for: the HUD's latency/failure controls are a dev affordance.
    SIMULATE_LATENCY: process.env.SIMULATE_LATENCY ?? "false",
    JEV_MODEL: process.env.JEV_MODEL ?? "jev-1.13.0",
    USE_MOCK: process.env.USE_MOCK ?? "false",
    AUTO_APPLY_CONFIDENCE: "0.85",
    EXTRACT_MODEL: "",
    TYPESAFE_API_KEY: process.env.TYPESAFE_API_KEY || undefined,
  }) as Env;

const unavailable = { error: "Ingestion runs on the Cloudflare deployment only" };

export const vercelApp = new Hono<AppEnv>()
  .all("/api/ingest", (c) => c.json(unavailable, 503))
  .all("/api/ingest/*", (c) => c.json(unavailable, 503))
  .route("/", app)
  // A mounted app's notFound/onError don't apply to the parent, so repeat them here.
  .notFound((c) => c.json({ error: "Not found" }, 404))
  .onError(onError);

/** Node (req, res) → fetch Request → Hono → Response → Node. Responses are small (JSON, SVG), so buffered. */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const ctrl = new AbortController();
  res.on("close", () => !res.writableFinished && ctrl.abort());

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    for (const one of Array.isArray(v) ? v : [v]) headers.append(k, one);
  }
  const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0] ?? "https";
  const url = new URL(req.url ?? "/", `${proto}://${req.headers.host ?? "localhost"}`);

  let body: Buffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    body = Buffer.concat(chunks);
  }

  const response = await vercelApp.fetch(
    new Request(url, { method: req.method, headers, body, signal: ctrl.signal }),
    env(),
  );

  res.statusCode = response.status;
  response.headers.forEach((v, k) => {
    if (k !== "set-cookie") res.setHeader(k, v);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader("set-cookie", cookies);
  res.end(req.method === "HEAD" ? undefined : Buffer.from(await response.arrayBuffer()));
}
