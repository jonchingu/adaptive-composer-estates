/** HK renter / buyer price math: rent ceiling, mortgage 供款, $/sqft, split, affordability. */

export type PriceKind = "ceiling" | "mortgage" | "psf" | "split" | "affordability" | "deposit" | "stamp" | "generic";

export type PriceData = {
  kind: PriceKind;
  rent: number | null;
  income: number | null;
  people: number | null;
  depositMonths: number | null;
  /** Property price for mortgage (HK$). */
  price: number | null;
  /** Loan years. */
  tenureYears: number;
  /** Annual interest % e.g. 3.5 */
  ratePct: number;
  /** Down payment % */
  downPct: number;
  /** Saleable sqft */
  sqft: number | null;
  /** District / area label for ceiling or psf */
  area: string | null;
  currency: "HK$";
  title: string;
  resultLabel: string;
  resultValue: number | null;
  resultSuffix: string;
  detail: string;
};

function num(text: string): number[] {
  const out: number[] = [];
  const re = /\$?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k|萬)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let v = Number(m[1].replace(/,/g, ""));
    if (!Number.isFinite(v)) continue;
    if (m[2]?.toLowerCase() === "k") v *= 1000;
    if (m[2] === "萬") v *= 10000;
    out.push(v);
  }
  return out;
}

function detectArea(text: string): string | null {
  if (/九龍灣|kowloon\s*bay/i.test(text)) return "九龍灣";
  if (/九龍城|kowloon\s*city/i.test(text)) return "九龍城";
  if (/觀塘|kwun\s*tong/i.test(text)) return "觀塘";
  if (/銅鑼灣|causeway/i.test(text)) return "銅鑼灣";
  if (/旺角|mong\s*kok/i.test(text)) return "旺角";
  if (/同區|same\s*district/i.test(text)) return "同區";
  if (/九龍|kowloon/i.test(text)) return "九龍";
  return null;
}

