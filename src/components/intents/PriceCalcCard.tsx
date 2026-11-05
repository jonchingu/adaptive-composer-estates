"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { mortgagePayment, type PriceData, type PriceKind } from "@/lib/parse/price";
import { cn } from "@/lib/utils";
import { AnimatedNumber, Field, HeroNumber, Meta, Missing } from "./shared";
import type { CardProps } from "./types";

const fmt = (n: number) => n.toLocaleString("en-HK", { maximumFractionDigits: n % 1 === 0 ? 0 : 1 });

const KINDS: { id: PriceKind; label: string }[] = [
  { id: "ceiling", label: "租金上限" },
  { id: "mortgage", label: "供款" },
  { id: "psf", label: "呎租" },
  { id: "split", label: "分租" },
  { id: "affordability", label: "負擔%" },
];

export function PriceCalcCard({ data, interactive }: CardProps<PriceData>) {
  const [kind, setKind] = useState<PriceKind | null>(null);
  const [rent, setRent] = useState<string | null>(null);
  const [income, setIncome] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [sqft, setSqft] = useState<string | null>(null);
  const [people, setPeople] = useState<number | null>(null);
  const [downPct, setDownPct] = useState<number | null>(null);
  const [ratePct, setRatePct] = useState<number | null>(null);
  const [tenure, setTenure] = useState<number | null>(null);
  const [prev, setPrev] = useState(data);
  if (prev.kind !== data.kind || prev.rent !== data.rent || prev.price !== data.price) {
    setPrev(data);
    setKind(null);
    setRent(null);
    setIncome(null);
    setPrice(null);
    setSqft(null);
    setPeople(null);
    setDownPct(null);
    setRatePct(null);
    setTenure(null);
  }

  const active = kind ?? (KINDS.some((k) => k.id === data.kind) ? data.kind : "ceiling");
  const rentN = rent !== null ? Number(rent.replace(/,/g, "")) || 0 : data.rent ?? 0;
  const incomeN = income !== null ? Number(income.replace(/,/g, "")) || 0 : data.income ?? 0;
  const priceN = price !== null ? Number(price.replace(/,/g, "")) || 0 : data.price ?? 0;
  const sqftN = sqft !== null ? Number(sqft.replace(/,/g, "")) || 0 : data.sqft ?? 0;
  const peopleN = people ?? data.people ?? 2;
  const down = downPct ?? data.downPct;
  const rate = ratePct ?? data.ratePct;
  const years = tenure ?? data.tenureYears;

  let resultValue: number | null = null;
  let resultLabel = data.resultLabel;
  let resultSuffix = "";
  let detail = data.detail;

  if (active === "ceiling") {
    resultValue = rentN || null;
    resultLabel = data.area ? `${data.area} 月租上限` : "月租上限";
    detail = rentN ? `篩選 HK$${fmt(rentN)} 以下` : "拖動或輸入可接受月租";
  } else if (active === "mortgage") {
    const principal = priceN * (1 - down / 100);
    resultValue = priceN ? Math.round(mortgagePayment(principal, rate, years)) : null;
    resultLabel = "每月供款";
    detail = priceN ? `樓價 HK$${fmt(priceN)} · 首期 ${down}% · ${rate}% · ${years} 年` : "輸入樓價";
  } else if (active === "psf") {
    if (rentN && sqftN) {
      resultValue = Math.round((rentN / sqftN) * 10) / 10;
      resultLabel = "呎租";
      resultSuffix = "/呎";
      detail = `HK$${fmt(rentN)} ÷ ${sqftN} 呎`;
    } else {
      resultValue = rentN && rentN < 200 ? rentN : null;
      resultLabel = "呎租比較";
      resultSuffix = "/呎";
      detail = data.area ? `${data.area} 實用呎租` : "輸入月租與實用面積";
    }
  } else if (active === "split") {
    resultValue = rentN && peopleN ? Math.round((rentN / peopleN) * 100) / 100 : null;
    resultLabel = "每人每月";
    detail = rentN ? `HK$${fmt(rentN)} ÷ ${peopleN} 人` : "輸入月租與人數";
  } else if (active === "affordability") {
    resultValue = rentN && incomeN ? Math.round((rentN / incomeN) * 1000) / 10 : null;
    resultLabel = "佔收入";
    resultSuffix = "%";
    detail = rentN && incomeN ? `HK$${fmt(rentN)} / HK$${fmt(incomeN)}` : "輸入月租與月入";
  }

  return (
    <div className="flex flex-col gap-4">
      <Field index={0} className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => {
          const on = active === k.id;
          return (
            <button
              key={k.id}
              type="button"
              disabled={!interactive}
              aria-pressed={on}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setKind(k.id)}
              className={cn(
                "h-7 rounded-full border px-2.5 text-[12.5px] font-medium transition-[background-color,border-color,color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60",
                on ? "border-brand/40 bg-brand-soft text-foreground" : "border-border bg-card text-ink-2 hover:border-line-strong",
              )}
            >
              {k.label}
            </button>
          );
        })}
      </Field>

      {(active === "ceiling" || active === "split" || active === "affordability" || active === "psf") && (
        <Field index={1} className="flex flex-col gap-1">
          <Meta>{active === "psf" ? "月租（可選）" : "月租 HK$"}</Meta>
          {active === "ceiling" ? (
            <>
              <Slider
                min={5000}
                max={60000}
                step={500}
                value={[Math.min(60000, Math.max(5000, rentN || 18000))]}
                disabled={!interactive}
                aria-label="租金上限"
                onValueChange={(v) => setRent(String(Array.isArray(v) ? v[0] : rentN))}
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>5,000</span>
                <span className="font-[550] tabular-nums text-foreground">HK${fmt(rentN || 18000)}</span>
                <span>60,000</span>
              </div>
            </>
          ) : (
            <Input
              inputMode="decimal"
              disabled={!interactive}
              aria-label="月租"
              placeholder="18,000"
              className="h-9 max-w-[160px] tabular-nums"
              value={rent ?? (data.rent !== null ? String(data.rent) : "")}
              onChange={(e) => setRent(e.target.value)}
            />
          )}
        </Field>
      )}

      {active === "mortgage" && (
        <Field index={1} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Meta>樓價 HK$</Meta>
            <Input
              inputMode="decimal"
              disabled={!interactive}
              aria-label="樓價"
              placeholder="6,000,000"
              className="h-9 max-w-[200px] tabular-nums"
              value={price ?? (data.price !== null ? String(data.price) : "")}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <Meta>首期 {down}%</Meta>
              <Meta>{rate}% · {years} 年</Meta>
            </div>
            <Slider
              min={10}
              max={50}
              step={5}
              value={[down]}
              disabled={!interactive}
              aria-label="首期百分比"
              onValueChange={(v) => setDownPct(Array.isArray(v) ? v[0]! : down)}
            />
            <div className="flex gap-2">
              <Input
                inputMode="decimal"
                disabled={!interactive}
                aria-label="利率"
                className="h-8 w-20 tabular-nums"
                value={ratePct ?? data.ratePct}
                onChange={(e) => setRatePct(Number(e.target.value) || 0)}
              />
              <Input
                inputMode="numeric"
                disabled={!interactive}
                aria-label="年期"
                className="h-8 w-20 tabular-nums"
                value={tenure ?? data.tenureYears}
                onChange={(e) => setTenure(Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </Field>
      )}

      {active === "psf" && (
        <Field index={2} className="flex flex-col gap-1">
          <Meta>實用面積（呎）</Meta>
          <Input
            inputMode="decimal"
            disabled={!interactive}
            aria-label="實用呎"
            placeholder="450"
            className="h-9 max-w-[120px] tabular-nums"
            value={sqft ?? (data.sqft !== null ? String(data.sqft) : "")}
            onChange={(e) => setSqft(e.target.value)}
          />
        </Field>
      )}

      {active === "affordability" && (
        <Field index={2} className="flex flex-col gap-1">
          <Meta>月入 HK$</Meta>
          <Input
            inputMode="decimal"
            disabled={!interactive}
            aria-label="月入"
            placeholder="45,000"
            className="h-9 max-w-[160px] tabular-nums"
            value={income ?? (data.income !== null ? String(data.income) : "")}
            onChange={(e) => setIncome(e.target.value)}
          />
        </Field>
      )}

      {active === "split" && (
        <Field index={2} className="flex items-center gap-2">
          <Meta>人數</Meta>
          <Input
            inputMode="numeric"
            disabled={!interactive}
            aria-label="人數"
            className="h-8 w-16 tabular-nums"
            value={peopleN}
            onChange={(e) => setPeople(Math.max(1, Number(e.target.value) || 1))}
          />
        </Field>
      )}

      <Field index={5} className="flex items-end justify-between gap-4 border-t border-border pt-3">
        <p className="max-w-[220px] text-[12.5px] leading-[17px] text-ink-2">{detail}</p>
        <div className="flex min-w-0 flex-col items-end gap-1 text-end">
          <Meta>{resultLabel}</Meta>
          {resultValue !== null ? (
            <HeroNumber>
              {active !== "affordability" && active !== "psf" && (
                <span className="me-1 text-[15px] font-[450] text-muted-foreground">HK$</span>
              )}
              {active === "psf" && resultSuffix === "/呎" && (
                <span className="me-1 text-[15px] font-[450] text-muted-foreground">HK$</span>
              )}
              <AnimatedNumber value={resultValue} format={fmt} />
              {resultSuffix && <span className="ms-0.5 text-[15px] font-[450] text-muted-foreground">{resultSuffix}</span>}
            </HeroNumber>
          ) : (
            <Missing>待計算</Missing>
          )}
        </div>
      </Field>
    </div>
  );
}
