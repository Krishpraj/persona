import { tool, type Tool } from "ai";
import { z } from "zod";
import { createServiceClient } from "../../supabase-server";

// The project-knowledge MCP: a single logical integration per project that
// exposes read-only access to the project's data sources. Internally it
// registers four Vercel AI SDK tools, all namespaced under `projectknowledge__*`
// so the model sees one integrated surface.

const NS = "projectknowledge";

type DataSourceRow = {
  id: string;
  kind: "doc" | "nodegraph" | "csv" | "pdf";
  name: string;
  data: Record<string, unknown>;
};

type PdfPage = { page: number; text: string };

type NodeRow = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

const ASSET_BUCKET = "project-data-assets";

const OPS = ["eq", "neq", "contains", "gt", "gte", "lt", "lte"] as const;
type Op = (typeof OPS)[number];

function matches(cell: string, op: Op, value: string): boolean {
  const a = cell ?? "";
  const b = value ?? "";
  if (op === "eq") return a === b;
  if (op === "neq") return a !== b;
  if (op === "contains") return a.toLowerCase().includes(b.toLowerCase());
  const an = Number(a);
  const bn = Number(b);
  if (Number.isNaN(an) || Number.isNaN(bn)) return false;
  if (op === "gt") return an > bn;
  if (op === "gte") return an >= bn;
  if (op === "lt") return an < bn;
  if (op === "lte") return an <= bn;
  return false;
}

function publicUrl(path: string): string | null {
  if (!path) return null;
  const sb = createServiceClient();
  const { data } = sb.storage.from(ASSET_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

async function readCsvRows(
  ds: DataSourceRow
): Promise<{ columns: string[]; rows: Record<string, string>[] }> {
  const columns = (ds.data["columns"] as string[]) ?? [];
  const inline = ds.data["rows"] as Record<string, string>[] | undefined;
  if (Array.isArray(inline)) return { columns, rows: inline };
  const storagePath = ds.data["storage_path"] as string | undefined;
  if (!storagePath) return { columns, rows: [] };
  const sb = createServiceClient();
  const { data, error } = await sb.storage.from(ASSET_BUCKET).download(storagePath);
  if (error || !data) return { columns, rows: [] };
  const text = await data.text();
  return parseCsv(text);
}

function parseCsv(text: string): {
  columns: string[];
  rows: Record<string, string>[];
} {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { columns: [], rows: [] };
  const columns = splitCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let c = 0; c < columns.length; c++) row[columns[c]] = cells[c] ?? "";
    rows.push(row);
  }
  return { columns, rows };
}

