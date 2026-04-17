"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Agent = {
  id: string;
  name: string;
  role: string | null;
  description: string | null;
  public_slug: string;
};

type ChatTurn = { role: "user" | "assistant"; content: string };

export default function PublicAgentPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/public/a/${slug}`, { cache: "no-store" });
      if (res.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || "Failed to load");
        setLoading(false);
        return;
      }
      setAgent(body.agent);
      setLoading(false);
    }
    load();
  }, [slug]);

  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const message = input.trim();
      if (!message || busy) return;
      setBusy(true);
      const next: ChatTurn[] = [...history, { role: "user", content: message }];
      setHistory(next);
      setInput("");
      const res = await fetch(`/api/public/a/${slug}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const body = await res.json().catch(() => ({}));
      setBusy(false);
      if (!res.ok) {
        setHistory([
          ...next,
          { role: "assistant", content: `(error) ${body?.error ?? "chat failed"}` },
        ]);
        return;
      }
      setHistory([
        ...next,
        { role: "assistant", content: body.reply ?? "(no reply)" },
      ]);
    },
    [busy, history, input, slug]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-[14px] text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background text-foreground">
        <p className="text-[18px] font-medium">Agent not found</p>
        <p className="text-[13px] text-muted-foreground">
          It may have been unpublished or the URL is incorrect.
        </p>
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="text-[18px] font-medium tracking-tight">{agent.name}</div>
          <div className="text-[12.5px] text-muted-foreground">
            {agent.role ? `${agent.role} · ` : ""}
            {agent.description || "published agent"}
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-3xl flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {history.length === 0 ? (
            <div className="mx-auto max-w-md rounded-none border border-dashed border-border/60 bg-card/20 px-6 py-10 text-center text-[14px] text-muted-foreground">
              Ask {agent.name} a question to get started.
            </div>
          ) : (
            history.map((t, i) => (
              <div
                key={i}
                className="mb-5 border-l-2 border-border/60 pl-4"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {t.role}
                </div>
                <div className="mt-1 whitespace-pre-wrap text-[14.5px]">
                  {t.content}
                </div>
              </div>
            ))
          )}
        </div>
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 border-t border-border/60 bg-background/80 p-4"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            className="flex-1 rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[14px] focus:border-primary/70 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-10 border border-primary/70 bg-primary px-5 text-[13px] text-primary-foreground disabled:opacity-60"
          >
            {busy ? "…" : "Send"}
          </button>
        </form>
      </main>
    </div>
  );
}
