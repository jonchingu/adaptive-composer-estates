import type { EstateDetail, FloorPlan, MapSketch, RoomType } from "./types";

/**
 * Mock "database". Only the mock backend (src/lib/estates/server.ts) imports this;
 * the client gets estates through the API, never by importing fixtures.
 */

type Row = [x: number, y: number, w: number, h: number, type: RoomType];
const plan = (outline: string, rooms: Row[], window: FloorPlan["window"], door: FloorPlan["door"]): FloorPlan => ({
  outline,
  rooms: rooms.map(([x, y, w, h, type]) => ({ x, y, w, h, type })),
  window,
  door,
});

const MAPS: Record<string, MapSketch> = {
  tk: { x: 150, y: 70, coast: "M0 40 Q120 30 260 48 L260 0 L0 0Z" },
  sp: { x: 110, y: 110, coast: "M0 150 L0 130 Q130 100 260 135 L260 150Z" },
  gh: { x: 170, y: 60, coast: "M190 0 Q200 80 260 110 L260 0Z" },
  mf: { x: 90, y: 80, coast: "" },
  kw: { x: 70, y: 100, coast: "" },
  lh: { x: 160, y: 95, coast: "M0 150 Q100 125 260 140 L260 150Z" },
};

const base = [
  {
    id: "tk",
    name: "太古城 · 金星閣",
    area: "鰂魚涌",
    spec: "2房 · 528呎",
    price: 868,
    travel: { walk: 4, mtr: 12, bus: 28 },
    affinity: { quiet: 0.55, school: 0.85, sea: 0.45, two: 1 },
    plan: plan(
      "M2 2H38V20H28V28H2Z",
      [
        [2, 2, 13, 12, "bed"],
        [15, 2, 11, 12, "bed"],
        [26, 2, 12, 8, "bath"],
        [26, 10, 12, 10, "kit"],
        [2, 14, 26, 14, "liv"],
      ],
      [2, 2, 26, 2],
      [28, 24],
    ),
    built: 1982,
    blocks: 61,
  },
  {
    id: "sp",
    name: "海怡半島",
    area: "鴨脷洲",
    spec: "2房 · 610呎",
    price: 920,
    travel: { walk: 7, mtr: 14, bus: 30 },
    affinity: { quiet: 0.7, school: 0.5, sea: 0.95, two: 1 },
    plan: plan(
      "M2 6H10V2H38V28H2Z",
      [
        [2, 6, 8, 22, "kit"],
        [10, 2, 14, 12, "bed"],
        [24, 2, 14, 12, "bed"],
        [10, 14, 10, 14, "bath"],
        [20, 14, 18, 14, "liv"],
      ],
      [10, 2, 38, 2],
      [2, 20],
    ),
    built: 1993,
    blocks: 18,
  },
  {
    id: "gh",
    name: "嘉亨灣",
    area: "西灣河",
    spec: "3房 · 812呎",
    price: 1380,
    travel: { walk: 6, mtr: 15, bus: 32 },
    affinity: { quiet: 0.5, school: 0.6, sea: 0.9, two: 0.4 },
    plan: plan(
      "M2 2H38V28H2Z",
      [
        [2, 2, 12, 11, "bed"],
        [14, 2, 12, 11, "bed"],
        [26, 2, 12, 11, "bed"],
        [2, 13, 9, 15, "bath"],
        [11, 13, 27, 15, "liv"],
      ],
      [38, 2, 38, 28],
      [16, 28],
    ),
    built: 2003,
    blocks: 6,
  },
  {
    id: "mf",
    name: "美孚新邨",
    area: "荔枝角",
    spec: "2房 · 560呎",
    price: 650,
    travel: { walk: 3, mtr: 24, bus: 35 },
    affinity: { quiet: 0.35, school: 0.75, sea: 0.1, two: 1 },
    plan: plan(
      "M2 2H30V8H38V28H2Z",
      [
        [2, 2, 14, 13, "bed"],
        [16, 2, 14, 13, "bed"],
        [30, 8, 8, 10, "bath"],
        [2, 15, 28, 13, "liv"],
        [30, 18, 8, 10, "kit"],
      ],
      [2, 2, 30, 2],
      [38, 22],
    ),
    built: 1968,
    blocks: 99,
  },
  {
    id: "kw",
    name: "嘉湖山莊",
    area: "天水圍",
    spec: "3房 · 620呎",
    price: 480,
    travel: { walk: 14, mtr: 48, bus: 65 },
    affinity: { quiet: 0.85, school: 0.5, sea: 0, two: 0.4 },
    plan: plan(
      "M2 2H38V28H14V22H2Z",
      [
        [2, 2, 12, 10, "bed"],
        [14, 2, 12, 10, "bed"],
        [26, 2, 12, 10, "bed"],
        [2, 12, 12, 10, "bath"],
        [14, 12, 24, 16, "liv"],
      ],
      [2, 2, 38, 2],
      [26, 28],
    ),
    built: 1991,
    blocks: 58,
  },
  {
    id: "lh",
    name: "日出康城",
    area: "將軍澳",
    spec: "2房 · 480呎",
    price: 720,
    travel: { walk: 9, mtr: 26, bus: 40 },
    affinity: { quiet: 0.75, school: 0.65, sea: 0.6, two: 1 },
    plan: plan(
      "M2 2H38V24H30V28H2Z",
      [
        [2, 2, 15, 13, "bed"],
        [17, 2, 13, 13, "bed"],
        [30, 2, 8, 10, "bath"],
        [30, 12, 8, 12, "kit"],
        [2, 15, 28, 13, "liv"],
      ],
      [2, 28, 30, 28],
      [34, 24],
    ),
    built: 2008,
    blocks: 50,
  },
];

export const ESTATES: EstateDetail[] = base.map(({ built, blocks, ...e }, i) => ({
  ...e,
  map: MAPS[e.id],
  photos: [
    { id: `${e.id}-1`, label: "外觀相片", hue: (i * 47) % 360 },
    { id: `${e.id}-2`, label: "客廳", hue: (i * 47 + 30) % 360 },
    { id: `${e.id}-3`, label: "景觀", hue: (i * 47 + 200) % 360 },
  ],
  facts: [
    { k: "落成年份", v: String(built) },
    { k: "座數", v: `${blocks} 座` },
  ],
}));
