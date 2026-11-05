import { describe, expect, test } from "bun:test";
import { ESTATES } from "@/lib/estates/fixtures";
import { affordableWan, commuteLegs, monthlyPayment, rankEstates } from "@/lib/estates/rank";
import { DEFAULT_PARAMS, parseSearchParams, type SearchParams, toQueryString } from "@/lib/estates/types";

const p = (patch: Partial<SearchParams>): SearchParams => ({ ...DEFAULT_PARAMS, ...patch });

describe("rankEstates", () => {
  test("transit: estates within the limit come first, fastest first", () => {
    const r = rankEstates(ESTATES, p({ mode: "transit", travelMode: "walk", maxMinutes: 6 }));
    expect(r.rows.map((x) => x.id)).toEqual(["mf", "tk", "gh", "sp", "lh", "kw"]);
    expect(r.okCount).toBe(3);
    expect(r.rows.map((x) => x.rank)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test("price: affordable estates rank by price descending, the rest after", () => {
    const r = rankEstates(ESTATES, p({ mode: "price", monthly: 28_000, downPayment: 0.2 }));
    const ok = r.rows.filter((x) => x.ok);
    expect(ok.every((x) => x.monthlyPayment <= 28_000)).toBe(true);
    expect(r.rows.slice(0, ok.length).every((x) => x.ok)).toBe(true);
  });

  test("semantic: no weights means everything is ok and order is stable", () => {
    const r = rankEstates(ESTATES, p({ mode: "semantic" }));
    expect(r.okCount).toBe(ESTATES.length);
    expect(r.rows.map((x) => x.id)).toEqual(ESTATES.map((e) => e.id));
  });

  test("semantic: sea weighting puts 海怡半島 on top", () => {
    const r = rankEstates(ESTATES, p({ mode: "semantic", weights: { quiet: 0, school: 0, sea: 3, two: 0 } }));
    expect(r.rows[0].id).toBe("sp");
  });
});

describe("finance", () => {
  test("affordableWan inverts monthlyPayment", () => {
    expect(monthlyPayment(affordableWan(28_000, 0.2), 0.2)).toBeCloseTo(28_000, 6);
  });
});

describe("commuteLegs", () => {
  test("legs sum to the door-to-door time", () => {
    for (const e of ESTATES)
      for (const m of ["walk", "mtr", "bus"] as const) expect(commuteLegs(e, m).reduce((a, l) => a + l.minutes, 0)).toBe(e.travel[m]);
  });
});

describe("search params", () => {
  test("round-trip through the query string", () => {
    const params = p({ mode: "price", monthly: 31_500, downPayment: 0.3, weights: { quiet: 1, school: 2, sea: 3, two: 0 } });
    expect(parseSearchParams(new URLSearchParams(toQueryString(params)))).toEqual(params);
  });

  test("rejects out-of-range input", () => {
    expect(() => parseSearchParams({ maxMinutes: "99" })).toThrow();
  });
});
