"use client";

import { useEffect, useRef, useState } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { cn } from "@/lib/utils";

/* ——————————————————————————————————————————————————————————————
 * Scripted multi-turn demo. Scroll 0→1 drives the whole thing.
 * —————————————————————————————————————————————————————————————— */

const SCRIPT = [
  {
    id: "u1",
    role: "user",
    appearAt: 0.03,
    attachment: {
      src: "/1.png",
      name: "customer-feedback.png",
      size: "1.4 MB",
      uploadRange: [0.03, 0.09],
    },
    text: "Can you summarize this customer feedback screenshot?",
    textRange: [0.11, 0.2],
  },
  {
    id: "a1",
    role: "agent",
    appearAt: 0.23,
    tool: {
      label: "Analyzed image",
      detail: "customer-feedback.png",
      stages: { call: 0.23, run: 0.26, done: 0.31 },
    },
    text:
      "Three themes stand out — onboarding friction, CSV export bugs, and pricing pushback. Want me to map these to nodes in your graph?",
    textRange: [0.33, 0.5],
  },
  {
    id: "u2",
    role: "user",
    appearAt: 0.53,
    text: "Yes, map them to existing nodes.",
    textRange: [0.53, 0.61],
  },
  {
    id: "a2",
    role: "agent",
    appearAt: 0.64,
    tool: {
      label: "Traversed knowledge graph",
      detail: "3 entities · 12 nodes scanned",
      stages: { call: 0.64, run: 0.67, done: 0.73 },
    },
    text:
      "Matched 2 of 3: Onboarding → Email verification, Export → CSV pipeline. There's no node for pricing yet — I can draft one if you'd like.",
    textRange: [0.75, 0.9],
    citations: {
      items: ["acme-q3.md", "onboarding-flow.md", "export-pipeline.md"],
      range: [0.91, 0.98],
    },
  },
];

/* ——————————————————————————————————————————————————————————————
 * helpers
 * —————————————————————————————————————————————————————————————— */

const easeOut = (t) => 1 - Math.pow(1 - t, 2);

function progressOf(p, [start, end]) {
  if (p <= start) return 0;
  if (p >= end) return 1;
  return easeOut((p - start) / (end - start));
}

function charsFor(text, p, range) {
  const t = progressOf(p, range);
  if (t === 0) return 0;
  if (t === 1) return text.length;
  return Math.max(1, Math.floor(t * text.length));
}

function Plus({ className }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute font-mono text-[14px] leading-none text-primary/60 select-none",
        className
      )}
    >
      +
    </span>
  );
}

function Cursor() {
  return (
    <span
      aria-hidden
      className="ml-1 inline-block h-[1em] w-[2px] -translate-y-[1px] animate-pulse bg-foreground/70 align-middle"
    />
  );
}

function AgentMark() {
  return (
    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-primary/40 bg-primary/10">
      <span className="font-mono text-[11px] font-medium text-primary/90">
        P
      </span>
    </div>
  );
}

function SendIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}

function PaperclipIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.99 8.8l-8.58 8.57a2 2 0 0 1-2.83-2.83l7.93-7.93" />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/* ——————————————————————————————————————————————————————————————
 * pieces
 * —————————————————————————————————————————————————————————————— */

