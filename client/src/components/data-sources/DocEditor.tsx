"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { DataSource, DocBlock, DocData } from "./types";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_MB,
  deleteNodeAsset,
  isAcceptedImage,
  uploadDataAsset,
} from "@/lib/node-assets";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  dataSource: DataSource;
  onPersistedChange?: () => void;
};

function uid(): string {
  return crypto.randomUUID();
}

export function DocEditor({ projectId, dataSource, onPersistedChange }: Props) {
  const initial = (dataSource.data as DocData)?.blocks ?? [];
  const [blocks, setBlocks] = useState<DocBlock[]>(initial);
  const [name, setName] = useState(dataSource.name);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback(
    (nextBlocks: DocBlock[], nextName?: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          await fetch(`/api/data-sources/${dataSource.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              data: { blocks: nextBlocks },
              ...(nextName !== undefined ? { name: nextName } : {}),
            }),
          });
          onPersistedChange?.();
        } catch (e) {
          setError(e instanceof Error ? e.message : "save failed");
        }
      }, 400);
    },
    [dataSource.id, onPersistedChange]
  );

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const addText = () => {
    const b: DocBlock = { id: uid(), type: "text", text: "" };
    const next = [...blocks, b];
    setBlocks(next);
    scheduleSave(next);
  };

  const addImageFromFile = async (file: File) => {
    setError(null);
    if (!isAcceptedImage(file)) {
      setError("Unsupported image type.");
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Too large (max ${MAX_IMAGE_MB}MB).`);
      return;
    }
    try {
      const res = await uploadDataAsset(file, projectId, dataSource.id);
      const b: DocBlock = {
        id: uid(),
        type: "image",
        storage_path: res.path,
        url: res.url,
        alt: "",
        caption: "",
      };
      const next = [...blocks, b];
      setBlocks(next);
      scheduleSave(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "upload failed");
    }
  };

  const updateBlock = (id: string, patch: Partial<DocBlock>) => {
    const next = blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as DocBlock) : b));
    setBlocks(next);
    scheduleSave(next);
  };

  const removeBlock = (id: string) => {
    const target = blocks.find((b) => b.id === id);
    if (target && target.type === "image" && target.storage_path) {
      deleteNodeAsset(target.storage_path).catch(() => {});
    }
    const next = blocks.filter((b) => b.id !== id);
    setBlocks(next);
    scheduleSave(next);
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const to = idx + dir;
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(idx, 1);
    next.splice(to, 0, moved);
    setBlocks(next);
    scheduleSave(next);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-3">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            scheduleSave(blocks, e.target.value);
          }}
          className="max-w-[420px] flex-1 rounded-none border border-transparent bg-transparent px-0 py-1 text-[16px] font-medium tracking-tight focus:border-primary/40 focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={addText}
            className="inline-flex h-9 items-center rounded-none border border-border/70 bg-background/40 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:border-primary/60 hover:text-foreground"
          >
            + text
          </button>
          <label className="inline-flex h-9 cursor-pointer items-center rounded-none border border-border/70 bg-background/40 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:border-primary/60 hover:text-foreground">
            + image
            <input
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) addImageFromFile(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      {error && (
        <div className="border-b border-destructive/60 bg-destructive/10 px-6 py-2 text-[12px] text-destructive">
          {error}
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {blocks.length === 0 && (
            <div className="border border-dashed border-border/60 bg-background/30 px-6 py-12 text-center text-[13px] text-muted-foreground">
              Empty doc. Add a text or image block above.
            </div>
          )}
          {blocks.map((b) => (
            <BlockShell
              key={b.id}
              onUp={() => moveBlock(b.id, -1)}
              onDown={() => moveBlock(b.id, 1)}
              onDelete={() => removeBlock(b.id)}
            >
              {b.type === "text" ? (
                <textarea
                  value={b.text}
                  onChange={(e) => updateBlock(b.id, { text: e.target.value })}
                  rows={Math.max(3, b.text.split("\n").length)}
                  placeholder="Write…"
                  className="w-full resize-y rounded-none border border-transparent bg-background/40 px-3 py-2 text-[14px] leading-relaxed focus:border-primary/60 focus:outline-none"
                />
              ) : (
                <DocImage block={b} onChange={(patch) => updateBlock(b.id, patch)} />
              )}
            </BlockShell>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlockShell({
  children,
  onUp,
  onDown,
  onDelete,
}: {
  children: React.ReactNode;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative border border-border/40 bg-card/30 p-3">
      <div className="absolute right-2 top-2 hidden items-center gap-1 group-hover:flex">
        <button
          onClick={onUp}
          className="h-6 w-6 border border-border/60 bg-background/80 font-mono text-[10px] text-muted-foreground hover:text-foreground"
        >
          ↑
        </button>
        <button
          onClick={onDown}
          className="h-6 w-6 border border-border/60 bg-background/80 font-mono text-[10px] text-muted-foreground hover:text-foreground"
        >
          ↓
        </button>
        <button
          onClick={onDelete}
          className="h-6 w-6 border border-border/60 bg-background/80 font-mono text-[10px] text-muted-foreground hover:text-destructive"
        >
          ×
        </button>
      </div>
      {children}
    </div>
  );
}

function DocImage({
  block,
  onChange,
}: {
  block: Extract<DocBlock, { type: "image" }>;
  onChange: (patch: Partial<Extract<DocBlock, { type: "image" }>>) => void;
}) {
  return (
    <div className={cn("flex flex-col gap-2")}>
      {block.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.url}
          alt={block.alt || ""}
          className="max-h-[320px] w-full object-contain bg-background/60"
        />
      )}
      <input
        value={block.alt}
        onChange={(e) => onChange({ alt: e.target.value })}
        placeholder="alt text"
        className="rounded-none border border-border/60 bg-background/40 px-3 py-2 text-[12.5px] focus:border-primary/60 focus:outline-none"
      />
      <input
        value={block.caption}
        onChange={(e) => onChange({ caption: e.target.value })}
        placeholder="caption"
        className="rounded-none border border-border/60 bg-background/40 px-3 py-2 text-[12.5px] focus:border-primary/60 focus:outline-none"
      />
    </div>
  );
}