function splitCsvLine(line: string): string[] {
  // minimal RFC-4180 splitter: handles quoted fields with embedded commas/quotes
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
      } else {
        cur += ch;
      }
    } else {
      if (ch === ",") {
        out.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}

export function buildProjectKnowledgeMcp(
  projectId: string,
  userId: string
): Record<string, Tool> {
  const sb = createServiceClient();

  const listSources = tool({
    description:
      "List the data sources (docs, node graphs, csv files) attached to this project. Call this first to discover what's available.",
    parameters: z.object({}),
    execute: async () => {
      const { data, error } = await sb
        .from("data_sources")
        .select("id, kind, name, data")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .order("position", { ascending: true });
      if (error) return { sources: [] as DataSourceRow[] };
      return {
        sources: (data ?? []).map((d) => {
          const dd = d as DataSourceRow;
          const summary: Record<string, unknown> = { id: dd.id, kind: dd.kind, name: dd.name };
          if (dd.kind === "csv") {
            const cols = (dd.data["columns"] as string[]) ?? [];
            const inline = dd.data["rows"] as unknown[] | undefined;
            summary.columns = cols;
            summary.rows_available = inline ? inline.length : "stored";
          }
          if (dd.kind === "pdf") {
            summary.filename = (dd.data["filename"] as string) ?? "";
            summary.page_count = (dd.data["page_count"] as number) ?? 0;
            summary.has_text =
              Array.isArray(dd.data["pages"]) && (dd.data["pages"] as unknown[]).length > 0;
          }
          return summary;
        }),
      };
    },
  });

  const search = tool({
    description:
      "Search the project's docs, node graphs and PDFs for text matching a query. Returns top matches with the data source id and a short snippet.",
    parameters: z.object({
      query: z.string().min(1),
      limit: z.number().int().positive().max(50).optional(),
    }),
    execute: async ({ query, limit }) => {
      const cap = limit ?? 10;
      const q = query.toLowerCase();
      const { data: sources } = await sb
        .from("data_sources")
        .select("id, kind, name, data")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .in("kind", ["doc", "nodegraph", "pdf"]);
      const hits: Array<{
        data_source_id: string;
        data_source_name: string;
        kind: string;
        location: string;
        snippet: string;
      }> = [];
      for (const s of (sources ?? []) as DataSourceRow[]) {
        if (s.kind === "doc") {
          const blocks =
            ((s.data as { blocks?: Array<Record<string, unknown>> }).blocks ?? []);
          for (const b of blocks) {
            const t =
              (b["type"] === "text" ? (b["text"] as string) : "") ||
              (b["caption"] as string) ||
              (b["alt"] as string) ||
              "";
            if (!t) continue;
            if (t.toLowerCase().includes(q)) {
              hits.push({
                data_source_id: s.id,
                data_source_name: s.name,
                kind: s.kind,
                location: `block:${String(b["id"] ?? "")}`,
                snippet: snippetAround(t, q),
              });
              if (hits.length >= cap) break;
            }
          }
        } else if (s.kind === "nodegraph") {
          const { data: nodes } = await sb
            .from("data_source_nodes")
            .select("id, type, data")
            .eq("data_source_id", s.id);
          for (const n of (nodes ?? []) as NodeRow[]) {
            const text = nodeSearchText(n);
            if (!text) continue;
            if (text.toLowerCase().includes(q)) {
              hits.push({
                data_source_id: s.id,
                data_source_name: s.name,
                kind: s.kind,
                location: `node:${n.id}`,
                snippet: snippetAround(text, q),
              });
              if (hits.length >= cap) break;
            }
          }
        } else if (s.kind === "pdf") {
          const pages = (s.data["pages"] as PdfPage[] | undefined) ?? [];
          for (const p of pages) {
            if (!p?.text) continue;
            if (p.text.toLowerCase().includes(q)) {
              hits.push({
                data_source_id: s.id,
                data_source_name: s.name,
                kind: s.kind,
                location: `page:${p.page}`,
                snippet: snippetAround(p.text, q),
              });
              if (hits.length >= cap) break;
            }
          }
        }
        if (hits.length >= cap) break;
      }
      return { hits };
    },
  });

  const csvQuery = tool({
    description:
      "Query a CSV data source. Use `list_sources` first to get the data_source_id and column names. `where` applies AND semantics across all clauses.",
    parameters: z.object({
      data_source_id: z.string().uuid(),
      where: z
        .array(
          z.object({
            column: z.string().min(1),
            op: z.enum(OPS),
            value: z.string(),
          })
        )
        .optional(),
      select: z.array(z.string()).optional(),
      limit: z.number().int().positive().max(500).optional(),
    }),
    execute: async ({ data_source_id, where, select, limit }) => {
      const { data: ds } = await sb
        .from("data_sources")
        .select("id, kind, name, data, user_id, project_id")
        .eq("id", data_source_id)
        .eq("user_id", userId)
        .eq("project_id", projectId)
        .maybeSingle();
      if (!ds || (ds as DataSourceRow).kind !== "csv") {
        return { error: "not a csv data source", rows: [] };
      }
      const { columns, rows } = await readCsvRows(ds as DataSourceRow);
      const cap = limit ?? 100;
      const keep = (select && select.length > 0) ? select : columns;
      const out: Record<string, string>[] = [];
      for (const r of rows) {
        if (where && where.length > 0) {
          let ok = true;
          for (const clause of where) {
            if (!matches(r[clause.column] ?? "", clause.op, clause.value)) {
              ok = false;
              break;
            }
          }
          if (!ok) continue;
        }
        const projected: Record<string, string> = {};
        for (const k of keep) projected[k] = r[k] ?? "";
        out.push(projected);
        if (out.length >= cap) break;
      }
      return { columns: keep, rows: out, total_matched: out.length };
    },
  });

  const getImage = tool({
    description:
      "Fetch an image referenced inside this project's data sources. Provide the data_source_id plus either a doc block_id or a nodegraph node_id.",
    parameters: z.object({
      data_source_id: z.string().uuid(),
      block_id: z.string().optional(),
      node_id: z.string().uuid().optional(),
    }),
    execute: async ({ data_source_id, block_id, node_id }) => {
      const { data: ds } = await sb
        .from("data_sources")
        .select("id, kind, name, data, user_id, project_id")
        .eq("id", data_source_id)
        .eq("user_id", userId)
        .eq("project_id", projectId)
        .maybeSingle();
      if (!ds) return { error: "data source not found" };
      const row = ds as DataSourceRow;
      if (row.kind === "doc" && block_id) {
        const blocks =
          ((row.data as { blocks?: Array<Record<string, unknown>> }).blocks ?? []);
        const b = blocks.find((x) => String(x["id"] ?? "") === block_id);
        if (!b || b["type"] !== "image") return { error: "image block not found" };
        const path = (b["storage_path"] as string) || "";
        const url = publicUrl(path);
        return {
          url,
          caption: (b["caption"] as string) ?? "",
          alt: (b["alt"] as string) ?? "",
        };
      }
      if (row.kind === "nodegraph" && node_id) {
        const { data: n } = await sb
          .from("data_source_nodes")
          .select("id, type, data")
          .eq("id", node_id)
          .eq("data_source_id", data_source_id)
          .maybeSingle();
        if (!n || (n as NodeRow).type !== "image") return { error: "image node not found" };
        const nr = n as NodeRow;
        const direct = (nr.data["imageUrl"] as string) || "";
        const path = (nr.data["imagePath"] as string) || "";
        const url = direct || publicUrl(path);
        return {
          url,
          caption: (nr.data["caption"] as string) ?? "",
          alt: (nr.data["alt"] as string) ?? "",
        };
      }
      return { error: "provide block_id for doc or node_id for nodegraph" };
    },
  });

  const getPdf = tool({
    description:
      "Fetch a PDF data source. Returns the public URL, filename, page count, and optionally a slice of the extracted text. Use `list_sources` first to get the data_source_id.",
    parameters: z.object({
      data_source_id: z.string().uuid(),
      page: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("If set, return only this page's extracted text."),
      include_text: z
        .boolean()
        .optional()
        .describe("If true (default), include extracted text; set false for metadata only."),
      max_chars: z
        .number()
        .int()
        .positive()
        .max(40000)
        .optional()
        .describe("Cap returned text length. Defaults to 8000."),
    }),
    execute: async ({ data_source_id, page, include_text, max_chars }) => {
      const { data: ds } = await sb
        .from("data_sources")
        .select("id, kind, name, data, user_id, project_id")
        .eq("id", data_source_id)
        .eq("user_id", userId)
        .eq("project_id", projectId)
        .maybeSingle();
      if (!ds || (ds as DataSourceRow).kind !== "pdf") {
        return { error: "not a pdf data source" };
      }
      const row = ds as DataSourceRow;
      const storagePath = (row.data["storage_path"] as string) || "";
      const url = storagePath ? publicUrl(storagePath) : null;
      const pages = (row.data["pages"] as PdfPage[] | undefined) ?? [];
      const cap = max_chars ?? 8000;
      const wantText = include_text !== false;

      let text: string | undefined;
      if (wantText) {
        if (page) {
          const found = pages.find((p) => p.page === page);
          text = (found?.text ?? "").slice(0, cap);
        } else {
          const full = pages.map((p) => `[page ${p.page}]\n${p.text ?? ""}`).join("\n\n");
          text = full.slice(0, cap);
        }
      }

      return {
        name: row.name,
        filename: (row.data["filename"] as string) ?? "",
        page_count: (row.data["page_count"] as number) ?? pages.length,
        size: (row.data["size"] as number) ?? 0,
        url,
        page: page ?? null,
        text,
        truncated: wantText && text !== undefined && text.length >= cap,
      };
    },
  });

  return {
    [`${NS}__list_sources`]: listSources,
    [`${NS}__search`]: search,
    [`${NS}__csv_query`]: csvQuery,
    [`${NS}__get_image`]: getImage,
    [`${NS}__get_pdf`]: getPdf,
  };
}

function nodeSearchText(n: NodeRow): string {
  const d = n.data;
  const parts: string[] = [];
  if (typeof d["label"] === "string") parts.push(d["label"] as string);
  if (typeof d["content"] === "string") parts.push(d["content"] as string);
  if (typeof d["text"] === "string") parts.push(d["text"] as string);
  if (typeof d["description"] === "string") parts.push(d["description"] as string);
  if (typeof d["caption"] === "string") parts.push(d["caption"] as string);
  if (typeof d["alt"] === "string") parts.push(d["alt"] as string);
  if (typeof d["url"] === "string") parts.push(d["url"] as string);
  return parts.filter(Boolean).join("\n");
}

function snippetAround(text: string, query: string, radius = 80): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + query.length + radius);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}
