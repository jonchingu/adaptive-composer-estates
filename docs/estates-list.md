# Estates composer: the ranked list

Spec for the list under the composer on `/estates`. It's taken from the Claude Design file `Smart Composer.dc.html` and implemented in [`src/components/estates/ResultList.tsx`](../src/components/estates/ResultList.tsx).

## What it shows

Six estates, ranked against whatever the composer is asking right now. The header says how they're sorted and how many match:

| Mode | Header | A row "matches" when | Sort order |
| --- | --- | --- | --- |
| 通勤時間 commute | `按{步行/港鐵/巴士}時間排序 · 到{港鐵站/中環站/中環}` | trip time ≤ the 最長通勤時間 slider | matches by trip time, fastest first; then the rest by trip time |
| 樓價計算 budget | `按可負擔程度排序 · 首期 {10/20/30}%` | monthly payment (30 yrs, 3.75%) ≤ the 每月供款上限 slider | matches by price, dearest first; then the rest, cheapest first |
| 語意排序 semantic | `按語意配對度排序` | score ≥ 50%, or no criteria set | by score, highest first |

The semantic score is the weighted average of each estate's affinity (0–1) for 安靜, 近名校, 海景 and 兩房. The weights are the criteria levels (0–3). Ties keep fixture order, so rows never shuffle when nothing changed. On the right of the header, `{matches} / 6 個樓盤`.

Ranking runs on the backend ([`rank.ts`](../src/lib/estates/rank.ts)), so the list only displays what `GET /api/estates` returns.

## Row anatomy

Each row is 64px tall and sits on a 66px grid (`ROW`).

```
┌──────┐
│①  ★ │  太古城 · 金星閣                 步4 ─ 鐵5 ─ 步3     港鐵 12 分
│ plan │  鰂魚涌 · 2房 · 528呎                                ▬▬▬▬▬▬───
└──────┘
 tile     name / subtitle                 commute legs        meta / bar
```

- **Plan tile** (62×48): the estate's floor plan, fetched as an SVG template (see below). The highlights follow the mode: the door in commute mode, every room in budget mode, and in semantic mode the bedrooms (when 兩房 is set) plus the sea-facing wall (when 海景 is set).
- **Rank badge**, top left: the position (1–6) for matches and `–` for the rest. Rank 1 is black when it matches.
- **Saved star**, top right: springs in when the estate is saved.
- **Name**: semibold when focused, medium otherwise. **Subtitle**: area and spec in commute mode; area, spec and price in budget mode; area and the two strongest criteria in semantic mode.
- **Commute legs** (commute mode only, hidden on narrow screens): walk / ride / walk segments. Each segment's width is its share of the trip, and the line style shows the kind: dotted for walking, accent for MTR, black for bus.
- **Meta + bar**: `港鐵 12 分`, `$31,234/月` or `82% 配對`. The bar shows trip speed in commute mode, payment as a share of budget in budget mode, and the score in semantic mode.
- Rows that don't match drop to 36% opacity but stay in the list, below the matches.

## States

| State | Trigger | Look |
| --- | --- | --- |
| Focus | hover, <kbd>↑</kbd>/<kbd>↓</kbd> | A tinted highlight springs to the row. The tile lifts (white, shadow, 106%) and the text nudges 3px right. The estate's detail and map are prefetched. |
| Menu | <kbd>Enter</kbd> on the focused row | A black pill under the row, or above it for the last two rows: 查看樓盤 <kbd>↵</kbd> and 加入收藏清單 / 移出收藏 <kbd>Ctrl ↵</kbd>. |
| Saved | menu, or <kbd>Ctrl</kbd>+<kbd>Enter</kbd> | Updates straight away with the star and a toast. If the server refuses, the star springs back out and the toast says 未能儲存，已還原. |
| Pending | a ranking request in flight | A thin accent bar sweeps the top edge, after a 120ms delay so fast answers don't flash it. The old rows stay until the new order arrives. |
| Error | the ranking request failed | The header turns red: `載入失敗 · {message}`. The last good rows stay. |
| Sheet open | <kbd>Space</kbd>, or 查看樓盤 | The focused row drives the detail sheet below. <kbd>↑</kbd>/<kbd>↓</kbd> keeps working. |

## Motion

- **Re-ranking**: rows keep their DOM order (keyed by estate id) and spring to `rank × 66px` (stiffness 260, damping 32), staggered 28ms per rank. So a new order reads as cards sliding past each other rather than a re-render, and hover, focus and the star keep their state.
- **Highlight**: springs on `y` (stiffness 380, damping 26).
- **Tile, text and star**: snappy springs (stiffness 520 or more).
- **Bar width and opacity**: spring and 360ms ease respectively.
- **Plan highlights**: CSS transitions (400ms) inside the SVG template. Changing mode only flips the `data-hl` attribute, so the drawing isn't re-mounted.
- With reduced motion turned on in the OS, `MotionConfig reducedMotion="user"` drops the movement and keeps the fades.

## Vector graphics as templates

Floor plans and maps are premade SVG files in [`template/`](../template), one per estate:

```
template/plans/{id}.svg   40×30 grid: rooms, outline, sea-facing window, door, room labels
template/maps/{id}.svg    260×150 sketch: sea, roads, estate pin, route to the destination
```

A template has no state in it. It draws every layer and switches them with CSS on attributes of its wrapper:

| Attribute | Values | Effect |
| --- | --- | --- |
| `data-hl` | any of `door bed win all` | highlights the door, bedrooms, sea-facing wall or every room |
| `data-size` | `big` | shows room labels (detail sheet) |
| `data-route` | `walk`, `mtr`, `bus`, `none` | shows the route in that line style, or hides it |

The Worker serves them from `GET /api/estates/:id/plan.svg` and `/map.svg`, with simulated latency and an hour's cache. An estate with no premade file (for example one added by ingestion) gets one rendered from its stored geometry, marked `x-template: rendered`. The client fetches each template once ([`useSvgTemplate`](../src/hooks/estates/useSvgTemplate.ts)), inlines it under `<Suspense>` and shows a pulsing box until it arrives.

The files are generated from the fixtures by [`src/lib/estates/svg.ts`](../src/lib/estates/svg.ts). After changing either, run:

```bash
bun run templates
```

A test fails if `template/` falls out of sync with the renderer.

## Data

The list needs only `GET /api/estates` (the ranked rows plus a summary per estate) and the plan templates. It reports focus, view and save back to `EstatesComposer`, which owns all state. See the composer's header comment for the full component map.
