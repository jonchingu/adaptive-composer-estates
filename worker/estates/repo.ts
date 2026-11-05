import * as fixtures from "@/lib/estates/server";
import { type MockOptions, MockFailureError, simulate } from "@/lib/estates/server";
import { rankEstates } from "@/lib/estates/rank";
import type { EstateDetail, EstateSummary, SavedResponse, SearchParams, SearchResponse } from "@/lib/estates/types";
import type { Env } from "../env";
import { HttpError } from "../http";

/**
 * What the estates API needs from storage. Two implementations:
 *   fixtures: the original in-memory mock (src/lib/estates/server.ts), no database needed
 *   d1:       the estates table, which ingestion keeps up to date
 */
export type EstatesRepo = {
  search(params: SearchParams, opts: MockOptions): Promise<SearchResponse>;
  detail(id: string, opts: MockOptions): Promise<(EstateDetail & { serverMs: number }) | null>;
  listSaved(clientId: string, opts: MockOptions): Promise<SavedResponse>;
  setSaved(clientId: string, id: string, saved: boolean, opts: MockOptions): Promise<SavedResponse>;
};

export function estatesRepo(env: Env): EstatesRepo {
  if (env.ESTATES_SOURCE === "fixtures") {
    return {
      search: fixtures.searchEstates,
      detail: fixtures.getEstateDetail,
      listSaved: fixtures.listSaved,
      setSaved: fixtures.setSaved,
    };
  }
  return d1Repo(env.DB);
}

type EstateRow = {
  id: string;
  name: string;
  area: string;
  spec: string;
  price: number;
  travel: string;
  affinity: string;
  plan: string;
  map: string;
  photos: string;
  facts: string;
};

const SUMMARY_COLS = "id, name, area, spec, price, travel, affinity, plan";

function toSummary(r: EstateRow): EstateSummary {
  return {
    id: r.id,
    name: r.name,
    area: r.area,
    spec: r.spec,
    price: r.price,
    travel: JSON.parse(r.travel),
    affinity: JSON.parse(r.affinity),
    plan: JSON.parse(r.plan),
  };
}

function toDetail(r: EstateRow): EstateDetail {
  return { ...toSummary(r), map: JSON.parse(r.map), photos: JSON.parse(r.photos), facts: JSON.parse(r.facts) };
}

/** serverMs = simulated latency (when on) + the real time spent in D1. */
async function timed<T>(kind: Parameters<typeof simulate>[0], opts: MockOptions, work: () => Promise<T>) {
  const simulated = await simulate(kind, opts);
  const started = performance.now();
  const value = await work();
  return { value, serverMs: simulated + Math.round(performance.now() - started) };
}

function d1Repo(db: D1Database): EstatesRepo {
  const savedIds = async (clientId: string) =>
    (
      await db.prepare("SELECT estate_id FROM saved WHERE client_id = ? ORDER BY created_at").bind(clientId).all<{ estate_id: string }>()
    ).results.map((r) => r.estate_id);

  return {
    async search(params, opts) {
      const { value: rows, serverMs } = await timed(
        "search",
        opts,
        async () => (await db.prepare(`SELECT ${SUMMARY_COLS} FROM estates`).all<EstateRow>()).results,
      );
      const summaries = rows.map(toSummary);
      return { params, ...rankEstates(summaries, params), estates: Object.fromEntries(summaries.map((e) => [e.id, e])), serverMs };
    },

    async detail(id, opts) {
      const { value: row, serverMs } = await timed("detail", opts, () =>
        db.prepare("SELECT * FROM estates WHERE id = ?").bind(id).first<EstateRow>(),
      );
      return row ? { ...toDetail(row), serverMs } : null;
    },

    async listSaved(clientId, opts) {
      const { value: saved, serverMs } = await timed("save", opts, () => savedIds(clientId));
      return { saved, serverMs };
    },

    async setSaved(clientId, id, saved, opts) {
      const { value, serverMs } = await timed("save", opts, async () => {
        if (Math.random() < opts.failRate) throw new MockFailureError();
        const exists = await db.prepare("SELECT 1 FROM estates WHERE id = ?").bind(id).first();
        if (!exists) throw new HttpError(404, `Unknown estate ${id}`);
        await (
          saved
            ? db.prepare("INSERT OR IGNORE INTO saved (client_id, estate_id, created_at) VALUES (?, ?, ?)").bind(clientId, id, Date.now())
            : db.prepare("DELETE FROM saved WHERE client_id = ? AND estate_id = ?").bind(clientId, id)
        ).run();
        return savedIds(clientId);
      });
      return { saved: value, serverMs };
    },
  };
}
