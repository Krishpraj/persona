"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Loading } from "@/components/Loading";

type ConfigField = {
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
  transport: "sse" | "http";
  configSchema: ConfigField[];
};

type Integration = {
  id: string;
  template_id: string;
  label: string;
  config: Record<string, unknown>;
  secret_preview: string;
  is_active: boolean;
  template: {
    id: string;
    name: string;
    description: string;
    transport: "sse" | "http";
  } | null;
};

export default function McpSection() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateId, setTemplateId] = useState<string>("");
  const [label, setLabel] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/settings/mcp", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body?.error || "Failed to load MCPs");
      setLoading(false);
      return;
    }
    setTemplates(body.templates ?? []);
    setIntegrations(body.integrations ?? []);
    setTemplateId((prev) => prev || body.templates?.[0]?.id || "");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const template = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId]
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template || !label.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/settings/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        template_id: template.id,
        label: label.trim(),
        config: fields,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body?.error || "Add failed");
      return;
    }
    setLabel("");
    setFields({});
    load();
  };

  const toggleActive = async (id: string, next: boolean) => {
    const res = await fetch(`/api/settings/mcp/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ is_active: next }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error || "Update failed");
      return;
    }
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this MCP integration? Encrypted credentials are destroyed.")) return;
    const res = await fetch(`/api/settings/mcp/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error || "Delete failed");
      return;
    }
    setIntegrations((xs) => xs.filter((x) => x.id !== id));
  };

  return (
    <>
      <div className="mt-16 mb-10">
        <h1 className="text-[2rem] font-medium leading-[1.05] tracking-[-0.02em]">
          MCP Integrations
        </h1>
        <p className="mt-3 text-[15px] text-muted-foreground">
          Connect MCP servers, then grant individual agents access from the agent settings page.
        </p>
      </div>

      <section className="mb-12">
        <h2 className="mb-5 text-[18px] font-medium tracking-tight">Connect a server</h2>
        <form onSubmit={handleAdd} className="border border-border/70 bg-card/30">
          <div className="divide-y divide-border/60">
            <div className="grid grid-cols-1 gap-3 px-6 py-5 sm:grid-cols-[160px_1fr] sm:gap-6 sm:items-center">
              <label className="text-[14px] text-muted-foreground">Server type</label>
              <div className="flex flex-wrap gap-px bg-border/70 p-px">
                {templates.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => {
                      setTemplateId(t.id);
                      setFields({});
                    }}
                    className={cn(
                      "min-w-[200px] flex-1 px-4 py-2.5 text-left text-[13px] transition-colors",
                      templateId === t.id
                        ? "bg-primary/15 text-primary"
                        : "bg-card/40 text-foreground/80 hover:bg-card/80"
                    )}
                  >
                    <div>{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {t.transport.toUpperCase()} · {t.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 px-6 py-5 sm:grid-cols-[160px_1fr] sm:gap-6 sm:items-center">
              <label className="text-[14px] text-muted-foreground">Label</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="personal linear"
                className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[15px] focus:border-primary/70 focus:outline-none"
              />
            </div>

            {template?.configSchema.map((field) => (
              <div
                key={field.key}
                className="grid grid-cols-1 gap-3 px-6 py-5 sm:grid-cols-[160px_1fr] sm:gap-6 sm:items-center"
              >
                <label className="text-[14px] text-muted-foreground">
                  {field.label}
                  {!field.required && (
                    <span className="ml-2 text-[12px] text-muted-foreground/60">
                      optional
                    </span>
                  )}
                </label>
                <input
                  type={field.type === "password" ? "password" : field.type === "url" ? "url" : "text"}
                  value={fields[field.key] ?? ""}
                  onChange={(e) =>
                    setFields((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                  className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[15px] focus:border-primary/70 focus:outline-none"
                />
              </div>
            ))}

            <div className="flex items-center justify-end gap-4 bg-background/30 px-6 py-4">
              {error && <span className="text-[12px] text-destructive">{error}</span>}
              <button
                type="submit"
                disabled={!template || !label.trim() || busy}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-2 rounded-none border px-6 text-[14px] font-medium tracking-tight transition-colors",
                  !template || !label.trim() || busy
                    ? "cursor-not-allowed border-border/60 bg-card/40 text-muted-foreground"
                    : "border-primary/70 bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {busy ? "Connecting…" : "Connect"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-5 text-[18px] font-medium tracking-tight">Your integrations</h2>
        {loading ? (
          <Loading label="loading integrations" />
        ) : integrations.length === 0 ? (
          <div className="border border-dashed border-border/60 bg-card/20 px-6 py-10 text-center text-[14px] text-muted-foreground">
            No MCP integrations yet.
          </div>
        ) : (
          <ul className="divide-y divide-border/70 overflow-hidden border border-border/70 bg-card/30">
            {integrations.map((i) => {
              const url = (i.config?.url as string) || "";
              return (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center gap-4 px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "inline-flex h-6 items-center rounded-none border px-2 font-mono text-[10px] uppercase tracking-[0.18em]",
                          i.is_active
                            ? "border-primary/70 bg-primary/10 text-primary"
                            : "border-border/70 bg-background/40 text-muted-foreground"
                        )}
                      >
                        {i.is_active ? "active" : "inactive"}
                      </span>
                      <span className="truncate text-[15px] font-medium tracking-tight">
                        {i.label}
                      </span>
                    </div>
                    <div className="mt-1.5 truncate font-mono text-[11.5px] text-muted-foreground/80">
                      {i.template?.name ?? i.template_id} · {i.secret_preview}
                      {url ? ` · ${url}` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => toggleActive(i.id, !i.is_active)}
                      className="inline-flex h-8 items-center justify-center rounded-none border border-border/70 bg-background/40 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary/70 hover:text-primary"
                    >
                      {i.is_active ? "deactivate" : "activate"}
                    </button>
                    <button
                      onClick={() => remove(i.id)}
                      className="inline-flex h-8 items-center justify-center rounded-none border border-border/70 bg-background/40 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
                    >
                      delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
