// Minimal CSV helpers for the data-source editor.

export const CSV_INLINE_MAX_ROWS = 500;
export const CSV_INLINE_MAX_BYTES = 256 * 1024;

export type CsvParsed = {
  columns: string[];
  rows: Record<string, string>[];
};

export function parseCsv(text: string): CsvParsed {
  const lines = splitLines(text);
  if (lines.length === 0) return { columns: [], rows: [] };
  const columns = splitCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].length === 0) continue;
    const cells = splitCsvLine(lines[i]);
    const r: Record<string, string> = {};
    for (let c = 0; c < columns.length; c++) r[columns[c]] = cells[c] ?? "";
    rows.push(r);
  }
  return { columns, rows };
}

export function toCsv(columns: string[], rows: Record<string, string>[]): string {
  const header = columns.map(quote).join(",");
  const body = rows
    .map((r) => columns.map((c) => quote(r[c] ?? "")).join(","))
    .join("\n");
  return body.length ? `${header}\n${body}\n` : `${header}\n`;
}

function quote(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else cur += ch;
    } else {
      if (ch === ",") {
        out.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else cur += ch;
    }
  }
  out.push(cur);
  return out;
}
