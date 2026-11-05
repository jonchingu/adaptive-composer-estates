/** Walk / MTR / bus distance — minutes slider + transport mode. */

export type DistanceMode = "walk" | "mtr" | "bus";

export type DistanceData = {
  minutes: number;
  meters: number | null;
  mode: DistanceMode;
  destination: string | null;
  area: string | null;
  rooms: number | null;
  label: string;
};

/** Rough metres covered per minute by mode (HK commute heuristics). */
export const MODE_SPEED_M_PER_MIN: Record<DistanceMode, number> = {
  walk: 80,
  mtr: 400,
  bus: 250,
};

const STATION_RE =
  /(港鐵|地鐵|mtr|車站|站)|(銅鑼灣|causeway\s*bay)|(中環|central)|(尖沙咀|tst|tsim\s*sha\s*tsui)|(旺角|mong\s*kok)|(觀塘|kwun\s*tong)|(九龍塘|kowloon\s*tong)|(九龍灣|kowloon\s*bay)|(太子|prince\s*edward)|(黃埔|whampoa)|(何文田|ho\s*man\s*tin)|(油麻地|yau\s*ma\s*tei)|(佐敦|jordan)|(紅磡|hung\s*hom)|(美孚|mei\s*foo)|(太古|tai\s*koo|taikoo)/i;

export function parseDistance(text: string): DistanceData {
  const t = text.trim();
  let minutes: number | null = null;
  let meters: number | null = null;

  const minZh = t.match(/(\d+)\s*(?:分|分鐘|mins?|minutes?)/i);
  const minEn = t.match(/(\d+)\s*-\s*min(?:ute)?s?\b/i);
  if (minZh) minutes = Number(minZh[1]);
  else if (minEn) minutes = Number(minEn[1]);
  else {
    const walkMin = t.match(/(?:within|in|≤|<=|少於|內)\s*(\d+)\s*(?:min|分)/i);
    if (walkMin) minutes = Number(walkMin[1]);
  }

  const m = t.match(/(\d+)\s*(?:m|米|公尺)\b|(?:within|內|距離)\s*(\d+)\s*(?:m|米)/i);
  if (m) meters = Number(m[1] || m[2]);
  if (meters === null) {
    const ofM = t.match(/(?:within\s*)?(\d+)\s*m\s+(?:of|from|to)\b/i);
    if (ofM) meters = Number(ofM[1]);
  }

  let mode: DistanceMode = "walk";
  if (/巴士|bus\b|公車/i.test(t)) mode = "bus";
  else if (/港鐵|地鐵|\bmtr\b|鐵路/i.test(t) && !/步行|walk|行路/i.test(t)) mode = "mtr";
  else if (/步行|walk|行路|腳程|走路/i.test(t)) mode = "walk";
  else if (/transit|乘車|車程/i.test(t)) mode = "bus";

  if (minutes === null && meters !== null) {
    minutes = Math.max(1, Math.round(meters / MODE_SPEED_M_PER_MIN[mode]));
  }
  if (minutes === null) minutes = 10;

  let destination: string | null = null;
  if (/港鐵|地鐵|\bmtr\b/i.test(t)) destination = "港鐵站";
  else if (/巴士站|bus\s*stop/i.test(t)) destination = "巴士站";
  else if (/車站/i.test(t)) destination = "車站";

  let area: string | null = null;
  const station = t.match(STATION_RE);
  if (station) {
    const raw = station[0];
    if (/銅鑼灣|causeway/i.test(raw)) area = "銅鑼灣";
    else if (/中環|central/i.test(raw)) area = "中環";
    else if (/尖沙咀|tst|tsim/i.test(raw)) area = "尖沙咀";
    else if (/旺角|mong/i.test(raw)) area = "旺角";
    else if (/觀塘|kwun/i.test(raw)) area = "觀塘";
    else if (/九龍灣|kowloon\s*bay/i.test(raw)) area = "九龍灣";
    else if (/九龍塘|kowloon\s*tong/i.test(raw)) area = "九龍塘";
    else if (/黃埔|whampoa/i.test(raw)) area = "黃埔";
    else if (/美孚|mei\s*foo/i.test(raw)) area = "美孚";
    else if (/太古|tai\s*koo|taikoo/i.test(raw)) area = "太古";
    else if (/何文田|ho\s*man/i.test(raw)) area = "何文田";
    else if (/紅磡|hung\s*hom/i.test(raw)) area = "紅磡";
  }

  if (!destination && area) destination = area;

  const roomsMatch = t.match(/(\d+)\s*(?:房|bedroom|br\b)|兩房|三房|一房/i);
  let rooms: number | null = null;
  if (roomsMatch) {
    if (/兩房/.test(t)) rooms = 2;
    else if (/三房/.test(t)) rooms = 3;
    else if (/一房/.test(t)) rooms = 1;
    else rooms = Number(roomsMatch[1]);
  }

  const modeLabel = mode === "walk" ? "步行" : mode === "mtr" ? "港鐵" : "巴士";
  const parts = [`${minutes} 分鐘`, modeLabel];
  if (destination) parts.push(`至 ${destination}`);
  else if (area) parts.push(`至 ${area}`);
  if (rooms) parts.push(`${rooms} 房`);

  return {
    minutes,
    meters,
    mode,
    destination,
    area,
    rooms,
    label: parts.join(" · "),
  };
}

export function completeDistance(d: DistanceData) {
  return 0.4 + (d.destination || d.area ? 0.35 : 0.15) + (d.rooms ? 0.15 : 0.1);
}
