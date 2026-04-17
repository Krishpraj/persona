"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Provider = "openai" | "anthropic" | "ollama";

type Credential = {
  id: string;
  provider: Provider;
  label: string;
  key_preview: string;
  base_url: string | null;
  model_default: string | null;
  is_active: boolean;
};

const PROVIDERS: { value: Provider; label: string; hint: string }[] = [
  { value: "openai", label: "OpenAI", hint: "gpt-4o, gpt-4o-mini" },
  { value: "anthropic", label: "Anthropic", hint: "claude-3-5-sonnet-latest" },
  { value: "ollama", label: "Ollama", hint: "llama3.1, mistral, gemma — self-hosted" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [creds, setCreds] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<Provider>("openai");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelDefault, setModelDefault] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/settings/llm", { cache: "no-store" });
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
    setCreds(body.credentials ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || busy) return;
    if (provider !== "ollama" && !apiKey.trim()) {
      setError("API key required");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/settings/llm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider,
        label: label.trim(),
        apiKey,
        base_url: baseUrl.trim() || null,
        model_default: modelDefault.trim() || null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body?.error || "Add failed");
      return;
    }
    setLabel("");
    setApiKey("");
    setBaseUrl("");
    setModelDefault("");
    load();
  };

  const handleActivate = async (id: string) => {
    const res = await fetch(`/api/settings/llm/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ is_active: true }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error || "Activate failed");
      return;
    }
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this credential? The encrypted key is destroyed.")) return;
    const res = await fetch(`/api/settings/llm/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error || "Delete failed");
      return;
    }
    setCreds((c) => c.filter((x) => x.id !== id));
  };

  return (
    <div className="-m-4 min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-8 py-12">
        <div className="mb-10">
          <h1 className="text-[2rem] font-medium leading-[1.05] tracking-[-0.02em]">
            Settings
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground">
            Add the LLM provider keys your agents will use. One active at a time.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="mb-5 text-[18px] font-medium tracking-tight">Add a key</h2>
          <form onSubmit={handleAdd} className="border border-border/70 bg-card/30">
            <div className="divide-y divide-border/60">
              <div className="grid grid-cols-1 gap-3 px-6 py-5 sm:grid-cols-[160px_1fr] sm:gap-6 sm:items-center">
                <label className="text-[14px] text-muted-foreground">Provider</label>
                <div className="flex flex-wrap gap-px bg-border/70 p-px">
                  {PROVIDERS.map((p) => (
                    <button
                      type="button"
                      key={p.value}
                      onClick={() => setProvider(p.value)}
                      className={cn(
                        "min-w-[140px] flex-1 px-4 py-2.5 text-[13px] transition-colors",
                        provider === p.value
                          ? "bg-primary/15 text-primary"
                          : "bg-card/40 text-foreground/80 hover:bg-card/80"
                      )}
                    >
                      <div>{p.label}</div>
                      <div className="text-[11px] text-muted-foreground">{p.hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 px-6 py-5 sm:grid-cols-[160px_1fr] sm:gap-6 sm:items-center">
                <label className="text-[14px] text-muted-foreground">Label</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="personal openai"
                  className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[15px] focus:border-primary/70 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 px-6 py-5 sm:grid-cols-[160px_1fr] sm:gap-6 sm:items-center">
                <label className="text-[14px] text-muted-foreground">
                  API key
                  {provider === "ollama" && (
                    <span className="ml-2 text-[12px] text-muted-foreground/60">
                      optional
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={provider === "ollama" ? "(leave blank)" : "sk-…"}
                  className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[15px] focus:border-primary/70 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 px-6 py-5 sm:grid-cols-[160px_1fr] sm:gap-6 sm:items-center">
                <label className="text-[14px] text-muted-foreground">
                  Base URL
                  <span className="ml-2 text-[12px] text-muted-foreground/60">
                    optional
                  </span>
                </label>
                <input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={
                    provider === "ollama"
                      ? "http://localhost:11434/api"
                      : "leave blank for default"
                  }
                  className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[15px] focus:border-primary/70 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 px-6 py-5 sm:grid-cols-[160px_1fr] sm:gap-6 sm:items-center">
                <label className="text-[14px] text-muted-foreground">
                  Default model
                  <span className="ml-2 text-[12px] text-muted-foreground/60">
                    optional
                  </span>
                </label>
                <input
                  value={modelDefault}
                  onChange={(e) => setModelDefault(e.target.value)}
                  placeholder={
                    provider === "openai"
                      ? "gpt-4o-mini"
                      : provider === "anthropic"
                      ? "claude-3-5-sonnet-latest"
                      : "llama3.1"
                  }
                  className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[15px] focus:border-primary/70 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-4 bg-background/30 px-6 py-4">
                {error && <span className="text-[12px] text-destructive">{error}</span>}
                <button
                  type="submit"
                  disabled={!label.trim() || busy}
                  className={cn(
                    "inline-flex h-10 items-center justify-center gap-2 rounded-none border px-6 text-[14px] font-medium tracking-tight transition-colors",
                    !label.trim() || busy
                      ? "cursor-not-allowed border-border/60 bg-card/40 text-muted-foreground"
                      : "border-primary/70 bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {busy ? "Adding…" : "Add key"}
                </button>
              </div>
            </div>
          </form>
        </section>

        <section>
          <h2 className="mb-5 text-[18px] font-medium tracking-tight">Your keys</h2>
          {loading ? (
            <div className="border border-dashed border-border/60 bg-card/20 px-6 py-10 text-center text-[14px] text-muted-foreground">
              Loading…
            </div>
          ) : creds.length === 0 ? (
            <div className="border border-dashed border-border/60 bg-card/20 px-6 py-10 text-center text-[14px] text-muted-foreground">
              No credentials yet.
            </div>
          ) : (
            <ul className="divide-y divide-border/70 overflow-hidden border border-border/70 bg-card/30">
              {creds.map((c) => (
                <li
                  key={c.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-4"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-medium tracking-tight">
                      {c.label}
                    </div>
                    <div className="mt-1 text-[12.5px] text-muted-foreground">
                      {c.provider} · {c.key_preview}
                      {c.model_default ? ` · ${c.model_default}` : ""}
                      {c.base_url ? ` · ${c.base_url}` : ""}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[11px] uppercase tracking-[0.12em]",
                      c.is_active ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {c.is_active ? "active" : "inactive"}
                  </span>
                  {!c.is_active && (
                    <button
                      onClick={() => handleActivate(c.id)}
                      className="text-[12px] text-muted-foreground hover:text-primary"
                    >
                      activate
                    </button>
                  )}
                  {c.is_active && <span />}
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-[12px] text-muted-foreground hover:text-destructive"
                  >
                    delete
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
