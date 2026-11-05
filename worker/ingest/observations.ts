import { z } from "zod";
import type { Field } from "./structure";

/**
 * Applying an observation is the only way ingested data reaches the estates table.
 * Each field has a validator, so a bad extraction is rejected here instead of breaking the UI.
 */

const VALUE: Record<Field, z.ZodType> = {
  price: z.coerce.number().positive().max(100_000),
  spec: z.string().min(1).max(40),
  area: z.string().min(1).max(40),
  fact: z.union([z.string(), z.number()]).transform(String).pipe(z.string().min(1).max(120)),
};

export type ObservationRow = {
  id: number;
  source_id: string;
  estate_id: string | null;
  estate_name: string;
  field: Field;
  key: string | null;
  value: string;
  confidence: number;
  status: "pending" | "applied" | "rejected";
};

export type ApplyResult = { ok: true } | { ok: false; reason: string };

export async function applyObservation(db: D1Database, o: ObservationRow): Promise<ApplyResult> {
  if (!o.estate_id) return { ok: false, reason: "No estate matched; set estate_id first" };
  const parsed = VALUE[o.field].safeParse(JSON.parse(o.value));
  if (!parsed.success) return { ok: false, reason: `Invalid ${o.field} value` };
  const value = parsed.data as string | number;
  const now = Date.now();

  let update: D1PreparedStatement;
  if (o.field === "fact") {
    if (!o.key) return { ok: false, reason: "A fact needs a key" };
    const row = await db.prepare("SELECT facts FROM estates WHERE id = ?").bind(o.estate_id).first<{ facts: string }>();
    if (!row) return { ok: false, reason: "Estate no longer exists" };
    const facts = (JSON.parse(row.facts) as { k: string; v: string }[]).filter((f) => f.k !== o.key);
    facts.push({ k: o.key, v: String(value) });
    update = db.prepare("UPDATE estates SET facts = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(facts), now, o.estate_id);
  } else {
    // Column names come from the closed Field enum, never from input.
    update = db.prepare(`UPDATE estates SET ${o.field} = ?, updated_at = ? WHERE id = ?`).bind(value, now, o.estate_id);
  }

  await db.batch([update, db.prepare("UPDATE observations SET status = 'applied' WHERE id = ?").bind(o.id)]);
  return { ok: true };
}
