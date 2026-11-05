import { Hono } from "hono";
import { APIUserAbortError, classifierMode, classifyWithJev, warnMockOnce } from "@/lib/jev/client";
import { mockClassify } from "@/lib/jev/mock";
import { type IntentResult, intentRequestSchema, noneResult } from "@/lib/jev/types";
import { LRU, normalizeKey } from "@/lib/lru";
import type { AppEnv } from "../env";

// Per-isolate cache. Isolates are reused across requests, so hot phrases stay warm.
const cache = new LRU<string, IntentResult>(500);

/** POST /api/intent { text } → IntentResult. The keystroke path: fast, and never fails loudly. */
export const intent = new Hono<AppEnv>().post("/", async (c) => {
  const body = intentRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "Expected { text: string }" }, 400);

  const text = body.data.text;
  const key = normalizeKey(text);
  if (key.length < 2) return c.json(noneResult({ model: "none" }));

  const hit = cache.get(key);
  if (hit) return c.json({ ...hit, latencyMs: 0, cached: true } satisfies IntentResult);

  const { mode, reason } = classifierMode();
  if (mode === "offline") {
    warnMockOnce(reason);
    return c.json(mockClassify(text));
  }

  const signal = c.req.raw.signal;
  try {
    const result = await classifyWithJev(text, signal);
    console.info(`[jev] ${result.model} ${result.latencyMs}ms ${result.questionCount}q "${key.slice(0, 40)}" → ${result.intent.value}`);
    cache.set(key, result);
    return c.json(result);
  } catch (err) {
    if (err instanceof APIUserAbortError || signal.aborted) return c.body(null, 499 as never);
    const status = typeof err === "object" && err && "status" in err ? (err as { status: number }).status : undefined;
    console.warn(`[jev] call failed${status ? ` (${status})` : ""}: ${err instanceof Error ? err.message : String(err)}`);
    // The client falls back to the offline classifier for this keystroke; the UI never flashes.
    return c.json(noneResult({ error: true, model: "error" }));
  }
});
