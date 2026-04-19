"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/Loading";
import { cn } from "@/lib/utils";
import { parseSkillSource } from "@/lib/skills";

type Skill = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  source: "inline" | "uploaded";
  updated_at: string;
};

export default function SkillsPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/skills", { cache: "no-store" });
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
    const list = (body.skills ?? []) as Skill[];
    setSkills(list);
    setActiveId((prev) => prev ?? list[0]?.id ?? null);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const active = useMemo(
    () => skills.find((s) => s.id === activeId) ?? null,
    [skills, activeId]
  );

  const createSkill = async (payload: {
    name: string;
    description: string;
    instructions: string;
    source: "inline" | "uploaded";
  }) => {
    setCreating(true);
    setError(null);
    const res = await fetch("/api/skills", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setError(body?.error || "create failed");
      return;
    }
    const s = body.skill as Skill;
    setSkills((curr) => [s, ...curr]);
    setActiveId(s.id);
  };

  const updateSkill = (id: string, patch: Partial<Skill>) => {
    setSkills((curr) => curr.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const deleteSkill = async (id: string) => {
    if (!confirm("Delete this skill? Agents using it will silently lose it.")) return;
    const res = await fetch(`/api/skills/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error || "delete failed");
      return;
    }
    setSkills((curr) => curr.filter((s) => s.id !== id));
    if (activeId === id) setActiveId(null);
  };

  return (
    <div className="-m-4 flex min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <aside className="flex w-[320px] shrink-0 flex-col border-r border-border/60 bg-card/20">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            skills
          </div>
          <NewSkillMenu onCreate={createSkill} creating={creating} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-5 py-6">
              <Loading label="loading skills" />
            </div>
          ) : skills.length === 0 ? (
            <div className="px-5 py-8 text-[13px] text-muted-foreground">
              No skills yet. Write one or upload a{" "}
              <span className="font-mono text-[11.5px]">SKILL.md</span>.
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {skills.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setActiveId(s.id)}
                    className={cn(
                      "group flex w-full flex-col items-start gap-1 px-5 py-3 text-left transition-colors",
                      activeId === s.id ? "bg-card/70" : "hover:bg-card/50"
                    )}
                  >
                    <div className="flex w-full items-center gap-2">
                      <span className="truncate text-[14px] font-medium tracking-tight">
                        {s.name}
                      </span>
                      <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground/70">
                        {s.source}
                      </span>
                    </div>
                    {s.description && (
                      <span className="line-clamp-2 text-[12px] text-muted-foreground">
                        {s.description}
                      </span>
                    )}
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
              className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] hover:text-destructive/80"
            >
              dismiss
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-hidden">
        {active ? (
          <SkillEditor
            key={active.id}
            skill={active}
            onChange={(patch) => updateSkill(active.id, patch)}
            onDelete={() => deleteSkill(active.id)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
            Select or create a skill.
          </div>
        )}
      </main>
    </div>
  );
}

function NewSkillMenu({
  onCreate,
  creating,
}: {
  onCreate: (p: {
    name: string;
    description: string;
    instructions: string;
    source: "inline" | "uploaded";
  }) => void;
  creating: boolean;
}) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    const text = await file.text();
    const parsed = parseSkillSource(text);
    const name = parsed.name || file.name.replace(/\.(md|markdown|txt)$/i, "");
    onCreate({
      name,
      description: parsed.description ?? "",
      instructions: parsed.instructions || text,
      source: "uploaded",
    });
    setOpen(false);
  };

  const handleBlank = () => {
    onCreate({
      name: "New skill",
      description: "",
      instructions:
        "# What this skill does\n\nDescribe the steps the agent should follow when this skill applies.\n",
      source: "inline",
    });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={creating}
        className={cn(
          "h-7 rounded-none border px-3 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
          open
            ? "border-primary/70 bg-primary/10 text-primary"
            : "border-border/70 bg-background/40 text-muted-foreground hover:border-primary/60 hover:text-foreground"
        )}
      >
        {creating ? "…" : "+ new"}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-[200px] border border-border/70 bg-background/95 shadow-lg backdrop-blur">
            <button
              onClick={handleBlank}
              className="flex w-full flex-col items-start border-b border-border/50 px-3 py-2 text-left hover:bg-card/70"
            >
              <span className="text-[12.5px] font-medium">Write a skill</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                start from blank
              </span>
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-card/70"
            >
              <span className="text-[12.5px] font-medium">Upload SKILL.md</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                .md with frontmatter
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function SkillEditor({
  skill,
  onChange,
  onDelete,
}: {
  skill: Skill;
  onChange: (patch: Partial<Skill>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(skill.name);
  const [description, setDescription] = useState(skill.description);
  const [instructions, setInstructions] = useState(skill.instructions);
  const [savedTick, setSavedTick] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedulePatch = useCallback(
    (patch: Record<string, unknown>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const res = await fetch(`/api/skills/${skill.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          const body = await res.json().catch(() => ({}));
          if (body?.skill) {
            onChange({
              name: body.skill.name,
              description: body.skill.description,
              instructions: body.skill.instructions,
            });
          }
          setSavedTick((t) => t + 1);
        }
      }, 400);
    },
    [skill.id, onChange]
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-3">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            schedulePatch({ name: e.target.value });
          }}
          className="max-w-[420px] flex-1 rounded-none border border-transparent bg-transparent px-0 py-1 text-[16px] font-medium tracking-tight focus:border-primary/40 focus:outline-none"
        />
        <div className="flex items-center gap-3">
          {savedTick > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
              autosaved
            </span>
          )}
          <button
            onClick={onDelete}
            className="inline-flex h-9 items-center rounded-none border border-border/70 bg-background/40 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:border-destructive/60 hover:text-destructive"
          >
            delete
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                schedulePatch({ description: e.target.value });
              }}
              placeholder="Short summary the agent reads to decide when to apply this skill."
              className="w-full resize-y rounded-none border border-border/70 bg-background/40 px-3 py-2 text-[14px] focus:border-primary/70 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Instructions
            </label>
            <textarea
              rows={22}
              value={instructions}
              onChange={(e) => {
                setInstructions(e.target.value);
                schedulePatch({ instructions: e.target.value });
              }}
              placeholder="Markdown. This is injected verbatim into the system prompt when the skill is attached to an agent."
              className="w-full resize-y rounded-none border border-border/70 bg-background/40 px-3 py-2 font-mono text-[12.5px] leading-relaxed focus:border-primary/70 focus:outline-none"
            />
            <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground/70">
              tip: upload a <span className="normal-case">SKILL.md</span> with{" "}
              <span className="normal-case">---</span> frontmatter (
              <span className="normal-case">name / description</span>) to auto-fill
              the fields.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
