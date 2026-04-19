"use client";

import { cn } from "@/lib/utils";

/**
 * Anatomy of a published agent — three stacked panels showing the real pieces
 * of the platform: a project with data sources, an agent wired to skills +
 * MCPs, and the three endpoints you get after publishing. Layout matches the
 * stats row: shared borders via `divide-*`, no floating arrow columns.
 */

const SOURCES = [
  { kind: "doc", name: "Spec v2" },
  { kind: "pdf", name: "Runbook.pdf" },
  { kind: "csv", name: "orders_2024.csv" },
  { kind: "graph", name: "Taxonomy" },
];

const ATTACHMENTS = [
  { kind: "built-in", name: "Project knowledge", note: "auto" },
  { kind: "mcp", name: "Linear", note: "http · bearer" },
  { kind: "skill", name: "Cite source docs", note: "uploaded" },
];

const ENDPOINTS = [
  { label: "URL", mono: "persona.app/a/finance-lead-x8k" },
  { label: "iframe", mono: '<iframe src="…/embed/finance-lead-x8k" />' },
  { label: "API", mono: "POST /api/public/a/…/chat" },
];

export function AgentAnatomy() {
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between gap-4 border-b border-foreground/20 px-6 py-5 sm:px-10">
        <h3 className="text-[18px] font-medium tracking-[-0.015em]">
          A published agent, end-to-end.
        </h3>
        <span className="hidden text-[12.5px] text-muted-foreground sm:inline">
          project → agent → endpoints
        </span>
      </div>

      <div className="grid grid-cols-1 divide-y divide-foreground/20 md:grid-cols-3 md:divide-x md:divide-y-0">
        <Panel step="01" kicker="project" title="Finance ops">
          <ul className="flex flex-col gap-1.5">
            {SOURCES.map((s) => (
              <li
                key={s.name}
                className="flex items-center gap-2 text-[13px] text-foreground/90"
              >
                <Chip>{s.kind}</Chip>
                <span className="truncate">{s.name}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel step="02" kicker="agent" title="finance-lead">
          <ul className="flex flex-col gap-1.5">
            {ATTACHMENTS.map((a) => (
              <li
                key={a.name}
                className="flex items-center gap-2 text-[13px] text-foreground/90"
              >
                <Chip tone={a.kind === "built-in" ? "accent" : "default"}>
                  {a.kind}
                </Chip>
                <span className="truncate font-medium">{a.name}</span>
                <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {a.note}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel step="03" kicker="endpoints" title="Live, one click">
          <ul className="flex flex-col gap-1.5">
            {ENDPOINTS.map((e) => (
              <li
                key={e.label}
                className="flex items-center gap-3 text-[13px] text-foreground/90"
              >
                <Chip>{e.label}</Chip>
                <span className="truncate font-mono text-[11.5px]">
                  {e.mono}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ step, kicker, title, children }) {
  return (
    <div className="flex flex-col gap-4 px-6 py-7 sm:px-8">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[22px] font-medium leading-none tracking-[-0.02em] text-primary">
          {step}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {kicker}
        </span>
      </div>
      <h4 className="text-[17px] font-medium tracking-[-0.015em]">{title}</h4>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Chip({ children, tone = "default" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center border px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.18em]",
        tone === "accent"
          ? "border-primary/60 bg-primary/15 text-foreground"
          : "border-foreground/25 bg-background/60 text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}
