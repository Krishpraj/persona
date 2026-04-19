"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Loading } from "@/components/Loading";
import { PublishPanel } from "@/components/PublishPanel";

type Agent = {
  id: string;
  project_id: string;
  name: string;
  role: string | null;
  description: string | null;
  system_prompt: string | null;
  is_published: boolean;
  public_slug: string | null;
  mcp_integration_ids: string[];
  skill_ids: string[];
};

type Skill = {
  id: string;
  name: string;
  description: string;
  source: "inline" | "uploaded";
};

type Integration = {
  id: string;
  template_id: string;
  label: string;
  is_active: boolean;
  project_id?: string | null;
  config?: Record<string, unknown>;
  secret_preview?: string;
  template?: {
    id: string;
    name: string;
    description: string;
    kind: "builtin" | "external";
    transport?: "sse" | "http";
  } | null;
};

type DataSource = { id: string; kind: string; name: string };

type ChatTurn = { role: "user" | "assistant"; content: string };

export default function AgentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const agentId = params.id;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);

  const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/agents/${agentId}`, { cache: "no-store" });
      if (res.status === 401) {
        router.push("/signin");
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setError(body?.error || "Failed to load");
        setLoading(false);
        return;
      }
      const a = body.agent as Agent;
      setAgent(a);

      const [mRes, dsRes, skRes] = await Promise.all([
        fetch("/api/settings/mcp", { cache: "no-store" }),
        fetch(`/api/projects/${a.project_id}/data-sources`, { cache: "no-store" }),
        fetch("/api/skills", { cache: "no-store" }),
      ]);
      const mBody = await mRes.json().catch(() => ({}));
      const dsBody = await dsRes.json().catch(() => ({}));
      const skBody = await skRes.json().catch(() => ({}));
      if (cancelled) return;
      setIntegrations((mBody.integrations ?? []) as Integration[]);
      setDataSources((dsBody.dataSources ?? []) as DataSource[]);
      setSkills((skBody.skills ?? []) as Skill[]);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [agentId, router]);

  const schedulePatch = useCallback(
    (patch: Record<string, unknown>) => {
      if (patchTimer.current) clearTimeout(patchTimer.current);
      patchTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/agents/${agentId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(patch),
          });
          if (res.ok) setSavedTick((t) => t + 1);
        } catch {
          // ignore
        }
      }, 500);
    },
    [agentId]
  );

  const updateField = (patch: Partial<Agent>) => {
    setAgent((curr) => (curr ? { ...curr, ...patch } : curr));
    schedulePatch(patch);
  };

  const projectKnowledgeRow = useMemo(
    () =>
      integrations.find(
        (i) =>
          i.template_id === "project-knowledge" &&
          i.project_id === agent?.project_id
      ) ?? null,
    [integrations, agent?.project_id]
  );

  const knowledgeEnabled = useMemo(() => {
    if (!agent || !projectKnowledgeRow) return false;
    return agent.mcp_integration_ids.includes(projectKnowledgeRow.id);
  }, [agent, projectKnowledgeRow]);

  const externalMcps = useMemo(
    () =>
      integrations.filter(
        (i) => i.template?.kind === "external" && i.is_active
      ),
    [integrations]
  );

  const toggleIntegration = useCallback(
    async (integrationId: string) => {
      if (!agent) return;
      const enabled = agent.mcp_integration_ids.includes(integrationId);
      const nextIds = enabled
        ? agent.mcp_integration_ids.filter((id) => id !== integrationId)
        : [...agent.mcp_integration_ids, integrationId];
      setAgent({ ...agent, mcp_integration_ids: nextIds });
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mcp_integration_ids: nextIds }),
      });
      if (res.ok) setSavedTick((t) => t + 1);
    },
    [agent, agentId]
  );

  const toggleKnowledge = () => {
    if (projectKnowledgeRow) toggleIntegration(projectKnowledgeRow.id);
  };

  const toggleSkill = useCallback(
    async (skillId: string) => {
      if (!agent) return;
      const enabled = (agent.skill_ids ?? []).includes(skillId);
      const nextIds = enabled
        ? (agent.skill_ids ?? []).filter((id) => id !== skillId)
        : [...(agent.skill_ids ?? []), skillId];
      setAgent({ ...agent, skill_ids: nextIds });
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ skill_ids: nextIds }),
      });
      if (res.ok) setSavedTick((t) => t + 1);
    },
    [agent, agentId]
  );

  const togglePublish = async (publish: boolean) => {
    if (!agent) return;
    setPublishing(true);
    setError(null);
    const endpoint = publish
      ? `/api/agents/${agentId}/publish`
      : `/api/agents/${agentId}/unpublish`;
    const res = await fetch(endpoint, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setPublishing(false);
    if (!res.ok) {
      setError(body?.error || "publish failed");
      return;
    }
    if (publish) {
      setAgent({
        ...agent,
        is_published: true,
        public_slug: body.agent?.public_slug ?? agent.public_slug,
      });
    } else {
      setAgent({ ...agent, is_published: false });
    }
  };

  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = chatInput.trim();
    if (!message || chatBusy) return;
    setChatBusy(true);
    const nextHistory: ChatTurn[] = [...chatHistory, { role: "user", content: message }];
    setChatHistory(nextHistory);
    setChatInput("");
    const res = await fetch(`/api/agents/${agentId}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, history: chatHistory }),
    });
    const body = await res.json().catch(() => ({}));
    setChatBusy(false);
    if (!res.ok) {
      setChatHistory([
        ...nextHistory,
        { role: "assistant", content: `(error) ${body?.error ?? "chat failed"}` },
      ]);
      return;
    }
    setChatHistory([
      ...nextHistory,
      { role: "assistant", content: body.reply ?? "(no reply)" },
    ]);
  };

  if (loading) {
    return (
      <div className="-m-4 min-h-[calc(100vh-4rem)]">
        <Loading label="loading agent" variant="page" />
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

  const publicUrl =
    agent.is_published && agent.public_slug ? `/a/${agent.public_slug}` : null;

  return (
    <div className="-m-4 flex min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-10">
          <div className="mb-6 flex items-center justify-between">
            <Link
              href={`/projects/${agent.project_id}`}
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
            >
              ← back to project
            </Link>
            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[11px] text-primary underline underline-offset-2"
              >
                {publicUrl}
              </a>
            )}
          </div>

          <Field label="Name">
            <input
              value={agent.name}
              onChange={(e) => updateField({ name: e.target.value })}
              className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2 text-[15px] focus:border-primary/70 focus:outline-none"
            />
          </Field>

          <Field label="Role">
            <input
              value={agent.role ?? ""}
              onChange={(e) => updateField({ role: e.target.value })}
              placeholder="tax specialist, support lead…"
              className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2 text-[15px] focus:border-primary/70 focus:outline-none"
            />
          </Field>

          <Field label="Description">
            <textarea
              rows={2}
              value={agent.description ?? ""}
              onChange={(e) => updateField({ description: e.target.value })}
              placeholder="What this agent helps with"
              className="w-full resize-y rounded-none border border-border/70 bg-background/40 px-3 py-2 text-[14px] focus:border-primary/70 focus:outline-none"
            />
          </Field>

          <Field label="System prompt">
            <textarea
              rows={10}
              value={agent.system_prompt ?? ""}
              onChange={(e) => updateField({ system_prompt: e.target.value })}
              placeholder="You are …"
              className="w-full resize-y rounded-none border border-border/70 bg-background/40 px-3 py-2 font-mono text-[12.5px] leading-relaxed focus:border-primary/70 focus:outline-none"
            />
          </Field>

          <section className="mt-10">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              mcp access
            </div>
            <div className="border border-border/70 bg-card/30">
              <div className="flex items-start gap-4 border-b border-border/60 px-5 py-4">
                <button
                  onClick={toggleKnowledge}
                  disabled={!projectKnowledgeRow}
                  className={cn(
                    "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-none border transition-colors",
                    knowledgeEnabled
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/70 bg-background/40"
                  )}
                >
                  {knowledgeEnabled && (
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
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-medium tracking-tight">
                    Project Knowledge
                  </div>
                  <div className="mt-1 text-[12.5px] text-muted-foreground">
                    Lets this agent query the project&apos;s docs, node graphs and CSVs.
                  </div>
                  <div className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground/80">
                    {dataSources.length === 0
                      ? "no data sources yet"
                      : dataSources
                          .slice(0, 6)
                          .map((d) => `${d.kind}:${d.name}`)
                          .join(" · ")}
                    {dataSources.length > 6 ? " · …" : ""}
                  </div>
                </div>
              </div>
              {externalMcps.length === 0 ? (
                <div className="flex items-center justify-between px-5 py-3 text-[12px] text-muted-foreground">
                  <span>No external MCPs connected yet.</span>
                  <Link
                    href="/settings"
                    className="font-mono text-[10px] uppercase tracking-[0.18em] hover:text-foreground"
                  >
                    add one
                  </Link>
                </div>
              ) : (
                <>
                  {externalMcps.map((mcp) => {
                    const enabled = agent.mcp_integration_ids.includes(mcp.id);
                    const url = (mcp.config?.url as string) || "";
                    return (
                      <div
                        key={mcp.id}
                        className="flex items-start gap-4 border-t border-border/60 px-5 py-4"
                      >
                        <button
                          onClick={() => toggleIntegration(mcp.id)}
                          className={cn(
                            "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-none border transition-colors",
                            enabled
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/70 bg-background/40"
                          )}
                        >
                          {enabled && (
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
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[14.5px] font-medium tracking-tight">
                              {mcp.label}
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
                              {mcp.template?.transport ?? "http"}
                            </span>
                          </div>
                          {url && (
                            <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                              {url}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between border-t border-border/60 px-5 py-2.5 text-[11px] text-muted-foreground">
                    <span>Toggle to give this agent access to the server&apos;s tools.</span>
                    <Link
                      href="/settings"
                      className="font-mono text-[10px] uppercase tracking-[0.18em] hover:text-foreground"
                    >
                      manage
                    </Link>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="mt-10">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                skills
              </div>
              <Link
                href="/skills"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
              >
                manage
              </Link>
            </div>
            <div className="border border-border/70 bg-card/30">
              {skills.length === 0 ? (
                <div className="flex items-center justify-between px-5 py-3 text-[12px] text-muted-foreground">
                  <span>No skills yet.</span>
                  <Link
                    href="/skills"
                    className="font-mono text-[10px] uppercase tracking-[0.18em] hover:text-foreground"
                  >
                    create one
                  </Link>
                </div>
              ) : (
                skills.map((sk, i) => {
                  const enabled = (agent.skill_ids ?? []).includes(sk.id);
                  return (
                    <div
                      key={sk.id}
                      className={cn(
                        "flex items-start gap-4 px-5 py-4",
                        i > 0 && "border-t border-border/60"
                      )}
                    >
                      <button
                        onClick={() => toggleSkill(sk.id)}
                        className={cn(
                          "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-none border transition-colors",
                          enabled
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/70 bg-background/40"
                        )}
                        aria-pressed={enabled}
                      >
                        {enabled && (
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
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[14.5px] font-medium tracking-tight">
                            {sk.name}
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                            {sk.source}
                          </span>
                        </div>
                        {sk.description && (
                          <div className="mt-1 line-clamp-2 text-[12.5px] text-muted-foreground">
                            {sk.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <PublishPanel
            agent={{
              id: agent.id,
              is_published: agent.is_published,
              public_slug: agent.public_slug,
            }}
            publishing={publishing}
            onPublish={() => togglePublish(true)}
            onUnpublish={() => togglePublish(false)}
          />

          <div className="mt-6 flex items-center justify-end gap-3">
            {error && <span className="text-[12px] text-destructive">{error}</span>}
            {savedTick > 0 && (
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                autosaved
              </span>
            )}
          </div>
        </div>
      </div>

      <aside className="flex w-[380px] shrink-0 flex-col border-l border-border/60 bg-card/20">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <span>test chat</span>
          <button
            onClick={() => setChatHistory([])}
            className="hover:text-foreground"
          >
            clear
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 text-[13px]">
          {chatHistory.length === 0 ? (
            <p className="text-muted-foreground">
              Ask your agent a question. It uses the project&apos;s data sources via the
              project-knowledge MCP.
            </p>
          ) : (
            chatHistory.map((t, i) => (
              <div key={i} className="mb-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {t.role}
                </div>
                <div className="mt-1 whitespace-pre-wrap">{t.content}</div>
              </div>
            ))
          )}
        </div>
        <form
          onSubmit={handleChatSend}
          className="flex items-center gap-2 border-t border-border/60 p-3"
        >
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask…"
            className="flex-1 rounded-none border border-border/70 bg-background/40 px-3 py-2 text-[13px] focus:border-primary/70 focus:outline-none"
          />
          <button
            type="submit"
            disabled={chatBusy}
            className="h-9 rounded-none border border-primary/70 bg-primary px-3 text-[12px] text-primary-foreground disabled:opacity-60"
          >
            {chatBusy ? "…" : "Send"}
          </button>
        </form>
      </aside>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}
