"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Loading } from "@/components/Loading";

type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type Agent = {
  id: string;
  name: string;
  role: string | null;
  description: string | null;
  is_published: boolean;
  public_slug: string | null;
  updated_at: string;
  project_id: string;
};

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newAgentFor, setNewAgentFor] = useState<string | null>(null);

  const [projName, setProjName] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agentRole, setAgentRole] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/home", { cache: "no-store" });
    if (res.status === 401) {
      router.push("/signin");
      return;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body?.error || "Failed to load");
      setLoading(false);
      return;
    }
    setProjects(body.projects ?? []);
    setAgents(body.agents ?? []);
    setExpanded((prev) => {
      if (prev.size > 0) return prev;
      const next = new Set<string>();
      const first = (body.projects ?? [])[0];
      if (first) next.add(first.id);
      return next;
    });
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const agentsByProject = useMemo(() => {
    const m = new Map<string, Agent[]>();
    for (const a of agents) {
      const list = m.get(a.project_id) ?? [];
      list.push(a);
      m.set(a.project_id, list);
    }
    return m;
  }, [agents]);

  const recentAgents = useMemo(() => agents.slice(0, 6), [agents]);

  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim() || creating) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: projName.trim(),
        description: projDesc.trim() || null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setError(body?.error || "Create failed");
      return;
    }
    setProjName("");
    setProjDesc("");
    setNewProjectOpen(false);
    setProjects((p) => [body.project, ...p]);
    setExpanded((s) => new Set(s).add(body.project.id));
  };

  const createAgent = async (projectId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim() || creating) return;
    setCreating(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/agents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: agentName.trim(),
        role: agentRole.trim() || null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setError(body?.error || "Create failed");
      return;
    }
    router.push(`/agent/${body.agent.id}`);
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this project and every agent inside it?")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error || "Delete failed");
      return;
    }
    setProjects((p) => p.filter((x) => x.id !== id));
    setAgents((a) => a.filter((x) => x.project_id !== id));
  };

  const deleteAgent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this agent and all its nodes?")) return;
    const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error || "Delete failed");
      return;
    }
    setAgents((a) => a.filter((x) => x.id !== id));
  };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const projectName = (id: string) =>
    projects.find((p) => p.id === id)?.name ?? "";

  return (
    <div className="-m-4 min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-8 py-12">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <h1 className="text-[2.5rem] font-medium leading-[1.05] tracking-[-0.02em]">
              Workspace
            </h1>
            <p className="mt-3 text-[15px] text-muted-foreground">
              Projects hold agents. Click an agent to open it.
            </p>
          </div>
          <button
            onClick={() => setNewProjectOpen((v) => !v)}
            className={cn(
              "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-none border px-5 text-[13px] font-medium tracking-tight transition-colors",
              newProjectOpen
                ? "border-border/70 bg-card/40 text-foreground"
                : "border-primary/70 bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {newProjectOpen ? "Cancel" : "+ New project"}
          </button>
        </div>

        {newProjectOpen && (
          <form
            onSubmit={createProject}
            className="mb-10 border border-border/70 bg-card/30"
          >
            <div className="divide-y divide-border/60">
              <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[140px_1fr] sm:items-center sm:gap-6">
                <label className="text-[13px] text-muted-foreground">Name</label>
                <input
                  autoFocus
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  placeholder="finance team"
                  className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary/70 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[140px_1fr] sm:items-start sm:gap-6">
                <label className="pt-1 text-[13px] text-muted-foreground">
                  Description
                  <span className="ml-2 text-[11px] text-muted-foreground/60">
                    optional
                  </span>
                </label>
                <textarea
                  rows={2}
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  placeholder="What this group of agents is for…"
                  className="w-full resize-none rounded-none border border-border/70 bg-background/40 px-3 py-2 text-[13.5px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary/70 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 bg-background/30 px-5 py-3">
                {error && (
                  <span className="text-[12px] text-destructive">{error}</span>
                )}
                <button
                  type="submit"
                  disabled={!projName.trim() || creating}
                  className={cn(
                    "inline-flex h-9 items-center justify-center gap-2 rounded-none border px-5 text-[13px] font-medium tracking-tight transition-colors",
                    !projName.trim() || creating
                      ? "cursor-not-allowed border-border/60 bg-card/40 text-muted-foreground"
                      : "border-primary/70 bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <Loading label="loading workspace" />
        ) : (
          <>
            {recentAgents.length > 0 && (
              <section className="mb-10">
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Recent
                  </h2>
                  <span className="h-px flex-1 bg-border/60" />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {recentAgents.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => router.push(`/agent/${a.id}`)}
                      className="group flex flex-col items-start gap-2 border border-border/70 bg-card/30 px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-card/60"
                    >
                      <div className="flex w-full items-center gap-2">
                        <div className="flex-1 truncate text-[14px] font-medium tracking-tight">
                          {a.name}
                        </div>
                        <span
                          className={cn(
                            "shrink-0 font-mono text-[10px] uppercase tracking-[0.12em]",
                            a.is_published
                              ? "text-primary/80"
                              : "text-muted-foreground/70"
                          )}
                        >
                          {a.is_published ? "live" : "draft"}
                        </span>
                      </div>
                      <div className="flex w-full items-center gap-2 text-[11.5px] text-muted-foreground">
                        <span className="truncate">
                          {projectName(a.project_id)}
                        </span>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="shrink-0">{fmt(a.updated_at)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  All projects
                </h2>
                <span className="h-px flex-1 bg-border/60" />
              </div>

              {projects.length === 0 ? (
                <div className="border border-dashed border-border/60 bg-card/20 px-6 py-10 text-center text-[14px] text-muted-foreground">
                  No projects yet. Create one above to get started.
                </div>
              ) : (
                <ul className="divide-y divide-border/70 overflow-hidden border border-border/70 bg-card/30">
                  {projects.map((p) => {
                    const isOpen = expanded.has(p.id);
                    const list = agentsByProject.get(p.id) ?? [];
                    const isAdding = newAgentFor === p.id;
                    return (
                      <li key={p.id}>
                        <div
                          onClick={() => toggle(p.id)}
                          className="group flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors hover:bg-card/70"
                        >
                          <span
                            className={cn(
                              "inline-block font-mono text-[12px] text-muted-foreground/70 transition-transform",
                              isOpen && "rotate-90 text-primary/80"
                            )}
                          >
                            ▸
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-[15px] font-medium tracking-tight">
                                {p.name}
                              </span>
                              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                                {list.length}
                              </span>
                            </div>
                            {p.description && (
                              <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                                {p.description}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewAgentFor(isAdding ? null : p.id);
                              setAgentName("");
                              setAgentRole("");
                              if (!isOpen)
                                setExpanded((s) => new Set(s).add(p.id));
                            }}
                            className="hidden h-8 items-center rounded-none border border-border/70 bg-background/40 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground group-hover:inline-flex"
                            title="New agent"
                          >
                            + agent
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/projects/${p.id}`);
                            }}
                            className="hidden h-8 items-center rounded-none border border-border/70 bg-background/40 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground group-hover:inline-flex"
                            title="Open project"
                          >
                            open
                          </button>
                          <button
                            onClick={(e) => deleteProject(p.id, e)}
                            className="text-[18px] leading-none text-muted-foreground/60 opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
                            title="Delete project"
                          >
                            ×
                          </button>
                        </div>

                        {isOpen && (
                          <div className="border-t border-border/60 bg-background/30">
                            {isAdding && (
                              <form
                                onSubmit={(e) => createAgent(p.id, e)}
                                className="flex items-center gap-2 border-b border-border/60 px-5 py-2.5 pl-12"
                              >
                                <input
                                  autoFocus
                                  value={agentName}
                                  onChange={(e) => setAgentName(e.target.value)}
                                  placeholder="agent name"
                                  className="w-48 rounded-none border border-border/70 bg-background/40 px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary/70 focus:outline-none"
                                />
                                <input
                                  value={agentRole}
                                  onChange={(e) => setAgentRole(e.target.value)}
                                  placeholder="role (optional)"
                                  className="w-56 rounded-none border border-border/70 bg-background/40 px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary/70 focus:outline-none"
                                />
                                <button
                                  type="submit"
                                  disabled={!agentName.trim() || creating}
                                  className={cn(
                                    "inline-flex h-8 items-center justify-center rounded-none border px-3 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                                    !agentName.trim() || creating
                                      ? "cursor-not-allowed border-border/60 bg-card/40 text-muted-foreground"
                                      : "border-primary/70 bg-primary text-primary-foreground hover:bg-primary/90"
                                  )}
                                >
                                  {creating ? "…" : "create"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNewAgentFor(null)}
                                  className="inline-flex h-8 items-center rounded-none border border-border/70 bg-background/40 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
                                >
                                  cancel
                                </button>
                              </form>
                            )}

                            {list.length === 0 && !isAdding ? (
                              <div className="py-5 pl-12 pr-5 text-[13px] text-muted-foreground/80">
                                No agents yet.{" "}
                                <button
                                  onClick={() => {
                                    setNewAgentFor(p.id);
                                    setAgentName("");
                                    setAgentRole("");
                                  }}
                                  className="text-primary/80 underline-offset-2 hover:underline"
                                >
                                  Create one
                                </button>
                                .
                              </div>
                            ) : (
                              <ul className="divide-y divide-border/50">
                                {list.map((a) => (
                                  <li
                                    key={a.id}
                                    onClick={() => router.push(`/agent/${a.id}`)}
                                    className="group grid cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-4 py-2.5 pl-12 pr-5 transition-colors hover:bg-card/60"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-[11px] text-muted-foreground/60">
                                          └
                                        </span>
                                        <span className="truncate text-[14px] tracking-tight">
                                          {a.name}
                                        </span>
                                        {a.role && (
                                          <span className="truncate text-[12px] text-muted-foreground">
                                            · {a.role}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <span
                                      className={cn(
                                        "font-mono text-[10px] uppercase tracking-[0.12em]",
                                        a.is_published
                                          ? "text-primary/80"
                                          : "text-muted-foreground/60"
                                      )}
                                    >
                                      {a.is_published ? "live" : "draft"}
                                    </span>
                                    <button
                                      onClick={(e) => deleteAgent(a.id, e)}
                                      className="text-[16px] leading-none text-muted-foreground/60 opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
                                      title="Delete agent"
                                    >
                                      ×
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