/** Monthly mortgage payment (PMT). */
export function mortgagePayment(principal: number, annualRatePct: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function parsePrice(text: string): PriceData {
  const nums = num(text);
  const currency = "HK$" as const;
  const area = detectArea(text);

  const peopleMatch =
    text.match(/\b(?:between|among|with|by|for|÷|\/)\s*(\d+)\b/i) ??
    text.match(/(\d+)\s*(?:人|位|people|persons|ways|房客)/i) ??
    text.match(/分租.*?(\d+)/i);
  const people = peopleMatch ? Number(peopleMatch[1]) : /分租|roommates?|flatmates?/i.test(text) ? 2 : null;

  const isCeiling = /以下|under|below|上限|ceiling|最多|唔多過|不多於|≤|<=/i.test(text) && /租|rent|月租/i.test(text);
  const isMortgage = /供款|mortgage|按揭|月供|貸款|loan\b/i.test(text);
  const isPsf = /呎租|呎價|\/\s*sq|per\s*sq|ps[fm]|實用.*呎|呎.*租|平方呎/i.test(text);
  const isAfford = /佔|afford|收入|income|比例|%\s*of\s*income|租金.*收入|收入.*租金/i.test(text);
  const isDeposit = /按金|deposit|訂金/i.test(text) && !isMortgage;
  const isStamp = /印花稅|stamp\s*duty/i.test(text);
  const isSplit = /分租|split|分開|各付|每人/i.test(text) || (people !== null && /租|rent/i.test(text));

  let kind: PriceKind = "generic";
  if (isMortgage) kind = "mortgage";
  else if (isPsf) kind = "psf";
  else if (isCeiling) kind = "ceiling";
  else if (isStamp) kind = "stamp";
  else if (isDeposit) kind = "deposit";
  else if (isAfford) kind = "affordability";
  else if (isSplit) kind = "split";
  else if (/租|rent|月租/i.test(text) && nums.length) kind = nums.length >= 2 ? "affordability" : "ceiling";

  let rent: number | null = null;
  let income: number | null = null;
  let price: number | null = null;
  let sqft: number | null = null;
  const tenureYears = (() => {
    const y = text.match(/(\d+)\s*(?:年|years?)/i);
    return y ? Number(y[1]) : 30;
  })();
  const ratePct = (() => {
    const r = text.match(/(\d+(?:\.\d+)?)\s*%/);
    return r && isMortgage ? Number(r[1]) : 3.5;
  })();
  const downPct = /九成|90%|一成首期/i.test(text) ? 10 : /八成|80%/i.test(text) ? 20 : 30;

  if (kind === "affordability") {
    if (nums.length >= 2) {
      const sorted = [...nums].sort((a, b) => b - a);
      income = sorted[0];
      rent = sorted[1];
    } else if (nums.length === 1) rent = nums[0];
  } else if (kind === "mortgage") {
    // Largest number is property price; small numbers may be rate/years already parsed
    const big = nums.filter((n) => n >= 100000);
    price = big[0] ?? (nums[0] && nums[0] >= 1000 ? nums[0] * (nums[0] < 10000 ? 10000 : 1) : null);
    if (price && price < 500000 && nums[0] < 10000) price = nums[0] * 10000; // treat as 萬
  } else if (kind === "psf") {
    rent = nums.find((n) => n >= 1000) ?? nums[0] ?? null;
    sqft = nums.find((n) => n >= 100 && n < 2000 && n !== rent) ?? null;
    if (!sqft) {
      const sf = text.match(/(\d+)\s*(?:呎|sq\.?\s*ft|sqft)/i);
      if (sf) sqft = Number(sf[1]);
    }
  } else {
    rent = nums.find((n) => n >= 1000) ?? nums[0] ?? null;
  }

  const depositMonths = isDeposit ? (/三個月|3\s*months?/i.test(text) ? 3 : /一個月|1\s*month/i.test(text) ? 1 : 2) : null;

  let resultValue: number | null = null;
  let resultLabel = "";
  let resultSuffix = "";
  let title = "租金計算";
  let detail = "";

  if (kind === "ceiling") {
    title = "租金上限";
    resultValue = rent;
    resultLabel = area ? `${area} 月租上限` : "月租上限";
    resultSuffix = "";
    detail = rent ? `篩選 ${currency}${rent.toLocaleString("en-HK")} 以下` : "設定可接受月租上限";
  } else if (kind === "mortgage") {
    title = "按揭供款";
    const principal = price ? price * (1 - downPct / 100) : null;
    resultValue = principal ? Math.round(mortgagePayment(principal, ratePct, tenureYears)) : null;
    resultLabel = "每月供款";
    resultSuffix = "";
    detail = price
      ? `樓價 ${currency}${price.toLocaleString("en-HK")} · 首期 ${downPct}% · ${ratePct}% · ${tenureYears} 年`
      : "輸入樓價估算月供";
  } else if (kind === "psf") {
    title = "實用呎租";
    if (rent && sqft) {
      resultValue = Math.round((rent / sqft) * 10) / 10;
      resultLabel = "呎租";
      resultSuffix = "/呎";
      detail = `月租 ${currency}${rent.toLocaleString("en-HK")} ÷ ${sqft} 呎`;
    } else {
      resultValue = rent; // may be a psf figure already
      resultLabel = "呎租比較";
      resultSuffix = rent && rent < 100 ? "/呎" : "";
      detail = area ? `${area} 實用呎租比較` : "比較同區實用呎租";
    }
  } else if (kind === "split") {
    title = "分租試算";
    const n = people ?? 2;
    const total = rent ?? null;
    resultValue = total && n ? Math.round((total / n) * 100) / 100 : null;
    resultLabel = "每人每月";
    detail = total ? `月租 ${currency}${total.toLocaleString("en-HK")} ÷ ${n} 人` : "輸入月租與人數";
  } else if (kind === "affordability") {
    title = "租金負擔";
    if (rent && income) {
      resultValue = Math.round((rent / income) * 1000) / 10;
      resultLabel = "佔收入";
      resultSuffix = "%";
      detail = `月租 ${currency}${rent.toLocaleString("en-HK")} / 收入 ${currency}${income.toLocaleString("en-HK")}`;
    } else {
      resultLabel = "佔收入";
      resultSuffix = "%";
      detail = "輸入月租與月入";
    }
  } else if (kind === "deposit") {
    title = "按金估計";
    const months = depositMonths ?? 2;
    resultValue = rent ? rent * months : null;
    resultLabel = `${months} 個月按金`;
    detail = rent ? `月租 ${currency}${rent.toLocaleString("en-HK")} × ${months}` : "輸入月租";
  } else if (kind === "stamp") {
    title = "印花稅估計";
    resultValue = rent ? Math.round(rent * 12 * 0.005) : null;
    resultLabel = "估計印花稅";
    detail = rent ? `年租 × 0.5% 估算（示範）` : "輸入月租";
  } else {
    title = "價錢計算";
    resultValue = rent;
    resultLabel = rent ? "金額" : "待計算";
    detail = "可試：租金上限、供款、呎租、分租";
  }

  return {
    kind,
    rent,
    income,
    people: people ?? (kind === "split" ? 2 : null),
    depositMonths,
    price,
    tenureYears,
    ratePct,
    downPct,
    sqft,
    area,
    currency,
    title,
    resultLabel,
    resultValue,
    resultSuffix,
    detail,
  };
}

export function completePrice(d: PriceData) {
  const hasCore =
    d.resultValue !== null || d.rent !== null || d.price !== null;
  return (hasCore ? 0.5 : 0.15) + (d.kind !== "generic" ? 0.35 : 0.1) + (d.area ? 0.15 : 0.05);
}
