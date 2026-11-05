import { describe, expect, test } from "bun:test";
import { chunkMarkdown, kindOf, rowsToChunks } from "./chunk";

describe("kindOf", () => {
  test("maps extensions to source kinds", () => {
    expect(kindOf("Price List 3.PDF")).toBe("pdf");
    expect(kindOf("transactions.xlsx")).toBe("table");
    expect(kindOf("listing.png")).toBe("image");
    expect(kindOf("notes.md")).toBe("text");
    expect(kindOf("archive.zip")).toBeNull();
  });
});

describe("chunkMarkdown", () => {
  test("short text stays one chunk", () => {
    expect(chunkMarkdown("# Taikoo Shing\n\nTwo rooms, 528 sq ft.")).toEqual(["# Taikoo Shing\n\nTwo rooms, 528 sq ft."]);
  });

  test("every chunk respects the budget", () => {
    const md = Array.from({ length: 50 }, (_, i) => `Paragraph ${i} ${"x".repeat(80)}\n`).join("\n");
    const chunks = chunkMarkdown(md, 500);
    expect(chunks.length).toBeGreaterThan(5);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(600);
    expect(chunks.join("\n")).toContain("Paragraph 49");
  });

  test("a table split across chunks repeats its header", () => {
    const rows = Array.from({ length: 40 }, (_, i) => `| Flat ${i} | ${800 + i} |`);
    const md = ["| Unit | Price (萬) |", "| --- | --- |", ...rows].join("\n");
    const chunks = chunkMarkdown(md, 300);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.startsWith("| Unit | Price (萬) |\n| --- | --- |")).toBe(true);
    const flats = chunks.flatMap((c) => c.split("\n").filter((l) => l.startsWith("| Flat")));
    expect(flats).toEqual(rows);
  });

  test("an overlong line is hard-split, not dropped", () => {
    const chunks = chunkMarkdown("y".repeat(2500), 1000);
    expect(chunks.map((c) => c.length)).toEqual([1000, 1000, 500]);
  });
});

describe("rowsToChunks", () => {
  test("renders SQL rows as markdown tables", () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({ estate: `E${i}`, price: 800 + i, note: i === 0 ? "a|b" : null }));
    const chunks = rowsToChunks(rows, 25);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].split("\n")[0]).toBe("| estate | price | note |");
    expect(chunks[0]).toContain("| E0 | 800 | a\\|b |");
    expect(chunks[1].split("\n")).toHaveLength(2 + 5);
  });
});
