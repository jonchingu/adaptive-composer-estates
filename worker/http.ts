import type { Context } from "hono";
import { z } from "zod";
import { MockAbortError, MockFailureError, type MockOptions, mockOptionsFrom } from "@/lib/estates/server";
import type { AppEnv } from "./env";

export class HttpError extends Error {
  constructor(
    readonly status: 400 | 404 | 409 | 413 | 415 | 503,
    message: string,
  ) {
    super(message);
  }
}

/** Shared error mapping, same contract the Next route handlers had: 499 on abort, the mock's 503, 4xx on bad input. */
export function onError(err: Error, c: Context<AppEnv>) {
  if (err instanceof MockAbortError) return c.body(null, 499 as never);
  if (err instanceof MockFailureError) return c.json({ error: err.message }, 503);
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
  if (err instanceof z.ZodError || err instanceof SyntaxError) return c.json({ error: "Bad request" }, 400);
  console.error(`[api] ${c.req.method} ${c.req.path}:`, err);
  return c.json({ error: "Internal error" }, 500);
}

/** The HUD's latency / failure headers apply only while SIMULATE_LATENCY is on. */
export function latencyFrom(c: Context<AppEnv>): MockOptions {
  if (c.env.SIMULATE_LATENCY !== "true") return { latency: "off", failRate: 0, signal: c.req.raw.signal };
  return mockOptionsFrom(c.req.raw);
}

export const clientId = (c: Context<AppEnv>) => c.req.header("x-client-id")?.slice(0, 64) || "anon";
