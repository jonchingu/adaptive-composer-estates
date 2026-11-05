# Shapeshift

**An input that becomes what you mean.** One text box that morphs into the right UI as you type — an event card, a checklist, a timer, a color picker, a bill splitter, a poll, a converter and more.

<p align="center">
  <img src="docs/demo.gif" alt="Typing 'dinner with priya friday 8pm on zoom' morphs the text box into an event card, then a shopping checklist" width="820">
  <br>
  <sub><a href="https://shapeshiftui.vercel.app"><b>Try it live</b></a> · <a href="docs/demo.mp4">Watch the full 60-second demo (1080p60)</a></sub>
</p>

```
dinner with priya friday 8pm on zoom   →  Event card · Friday · 8 PM · Priya · Video call
buy milk, eggs, bread and coffee       →  Shopping checklist
split 2400 between 3                   →  ₹800 each
minecraft diamond                      →  #4AEDD9
```

Intent is classified by [TypeSafe AI](https://typesafe.ai)'s **Jev** model: one call answers 14 typed questions in parallel (which card, plus signals like "is it a video call?", "is it urgent?"). Everything else — dates, amounts, units, math — is deterministic code. **Jev decides, code computes.**

<p align="center"><img src="docs/diagrams/jev-fanout.svg" alt="One Jev call answers 14 questions in parallel; a deterministic parser reads the same text for values" width="820"></p>

It works **fully offline by default** with a built-in keyword classifier, so you can run it without an account.

## Quick start

Requires [Bun](https://bun.sh) 1.2+.

```bash
bun install
bun run db:migrate   # create the local D1 database and load the six sample estates
bun dev
```

Open http://localhost:3000 and start typing. Press <kbd>/</kbd> to see every card type. `bun dev` runs the Vite SPA and the Worker (`worker/`) together, with local D1, R2 and Queues. It needs no Cloudflare account.

### Use the online Jev model (optional)

```bash
cp .dev.vars.example .dev.vars
# then set TYPESAFE_API_KEY=... (get one at https://console.typesafe.ai/keys)
```

Restart `bun dev`. The latency readout in the bottom-right corner switches from `jev-offline` to `jev-1.13.0`. The key is only ever read by the Worker (`/api/intent`); it never reaches the browser. If the API is unreachable or rate-limited, Shapeshift quietly falls back to offline mode.

| Variable | Default | What it does |
| --- | --- | --- |
| `TYPESAFE_API_KEY` | _(empty)_ | Secret (`.dev.vars`, or `wrangler secret put`). Enables the online model. Empty or placeholder values keep you offline. |
| `JEV_MODEL` | `jev-1.13.0` | Pinned model version. |
| `USE_MOCK` | `false` | `true` forces the Worker offline even with a key. |
| `VITE_USE_MOCK` | `false` | In `.env.local`: classify in the browser and skip `/api/intent` entirely. |
| `ESTATES_SOURCE` | `d1` | `fixtures` serves estates from the in-memory mock instead of D1. |
| `SIMULATE_LATENCY` | `true` | Honour the estates HUD's latency/failure headers. Turn off in production. |
| `AUTO_APPLY_CONFIDENCE` | `0.85` | Ingested observations this confident are applied without review. |
| `EXTRACT_MODEL` | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Workers AI model that turns document text into observations. |

Everything except the key lives in `vars` in `wrangler.jsonc`.

## Card types

| Card | Try |
| --- | --- |
| Event | `lunch with rahul and anna tomorrow` |
| Reminder | `remind me to pay rent tomorrow urgent` |
| Checklist | `buy milk, eggs, bread and coffee` |
| Timer | `25 min focus` |
| Habit | `gym 3x a week` |
| Color | `#ff6b35`, `tiffany blue`, `minecraft diamond` |
| Split | `split 2400 between 3` |
| Expense | `spent 450 on uber` |
| Convert | `5 miles in km`, `72f to c` |
| Calculate | `18% of 3450` |
| Trip | `flight to goa next weekend` |
| Poll | `pizza or burgers for friday?` |
| Contact | `rahul 98200 12345 rahul@mail.com` |
| Bookmark | `https://vercel.com/blog check later` |
| Countdown | `days until christmas` |
| Time zone | `3pm pst in ist`, `what time is it in tokyo` |
| Random | `roll 2d6`, `flip a coin`, `pick one: tacos, sushi or pizza` |
| Goal | `read 12 books this year, 4 done` |
| Note | anything else |

Saved cards live in your browser (`localStorage`) until you delete them. Click one to edit it.

### Keyboard

| Key | Action |
| --- | --- |
| <kbd>Enter</kbd> | Save the card |
| <kbd>Esc</kbd> | Clear (or cancel an edit) |
| <kbd>Tab</kbd> | Keep a faint preview |
| <kbd>←</kbd> <kbd>→</kbd> | Choose between "Did you mean" chips |
| <kbd>/</kbd> | Open every card type |

URL flags: `?debug=1` shows every probability; `?demo=1&loop=1` plays a scripted demo.

## How it works

<p align="center"><img src="docs/diagrams/architecture.svg" alt="Keystroke, debounced hook, server route, Jev or offline classifier, decide, gate signals, parse, card" width="820"></p>

Raw model output flickers as you type, so a small state machine turns confidence into calm UI states. A card only changes when a challenger wins twice in a row (or is very sure), and signal badges use an on/off hysteresis band.

<p align="center"><img src="docs/diagrams/states.svg" alt="States: input, ghost preview, choose between two chips, committed card, with the thresholds between them" width="820"></p>

The diagrams are Excalidraw files — open any `docs/diagrams/*.excalidraw` at [excalidraw.com](https://excalidraw.com) to edit them.

| Path | What lives there |
| --- | --- |
| `src/components/intents/registry.ts` | **The extension point.** One entry per card type. |
| `src/lib/jev/questions.ts` | The Jev question schema |
| `src/lib/jev/mock.ts` | Offline keyword classifier (same output shape) |
| `src/lib/parse/` | One deterministic parser per card type |
| `src/lib/decide.ts`, `src/lib/signals.ts` | The calm-UI state machine |
| `src/components/shapeshift/` | Shell, chips, palette, saved list, HUD |
| `worker/` | The backend: a Hono app on Cloudflare Workers (see [Backend](#backend)) |

### Adding a card type

1. Add the key to `INTENT_KEYS` in `src/lib/jev/types.ts`.
2. Add a non-overlapping criterion to `intent` in `src/lib/jev/questions.ts`.
3. Write a parser in `src/lib/parse/` and register it in `src/lib/parse/index.ts`.
4. Write a card component in `src/components/intents/` and add a registry entry.
5. Teach the offline classifier in `src/lib/jev/mock.ts`, and add tests.

TypeScript will point at anything you missed.

## Estates composer scaffold (`/estates`)

A second sample page, built from the "One Say 壹居 Smart Composer" design: one composer with three modes (commute, budget, semantic), a ranked list that re-orders live and a detail sheet. Use it to try out animations, how components fit together and data fetching against a **mock backend with simulated latency**.

```
src/pages/EstatesPage.tsx           shows a skeleton, fetches the first ranking, hands over to the composer
worker/routes/estates.ts            GET search · GET :id detail · GET/POST saved
worker/estates/repo.ts              D1 storage (default) or the in-memory fixtures (ESTATES_SOURCE=fixtures)
src/lib/estates/server.ts           the fixtures backend and the simulated latency both repos share
src/lib/estates/rank.ts             pure ranking + finance maths (unit-tested)
src/lib/estates/client.ts           browser fetch layer + request log for the HUD
src/hooks/estates/                  useSearch (throttle, abort, out-of-order guard) · useEstateDetail (use() + Suspense)
                                    useSaved (useOptimistic, rolls back on failure) · useAutoplay (scripted demo)
src/components/estates/             EstatesComposer (state owner) → ModeTabs, ComposerCard, ResultList, DetailSheet, NetworkHud
```

The **mock api** panel (top right) shows each request as it runs and lets you switch latency between `off`, `normal` and `slow`, or make half the saves fail so you can watch the rollback. Keyboard: <kbd>↑</kbd> <kbd>↓</kbd> focus a row, <kbd>Enter</kbd> opens its menu (<kbd>Enter</kbd> again to view, <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to save), <kbd>Space</kbd> opens or closes the sheet, <kbd>Esc</kbd> stops autoplay. URL flags: `?autoplay=0`, `?hold=4`. Real data comes in through ingestion; see [Backend](#backend).

## Backend

Everything runs on Cloudflare: the SPA is served as Workers static assets, and `/api/*` goes to one Worker (`worker/index.ts`, Hono).

```
/api/intent     POST   Jev or the offline classifier (the keystroke path: fast, never fails loudly)
/api/estates    GET    ranked search · /:id detail · /saved list and toggle      → D1
/api/ingest     POST   upload a file, or /sql to register a query                → R2 + Queue
/api/stars      GET    GitHub star count, edge-cached for an hour
```

**Ingestion.** Any source becomes text, the text becomes typed *observations*, and only observations ever change an estate:

```
PDF brochure ─┐
price list ───┤  Workers AI          chunk.ts           structure.ts            observations.ts
screenshot ───┼─ toMarkdown() ──▶ chunks (D1) ──▶ Workers AI JSON mode ──▶ observations (D1) ──▶ estates
external SQL ─┘  (or Hyperdrive rows)              {estate_id, field,        apply if confident,
                                                     value, confidence}      otherwise review
```

- `POST /api/ingest` (multipart `file`) stores the original in R2 and enqueues it. PDFs, CSV/XLSX, PNG/JPG and text/HTML are supported.
- `POST /api/ingest/sql` `{ name, query }` registers a read-only query against an external Postgres via Hyperdrive. A daily cron re-runs it. Uncomment `hyperdrive` in `wrangler.jsonc` first.
- The queue consumer (`worker/ingest/consumer.ts`) extracts, chunks and structures each source. Observations at or above `AUTO_APPLY_CONFIDENCE` that match a known estate are applied. The rest wait in `GET /api/ingest/observations`, where you can `assign`, `apply` or `reject` them.
- Every observation keeps its source and chunk, so any value on an estate can be traced back to the document it came from.

Workers AI has no local emulator. `bun dev` runs everything except extraction. Run `wrangler login` then `bun run dev:remote` to ingest locally.

**Deploy:**

```bash
wrangler queues create estates-ingest && wrangler queues create estates-ingest-dlq
wrangler r2 bucket create estates-sources
bun run deploy                 # builds, creates the D1 database on first deploy, ships
bun run db:migrate:remote
wrangler secret put TYPESAFE_API_KEY
```

## Development

```bash
bun run check    # typecheck + lint + tests
bun test         # parser, decision, signal and classifier tests
bun run build
```

Stack: Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui · Motion · chrono-node · zod · Hono on Cloudflare Workers (D1, R2, Queues, Workers AI, Hyperdrive).

## License

[MIT](LICENSE)
