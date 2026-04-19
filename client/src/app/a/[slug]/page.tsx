"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loading } from "@/components/Loading";
import {
  AgentChatWidget,
  type AgentSummary,
} from "@/components/public/AgentChatWidget";

export default function PublicAgentPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [agent, setAgent] = useState<AgentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/public/a/${slug}`, { cache: "no-store" });
      if (res.status === 404) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setError(body?.error || "Failed to load");
        setLoading(false);
        return;
      }
      setAgent(body.agent as AgentSummary);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Loading label="loading agent" variant="page" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background text-foreground">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          404
        </div>
        <p className="mt-2 text-[20px] font-medium tracking-tight">
          Not found
        </p>
        <p className="max-w-sm text-center text-[13px] text-muted-foreground">
          This page isn&apos;t available. Check the URL or try again later.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex h-9 items-center border border-border/70 bg-background/40 px-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:border-primary/60 hover:text-foreground"
        >
          go home
        </Link>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-[14px] text-destructive">
        {error || "Failed to load"}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AgentChatWidget agent={agent} />
    </div>
  );
}
