"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type AgentSummary = {
  id: string;
  name: string;
  role: string | null;
  description: string | null;
  public_slug: string;
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

type Props = {
  agent: AgentSummary;
  /** Prompts shown as quick-start chips before the user sends anything. */
  suggestions?: string[];
  /** Tight mode drops the hero header (used by the iframe embed). */
  embed?: boolean;
};

const DEFAULT_SUGGESTIONS = [
  "What can you help me with?",
  "Summarize the project data.",
  "Walk me through how you reason about a question.",
];

export function AgentChatWidget({ agent, suggestions, embed = false }: Props) {
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const quickPrompts = useMemo(
    () => (suggestions && suggestions.length ? suggestions : DEFAULT_SUGGESTIONS),
    [suggestions]
  );

  useEffect(() => {
    // Auto-scroll to bottom on new content.
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history, busy]);

  const send = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || busy) return;
      setError(null);
      setBusy(true);
      const next: ChatTurn[] = [...history, { role: "user", content: trimmed }];
      setHistory(next);
      setInput("");
      try {
        const res = await fetch(`/api/public/a/${agent.public_slug}/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: trimmed, history }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setHistory([
            ...next,
            {
              role: "assistant",
              content: `(error) ${body?.error ?? "chat failed"}`,
            },
          ]);
          setError(body?.error ?? "chat failed");
        } else {
          setHistory([
            ...next,
            { role: "assistant", content: body.reply ?? "(no reply)" },
          ]);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "network error";
        setHistory([
          ...next,
          { role: "assistant", content: `(error) ${msg}` },
        ]);
        setError(msg);
      } finally {
        setBusy(false);
      }
    },
    [agent.public_slug, busy, history]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-background text-foreground",
        embed ? "border-0" : ""
      )}
    >
      {!embed && <Hero agent={agent} />}

      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto",
          embed ? "px-4 py-4" : "px-6 py-8 sm:px-10"
        )}
      >
        <div
          className={cn(
            "mx-auto flex w-full flex-col gap-5",
            embed ? "max-w-full" : "max-w-3xl"
          )}
        >
          {history.length === 0 ? (
            <Empty
              agent={agent}
              suggestions={quickPrompts}
              onPick={(q) => send(q)}
              embed={embed}
            />
          ) : (
            history.map((t, i) => <Bubble key={i} turn={t} />)
          )}
          {busy && <Typing />}
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className={cn(
          "border-t border-border/60 bg-background/90 backdrop-blur",
          embed ? "px-3 py-3" : "px-6 py-4 sm:px-10"
        )}
      >
        <div
          className={cn(
            "mx-auto flex w-full items-stretch gap-2",
            embed ? "max-w-full" : "max-w-3xl"
          )}
        >
          <div className="flex h-10 flex-1 items-stretch border border-border/70 bg-card/30 focus-within:border-primary/60">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              disabled={busy}
              placeholder={`Ask ${agent.name}…`}
              className="block w-full resize-none bg-transparent px-3 text-[14px] leading-[38px] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className={cn(
              "inline-flex h-10 shrink-0 items-center rounded-none border px-4 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
              busy || !input.trim()
                ? "cursor-not-allowed border-border/60 bg-card/40 text-muted-foreground"
                : "border-foreground bg-foreground text-background hover:bg-foreground/90"
            )}
          >
            {busy ? "…" : "send"}
          </button>
        </div>
        {error && (
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11.5px] text-destructive">
            {error}
          </p>
        )}
        {!embed && (
          <p className="mx-auto mt-3 max-w-3xl text-center text-[11px] text-muted-foreground/70">
            Shift + Enter for a newline.
          </p>
        )}
      </form>
    </div>
  );
}

function Hero({ agent }: { agent: AgentSummary }) {
  return (
    <header className="border-b border-border/60">
      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-10">
        <div className="flex items-start gap-4">
          <AgentMark name={agent.name} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[2rem] font-medium leading-[1.05] tracking-[-0.025em] sm:text-[2.25rem]">
              {agent.name}
            </h1>
            {agent.role && (
              <div className="mt-1 text-[13.5px] text-muted-foreground">
                {agent.role}
              </div>
            )}
            {agent.description && (
              <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-muted-foreground">
                {agent.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function AgentMark({ name }: { name: string }) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <div
      aria-hidden
      className="flex h-12 w-12 shrink-0 items-center justify-center border border-foreground/80 bg-foreground text-background"
    >
      <span className="font-mono text-[18px] font-medium leading-none">
        {initial}
      </span>
    </div>
  );
}

function Empty({
  agent,
  suggestions,
  onPick,
  embed,
}: {
  agent: AgentSummary;
  suggestions: string[];
  onPick: (q: string) => void;
  embed: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border border-dashed border-border/60 bg-card/30",
        embed ? "px-4 py-6" : "px-6 py-10"
      )}
    >
      <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
        Try one of these
      </div>
      <ul className="flex flex-col gap-2">
        {suggestions.map((q) => (
          <li key={q}>
            <button
              onClick={() => onPick(q)}
              className="w-full border border-border/60 bg-background/40 px-3 py-2 text-left text-[13.5px] transition-colors hover:border-primary/60 hover:bg-background/70"
            >
              {q}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-[11.5px] text-muted-foreground">
        Or type your own question to chat with {agent.name}.
      </p>
    </div>
  );
}

function Bubble({ turn }: { turn: ChatTurn }) {
  const isUser = turn.role === "user";
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-1.5",
        isUser ? "items-end" : "items-start"
      )}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {isUser ? "you" : "agent"}
      </div>
      <div
        className={cn(
          "max-w-[85%] border px-4 py-3 text-[14.5px] leading-relaxed",
          isUser
            ? "border-foreground/25 bg-foreground text-background"
            : "border-border/70 bg-card/40 text-foreground"
        )}
      >
        <div className="whitespace-pre-wrap break-words">
          {renderText(turn.content)}
        </div>
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        agent
      </div>
      <div
        className="inline-flex items-center gap-1.5 border border-border/70 bg-card/40 px-4 py-3"
        aria-label="agent is typing"
      >
        <Dot delay={0} />
        <Dot delay={180} />
        <Dot delay={360} />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/70"
      style={{
        animation: "typing-dot 1.1s ease-in-out infinite",
        animationDelay: `${delay}ms`,
      }}
    />
  );
}

// Very light inline formatting — bold **x**, italic *x*, `code`, and naked URLs.
// Keeps assistant responses scannable without bringing in a markdown dep.
function renderText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|https?:\/\/\S+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={`b-${key++}`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={`c-${key++}`}
          className="rounded-none border border-border/60 bg-card/60 px-1 font-mono text-[12.5px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("*")) {
      parts.push(
        <em key={`i-${key++}`} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else {
      parts.push(
        <a
          key={`u-${key++}`}
          href={token}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline-offset-2 hover:underline"
        >
          {token}
        </a>
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
