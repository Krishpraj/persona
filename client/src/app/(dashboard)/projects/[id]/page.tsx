"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Loading } from "@/components/Loading";

type Project = {
  id: string;
  name: string;
  description: string | null;
};

type Agent = {
  id: string;
  name: string;
  role: string | null;
  description: string | null;
  is_published: boolean;
  public_slug: string | null;
  updated_at: string;
};

export default function ProjectDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
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
    setProject(body.project);
    setAgents(body.agents || []);
    setLoading(false);
  }, [projectId, router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/agents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        role: role.trim() || null,
        description: description.trim() || null,
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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
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
    <div className="-m-4 min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-8 py-12">
        <div className="mb-10">
          <h1 className="text-[2rem] font-medium leading-[1.05] tracking-[-0.02em]">
            {project.name}
          </h1>
          {project.description && (
            <p className="mt-3 text-[15px] text-muted-foreground">{project.description}</p>
          )}
        </div>

        <section className="mb-12">
          <h2 className="mb-5 text-[18px] font-medium tracking-tight">New agent</h2>
          <form onSubmit={handleCreate} className="border border-border/70 bg-card/30">
            <div className="divide-y divide-border/60">
              <div className="grid grid-cols-1 gap-3 px-6 py-5 sm:grid-cols-[160px_1fr] sm:gap-6 sm:items-center">
                <label className="text-[14px] text-muted-foreground">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="tax agent"
                  className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary/70 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 px-6 py-5 sm:grid-cols-[160px_1fr] sm:gap-6 sm:items-center">
                <label className="text-[14px] text-muted-foreground">
                  Role
                  <span className="ml-2 text-[12px] text-muted-foreground/60">optional</span>
                </label>
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="tax specialist, support lead…"
                  className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary/70 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 px-6 py-5 sm:grid-cols-[160px_1fr] sm:gap-6 sm:items-start">
                <label className="pt-1 text-[14px] text-muted-foreground">
                  Description
                  <span className="ml-2 text-[12px] text-muted-foreground/60">optional</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this agent helps with…"
                  className="w-full resize-none rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[14.5px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary/70 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-4 bg-background/30 px-6 py-4">
                {error && <span className="text-[12px] text-destructive">{error}</span>}
                <button
                  type="submit"
                  disabled={!name.trim() || creating}
                  className={cn(
                    "inline-flex h-10 items-center justify-center gap-2 rounded-none border px-6 text-[14px] font-medium tracking-tight transition-colors",
                    !name.trim() || creating
                      ? "cursor-not-allowed border-border/60 bg-card/40 text-muted-foreground"
                      : "border-primary/70 bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {creating ? "Creating…" : "Create agent"}
                </button>
              </div>
            </div>
          </form>
        </section>

        <section>
          <h2 className="mb-5 text-[18px] font-medium tracking-tight">Agents</h2>
          {agents.length === 0 ? (
            <div className="border border-dashed border-border/60 bg-card/20 px-6 py-10 text-center text-[14px] text-muted-foreground">
              No agents yet in this project.
            </div>
          ) : (
            <ul className="divide-y divide-border/70 overflow-hidden border border-border/70 bg-card/30">
              {agents.map((a) => (
                <li
                  key={a.id}
                  onClick={() => router.push(`/agent/${a.id}`)}
                  className="group grid cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-card/70"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-medium tracking-tight">
                      {a.name}
                    </div>
                    <div className="mt-1 text-[12.5px] text-muted-foreground">
                      {a.role ? `${a.role} · ` : ""}
                      {a.is_published && a.public_slug
                        ? `published · /a/${a.public_slug}`
                        : "draft"}
                    </div>
                  </div>
                  <span className="text-[12px] uppercase tracking-[0.12em] text-primary/80">
                    {a.is_published ? "live" : "draft"}
                  </span>
                  <button
                    onClick={(e) => handleDelete(a.id, e)}
                    className="text-[18px] leading-none text-muted-foreground/60 opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
                    title="Delete"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
