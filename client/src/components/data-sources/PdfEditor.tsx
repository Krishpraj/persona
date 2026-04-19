"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataSource, PdfData, PdfPageText } from "./types";
import {
  deleteNodeAsset,
  formatBytes,
  uploadDataAsset,
} from "@/lib/node-assets";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  dataSource: DataSource;
  onPersistedChange?: () => void;
};

const MAX_PDF_MB = 50;

export function PdfEditor({ projectId, dataSource, onPersistedChange }: Props) {
  const initial = (dataSource.data as PdfData) ?? {
    filename: "",
    storage_path: "",
    size: 0,
    page_count: 0,
  };
  const [data, setData] = useState<PdfData>(initial);
  const [name, setName] = useState(dataSource.name);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setData((dataSource.data as PdfData) ?? initial);
    setName(dataSource.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource.id]);

  const persist = useCallback(
    (nextData: PdfData, nextName?: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          await fetch(`/api/data-sources/${dataSource.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              data: nextData,
              ...(nextName !== undefined ? { name: nextName } : {}),
            }),
          });
          onPersistedChange?.();
        } catch (e) {
          setError(e instanceof Error ? e.message : "save failed");
        }
      }, 300);
    },
    [dataSource.id, onPersistedChange]
  );

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    []
  );

  const hasFile = !!data.storage_path;

  const handleFile = async (file: File) => {
    setError(null);
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }
    if (file.size > MAX_PDF_MB * 1024 * 1024) {
      setError(`Too large (max ${MAX_PDF_MB}MB).`);
      return;
    }

    setUploading(true);
    setProgress("extracting text…");
    try {
      const buffer = await file.arrayBuffer();
      const { fullText, pages, pageCount } = await extractPdfText(buffer);

      setProgress("uploading…");
      const up = await uploadDataAsset(file, projectId, dataSource.id, {
        ext: "pdf",
      });

      // Replace old file if any
      if (hasFile && data.storage_path && data.storage_path !== up.path) {
        deleteNodeAsset(data.storage_path).catch(() => {});
      }

      const next: PdfData = {
        filename: file.name,
        storage_path: up.path,
        url: up.url,
        size: file.size,
        page_count: pageCount,
        text: fullText,
        pages,
      };
      const nextName = name.trim() || file.name.replace(/\.pdf$/i, "");
      setData(next);
      setName(nextName);
      persist(next, nextName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "upload failed");
    } finally {
      setUploading(false);
      setProgress("");
    }
  };

  const removeFile = async () => {
    if (!hasFile) return;
    if (!confirm("Remove this PDF?")) return;
    if (data.storage_path) deleteNodeAsset(data.storage_path).catch(() => {});
    const next: PdfData = {
      filename: "",
      storage_path: "",
      size: 0,
      page_count: 0,
    };
    setData(next);
    persist(next);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-3">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            persist(data, e.target.value);
          }}
          className="max-w-[420px] flex-1 rounded-none border border-transparent bg-transparent px-0 py-1 text-[16px] font-medium tracking-tight focus:border-primary/40 focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <label
            className={cn(
              "inline-flex h-9 items-center rounded-none border px-3 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
              uploading
                ? "cursor-wait border-border/60 text-muted-foreground"
                : "cursor-pointer border-border/70 bg-background/40 text-muted-foreground hover:border-primary/60 hover:text-foreground"
            )}
          >
            {uploading ? progress || "working…" : hasFile ? "replace" : "+ upload"}
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={uploading}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {hasFile && (
            <button
              onClick={removeFile}
              disabled={uploading}
              className="inline-flex h-9 items-center rounded-none border border-border/70 bg-background/40 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
            >
              remove
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="border-b border-destructive/60 bg-destructive/10 px-6 py-2 text-[12px] text-destructive">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-destructive/80 hover:text-destructive"
          >
            dismiss
          </button>
        </div>
      )}

      {!hasFile ? (
        <EmptyUpload uploading={uploading} onFile={handleFile} progress={progress} />
      ) : (
        <PdfView data={data} />
      )}
    </div>
  );
}

function EmptyUpload({
  uploading,
  progress,
  onFile,
}: {
  uploading: boolean;
  progress: string;
  onFile: (f: File) => void;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={cn(
          "mx-auto flex h-[320px] w-full max-w-2xl cursor-pointer flex-col items-center justify-center gap-3 border border-dashed px-6 text-center transition-colors",
          dragging
            ? "border-primary/70 bg-primary/10 text-foreground"
            : "border-border/60 bg-background/30 text-muted-foreground hover:border-primary/50"
        )}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.22em]">
          {uploading ? progress || "working…" : "drop pdf or click to upload"}
        </div>
        <div className="text-[13px]">
          Text is extracted in-browser so agents can search it.
        </div>
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
          Max {MAX_PDF_MB}MB · 1 file
        </div>
        <input
          type="file"
          accept="application/pdf,.pdf"
          disabled={uploading}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

function PdfView({ data }: { data: PdfData }) {
  const [tab, setTab] = useState<"preview" | "text">("preview");
  const textSummary = useMemo(() => {
    const t = data.text ?? "";
    const chars = t.length;
    const words = t.split(/\s+/).filter(Boolean).length;
    return { chars, words };
  }, [data.text]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 bg-background/40 px-6 py-2.5">
        <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
          <span className="truncate font-mono">{data.filename}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{data.page_count || "?"} pages</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{formatBytes(data.size || 0)}</span>
          {textSummary.words > 0 && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span>{textSummary.words.toLocaleString()} words indexed</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-0 border border-border/70 bg-card/30">
          {(["preview", "text"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "h-7 px-3 font-mono text-[10px] uppercase tracking-[0.18em]",
                tab === k
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {tab === "preview" ? (
        data.url ? (
          <iframe
            src={data.url}
            title={data.filename || "PDF"}
            className="flex-1 border-0 bg-background"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-[13px] text-muted-foreground">
            No preview URL.
          </div>
        )
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-3xl">
            {!data.pages?.length ? (
              <div className="text-[13px] text-muted-foreground">
                No extracted text. Re-upload to extract.
              </div>
            ) : (
              <ol className="flex flex-col gap-4">
                {data.pages.map((p) => (
                  <li
                    key={p.page}
                    className="border border-border/50 bg-card/30 px-4 py-3"
                  >
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      page {p.page}
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-foreground">
                      {p.text || <span className="text-muted-foreground">(empty)</span>}
                    </pre>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- pdfjs text extraction (browser) ----------

type PdfjsModule = typeof import("pdfjs-dist");
let pdfjsPromise: Promise<PdfjsModule> | null = null;

async function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const mod = await import("pdfjs-dist");
      // Serve the worker from a CDN matched to the installed version so we
      // don't have to wire a webpack/turbopack asset import.
      mod.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${mod.version}/pdf.worker.min.mjs`;
      return mod;
    })();
  }
  return pdfjsPromise;
}

async function extractPdfText(
  buffer: ArrayBuffer
): Promise<{ fullText: string; pages: PdfPageText[]; pageCount: number }> {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pageCount = doc.numPages;
  const pages: PdfPageText[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items
      .map((item) => ("str" in item ? (item as { str: string }).str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push({ page: i, text });
  }
  const fullText = pages.map((p) => p.text).join("\n\n");
  return { fullText, pages, pageCount };
}
