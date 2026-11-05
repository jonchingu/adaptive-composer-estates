/** Rank listings by a criterion and attach short reasons (便利程度 etc.). */

export type RankItem = {
  id: string;
  name: string;
  district: string;
  score: number;
  reason: string;
};

export type RankData = {
  criterion: string;
  area: string | null;
  items: RankItem[];
  brief: boolean;
};

const DEFAULT_ITEMS: RankItem[] = [
  { id: "1", name: "黃埔花園", district: "九龍城", score: 9.2, reason: "黃埔站上蓋、商場超市齊全，日常步行即可完成。" },
  { id: "2", name: "海逸豪園", district: "九龍城", score: 8.7, reason: "鄰近黃埔／紅磡，海濱散步方便，巴士線多。" },
  { id: "3", name: "啟德一號", district: "九龍城", score: 8.1, reason: "新社區配套增長中，通往土瓜灣／九龍城市中心便捷。" },
  { id: "4", name: "翔龍灣", district: "九龍城", score: 7.6, reason: "近土瓜灣，街市食肆多；港鐵需短程接駁。" },
  { id: "5", name: "環海·東岸", district: "九龍城", score: 7.2, reason: "海景與新設施佳，日常購物略依賴商場。" },
];

const PSF_ITEMS: RankItem[] = [
  { id: "p1", name: "德福花園", district: "九龍灣", score: 9.4, reason: "實用呎租約 HK$38，商場上蓋、九龍灣站直達，性價比高。" },
  { id: "p2", name: "麗晶花園", district: "九龍灣", score: 8.9, reason: "呎租約 HK$40，屋苑配套成熟，巴士線密。" },
  { id: "p3", name: "淘大花園", district: "牛頭角", score: 8.5, reason: "呎租約 HK$42，近牛頭角站，街市食肆方便。" },
  { id: "p4", name: "啓業邨私樓帶", district: "九龍灣", score: 7.8, reason: "呎租略高約 HK$45，新裝修單位較多。" },
  { id: "p5", name: "MegaBox 周邊", district: "九龍灣", score: 7.2, reason: "呎租約 HK$48，商業區氣氛強，夜間略嘈。" },
];

function detectArea(text: string): string | null {
  if (/九龍灣|kowloon\s*bay/i.test(text)) return "九龍灣";
  if (/九龍城|kowloon\s*city/i.test(text)) return "九龍城";
  if (/油尖旺|yau\s*tsim/i.test(text)) return "油尖旺";
  if (/深水埗|sham\s*shui/i.test(text)) return "深水埗";
  if (/觀塘|kwun\s*tong/i.test(text)) return "觀塘";
  if (/同區|same\s*district/i.test(text)) return "同區";
  if (/九龍|kowloon/i.test(text)) return "九龍";
  if (/銅鑼灣|causeway/i.test(text)) return "銅鑼灣";
  return null;
}

function detectCriterion(text: string): string {
  if (/呎租|呎價|ps[fm]|per\s*sq|最平|cheapest|便宜/i.test(text)) return "實用呎租（由低至高）";
  if (/便利|convenience|日常|生活/i.test(text)) return "日常生活便利程度";
  if (/交通|transit|commute|地鐵|mtr/i.test(text)) return "交通便利";
  if (/性價比|value|抵住/i.test(text)) return "性價比";
  if (/安靜|quiet|寧靜/i.test(text)) return "居住安靜度";
  if (/排序|sort|rank|排列/i.test(text)) return "綜合評分";
  return "日常生活便利程度";
}

export function parseRank(text: string): RankData {
  const area = detectArea(text);
  const criterion = detectCriterion(text);
  const brief = /簡述|原因|reason|why|簡要/i.test(text) || true;
  const isPsf = /呎租|呎價|ps[fm]|最平/i.test(text);

  let items = (isPsf ? PSF_ITEMS : DEFAULT_ITEMS).map((x) => ({ ...x }));
  if (area && area !== "九龍" && area !== "同區") {
    const filtered = items.filter((x) => x.district === area || (area === "九龍城" && x.district === "九龍城"));
    if (filtered.length) items = filtered;
    else if (!isPsf) items = DEFAULT_ITEMS.map((x) => ({ ...x, district: area }));
  }
  items.sort((a, b) => b.score - a.score);

  return { criterion, area, items, brief };
}

export function completeRank(d: RankData) {
  return (d.criterion ? 0.35 : 0) + (d.area ? 0.25 : 0) + (d.items.length ? 0.4 : 0);
}
