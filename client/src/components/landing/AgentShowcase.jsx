"use client";

import { useEffect, useState } from "react";
import { AsciiField } from "./AsciiField";
import { cn } from "@/lib/utils";

/* ——————————————————————————————————————————————————————————————
 * AgentShowcase — atmospheric showcase over an ASCII backdrop.
 * Four glass cards; each runs a short sequence that mirrors a real
 * product surface.
 * —————————————————————————————————————————————————————————————— */

const STEP_COUNT = 8;
const STEP_MS = 850;

function useStep() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (m.matches) {
      setStep(STEP_COUNT - 1);
      return;
    }
    const id = setInterval(
      () => setStep((s) => (s + 1) % STEP_COUNT),
      STEP_MS
    );
    return () => clearInterval(id);
  }, []);
  return step;
}

function Fade({ show, delay = 0, y = 2, className, children }) {
  return (
    <div
      className={cn(
        "transition-all duration-500 ease-out",
        show ? "translate-y-0 opacity-100" : "opacity-0",
        className
      )}
      style={{
        transform: show ? "translateY(0)" : `translateY(${y}px)`,
        transitionDelay: show ? `${delay}ms` : "0ms",
      }}
    >
      {children}
    </div>
  );
}

function Check({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
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

function Spin({ className, spin }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block rounded-full border-2 border-primary/25 border-t-primary",
        spin && "animate-spin",
        className
      )}
    />
  );
}

function useChars(text, show, charsAtStep) {
  return show ? charsAtStep : 0;
}

/* ——————————————————————————————————————————————————————————————
 * Demo 1 — projectknowledge__search
 *   user prompt → tool call → retrieved source chips → streaming
 *   answer with inline [1][2] citations that light up as each
 *   source is referenced.
 * —————————————————————————————————————————————————————————————— */

const SEARCH_SOURCES = [
  { n: 1, file: "acme-q3.md",      snip: "onboarding friction cited by 7 accounts" },
  { n: 2, file: "exports-bugs.md", snip: "CSV export returns 500 under load" },
];

const SEARCH_FULL =
  "Two themes stand out — onboarding friction and export bugs.";

