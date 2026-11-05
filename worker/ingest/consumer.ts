import postgres from "postgres";
import type { Env, IngestMessage } from "../env";
import { chunkMarkdown, rowsToChunks, type SourceKind } from "./chunk";
import { applyObservation, type ObservationRow } from "./observations";
import { type KnownEstate, structureChunk } from "./structure";

/**
 *   source ──extract──▶ markdown / rows ──chunk──▶ chunks ──structure──▶ observations ──apply──▶ estates
 *
 * Re-ingesting a source replaces its chunks and pending observations; applied ones stay as history.
 */

type SourceRow = { id: string; kind: SourceKind; name: string; r2_key: string | null; mime_type: string | null; sql_query: string | null };

const MAX_SQL_ROWS = 5000;
const MAX_CHUNKS = 200;

export async function handleIngestBatch(batch: MessageBatch<IngestMessage>, env: Env) {
  for (const msg of batch.messages) {
    try {
      await ingestSource(env, msg.body.sourceId);
      msg.ack();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ingest] ${msg.body.sourceId} attempt ${msg.attempts}: ${message}`);
      await setStatus(env.DB, msg.body.sourceId, "failed", message.slice(0, 500));
      msg.retry({ delaySeconds: 30 * msg.attempts });
    }
  }
}

export async function ingestSource(env: Env, sourceId: string) {
  const source = await env.DB.prepare("SELECT id, kind, name, r2_key, mime_type, sql_query FROM sources WHERE id = ?")
    .bind(sourceId)
    .first<SourceRow>();
  if (!source) return; // deleted while queued
  await setStatus(env.DB, sourceId, "extracting");

  const texts = (source.kind === "sql" ? await extractSql(env, source) : await extractFile(env, source)).slice(0, MAX_CHUNKS);

  const chunks = texts.map((text, seq) => ({ id: `${sourceId}:${seq}`, seq, text }));
  await env.DB.batch([
    env.DB.prepare("DELETE FROM observations WHERE source_id = ? AND status = 'pending'").bind(sourceId),
    env.DB.prepare("DELETE FROM chunks WHERE source_id = ?").bind(sourceId),
    ...chunks.map((c) =>
      env.DB.prepare("INSERT INTO chunks (id, source_id, seq, text) VALUES (?, ?, ?, ?)").bind(c.id, sourceId, c.seq, c.text),
    ),
  ]);

  const known = (await env.DB.prepare("SELECT id, name, area FROM estates").all<KnownEstate>()).results;
  const threshold = Number(env.AUTO_APPLY_CONFIDENCE) || 1.1;

  for (const chunk of chunks) {
    const found = await structureChunk(env, chunk.text, known);
    if (found.length === 0) continue;
    const now = Date.now();
    const inserted = await env.DB.batch<ObservationRow>(
      found.map((o) =>
        env.DB.prepare(
          `INSERT INTO observations (source_id, chunk_id, estate_id, estate_name, field, key, value, confidence, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        ).bind(sourceId, chunk.id, o.estate_id, o.estate_name, o.field, o.key, JSON.stringify(o.value), o.confidence, now),
      ),
    );
    for (const row of inserted.flatMap((r) => r.results)) {
      if (row.estate_id && row.confidence >= threshold) await applyObservation(env.DB, row);
    }
  }

  await setStatus(env.DB, sourceId, "done");
}

/** PDFs, spreadsheets, images and documents all go through Workers AI toMarkdown(). */
async function extractFile(env: Env, source: SourceRow): Promise<string[]> {
  if (!source.r2_key) throw new Error("File source has no r2_key");
  const obj = await env.FILES.get(source.r2_key);
  if (!obj) throw new Error(`Missing upload ${source.r2_key}`);
  const blob = new Blob([await obj.arrayBuffer()], { type: source.mime_type ?? obj.httpMetadata?.contentType ?? "" });
  const out = await env.AI.toMarkdown({ name: source.name, blob });
  if (out.format === "error") throw new Error(`toMarkdown: ${out.error}`);
  return chunkMarkdown(out.data);
}

/** External SQL through Hyperdrive, inside a read-only transaction so a source can never write. */
async function extractSql(env: Env, source: SourceRow): Promise<string[]> {
  if (!env.EXTERNAL_DB) throw new Error("No EXTERNAL_DB Hyperdrive binding configured");
  if (!source.sql_query) throw new Error("SQL source has no query");
  const sql = postgres(env.EXTERNAL_DB.connectionString, { max: 1, fetch_types: false, prepare: false });
  try {
    const rows = await sql.begin("read only", (tx) => tx.unsafe(source.sql_query!));
    return rowsToChunks((rows as unknown as Record<string, unknown>[]).slice(0, MAX_SQL_ROWS));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function setStatus(db: D1Database, id: string, status: "extracting" | "done" | "failed", error: string | null = null) {
  await db.prepare("UPDATE sources SET status = ?, error = ?, updated_at = ? WHERE id = ?").bind(status, error, Date.now(), id).run();
}

/** Cron: re-run every SQL source so external tables stay in sync. */
export async function requeueSqlSources(env: Env) {
  const { results } = await env.DB.prepare("SELECT id FROM sources WHERE kind = 'sql'").all<{ id: string }>();
  if (results.length === 0) return;
  await env.DB.prepare("UPDATE sources SET status = 'queued', updated_at = ? WHERE kind = 'sql'").bind(Date.now()).run();
  await env.INGEST.sendBatch(results.map((r) => ({ body: { sourceId: r.id } })));
}
