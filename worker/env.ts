/** Bindings and vars declared in wrangler.jsonc. */
export type Env = {
  DB: D1Database;
  FILES: R2Bucket;
  INGEST: Queue<IngestMessage>;
  AI: Ai;
  /** Optional: an external Postgres/MySQL reached through Hyperdrive. */
  EXTERNAL_DB?: Hyperdrive;

  JEV_MODEL: string;
  USE_MOCK: string;
  ESTATES_SOURCE: "d1" | "fixtures";
  SIMULATE_LATENCY: string;
  AUTO_APPLY_CONFIDENCE: string;
  EXTRACT_MODEL: string;
  /** Secret: `wrangler secret put TYPESAFE_API_KEY`, or .dev.vars locally. */
  TYPESAFE_API_KEY?: string;
};

export type IngestMessage = { sourceId: string };

export type AppEnv = { Bindings: Env };