function SearchDemo({ step }) {
  const showQuery = step >= 1;
  const showCall = step >= 2;
  const callDone = step >= 3;
  const showSources = step >= 3;
  const answerChars =
    step >= 7 ? SEARCH_FULL.length
    : step >= 6 ? 40
    : step >= 5 ? 22
    : 0;
  const showCite1 = step >= 6;
  const showCite2 = step >= 7;

  return (
    <div className="flex flex-col gap-2">
      {/* user prompt bubble */}
      <Fade show={showQuery}>
        <div className="ml-auto max-w-[85%] border border-foreground/10 bg-card/80 px-2.5 py-1.5 text-[11.5px] leading-[1.4] text-foreground/85">
          Summarize Q3 feedback.
        </div>
      </Fade>

      {/* tool call line */}
      <Fade show={showCall}>
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
          {callDone ? (
            <Check className="h-3 w-3 text-primary" />
          ) : (
            <Spin className="h-3 w-3" spin={showCall && !callDone} />
          )}
          <span className="text-primary">search</span>
          <span className="text-foreground/20">·</span>
          <span>{callDone ? "2 matches" : "retrieving…"}</span>
        </div>
      </Fade>

      {/* retrieved source chips — cite numbers light up when referenced */}
      <Fade show={showSources}>
        <div className="flex flex-col gap-1">
          {SEARCH_SOURCES.map((s, i) => {
            const cited = (i === 0 && showCite1) || (i === 1 && showCite2);
            return (
              <div
                key={s.n}
                className={cn(
                  "flex items-baseline gap-2 border-l-2 pl-2 text-[10.5px] leading-[1.35] transition-colors duration-500",
                  cited ? "border-primary" : "border-foreground/15"
                )}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span
                  className={cn(
                    "font-mono text-[9.5px] transition-colors duration-500",
                    cited ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  [{s.n}]
                </span>
                <span className="min-w-0 truncate text-muted-foreground">
                  <span className="text-foreground/75">{s.file}</span>
                  <span className="text-foreground/30"> · </span>
                  <span className="normal-case">{s.snip}</span>
                </span>
              </div>
            );
          })}
        </div>
      </Fade>

      {/* streaming answer */}
      <Fade show={step >= 5}>
        <p className="text-[12px] leading-[1.55] text-foreground/90">
          {SEARCH_FULL.slice(0, answerChars)}
          {showCite1 && (
            <sup className="ml-0.5 font-mono text-[9px] text-primary">
              [1]
            </sup>
          )}
          {showCite2 && (
            <sup className="ml-0.5 font-mono text-[9px] text-primary">
              [2]
            </sup>
          )}
          {step === 6 && (
            <span
              aria-hidden
              className="ml-0.5 inline-block h-[0.9em] w-[1.5px] -translate-y-[1px] animate-pulse bg-foreground/60 align-middle"
            />
          )}
        </p>
      </Fade>
    </div>
  );
}

/* ——————————————————————————————————————————————————————————————
 * Demo 2 — projectknowledge__csv_query
 *   shows typed where-clause building, then a table scrolls in
 *   row-by-row, ending with a result-count footer.
 * —————————————————————————————————————————————————————————————— */

const CSV_ROWS = [
  { region: "EMEA", plan: "team", mrr: 4210 },
  { region: "EMEA", plan: "team", mrr: 3850 },
  { region: "EMEA", plan: "pro",  mrr: 1240 },
];
const WHERE_STR = "region = 'EMEA'";

function CsvQueryDemo({ step }) {
  // type the where clause char-by-char across steps 1→3
  const whereChars =
    step >= 3 ? WHERE_STR.length
    : step >= 2 ? 9
    : step >= 1 ? 3
    : 0;
  const rowsShown = Math.min(CSV_ROWS.length, Math.max(0, step - 3));
  const total = rowsShown === CSV_ROWS.length
    ? CSV_ROWS.reduce((s, r) => s + r.mrr, 0)
    : 0;

  return (
    <div className="flex flex-col gap-2 font-mono text-[10.5px] leading-[1.5]">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-primary">csv_query</span>
        <span className="text-foreground/25">·</span>
        <span className="lowercase">revenue_2025.csv</span>
      </div>

      <div className="flex flex-col gap-0.5 pl-3">
        <div className="text-foreground/70">
          <span className="text-primary/90">select</span>{" "}
          <span className="text-foreground/55">region, plan, mrr</span>
        </div>
        <div className="text-foreground/70">
          <span className="text-primary/90">where</span>{" "}
          <span className="text-foreground/85">
            {WHERE_STR.slice(0, whereChars)}
            {step >= 1 && step < 3 && (
              <span
                aria-hidden
                className="ml-[1px] inline-block h-[0.9em] w-[1.5px] -translate-y-[1px] animate-pulse bg-foreground/60 align-middle"
              />
            )}
          </span>
        </div>
      </div>

      {/* result table */}
      <div className="mt-1 overflow-hidden border border-foreground/15 bg-background/50">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 border-b border-foreground/10 bg-background/40 px-2 py-1 text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
          <span>region</span>
          <span>plan</span>
          <span className="text-right">mrr</span>
        </div>
        {CSV_ROWS.map((r, i) => (
          <div
            key={i}
            className={cn(
              "grid grid-cols-[1fr_1fr_auto] gap-3 border-b border-foreground/6 px-2 py-1 text-[10.5px] transition-all duration-400 last:border-b-0",
              i < rowsShown
                ? "translate-x-0 opacity-100"
                : "-translate-x-1 opacity-0"
            )}
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <span className="text-foreground/85">{r.region}</span>
            <span className="text-muted-foreground">{r.plan}</span>
            <span className="text-right tabular-nums text-foreground/85">
              ${r.mrr.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <Fade show={rowsShown === CSV_ROWS.length}>
        <div className="flex items-baseline justify-between text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground">
          <span>{CSV_ROWS.length} rows</span>
          <span className="tabular-nums text-foreground/80">
            ${total.toLocaleString()} mrr
          </span>
        </div>
      </Fade>
    </div>
  );
}

/* ——————————————————————————————————————————————————————————————
 * Demo 3 — share & embed
 *   Publish button morphs Draft→Live with a rose pulse; three
 *   endpoint rows cascade in; a "copied" toast floats over the
 *   active row.
 * —————————————————————————————————————————————————————————————— */

const ENDPOINTS = [
  { label: "public URL",  value: "persona.app/a/support-copilot" },
  { label: "iframe embed", value: '<iframe src="…/embed/…" />' },
  { label: "api · curl",  value: "curl -X POST /api/a/…/chat" },
];

function PublishDemo({ step }) {
  const publishing = step === 1;
  const live = step >= 2;
  const copiedIdx = step === 5 ? 0 : step === 6 ? 1 : step === 7 ? 2 : -1;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.22em] transition-all duration-500",
            live
              ? "border-primary/45 bg-primary/10 text-foreground"
              : "border-foreground/20 text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "h-1 w-1 rounded-full transition-colors duration-500",
              live ? "bg-primary" : "bg-foreground/30",
              live && "live-dot"
            )}
          />
          {live ? "Live" : publishing ? "Publishing" : "Draft"}
        </span>

        <button
          type="button"
          className={cn(
            "inline-flex h-6 items-center gap-1.5 border px-2 font-mono text-[9.5px] uppercase tracking-[0.22em] transition-all duration-500",
            live
              ? "border-foreground/15 bg-background/60 text-muted-foreground"
              : "border-foreground/80 bg-foreground text-background"
          )}
        >
          {publishing && <Spin className="h-2 w-2" spin />}
          {live ? "Unpublish" : "Publish"}
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {ENDPOINTS.map((e, i) => {
          const visible = step >= i + 2;
          const copied = copiedIdx === i;
          return (
            <Fade show={visible} delay={i * 70} key={e.label}>
              <div
                className={cn(
                  "relative flex items-center justify-between gap-2 border px-2 py-1 font-mono text-[10px] transition-all duration-300",
                  copied
                    ? "border-primary/45 bg-primary/10"
                    : "border-foreground/15 bg-background/60"
                )}
              >
                <span className="flex min-w-0 items-baseline gap-2 truncate">
                  <span className="shrink-0 text-[9px] lowercase text-muted-foreground">
                    {e.label}
                  </span>
                  <span className="truncate text-foreground/85">{e.value}</span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-[9px] uppercase tracking-[0.22em] transition-colors",
                    copied ? "text-primary" : "text-muted-foreground/60"
                  )}
                >
                  {copied ? "✓ copied" : "copy"}
                </span>
              </div>
            </Fade>
          );
        })}
      </div>
    </div>
  );
}

