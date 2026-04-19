"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CsvData, DataSource } from "./types";
import { deleteNodeAsset, uploadDataAsset } from "@/lib/node-assets";
import {
  CSV_INLINE_MAX_BYTES,
  CSV_INLINE_MAX_ROWS,
  parseCsv,
  toCsv,
} from "@/lib/csv";
import { supabase } from "@/lib/supabase";

type Props = {
  projectId: string;
  dataSource: DataSource;
};

const PAGE_SIZE = 50;

export function CsvEditor({ projectId, dataSource }: Props) {
  const initial = (dataSource.data as CsvData) || { filename: "", columns: [], rows: [] };
  const [name, setName] = useState(dataSource.name);
  const [filename, setFilename] = useState(initial.filename || "");
  const [columns, setColumns] = useState<string[]>(initial.columns ?? []);
  const [rows, setRows] = useState<Record<string, string>[]>(initial.rows ?? []);
  const [storagePath, setStoragePath] = useState<string | null>(
    initial.storage_path ?? null
  );
  const [totalRows, setTotalRows] = useState<number | null>(
    initial.total_rows ?? (initial.rows?.length ?? null)
  );
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate stored CSV preview when only storage_path is present.
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!storagePath || rows.length > 0) return;
      const { data, error } = await supabase.storage
        .from("project-data-assets")
        .download(storagePath);
      if (cancelled) return;
      if (error || !data) return;
      const text = await data.text();
      const parsed = parseCsv(text);
      if (cancelled) return;
      if (!columns.length) setColumns(parsed.columns);
      setRows(parsed.rows);
      setTotalRows(parsed.rows.length);
    }
    hydrate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storagePath]);

  const scheduleSave = useCallback(
    (next: {
      name?: string;
      filename?: string;
      columns?: string[];
      rows?: Record<string, string>[];
      storage_path?: string | null;
      total_rows?: number | null;
    }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const payload: Record<string, unknown> = {};
        if (next.name !== undefined) payload.name = next.name;
        const dataPayload: Record<string, unknown> = {
          filename: next.filename ?? filename,
          columns: next.columns ?? columns,
        };
        const inline = next.rows ?? rows;
        const hasStorage = next.storage_path !== undefined ? next.storage_path : storagePath;
        if (hasStorage) dataPayload.storage_path = hasStorage;
        // only store rows inline when reasonably small
        if (!hasStorage) dataPayload.rows = inline;
        if ((next.total_rows ?? totalRows) != null) dataPayload.total_rows = next.total_rows ?? totalRows;
        payload.data = dataPayload;
        try {
          await fetch(`/api/data-sources/${dataSource.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (e) {
          setError(e instanceof Error ? e.message : "save failed");
        }
      }, 500);
    },
    [columns, dataSource.id, filename, rows, storagePath, totalRows]
  );

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const handleFile = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      const sizeBytes = new Blob([text]).size;
      const shouldSpill =
        parsed.rows.length > CSV_INLINE_MAX_ROWS || sizeBytes > CSV_INLINE_MAX_BYTES;
      if (shouldSpill) {
        const up = await uploadDataAsset(file, projectId, dataSource.id, { ext: "csv" });
        if (storagePath) deleteNodeAsset(storagePath).catch(() => {});
        setFilename(file.name);
        setColumns(parsed.columns);
        setRows(parsed.rows.slice(0, PAGE_SIZE * 4));
        setStoragePath(up.path);
        setTotalRows(parsed.rows.length);
        setPage(0);
        scheduleSave({
          filename: file.name,
          columns: parsed.columns,
          rows: [], // don't inline
          storage_path: up.path,
          total_rows: parsed.rows.length,
        });
      } else {
        if (storagePath) deleteNodeAsset(storagePath).catch(() => {});
        setFilename(file.name);
        setColumns(parsed.columns);
        setRows(parsed.rows);
        setStoragePath(null);
        setTotalRows(parsed.rows.length);
        setPage(0);
        scheduleSave({
          filename: file.name,
          columns: parsed.columns,
          rows: parsed.rows,
          storage_path: null,
          total_rows: parsed.rows.length,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "parse failed");
    } finally {
      setBusy(false);
    }
  };

  const downloadCsv = () => {
    const text = toCsv(columns, rows);
    const blob = new Blob([text], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const paged = useMemo(() => {
    const start = page * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const updateHeader = (idx: number, value: string) => {
    const nextCols = [...columns];
    const old = nextCols[idx];
    nextCols[idx] = value;
    const nextRows = rows.map((r) => {
      const copy: Record<string, string> = {};
      for (const c of nextCols) {
        if (c === value) copy[c] = r[old] ?? "";
        else copy[c] = r[c] ?? "";
      }
      return copy;
    });
    setColumns(nextCols);
    setRows(nextRows);
    scheduleSave({ columns: nextCols, rows: storagePath ? [] : nextRows });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-3">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            scheduleSave({ name: e.target.value });
          }}
          className="max-w-[420px] flex-1 rounded-none border border-transparent bg-transparent px-0 py-1 text-[16px] font-medium tracking-tight focus:border-primary/40 focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center rounded-none border border-border/70 bg-background/40 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:border-primary/60 hover:text-foreground">
            {busy ? "…" : filename ? "replace csv" : "upload csv"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {rows.length > 0 && (
            <button
              onClick={downloadCsv}
              className="inline-flex h-9 items-center rounded-none border border-border/70 bg-background/40 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:border-primary/60 hover:text-foreground"
            >
              download
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="border-b border-destructive/60 bg-destructive/10 px-6 py-2 text-[12px] text-destructive">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>
          {filename || "(no file)"} · {columns.length} cols ·{" "}
          {totalRows ?? rows.length} rows
          {storagePath ? " · stored" : ""}
        </span>
        {rows.length > 0 && (
          <span>
            page {page + 1} / {totalPages}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto px-6 py-4">
        {rows.length === 0 ? (
          <div className="border border-dashed border-border/60 bg-background/30 px-6 py-12 text-center text-[13px] text-muted-foreground">
            Upload a CSV to populate this data source.
          </div>
        ) : (
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                {columns.map((c, i) => (
                  <th
                    key={i}
                    className="border border-border/60 bg-card/40 px-2 py-1 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    <input
                      value={c}
                      onChange={(e) => updateHeader(i, e.target.value)}
                      className="w-full rounded-none border border-transparent bg-transparent font-mono text-[10px] uppercase tracking-[0.18em] focus:border-primary/60 focus:outline-none"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((r, i) => (
                <tr key={i}>
                  {columns.map((c, j) => (
                    <td
                      key={j}
                      className="border border-border/60 px-2 py-1 text-[12px]"
                    >
                      {r[c] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {rows.length > 0 && (
        <div className="flex items-center justify-between border-t border-border/60 px-6 py-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="h-8 border border-border/70 bg-background/40 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground disabled:opacity-40 hover:border-primary/60 hover:text-foreground"
          >
            prev
          </button>
          <button
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="h-8 border border-border/70 bg-background/40 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground disabled:opacity-40 hover:border-primary/60 hover:text-foreground"
          >
            next
          </button>
        </div>
      )}
    </div>
  );
}
