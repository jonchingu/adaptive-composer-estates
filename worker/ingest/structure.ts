import { z } from "zod";
import type { Env } from "../env";

/**
 * Turns one chunk of text into typed observations about estates, with Workers AI in JSON mode.
 * This is extraction, not classification, so it is an LLM's job rather than Jev's (Jev answers
 * questions about text; it is not asked to pull values out of it).
 */

export const FIELDS = ["price", "spec", "area", "fact"] as const;
export type Field = (typeof FIELDS)[number];

export const observationSchema = z.object({
  estate_id: z.string().nullable(),
  estate_name: z.string().min(1).max(120),
  field: z.enum(FIELDS),
  key: z.string().max(60).nullable(),
  value: z.union([z.string().max(300), z.number()]),
  confidence: z.number().min(0).max(1),
});
export type Observation = z.infer<typeof observationSchema>;

const responseSchema = z.object({ observations: z.array(z.unknown()).max(200) });

/** JSON schema handed to the model. Kept by hand next to the zod schema; zod validates whatever comes back. */
const JSON_SCHEMA = {
  type: "object",
  properties: {
    observations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          estate_id: { type: ["string", "null"] },
          estate_name: { type: "string" },
          field: { type: "string", enum: FIELDS },
          key: { type: ["string", "null"] },
          value: { type: ["string", "number"] },
          confidence: { type: "number" },
        },
        required: ["estate_id", "estate_name", "field", "key", "value", "confidence"],
      },
    },
  },
  required: ["observations"],
} as const;

export type KnownEstate = { id: string; name: string; area: string };

function prompt(known: KnownEstate[]) {
  return `You extract facts about Hong Kong residential estates from documents (brochures, price lists, listing screenshots, database rows).

Known estates (match to these ids when the text clearly refers to one; otherwise estate_id is null):
${known.map((e) => `- ${e.id}: ${e.name} (${e.area})`).join("\n")}

Return every fact the text states about a specific estate, one observation each:
- field "price": asking or transaction price, as a number in 萬 (HK$10,000). Convert HK$ amounts (HK$8,680,000 → 868).
- field "spec": rooms and saleable area, formatted like "2房 · 528呎".
- field "area": the district, e.g. "鰂魚涌".
- field "fact": anything else worth showing (completion year, developer, management fee, school net, floor, facing). Put the label in "key" and the value in "value".
estate_name is the name as written in the text. confidence is 0–1: how sure you are the text states this value for this estate.
Only report what the text says. Never guess. If there is nothing, return {"observations": []}.`;
}

export async function structureChunk(env: Env, text: string, known: KnownEstate[]): Promise<Observation[]> {
  const res = (await env.AI.run(env.EXTRACT_MODEL as "@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    messages: [
      { role: "system", content: prompt(known) },
      { role: "user", content: text },
    ],
    response_format: { type: "json_schema", json_schema: JSON_SCHEMA },
    max_tokens: 2048,
    temperature: 0,
  })) as { response?: unknown };

  const raw = typeof res.response === "string" ? safeJson(res.response) : res.response;
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) return [];

  const ids = new Set(known.map((e) => e.id));
  return parsed.data.observations.flatMap((o) => {
    const ok = observationSchema.safeParse(o);
    if (!ok.success) return [];
    // A model can invent ids; anything that isn't a known estate goes to review unmatched.
    return [{ ...ok.data, estate_id: ok.data.estate_id && ids.has(ok.data.estate_id) ? ok.data.estate_id : null }];
  });
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