function AttachmentCard({ attachment, progress }) {
  const t = progressOf(progress, attachment.uploadRange);
  const uploaded = t >= 1;
  const pct = Math.round(t * 100);

  return (
    <div className="flex items-center gap-3 rounded-sm border border-border/60 bg-card/80 p-2 pr-3">
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-sm border border-border/50 bg-background/60">
        {uploaded ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.src}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            <div
              className="absolute inset-x-0 bottom-0 bg-primary/25"
              style={{ height: `${pct}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-[9.5px] font-medium text-primary/90">
                {pct}%
              </span>
            </div>
          </>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-foreground/90">
          {attachment.name}
        </div>
        <div className="mt-0.5 text-[11.5px] text-muted-foreground">
          {uploaded ? (
            <span className="inline-flex items-center gap-1">
              <CheckIcon className="h-3 w-3 text-primary/90" />
              Uploaded · {attachment.size}
            </span>
          ) : (
            <>Uploading · {attachment.size}</>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolNotice({ tool, progress }) {
  const { call, run, done } = tool.stages;
  const isDone = progress >= done;
  const isRunning = !isDone && progress >= call;

  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-sm border border-border/50 bg-background/40 px-3 py-1.5 text-[12.5px] text-muted-foreground">
      {isDone ? (
        <CheckIcon className="h-3.5 w-3.5 shrink-0 text-primary/90" />
      ) : (
        <span
          aria-hidden
          className={cn(
            "h-3.5 w-3.5 shrink-0 rounded-full border-2 border-primary/30 border-t-primary",
            isRunning && "animate-spin"
          )}
        />
      )}
      <span className="truncate">
        <span className="text-foreground/85">{tool.label}</span>
        {tool.detail && (
          <>
            <span className="mx-1.5 text-border">·</span>
            <span>{tool.detail}</span>
          </>
        )}
      </span>
    </div>
  );
}

function UserMessage({ turn, progress }) {
  const typed = turn.text ? charsFor(turn.text, progress, turn.textRange) : 0;
  const typing = turn.text && typed > 0 && typed < turn.text.length;

  return (
    <div className="flex flex-col items-end gap-2 px-6 py-4">
      {turn.attachment && (
        <div className="w-[280px] max-w-[80%]">
          <AttachmentCard attachment={turn.attachment} progress={progress} />
        </div>
      )}
      {turn.text && typed > 0 && (
        <div className="max-w-[80%] whitespace-pre-wrap rounded-sm border border-border/60 bg-card px-4 py-2.5 text-[14.5px] leading-[1.55] text-foreground">
          {turn.text.slice(0, typed)}
          {typing && <Cursor />}
        </div>
      )}
    </div>
  );
}

function AgentMessage({ turn, progress }) {
  const typed = turn.text ? charsFor(turn.text, progress, turn.textRange) : 0;
  const typing = turn.text && typed > 0 && typed < turn.text.length;
  const showCitations = turn.citations && progress >= turn.citations.range[0];
  const citeT = turn.citations ? progressOf(progress, turn.citations.range) : 0;
  const citeCount = turn.citations
    ? Math.floor(citeT * turn.citations.items.length)
    : 0;

  return (
    <div
      className="flex gap-3 px-6 py-4"
      aria-live="polite"
      aria-atomic="false"
    >
      <AgentMark />
      <div className="min-w-0 flex-1 space-y-3">
        {turn.tool && <ToolNotice tool={turn.tool} progress={progress} />}
        {typed > 0 && (
          <div className="whitespace-pre-wrap text-[14.5px] leading-[1.65] text-foreground/90">
            {turn.text.slice(0, typed)}
            {typing && <Cursor />}
          </div>
        )}
        {showCitations && citeCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {turn.citations.items.slice(0, citeCount).map((src, i) => (
              <a
                key={src}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border/60 bg-background/40 px-2.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <span className="font-mono text-[10px] text-primary/80">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{src}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ——————————————————————————————————————————————————————————————
 * container
 * —————————————————————————————————————————————————————————————— */

export function HeroChat({ title }) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const [p, setP] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", setP);

  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const on = (e) => setReduced(e.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  const progress = reduced ? 1 : p;

  const visibleTurns = SCRIPT.filter((t) => progress >= t.appearAt);

  return (
    <section
      ref={containerRef}
      className="relative h-[260vh] border-b border-border/60"
      aria-label="Persona chat demo"
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="grid-bg absolute inset-0" aria-hidden />
        <div className="amber-wash absolute inset-0" aria-hidden />

        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>{title}</div>

          <div className="relative">
            <Plus className="-left-[6px] -top-[6px]" />
            <Plus className="-right-[6px] -top-[6px]" />
            <Plus className="-left-[6px] -bottom-[6px]" />
            <Plus className="-right-[6px] -bottom-[6px]" />

            <div className="relative overflow-hidden rounded-md border border-border/80 bg-card/80 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.65)] backdrop-blur-md">
              {/* accent rail */}
              <div
                className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
                aria-hidden
              />

              {/* messages — fixed height, bottom-anchored, older turns clip at top */}
              <div className="relative h-[30rem] overflow-hidden bg-background/10">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-card/95 via-card/50 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 flex flex-col">
                  {visibleTurns.map((turn) =>
                    turn.role === "user" ? (
                      <UserMessage
                        key={turn.id}
                        turn={turn}
                        progress={progress}
                      />
                    ) : (
                      <AgentMessage
                        key={turn.id}
                        turn={turn}
                        progress={progress}
                      />
                    )
                  )}
                </div>
              </div>

              {/* input */}
              <div className="border-t border-border/60 bg-background/40 p-3">
                <div className="flex items-end gap-2 rounded-sm border border-border/70 bg-card/80 px-3 py-2.5 focus-within:border-primary/50">
                  <button
                    type="button"
                    aria-label="Attach file"
                    className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <PaperclipIcon className="h-4 w-4" />
                  </button>
                  <div className="flex-1 text-[13.5px] leading-[1.5] text-muted-foreground/80">
                    Ask anything about your graph…
                  </div>
                  <button
                    type="button"
                    aria-label="Send"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <SendIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-10 -bottom-6 h-10 rounded-full bg-primary/25 blur-3xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
