"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type TextNodeData = {
  label?: string;
  content?: string;
};

export type ImageNodeData = {
  label?: string;
  imageUrl?: string;
  imagePath?: string;
  alt?: string;
  caption?: string;
  mime?: string;
};

export type LinkNodeData = {
  label?: string;
  url?: string;
  description?: string;
};

function NodeShell({
  selected,
  kindLabel,
  children,
  tone = "primary",
}: {
  selected: boolean;
  kindLabel: string;
  children: React.ReactNode;
  tone?: "primary" | "accent" | "muted";
}) {
  const toneClass =
    tone === "accent"
      ? "text-primary"
      : tone === "muted"
      ? "text-muted-foreground"
      : "text-primary";
  return (
    <div
      className={cn(
        "relative w-[240px] rounded-none border bg-card/90 text-foreground shadow-sm backdrop-blur transition-colors",
        selected
          ? "border-primary/70 ring-1 ring-primary/30"
          : "border-border/70 hover:border-border"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border !border-border/70 !bg-background"
      />
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-1.5">
        <span className={cn("h-1 w-4 bg-primary/60", tone === "muted" && "bg-muted-foreground/40")} />
        <span
          className={cn(
            "font-mono text-[9.5px] uppercase tracking-[0.22em]",
            toneClass
          )}
        >
          {kindLabel}
        </span>
      </div>
      {children}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border !border-border/70 !bg-background"
      />
    </div>
  );
}

export function TextNode({ data, selected }: NodeProps) {
  const d = (data ?? {}) as TextNodeData;
  const content = (d.content ?? "").trim();
  return (
    <NodeShell selected={!!selected} kindLabel="text">
      <div className="px-3 py-2.5">
        <div className="truncate text-[13.5px] font-medium tracking-tight">
          {d.label || "Untitled"}
        </div>
        {content ? (
          <div className="mt-1 line-clamp-4 whitespace-pre-wrap text-[11.5px] leading-snug text-muted-foreground">
            {content}
          </div>
        ) : (
          <div className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground/60">
            empty · click to edit
          </div>
        )}
      </div>
    </NodeShell>
  );
}

export function ImageNode({ data, selected }: NodeProps) {
  const d = (data ?? {}) as ImageNodeData;
  return (
    <NodeShell selected={!!selected} kindLabel="image">
      <div className="px-3 py-2.5">
        <div className="truncate text-[13.5px] font-medium tracking-tight">
          {d.label || "Untitled"}
        </div>
        {d.imageUrl ? (
          <div className="mt-2 border border-border/60 bg-background/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={d.imageUrl}
              alt={d.alt || d.label || ""}
              className="block h-[120px] w-full object-cover"
              draggable={false}
            />
          </div>
        ) : (
          <div className="mt-2 flex h-[120px] items-center justify-center border border-dashed border-border/60 bg-background/30 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
            no image · click to upload
          </div>
        )}
        {d.caption && (
          <div className="mt-1.5 line-clamp-2 text-[11px] text-muted-foreground">
            {d.caption}
          </div>
        )}
      </div>
    </NodeShell>
  );
}

export function LinkNode({ data, selected }: NodeProps) {
  const d = (data ?? {}) as LinkNodeData;
  let host = "";
  if (d.url) {
    try {
      host = new URL(d.url).host;
    } catch {
      host = d.url;
    }
  }
  return (
    <NodeShell selected={!!selected} kindLabel="link">
      <div className="px-3 py-2.5">
        <div className="truncate text-[13.5px] font-medium tracking-tight">
          {d.label || "Untitled"}
        </div>
        {host ? (
          <div className="mt-1 truncate font-mono text-[11px] text-primary/90">
            {host}
          </div>
        ) : (
          <div className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground/60">
            no url · click to edit
          </div>
        )}
        {d.description && (
          <div className="mt-1.5 line-clamp-2 text-[11px] text-muted-foreground">
            {d.description}
          </div>
        )}
      </div>
    </NodeShell>
  );
}

export const agentNodeTypes = {
  text: TextNode,
  image: ImageNode,
  link: LinkNode,
  // legacy: old rows saved with type="knowledge" still resolve to text UI
  knowledge: TextNode,
} as const;

export type AgentNodeType = "text" | "image" | "link";

export const NODE_TYPE_OPTIONS: {
  value: AgentNodeType;
  label: string;
  hint: string;
}[] = [
  { value: "text", label: "Text", hint: "plain knowledge passage" },
  { value: "image", label: "Image", hint: "upload png/jpg/webp/svg" },
  { value: "link", label: "Link", hint: "external url reference" },
];
