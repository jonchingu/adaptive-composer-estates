/** HK renter location hierarchy: region → district → estate → building. */

export type LocationNode = {
  id: string;
  label: string;
  labelEn?: string;
  kind: "region" | "district" | "estate" | "building";
  children?: LocationNode[];
  tags?: string[];
};

export type LocationData = {
  region: string | null;
  district: string | null;
  estate: string | null;
  building: string | null;
  filter: string | null;
  path: string[];
  tree: LocationNode[];
};

const HK_TREE: LocationNode[] = [
  {
    id: "kln",
    label: "九龍",
    labelEn: "Kowloon",
    kind: "region",
    children: [
      {
        id: "kln-city",
        label: "九龍城",
        labelEn: "Kowloon City",
        kind: "district",
        children: [
          { id: "whampoa", label: "黃埔花園", labelEn: "Whampoa Garden", kind: "estate", tags: ["renovated"], children: [
            { id: "whampoa-1", label: "第1期", kind: "building" },
            { id: "whampoa-12", label: "第12期", kind: "building" },
          ]},
          { id: "laguna", label: "海逸豪園", labelEn: "Laguna Verde", kind: "estate", tags: ["renovated"] },
          { id: "kai-tak", label: "啟德一號", labelEn: "One Kai Tak", kind: "estate" },
        ],
      },
      {
        id: "ytm",
        label: "油尖旺",
        labelEn: "Yau Tsim Mong",
        kind: "district",
        children: [
          { id: "park-avenue", label: "栢景灣", labelEn: "Park Avenue", kind: "estate" },
          { id: "the-masterpiece", label: "名鑄", labelEn: "The Masterpiece", kind: "estate" },
        ],
      },
      {
        id: "ssp",
        label: "深水埗",
        labelEn: "Sham Shui Po",
        kind: "district",
        children: [
          { id: "mei-foo", label: "美孚新邨", labelEn: "Mei Foo Sun Chuen", kind: "estate", tags: ["renovated"] },
          { id: "culine", label: "匯璽", labelEn: "Cullinan West", kind: "estate" },
        ],
      },
      {
        id: "kln-bay",
        label: "九龍灣",
        labelEn: "Kowloon Bay",
        kind: "district",
        children: [
          { id: "tef", label: "德福花園", labelEn: "Telford Gardens", kind: "estate", tags: ["renovated"] },
          { id: "richland", label: "麗晶花園", labelEn: "Richland Gardens", kind: "estate" },
        ],
      },
      {
        id: "kt",
        label: "觀塘",
        labelEn: "Kwun Tong",
        kind: "district",
        children: [
          { id: "apm-area", label: "創紀之城", labelEn: "Millennium City", kind: "estate" },
          { id: "laguna-city", label: "麗港城", labelEn: "Laguna City", kind: "estate", tags: ["renovated"] },
        ],
      },
      {
        id: "wts",
        label: "黃大仙",
        labelEn: "Wong Tai Sin",
        kind: "district",
        children: [
          { id: "lung-pong", label: "龍蟠苑", kind: "estate" },
        ],
      },
    ],
  },
  {
    id: "hk-island",
    label: "港島",
    labelEn: "Hong Kong Island",
    kind: "region",
    children: [
      {
        id: "cwb",
        label: "銅鑼灣",
        labelEn: "Causeway Bay",
        kind: "district",
        children: [
          { id: "times-square-area", label: "時代廣場附近", kind: "estate" },
        ],
      },
      {
        id: "eastern",
        label: "東區",
        labelEn: "Eastern",
        kind: "district",
        children: [
          { id: "taikoo", label: "太古城", labelEn: "Taikoo Shing", kind: "estate", tags: ["renovated"] },
        ],
      },
    ],
  },
];

type Hit = { node: LocationNode; ancestors: LocationNode[] };

function walk(nodes: LocationNode[], ancestors: LocationNode[] = [], out: Hit[] = []): Hit[] {
  for (const n of nodes) {
    out.push({ node: n, ancestors });
    if (n.children) walk(n.children, [...ancestors, n], out);
  }
  return out;
}

const ALL = walk(HK_TREE);