/* ——————————————————————————————————————————————————————————————
 * Demo 4 — usage · 30d
 *   metric tiles count up, sparkline draws itself via
 *   stroke-dashoffset, recent events log streams in with live dot.
 * —————————————————————————————————————————————————————————————— */

const SERIES = [6, 9, 7, 12, 10, 15, 13, 18, 16, 22, 19, 26, 24, 30];
const RECENT = [
  { tool: "search",    ms: 182, ok: true  },
  { tool: "csv_query", ms: 94,  ok: true  },
  { tool: "get_pdf",   ms: 420, ok: false },
];

function useCountUp(target, active) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const DUR = 800;
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / DUR);
      const eased = 1 - Math.pow(1 - p, 2);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active]);
  return n;
}

function TelemetryDemo({ step }) {
  const showMetrics = step >= 1;
  const runs = useCountUp(1248, showMetrics);
  const tokens = useCountUp(426, showMetrics);
  const errors = useCountUp(3, showMetrics);

  // sparkline: compute full path, then reveal via dashoffset
  const w = 240, h = 32;
  const dx = w / (SERIES.length - 1);
  const max = Math.max(...SERIES);
  const line = SERIES
    .map((v, i) => `${i === 0 ? "M" : "L"} ${i * dx} ${h - (v / max) * h}`)
    .join(" ");
  // approximate length for dasharray
  const dashLen = 340;
  const drawProgress = Math.min(1, Math.max(0, (step - 1) / 3));
  const offset = dashLen * (1 - drawProgress);

  const rowsShown = Math.min(RECENT.length, Math.max(0, step - 4));
  const tailIdx = Math.min(SERIES.length - 1, Math.max(0, Math.floor(drawProgress * (SERIES.length - 1))));
  const tx = tailIdx * dx;
  const ty = h - (SERIES[tailIdx] / max) * h;

  return (
    <div className="flex flex-col gap-2">
      {/* metric tiles */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { k: "runs",   v: runs.toLocaleString() },
          { k: "tok",    v: tokens + "k" },
          { k: "errors", v: errors },
        ].map((m) => (
          <div
            key={m.k}
            className={cn(
              "border border-foreground/12 bg-background/50 px-2 py-1 transition-opacity duration-500",
              showMetrics ? "opacity-100" : "opacity-0"
            )}
          >
            <div className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-muted-foreground">
              {m.k}
            </div>
            <div className="mt-0.5 font-mono text-[12.5px] tabular-nums text-foreground/90">
              {m.v}
            </div>
          </div>
        ))}
      </div>

      {/* sparkline */}
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="h-8 w-full"
        aria-hidden
      >
        <path
          d={line}
          fill="none"
          stroke="oklch(0.215 0.015 245 / 0.08)"
          strokeWidth="1"
        />
        <path
          d={line}
          fill="none"
          stroke="oklch(0.62 0.15 22)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: dashLen,
            strokeDashoffset: offset,
            transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 0.61, 0.36, 1)",
          }}
        />
        {drawProgress > 0 && (
          <>
            <circle cx={tx} cy={ty} r="5" fill="oklch(0.62 0.15 22 / 0.18)" />
            <circle cx={tx} cy={ty} r="2" fill="oklch(0.62 0.15 22)" />
          </>
        )}
      </svg>

      {/* recent events log */}
      <div className="flex flex-col gap-0.5">
        {RECENT.map((e, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2 font-mono text-[10px] transition-all duration-400",
              i < rowsShown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
            )}
            style={{ transitionDelay: `${i * 70}ms` }}
          >
            <span
              className={cn(
                "h-1 w-1 shrink-0 rounded-full",
                e.ok ? "bg-primary" : "bg-destructive"
              )}
            />
            <span className="flex-1 truncate text-foreground/80">
              {e.tool}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {e.ms}ms
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ——————————————————————————————————————————————————————————————
 * card — glass panel
 * —————————————————————————————————————————————————————————————— */

function Card({ kicker, title, children }) {
  return (
    <article className="group relative flex flex-col gap-3 overflow-hidden border border-foreground/10 bg-background/60 p-5 backdrop-blur-md transition-all duration-500 hover:border-primary/40 hover:bg-background/80 sm:p-6">
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 50% 0%, oklch(0.805 0.028 18 / 0.2), transparent 70%)",
        }}
      />
      <div className="relative flex items-center justify-between gap-3">
        <span className="truncate font-mono text-[10px] lowercase tracking-[0.05em] text-primary">
          {kicker}
        </span>
        <span className="h-px w-8 bg-foreground/15" />
      </div>
      <h3 className="relative text-[16px] font-medium leading-[1.15] tracking-[-0.015em]">
        {title}
      </h3>
      <div className="relative mt-2">{children}</div>
    </article>
  );
}

