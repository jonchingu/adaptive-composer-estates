export type SourceKind = "pdf" | "table" | "image" | "text" | "sql";

const BY_EXT: Record<string, Exclude<SourceKind, "sql">> = {
  pdf: "pdf",
  csv: "table",
  xlsx: "table",
  xlsm: "table",
  xls: "table",
  ods: "table",
  numbers: "table",
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  svg: "image",
  txt: "text",
  md: "text",
  html: "text",
  htm: "text",
  xml: "text",
  docx: "text",
  odt: "text",
};

/** The source kind for an uploaded file, from its extension (MIME types from browsers are unreliable). Null: unsupported. */
export function kindOf(filename: string): Exclude<SourceKind, "sql"> | null {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return BY_EXT[ext] ?? null;
}

const isTableRow = (line: string) => line.trimStart().startsWith("|");
const isDivider = (line: string) => /^\s*\|?\s*:?-{3,}/.test(line);

/**
 * Split markdown into chunks of at most ~maxChars, on blank lines where possible.
 * A markdown table cut across chunks gets its header row repeated, so every chunk of a
 * price list still says what each column means.
 */
export function chunkMarkdown(markdown: string, maxChars = 3000): string[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const chunks: string[] = [];
  let current: string[] = [];
  let size = 0;
  let header: string[] | null = null;

  const flush = () => {
    const text = current.join("\n").trim();
    if (text) chunks.push(text);
    current = [];
    size = 0;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isTableRow(line) && isDivider(lines[i + 1] ?? "")) header = [line, lines[i + 1]];
    else if (!isTableRow(line)) header = null;

    if (size + line.length > maxChars && size > 0) {
      flush();
      if (header && isTableRow(line) && !isDivider(line) && line !== header[0]) {
        current.push(...header);
        size = header.join("\n").length;
      }
    }
    // A single line longer than the budget is hard-split.
    for (let start = 0; start < Math.max(line.length, 1); start += maxChars) {
      const part = line.slice(start, start + maxChars);
      if (start > 0) flush();
      current.push(part);
      size += part.length + 1;
    }
    if (line.trim() === "" && size > maxChars * 0.8) flush();
  }
  flush();
  return chunks;
}

/** Rows from a SQL source as markdown tables, rowsPerChunk at a time. */
export function rowsToChunks(rows: Record<string, unknown>[], rowsPerChunk = 25): string[] {
  if (rows.length === 0) return [];
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) =>
    (v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v)).replaceAll("|", "\\|").replaceAll("\n", " ");
  const head = `| ${cols.join(" | ")} |\n|${cols.map(() => " --- ").join("|")}|`;
  const out: string[] = [];
  for (let i = 0; i < rows.length; i += rowsPerChunk) {
    const body = rows.slice(i, i + rowsPerChunk).map((r) => `| ${cols.map((c) => cell(r[c])).join(" | ")} |`);
    out.push(`${head}\n${body.join("\n")}`);
  }
  return out;
}
