import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../env";
import { HttpError } from "../http";
import { kindOf } from "../ingest/chunk";
import { applyObservation, type ObservationRow } from "../ingest/observations";

const MAX_UPLOAD = 25 * 1024 * 1024;

const sqlBody = z.object({
  name: z.string().min(1).max(120),
  // A single read-only statement. It also runs inside a READ ONLY transaction, so this is a guard, not the only one.
  query: z
    .string()
    .min(1)
    .max(5000)
    .refine((q) => /^\s*(select|with)\b/i.test(q) && !/;\s*\S/.test(q), "Only a single SELECT or WITH statement"),
});

const assignBody = z.object({ estate_id: z.string().min(1).max(16) });

/**
 * Ingestion and review. Uploads return 202 right away; extraction runs in the queue consumer.
 *
 *   POST /api/ingest                  multipart "file" (pdf, csv/xlsx, png/jpg, txt/md/html…)
 *   POST /api/ingest/sql              { name, query }  needs the EXTERNAL_DB Hyperdrive binding
 *   POST /api/ingest/:id/rerun        extract a source again
 *   GET  /api/ingest/sources          recent sources with status
 *   GET  /api/ingest/sources/:id      one source, its chunk count and observations
 *   GET  /api/ingest/observations     ?status=pending (default) · applied · rejected
 *   POST /api/ingest/observations/:id/apply | /reject | /assign { estate_id }
 */
export const ingest = new Hono<AppEnv>()
  .post("/", async (c) => {
    const form = await c.req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, 'Expected a multipart "file" field');
    if (file.size > MAX_UPLOAD) throw new HttpError(413, "File is larger than 25 MB");
    const kind = kindOf(file.name);
    if (!kind) throw new HttpError(415, `Unsupported file type: ${file.name}`);

    const id = crypto.randomUUID();
    const key = `sources/${id}/${file.name}`;
    const now = Date.now();
    await c.env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
    await c.env.DB.prepare(
      "INSERT INTO sources (id, kind, name, r2_key, mime_type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'queued', ?, ?)",
    )
      .bind(id, kind, file.name, key, file.type || null, now, now)
      .run();
    await c.env.INGEST.send({ sourceId: id });
    return c.json({ id, kind, name: file.name, status: "queued" }, 202);
  })

  .post("/sql", async (c) => {
    if (!c.env.EXTERNAL_DB) throw new HttpError(409, "No EXTERNAL_DB Hyperdrive binding configured");
    const body = sqlBody.parse(await c.req.json());
    const id = crypto.randomUUID();
    const now = Date.now();
    await c.env.DB.prepare(
      "INSERT INTO sources (id, kind, name, sql_query, status, created_at, updated_at) VALUES (?, 'sql', ?, ?, 'queued', ?, ?)",
    )
      .bind(id, body.name, body.query, now, now)
      .run();
    await c.env.INGEST.send({ sourceId: id });
    return c.json({ id, kind: "sql", name: body.name, status: "queued" }, 202);
  })

  .post("/:id/rerun", async (c) => {
    const id = c.req.param("id");
    const res = await c.env.DB.prepare("UPDATE sources SET status = 'queued', error = NULL, updated_at = ? WHERE id = ?")
      .bind(Date.now(), id)
      .run();
    if (!res.meta.changes) throw new HttpError(404, "Not found");
    await c.env.INGEST.send({ sourceId: id });
    return c.json({ id, status: "queued" }, 202);
  })

  .get("/sources", async (c) => {
    const { results } = await c.env.DB.prepare(
      "SELECT id, kind, name, status, error, created_at, updated_at FROM sources ORDER BY created_at DESC LIMIT 100",
    ).all();
    return c.json({ sources: results });
  })

  .get("/sources/:id", async (c) => {
    const id = c.req.param("id");
    const [source, chunks, observations] = await c.env.DB.batch([
      c.env.DB.prepare("SELECT id, kind, name, status, error, sql_query, created_at, updated_at FROM sources WHERE id = ?").bind(id),
      c.env.DB.prepare("SELECT COUNT(*) AS n FROM chunks WHERE source_id = ?").bind(id),
      c.env.DB.prepare("SELECT * FROM observations WHERE source_id = ? ORDER BY id").bind(id),
    ]);
    if (!source.results[0]) throw new HttpError(404, "Not found");
    return c.json({ source: source.results[0], chunks: (chunks.results[0] as { n: number }).n, observations: observations.results });
  })

  .get("/observations", async (c) => {
    const status = z.enum(["pending", "applied", "rejected"]).catch("pending").parse(c.req.query("status"));
    const { results } = await c.env.DB.prepare("SELECT * FROM observations WHERE status = ? ORDER BY created_at DESC LIMIT 200")
      .bind(status)
      .all();
    return c.json({ observations: results });
  })

  .post("/observations/:id/apply", async (c) => {
    const row = await observation(c.env.DB, c.req.param("id"));
    if (row.status !== "pending") throw new HttpError(409, `Observation is ${row.status}`);
    const res = await applyObservation(c.env.DB, row);
    if (!res.ok) throw new HttpError(409, res.reason);
    return c.json({ id: row.id, status: "applied" });
  })

  .post("/observations/:id/reject", async (c) => {
    const row = await observation(c.env.DB, c.req.param("id"));
    await c.env.DB.prepare("UPDATE observations SET status = 'rejected' WHERE id = ?").bind(row.id).run();
    return c.json({ id: row.id, status: "rejected" });
  })

  .post("/observations/:id/assign", async (c) => {
    const row = await observation(c.env.DB, c.req.param("id"));
    const { estate_id } = assignBody.parse(await c.req.json());
    if (!(await c.env.DB.prepare("SELECT 1 FROM estates WHERE id = ?").bind(estate_id).first()))
      throw new HttpError(404, `Unknown estate ${estate_id}`);
    await c.env.DB.prepare("UPDATE observations SET estate_id = ? WHERE id = ?").bind(estate_id, row.id).run();
    return c.json({ id: row.id, estate_id });
  });

async function observation(db: D1Database, id: string) {
  const row = await db.prepare("SELECT * FROM observations WHERE id = ?").bind(Number(id)).first<ObservationRow>();
  if (!row) throw new HttpError(404, "Not found");
  return row;
}
