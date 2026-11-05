-- Estates: the resolved view the composer reads. JSON columns hold the nested shapes from
-- src/lib/estates/types.ts as they are, so the API maps rows 1:1 and ranking stays in TypeScript.
CREATE TABLE estates (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  area        TEXT NOT NULL,
  spec        TEXT NOT NULL,
  price       REAL NOT NULL,                 -- 萬 (HK$10,000)
  travel      TEXT NOT NULL,                 -- JSON Record<TravelMode, minutes>
  affinity    TEXT NOT NULL,                 -- JSON Weights
  plan        TEXT NOT NULL,                 -- JSON FloorPlan
  map         TEXT NOT NULL,                 -- JSON MapSketch
  photos      TEXT NOT NULL DEFAULT '[]',    -- JSON { id, label, hue }[]
  facts       TEXT NOT NULL DEFAULT '[]',    -- JSON { k, v }[]
  updated_at  INTEGER NOT NULL
);

CREATE TABLE saved (
  client_id   TEXT NOT NULL,
  estate_id   TEXT NOT NULL REFERENCES estates(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (client_id, estate_id)
);

-- Ingestion. Every input (PDF brochure, price-list spreadsheet, listing screenshot, external SQL
-- query) is a source. A source becomes text chunks; chunks become observations; observations
-- that are confident enough, or approved, are applied to estates. Nothing writes to estates directly.
CREATE TABLE sources (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('pdf', 'table', 'image', 'text', 'sql')),
  name        TEXT NOT NULL,
  r2_key      TEXT,                          -- files: where the original lives
  mime_type   TEXT,
  sql_query   TEXT,                          -- sql: the read-only query, re-run by the cron
  status      TEXT NOT NULL CHECK (status IN ('queued', 'extracting', 'done', 'failed')),
  error       TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE chunks (
  id          TEXT PRIMARY KEY,
  source_id   TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  seq         INTEGER NOT NULL,
  text        TEXT NOT NULL
);
CREATE INDEX chunks_source ON chunks(source_id, seq);

CREATE TABLE observations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id   TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  chunk_id    TEXT REFERENCES chunks(id) ON DELETE SET NULL,
  estate_id   TEXT REFERENCES estates(id) ON DELETE SET NULL,  -- null: no known estate matched
  estate_name TEXT NOT NULL,                 -- as written in the source
  field       TEXT NOT NULL CHECK (field IN ('price', 'spec', 'area', 'fact')),
  key         TEXT,                          -- fact label, e.g. "Completion year"
  value       TEXT NOT NULL,                 -- JSON
  confidence  REAL NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected')),
  created_at  INTEGER NOT NULL
);
CREATE INDEX observations_status ON observations(status, created_at);
CREATE INDEX observations_estate ON observations(estate_id);