function matchLabel(text: string, node: LocationNode): boolean {
  const t = text.toLowerCase();
  if (t.includes(node.label.toLowerCase())) return true;
  if (node.labelEn && t.includes(node.labelEn.toLowerCase())) return true;
  // short aliases
  const aliases: Record<string, string[]> = {
    kln: ["kowloon", "九龍"],
    "kln-city": ["kowloon city", "九龍城"],
    "kln-bay": ["kowloon bay", "九龍灣"],
    cwb: ["causeway bay", "銅鑼灣"],
    whampoa: ["whampoa", "黃埔"],
    "mei-foo": ["mei foo", "美孚"],
    taikoo: ["taikoo", "太古"],
  };
  return (aliases[node.id] ?? []).some((a) => t.includes(a.toLowerCase()));
}

function detectFilter(text: string): string | null {
  const t = text.toLowerCase();
  if (/大維修|major\s*renovat|已維修|翻新|renovated/.test(t)) return "已進行大維修";
  if (/新樓|新盤|newly\s*built|first.?hand/.test(t)) return "新盤";
  if (/寵物|pet.?friendly|可養寵物/.test(t)) return "可養寵物";
  if (/篩選|filter|屋苑/.test(t)) return "屋苑篩選";
  return null;
}

function pruneTree(region: string | null, district: string | null, estate: string | null, filter: string | null): LocationNode[] {
  const wantRenovated = filter === "已進行大維修";
  const filterNode = (n: LocationNode): LocationNode | null => {
    if (wantRenovated && n.kind === "estate" && !n.tags?.includes("renovated")) return null;
    const children = n.children?.map(filterNode).filter((c): c is LocationNode => c !== null);
    if (n.kind === "estate" && wantRenovated && !n.tags?.includes("renovated") && !(children && children.length)) return null;
    return { ...n, children };
  };

  let roots = HK_TREE.map(filterNode).filter((c): c is LocationNode => c !== null);

  if (region) {
    roots = roots.filter((r) => r.label === region || r.labelEn === region);
  }
  if (district && roots.length) {
    roots = roots.map((r) => ({
      ...r,
      children: (r.children ?? []).filter((d) => d.label === district || d.labelEn === district),
    })).filter((r) => (r.children?.length ?? 0) > 0);
  }
  if (estate && roots.length) {
    roots = roots.map((r) => ({
      ...r,
      children: (r.children ?? []).map((d) => ({
        ...d,
        children: (d.children ?? []).filter((e) => e.label === estate || e.labelEn === estate || e.label.includes(estate) || (e.labelEn?.includes(estate) ?? false)),
      })).filter((d) => (d.children?.length ?? 0) > 0),
    })).filter((r) => (r.children?.length ?? 0) > 0);
  }
  return roots;
}

export function parseLocation(text: string): LocationData {
  const hits = ALL.filter((h) => matchLabel(text, h.node));
  // Prefer most specific hit
  hits.sort((a, b) => {
    const rank = { building: 4, estate: 3, district: 2, region: 1 };
    return rank[b.node.kind] - rank[a.node.kind];
  });

  let region: string | null = null;
  let district: string | null = null;
  let estate: string | null = null;
  let building: string | null = null;

  if (hits[0]) {
    const { node, ancestors } = hits[0];
    const chain = [...ancestors, node];
    for (const n of chain) {
      if (n.kind === "region") region = n.label;
      if (n.kind === "district") district = n.label;
      if (n.kind === "estate") estate = n.label;
      if (n.kind === "building") building = n.label;
    }
  }

  // Fallback region if only "kowloon" style words without structured hit
  if (!region && /九龍|kowloon/i.test(text)) region = "九龍";
  if (!district && /九龍灣|kowloon\s*bay/i.test(text)) district = "九龍灣";
  if (!district && /九龍城|kowloon\s*city/i.test(text)) district = "九龍城";

  const filter = detectFilter(text);
  const path = [region, district, estate, building].filter((x): x is string => Boolean(x));
  const tree = pruneTree(region, district, estate, filter);

  return { region, district, estate, building, filter, path, tree: tree.length ? tree : HK_TREE.slice(0, 1) };
}

export function completeLocation(d: LocationData) {
  return (d.region ? 0.25 : 0) + (d.district ? 0.3 : 0) + (d.estate ? 0.25 : 0) + (d.filter || d.building ? 0.2 : 0);
}
