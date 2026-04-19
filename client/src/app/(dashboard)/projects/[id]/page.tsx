"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Loading } from "@/components/Loading";
import { DocEditor } from "@/components/data-sources/DocEditor";
import { CsvEditor } from "@/components/data-sources/CsvEditor";
import { NodeGraphEditor } from "@/components/data-sources/NodeGraphEditor";
import { PdfEditor } from "@/components/data-sources/PdfEditor";
import type { DataSource, DataSourceKind } from "@/components/data-sources/types";

type Project = {
  id: string;
  name: string;
  description: string | null;
};

type Agent = {
  id: string;
  name: string;
  role: string | null;
  is_published: boolean;
  public_slug: string | null;
  updated_at: string;
};

type ProjectOption = { id: string; name: string };

export default function ProjectDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [projectsList, setProjectsList] = useState<ProjectOption[]>([]);
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");

  const activeDs = useMemo(
    () => dataSources.find((d) => d.id === activeId) ?? null,
    [dataSources, activeId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [projRes, dsRes] = await Promise.all([
      fetch(`/api/projects/${projectId}`, { cache: "no-store" }),
      fetch(`/api/projects/${projectId}/data-sources`, { cache: "no-store" }),
    ]);
    if (projRes.status === 401) {
      router.push("/signin");
      return;
    }
    const projBody = await projRes.json().catch(() => ({}));
    const dsBody = await dsRes.json().catch(() => ({}));
    if (!projRes.ok) {
      setError(projBody?.error || "Failed to load");
      setLoading(false);
      return;
    }
    setProject(projBody.project);
    setAgents(projBody.agents || []);
    setDataSources((dsBody.dataSources as DataSource[]) || []);
    setLoading(false);
  }, [projectId, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/projects", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => setProjectsList((b.projects ?? []) as ProjectOption[]))
      .catch(() => {});
  }, []);

  const createDataSource = async (kind: DataSourceKind) => {
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/data-sources`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body?.error || "create failed");
      return;
    }
    const ds = body.dataSource as DataSource;
    setDataSources((curr) => [...curr, ds]);
    setActiveId(ds.id);
  };

  const deleteDataSource = async (id: string) => {
    if (!confirm("Delete this data source?")) return;
    const res = await fetch(`/api/data-sources/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error || "delete failed");
      return;
    }
    setDataSources((curr) => curr.filter((d) => d.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const transferDataSource = async (id: string, targetProjectId: string) => {
    const res = await fetch(`/api/data-sources/${id}/transfer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project_id: targetProjectId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error || "transfer failed");
      return;
    }
    setDataSources((curr) => curr.filter((d) => d.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const createAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newAgentName.trim();
    if (!name || creatingAgent) return;
    setCreatingAgent(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/agents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = await res.json().catch(() => ({}));
    setCreatingAgent(false);
    if (!res.ok) {
      setError(body?.error || "create failed");
      return;
    }
    router.push(`/agent/${body.agent.id}`);
  };

  const deleteAgent = async (id: string) => {
    if (!confirm("Delete this agent?")) return;
    const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error || "delete failed");
      return;
    }
    setAgents((a) => a.filter((x) => x.id !== id));
  };

  if (loading && !project) {
    return (
      <div className="-m-4 min-h-[calc(100vh-4rem)] bg-background text-foreground">
        <Loading label="loading project" variant="page" />
      </div>
    );
  }
  if (!project) {
    return (
      <div className="-m-4 min-h-[calc(100vh-4rem)] bg-background text-foreground">
        <div className="mx-auto max-w-6xl px-8 py-12 text-[14px] text-muted-foreground">
          Project not found.
        </div>
      </div>
    );
  }

  return (
    <div className="-m-4 flex min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <aside className="flex w-[300px] shrink-0 flex-col border-r border-border/60 bg-card/20">
        <div className="border-b border-border/60 px-5 py-4">
          <div className="truncate text-[16px] font-medium tracking-tight">
            {project.name}
          </div>
          {project.description && (
            <div className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">
              {project.description}
            </div>
          )}
        </div>

        <SectionHeader label="data sources">
          <AddDataSourceMenu onAdd={createDataSource} />
        </SectionHeader>
        <div className="flex-1 overflow-y-auto">
          {dataSources.length === 0 ? (
            <div className="px-5 py-3 text-[12px] text-muted-foreground">
              None yet. Add a doc, node graph, or CSV.
            </div>
          ) : (
            <ul className="px-2 py-1">
              {dataSources.map((ds) => (
                <li key={ds.id}>
                  <DataSourceCard
                    ds={ds}
                    active={activeId === ds.id}
                    onOpen={() => setActiveId(ds.id)}
                    onDelete={() => deleteDataSource(ds.id)}
                    transferOptions={projectsList.filter((p) => p.id !== projectId)}
                    onTransfer={(target) => transferDataSource(ds.id, target)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <SectionHeader label="agents" />
        <form onSubmit={createAgent} className="flex items-center gap-2 px-3 py-2">
          <input
            value={newAgentName}
            onChange={(e) => setNewAgentName(e.target.value)}
            placeholder="new agent name"
            className="flex-1 rounded-none border border-border/70 bg-background/40 px-2 py-1.5 text-[12.5px] focus:border-primary/70 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newAgentName.trim() || creatingAgent}
            className="h-7 rounded-none border border-primary/70 bg-primary px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-50"
          >
            +
          </button>
        </form>
        <div className="flex-1 overflow-y-auto">
          {agents.length === 0 ? (
            <div className="px-5 py-3 text-[12px] text-muted-foreground">
              No agents yet.
            </div>
          ) : (
            <ul className="px-2">
              {agents.map((a) => (
                <li
                  key={a.id}
                  className="group flex items-center justify-between gap-2 rounded-none px-3 py-2 hover:bg-card/60"
                >
                  <button
                    onClick={() => router.push(`/agent/${a.id}`)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate text-[13px]">{a.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {a.is_published && a.public_slug
                        ? `/a/${a.public_slug}`
                        : "draft"}
                    </div>
                  </button>
                  <button
                    onClick={() => deleteAgent(a.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground/60 hover:text-destructive"
                    title="Delete"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && (
          <div className="border-t border-destructive/60 bg-destructive/10 px-5 py-2 text-[12px] text-destructive">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-destructive/80 hover:text-destructive"
            >
              dismiss
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-hidden">
        {activeDs ? (
          activeDs.kind === "doc" ? (
            <DocEditor projectId={projectId} dataSource={activeDs} />
          ) : activeDs.kind === "csv" ? (
            <CsvEditor projectId={projectId} dataSource={activeDs} />
          ) : activeDs.kind === "pdf" ? (
            <PdfEditor projectId={projectId} dataSource={activeDs} />
          ) : (
            <NodeGraphEditor projectId={projectId} dataSource={activeDs} />
          )
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
            Select or create a data source to start.
          </div>
        )}
      </main>
    </div>
  );
}

function SectionHeader({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 bg-background/30 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
      <span>{label}</span>
      {children}
    </div>
  );
}

function AddDataSourceMenu({
  onAdd,
}: {
  onAdd: (kind: DataSourceKind) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "h-6 rounded-none border px-2 font-mono text-[10px] uppercase tracking-[0.18em]",
          open
            ? "border-primary/70 bg-primary/10 text-primary"
            : "border-border/70 bg-background/40 text-muted-foreground hover:border-primary/60 hover:text-foreground"
        )}
      >
        + add
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-[180px] border border-border/70 bg-background/95 shadow-lg backdrop-blur">
            {(
              [
                { k: "doc" as const, label: "Doc", hint: "text + images" },
                { k: "nodegraph" as const, label: "Node graph", hint: "canvas" },
                { k: "csv" as const, label: "CSV", hint: "tabular upload" },
                { k: "pdf" as const, label: "PDF", hint: "file upload" },
              ]
            ).map((o) => (
              <button
                key={o.k}
                onClick={() => {
                  onAdd(o.k);
                  setOpen(false);
                }}
                className="flex w-full flex-col items-start border-b border-border/50 px-3 py-2 text-left last:border-b-0 hover:bg-card/70"
              >
                <span className="text-[12.5px] font-medium">{o.label}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {o.hint}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DataSourceCard({
  ds,
  active,
  onOpen,
  onDelete,
  transferOptions,
  onTransfer,
}: {
  ds: DataSource;
  active: boolean;
  onOpen: () => void;
  onDelete: () => void;
  transferOptions: ProjectOption[];
  onTransfer: (projectId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const kindLabel =
    ds.kind === "doc"
      ? "doc"
      : ds.kind === "csv"
      ? "csv"
      : ds.kind === "pdf"
      ? "pdf"
      : "graph";
  return (
    <div
      className={cn(
        "group relative flex items-start gap-2 rounded-none px-3 py-2 transition-colors",
        active ? "bg-card/80" : "hover:bg-card/60"
      )}
    >
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="truncate text-[13px]">{ds.name}</div>
        <div className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {kindLabel}
        </div>
      </button>
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="text-muted-foreground/60 hover:text-foreground"
        >
          ⋯
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-[200px] border border-border/70 bg-background/95 shadow-lg backdrop-blur">
              {transferOptions.length > 0 && (
                <div className="border-b border-border/50">
                  <div className="px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
                    transfer to
                  </div>
                  {transferOptions.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onTransfer(p.id);
                        setMenuOpen(false);
                      }}
                      className="block w-full truncate px-3 py-1.5 text-left text-[12px] hover:bg-card/70"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => {
                  onDelete();
                  setMenuOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-[12px] text-destructive hover:bg-destructive/10"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
