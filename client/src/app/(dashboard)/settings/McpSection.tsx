"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loading } from "@/components/Loading";
import { cn } from "@/lib/utils";

type McpConfigField = {
  key: string;
  label: string;
  placeholder?: string;
  required: boolean;
  secret: boolean;
  type?: "text" | "url" | "password";
};

type Template = {
  id: string;
  name: string;
  description: string;
  kind: "builtin" | "external";
  transport?: "sse" | "http";
  configSchema: McpConfigField[];
};

type Integration = {
  id: string;
  template_id: string;
  label: string;
  is_active: boolean;
  project_id: string | null;
  config: Record<string, unknown>;
  secret_preview: string;
  template: {
    id: string;
    name: string;
    description: string;
    kind: "builtin" | "external";
    transport?: "sse" | "http";
  } | null;
};

export default function McpSection() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/settings/mcp", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body?.error || "Failed to load MCPs");
      setLoading(false);
      return;
    }
    setIntegrations((body.integrations ?? []) as Integration[]);
    setTemplates((body.templates ?? []) as Template[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const projectKnowledge = integrations.filter(
    (i) => i.template_id === "project-knowledge"
  );
  const external = integrations.filter(
    (i) => i.template?.kind === "external"
  );
  const externalTemplates = useMemo(
    () => templates.filter((t) => t.kind === "external"),
    [templates]
  );

  const deleteIntegration = async (id: string) => {
    if (!confirm("Remove this MCP? Agents that had it enabled will silently lose access.")) return;
    const res = await fetch(`/api/settings/mcp/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error || "delete failed");
      return;
    }
    setIntegrations((curr) => curr.filter((i) => i.id !== id));
  };

  return (
    <>
      <div className="mt-16 mb-10">
        <h1 className="text-[2rem] font-medium leading-[1.05] tracking-[-0.02em]">
          MCP Integrations
        </h1>
        <p className="mt-3 text-[15px] text-muted-foreground">
          Every project comes with one built-in MCP — <em>Project Knowledge</em> —
          that exposes the docs, node graphs and CSVs you attach to it. You can
          also connect external MCP servers and opt individual agents into them.
        </p>
      </div>

      {error && (
        <div className="mb-6 border border-destructive/60 bg-destructive/10 px-4 py-2 text-[12px] text-destructive">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] hover:text-destructive/80"
          >
            dismiss
          </button>
        </div>
      )}

      <section>
        <h2 className="mb-5 text-[18px] font-medium tracking-tight">
          Project Knowledge MCP
        </h2>
        {loading ? (
          <Loading label="loading integrations" />
        ) : projectKnowledge.length === 0 ? (
          <div className="border border-dashed border-border/60 bg-card/20 px-6 py-10 text-center text-[14px] text-muted-foreground">
            No projects yet — create one to get a Project Knowledge MCP.
          </div>
        ) : (
          <ul className="divide-y divide-border/70 overflow-hidden border border-border/70 bg-card/30">
            {projectKnowledge.map((i) => (
              <li
                key={i.id}
                className="flex items-center gap-4 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium tracking-tight">
                    {i.label}
                  </div>
                  <div className="mt-1 truncate font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    auto · {i.is_active ? "active" : "inactive"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-medium tracking-tight">External MCPs</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Connect any server that speaks the MCP protocol over HTTP or SSE.
            </p>
          </div>
          {!loading && (
            <button
              onClick={() => setAdding((v) => !v)}
              className={cn(
                "inline-flex h-9 items-center rounded-none border px-4 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
                adding
                  ? "border-border/70 bg-card/40 text-foreground"
                  : "border-primary/70 bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {adding ? "cancel" : "+ add external"}
            </button>
          )}
        </div>

        {adding && (
          <AddExternalForm
            templates={externalTemplates}
            onCreated={(next) => {
              setIntegrations((curr) => [next, ...curr]);
              setAdding(false);
            }}
            onError={setError}
          />
        )}

        {loading ? null : external.length === 0 ? (
          <div className="border border-dashed border-border/60 bg-card/20 px-6 py-10 text-center text-[14px] text-muted-foreground">
            No external MCPs yet. Add one above.
          </div>
        ) : (
          <ul className="divide-y divide-border/70 overflow-hidden border border-border/70 bg-card/30">
            {external.map((i) => (
              <ExternalRow
                key={i.id}
                integration={i}
                onDelete={() => deleteIntegration(i.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function AddExternalForm({
  templates,
  onCreated,
  onError,
}: {
  templates: Template[];
  onCreated: (i: Integration) => void;
  onError: (msg: string) => void;
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const tpl = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tpl || !label.trim() || busy) return;
    setBusy(true);
    const res = await fetch("/api/settings/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        template_id: tpl.id,
        label: label.trim(),
        config,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      onError(body?.error || "failed to add");
      return;
    }
    onCreated(body.integration as Integration);
    setLabel("");
    setConfig({});
  };

  if (!tpl) {
    return (
      <div className="mb-6 border border-border/70 bg-card/30 px-5 py-4 text-[13px] text-muted-foreground">
        No external templates registered.
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 border border-border/70 bg-card/30"
    >
      <div className="divide-y divide-border/60">
        <FormRow label="Transport">
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2 text-[13.5px] focus:border-primary/70 focus:outline-none"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            {tpl.description}
          </p>
        </FormRow>

        <FormRow label="Label">
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Linear, GitHub, internal tools…"
            className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2 text-[14px] focus:border-primary/70 focus:outline-none"
          />
        </FormRow>

        {tpl.configSchema.map((field) => (
          <FormRow key={field.key} label={field.label}>
            <input
              type={
                field.type === "password"
                  ? "password"
                  : field.type === "url"
                  ? "url"
                  : "text"
              }
              value={config[field.key] ?? ""}
              onChange={(e) =>
                setConfig((c) => ({ ...c, [field.key]: e.target.value }))
              }
              placeholder={field.placeholder}
              required={field.required}
              className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2 text-[14px] focus:border-primary/70 focus:outline-none"
            />
            {field.secret && (
              <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground/70">
                stored in vault · never shown again
              </p>
            )}
          </FormRow>
        ))}

        <div className="flex items-center justify-end gap-3 bg-background/30 px-5 py-3">
          <button
            type="submit"
            disabled={!label.trim() || busy}
            className={cn(
              "inline-flex h-9 items-center rounded-none border px-5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
              !label.trim() || busy
                ? "cursor-not-allowed border-border/60 bg-card/40 text-muted-foreground"
                : "border-primary/70 bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {busy ? "adding…" : "add integration"}
          </button>
        </div>
      </div>
    </form>
  );
}

function FormRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[160px_1fr] sm:items-start sm:gap-6">
      <label className="pt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </label>
      <div>{children}</div>
    </div>
  );
}

function ExternalRow({
  integration,
  onDelete,
}: {
  integration: Integration;
  onDelete: () => void;
}) {
  const url = (integration.config?.url as string) || "";
  const transport = integration.template?.transport ?? "http";
  return (
    <li className="flex items-start gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] font-medium tracking-tight">
            {integration.label}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
            {transport}
          </span>
          {!integration.is_active && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-destructive/80">
              paused
            </span>
          )}
        </div>
        {url && (
          <div className="mt-1 truncate font-mono text-[11.5px] text-muted-foreground">
            {url}
          </div>
        )}
        <div className="mt-1 truncate font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground/80">
          auth · {integration.secret_preview || "no auth"}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="shrink-0 text-[18px] leading-none text-muted-foreground/60 hover:text-destructive"
        title="Remove"
      >
        ×
      </button>
    </li>
  );
}
