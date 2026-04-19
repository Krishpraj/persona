"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loading } from "@/components/Loading";
import {
  AgentChatWidget,
  type AgentSummary,
} from "@/components/public/AgentChatWidget";

// Iframe-friendly agent chat. Drop this on any page:
//   <iframe src="https://<host>/embed/<slug>" width="380" height="560" />
//
// The widget is chrome-less and CORS-enabled against /api/public/a/<slug>/chat.

export default function EmbedPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [agent, setAgent] = useState<AgentSummary | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/public/a/${slug}`, { cache: "no-store" });
      if (res.status === 404) {
        if (!cancelled) setState("missing");
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setError(body?.error || "Failed to load");
        setState("error");
        return;
      }
      setAgent(body.agent as AgentSummary);
      setState("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state === "loading") {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Loading label="loading" />
      </div>
    );
  }
  if (state === "missing") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-background text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          unavailable
        </div>
        <p className="text-[14px] text-muted-foreground">
          This chat isn&apos;t available right now.
        </p>
      </div>
    );
  }
  if (state === "error" || !agent) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-[13px] text-destructive">
        {error || "Failed to load"}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center border border-foreground/80 bg-foreground font-mono text-[14px] font-medium text-background"
        >
          {(agent.name[0] ?? "?").toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium tracking-tight">
            {agent.name}
          </div>
          {agent.role && (
            <div className="truncate text-[11.5px] text-muted-foreground">
              {agent.role}
            </div>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <AgentChatWidget agent={agent} embed />
      </div>
    </div>
  );
}