/* ——————————————————————————————————————————————————————————————
 * exports
 * —————————————————————————————————————————————————————————————— */

export function ShowcaseHeader() {
  return (
    <div className="relative px-6 py-12 sm:px-10 sm:py-16">
      <h2 className="font-display text-[2.35rem] font-normal leading-[1.02] tracking-[-0.015em] sm:text-[3rem]">
        The tools your agent runs on.
      </h2>
      <p className="mt-3 max-w-lg text-[13.5px] leading-relaxed text-muted-foreground">
        Real product surfaces, live — scrub through each one below.
      </p>
    </div>
  );
}

export function ShowcaseGrid() {
  const step = useStep();
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-60">
        <AsciiField className="h-full w-full" density={12} />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_50%,oklch(0.925_0.010_82/0.85),oklch(0.925_0.010_82/0.55)_60%,transparent_100%)]"
      />

      <span
        aria-hidden
        className="pointer-events-none absolute left-6 top-6 z-0 font-mono text-[10px] uppercase tracking-[0.24em] text-primary/60"
      >
        ·· four tools
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute right-6 top-6 z-0 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground/75"
      >
        <span className="live-dot h-1 w-1 rounded-full bg-primary" />
        live
      </span>

      <div className="relative z-10 grid grid-cols-1 gap-4 px-6 py-14 sm:px-10 sm:py-16 md:grid-cols-2 md:gap-5">
        <Card
          kicker="projectknowledge__search"
          title="Retrieval, with receipts."
        >
          <SearchDemo step={step} />
        </Card>
        <Card
          kicker="projectknowledge__csv_query"
          title="Structured CSV queries."
        >
          <CsvQueryDemo step={step} />
        </Card>
        <Card kicker="share & embed" title="URL, iframe, API.">
          <PublishDemo step={step} />
        </Card>
        <Card kicker="usage · 30d" title="Every call, logged.">
          <TelemetryDemo step={step} />
        </Card>
      </div>
    </div>
  );
}

export function AgentShowcase() {
  return (
    <>
      <ShowcaseHeader />
      <div className="border-t border-foreground/20">
        <ShowcaseGrid />
      </div>
    </>
  );
}
