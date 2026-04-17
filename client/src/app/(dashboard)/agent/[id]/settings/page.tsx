"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Loading } from "@/components/Loading";

type Integration = {
  id: string;
  label: string;
  is_active: boolean;
  secret_preview: string;
  template: {
    id: string;
    name: string;
    transport: "sse" | "http";
  } | null;
};

type Agent = {
  id: string;
  name: string;
  role: string | null;
  mcp_integration_ids: string[];
};

export default function AgentSettingsPage() {
  const params = useParams<{ id: string }>();
  const agentId = params?.id;
  const router = useRouter();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    const [aRes, mRes] = await Promise.all([
      fetch(`/api/agents/${agentId}`, { cache: "no-store" }),
      fetch("/api/settings/mcp", { cache: "no-store" }),
    ]);
    if (aRes.status === 401) {
      router.push("/signin");
      return;
    }
    const aBody = await aRes.json().catch(() => ({}));
    const mBody = await mRes.json().catch(() => ({}));
    if (!aRes.ok) {
      setError(aBody?.error || "Failed to load agent");
      setLoading(false);
      return;
    }
    const loadedAgent = aBody.agent as Agent;
    setAgent(loadedAgent);
    setIntegrations((mBody.integrations ?? []) as Integration[]);
    setSelected(new Set((loadedAgent.mcp_integration_ids ?? []) as string[]));
    setLoading(false);
  }, [agentId, router]);

  useEffect(() => {
    load();
  }, [load]);

  const active = useMemo(
    () => integrations.filter((i) => i.is_active),
    [integrations]
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSavedAt(null);
  };

  const save = async () => {
    if (!agentId || saving) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/agents/${agentId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mcp_integration_ids: Array.from(selected) }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(body?.error || "Save failed");
      return;
    }
    setSavedAt(Date.now());
  };

  if (loading) {
    return (
      <div className="-m-4 min-h-[calc(100vh-4rem)]">
        <Loading label="loading agent settings" variant="page" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="-m-4 flex min-h-[calc(100vh-4rem)] items-center justify-center text-[14px] text-muted-foreground">
        Agent not found.
      </div>
    );
  }

  return (
    <div className="-m-4 min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-8 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              agent settings
            </div>
            <h1 className="mt-2 text-[2rem] font-medium leading-[1.05] tracking-[-0.02em]">
              {agent.name}
            </h1>
            {agent.role && (
              <div className="mt-1 text-[13px] text-muted-foreground">{agent.role}</div>
            )}
          </div>
          <Link
            href={`/agent/${agentId}`}
            className="inline-flex h-9 items-center rounded-none border border-border/70 bg-background/40 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
          >
            ← back to canvas
          </Link>
        </div>

        <section className="mb-10">
          <h2 className="mb-3 text-[18px] font-medium tracking-tight">MCP Access</h2>
          <p className="mb-5 text-[14px] text-muted-foreground">
            Select which of your MCP integrations this agent can call during chat. Connect more
            servers on the{" "}
            <Link href="/settings" className="underline underline-offset-2 hover:text-primary">
              settings page
            </Link>
            .
          </p>

          {active.length === 0 ? (
            <div className="border border-dashed border-border/60 bg-card/20 px-6 py-10 text-center text-[14px] text-muted-foreground">
              No active MCP integrations. Connect one in{" "}
              <Link href="/settings" className="underline underline-offset-2 hover:text-primary">
                settings
              </Link>{" "}
              first.
            </div>
          ) : (
            <ul className="divide-y divide-border/70 overflow-hidden border border-border/70 bg-card/30">
              {active.map((i) => {
                const isSelected = selected.has(i.id);
                return (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() => toggle(i.id)}
                      className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-card/60"
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-none border transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/70 bg-background/40"
                        )}
                      >
                        {isSelected && (
                          <svg
                            viewBox="0 0 16 16"
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M3 8.5l3 3 7-7" />
                          </svg>
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-medium tracking-tight">
                          {i.label}
                        </div>
                        <div className="mt-1 truncate font-mono text-[11.5px] text-muted-foreground/80">
                          {i.template?.name ?? "unknown"} · {i.secret_preview}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-5 flex items-center justify-end gap-4">
            {error && <span className="text-[12px] text-destructive">{error}</span>}
            {savedAt && (
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                saved
              </span>
            )}
            <button
              onClick={save}
              disabled={saving}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-none border px-6 text-[14px] font-medium tracking-tight transition-colors",
                saving
                  ? "cursor-not-allowed border-border/60 bg-card/40 text-muted-foreground"
                  : "border-primary/70 bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
