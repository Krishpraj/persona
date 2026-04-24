"use client";

import { cn } from "@/lib/utils";
import { useReveal } from "@/lib/use-reveal";
import { useRailProgress } from "@/lib/use-rail-progress";
import { useActive } from "@/lib/use-active";
import { useStep } from "@/lib/use-step";
import {
  MarkNotion,
  MarkSupabase,
  MarkSlack,
  MarkGithub,
  MarkLinear,
} from "@/components/landing-art";

/* ——————————————————————————————————————————————————————————————
 * Flow — a three-chapter editorial spread. A rose rail draws
 * itself in on scroll, each numbered chapter pairs headline copy
 * with a bespoke SVG product diagram, and an outcomes strip at the
 * bottom closes the section with four tinted gradient tiles.
 *
 * Composition moves:
 *   · Chapter 01 — Ground.  Data-source constellation.
 *   · Chapter 02 — Extend.  Mocked MCP server rack.
 *   · Chapter 03 — Publish. Tilted collage of outputs.
 *
 * The rail + reveals are hand-rolled (IntersectionObserver +
 * a rAF-throttled scroll read) rather than pulled from a
 * motion library, so the band feels native to the site rhythm.
 * —————————————————————————————————————————————————————————————— */

/* ————————————————————————————————————————————————————————————————
 * Chapter 01 — CONSTELLATION: sources converge on an agent node
 * ———————————————————————————————————————————————————————————————— */

function GroundingVisual() {
  /* Data-source library demo: 4 different file types land in a project
   * one after another, each with an upload → indexed transition.
   *   0  Docs file appearing (uploading)
   *   1  Docs file indexed
   *   2  PDF file appearing
   *   3  PDF file indexed
   *   4  CSV file appearing
   *   5  CSV file indexed
   *   6  Graph appearing
   *   7  Graph indexed — "grounded in 4 sources" summary
   */
  const step = useStep({ count: 8, interval: 1100 });

  const sources = [
    {
      glyph: <GlyphDoc />,
      kind: "Doc",
      name: "Q3 feedback.md",
      meta: "12 sections · 3.4k words",
      appearAt: 0,
    },
    {
      glyph: <GlyphPdf />,
      kind: "PDF",
      name: "Product manual.pdf",
      meta: "42 pages · 18k words",
      appearAt: 2,
    },
    {
      glyph: <GlyphCsv />,
      kind: "CSV",
      name: "revenue_2025.csv",
      meta: "1,248 rows · 8 cols",
      appearAt: 4,
    },
    {
      glyph: <GlyphGraph />,
      kind: "Graph",
      name: "entity-map",
      meta: "18 nodes · 32 edges",
      appearAt: 6,
    },
  ];
  const indexedCount = sources.filter((s) => step >= s.appearAt + 1).length;
  const visibleCount = sources.filter((s) => step >= s.appearAt).length;

  return (
    <figure className="relative overflow-hidden border border-foreground/15 tint-rose aspect-[5/4] w-full">
      {/* grain */}
      <div aria-hidden className="grain pointer-events-none absolute inset-0" />

      {/* rose ambient glow — top-left */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[10%] -top-[10%] h-[70%] w-[70%]"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 30% 30%, oklch(0.805 0.028 18 / 0.40), transparent 70%)",
        }}
      />
      {/* azure ambient glow — bottom-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[10%] -right-[10%] h-[60%] w-[60%]"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 70% 70%, oklch(0.58 0.11 240 / 0.25), transparent 70%)",
        }}
      />

      {/* hairline grid, masked to center */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(0.215 0.015 245 / 0.055) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.215 0.015 245 / 0.055) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse 85% 75% at 50% 50%, black 40%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 85% 75% at 50% 50%, black 40%, transparent 90%)",
        }}
      />

      {/* product surface — a sources library ingesting files over time */}
      <div className="relative z-[1] flex h-full w-full items-center justify-center p-4 sm:p-5">
        <div
          className="reveal-stagger flex h-full w-full max-w-[460px] flex-col overflow-hidden border border-foreground/15 bg-background/95 paper-drop"
          style={{ ["--stagger"]: "200ms" }}
        >
          {/* chrome */}
          <div className="flex items-center justify-between border-b border-foreground/10 bg-foreground/[0.03] px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-foreground/25" />
              <span className="h-2 w-2 rounded-full bg-foreground/25" />
              <span className="h-2 w-2 rounded-full bg-foreground/25" />
            </div>
            <span className="text-[11px] font-medium tracking-[-0.01em] text-foreground/70">
              Support project · Sources
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[9.5px] tabular-nums text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-primary status-blink" />
              live
            </span>
          </div>

          {/* section header with dynamic counter */}
          <div className="flex items-center justify-between border-b border-foreground/10 px-3 py-2">
            <span className="text-[11px] font-medium tracking-[-0.005em] text-foreground/80">
              Library
            </span>
            <span className="text-[10.5px] text-muted-foreground">
              {indexedCount} of 4 indexed
            </span>
          </div>

          {/* sources list */}
          <div className="flex flex-1 flex-col gap-2 overflow-hidden px-3 py-2.5">
            {sources.map((s) => {
              const appeared = step >= s.appearAt;
              const indexed = step >= s.appearAt + 1;
              return appeared ? (
                <div
                  key={s.name}
                  className="flex items-center gap-2.5 border border-foreground/15 bg-background px-2.5 py-1.5"
                  style={{
                    animation:
                      "file-drop-in 500ms cubic-bezier(0.22,0.61,0.36,1) both",
                  }}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center border transition-colors duration-500",
                      indexed
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-foreground/15 bg-background text-foreground/75"
                    )}
                  >
                    {s.glyph}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-[11.5px] font-medium tracking-[-0.005em] text-foreground">
                        {s.name}
                      </span>
                      <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                        {s.kind}
                      </span>
                    </div>
                    {indexed ? (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {s.meta}
                      </div>
                    ) : (
                      <div className="mt-1 h-[2px] w-full overflow-hidden bg-foreground/10">
                        <div
                          className="h-full bg-primary"
                          style={{
                            animation:
                              "progress-fill 1000ms cubic-bezier(0.22,0.61,0.36,1) forwards",
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <span
                    className={cn(
                      "flex h-5 items-center gap-1 border px-1.5 text-[9.5px] font-medium tracking-[-0.005em] transition-colors duration-500",
                      indexed
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-foreground/20 bg-background text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1 w-1 rounded-full",
                        indexed ? "bg-primary" : "bg-primary status-blink"
                      )}
                    />
                    {indexed ? "Indexed" : "Uploading"}
                  </span>
                </div>
              ) : (
                <div
                  key={s.name}
                  className="flex items-center gap-2.5 border border-dashed border-foreground/15 bg-background/30 px-2.5 py-1.5 opacity-50"
                >
                  <span className="flex h-6 w-6 items-center justify-center text-foreground/30">
                    {s.glyph}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground/80">
                    Waiting for {s.kind.toLowerCase()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* footer — grounded-in summary */}
          <div
            className={cn(
              "flex items-center justify-between border-t border-foreground/10 bg-foreground/[0.03] px-3 py-2 transition-colors duration-500",
              indexedCount >= 4 && "bg-primary/10"
            )}
          >
            <span className="text-[10.5px] font-medium tracking-[-0.005em] text-foreground/80">
              {indexedCount >= 4
                ? "Grounded in 4 sources"
                : visibleCount < 4
                ? `${visibleCount} of 4 attached`
                : "Finishing indexing…"}
            </span>
            <span className="font-mono text-[9.5px] tabular-nums text-muted-foreground">
              {indexedCount >= 4
                ? "61 pages · 1.2k rows"
                : step === 0
                ? "ready"
                : "in progress"}
            </span>
          </div>
        </div>
      </div>
    </figure>
  );
}

function GlyphDoc() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M6 3h8l4 4v14H6z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8.5 12h7M8.5 15h7M8.5 18h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function GlyphCsv() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 10h18M3 14h18M10 5v14M16 5v14" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
function GlyphPdf() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M5 3h10l4 4v14H5z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M15 3v4h4" stroke="currentColor" strokeWidth="1.3" />
      <text x="7.8" y="17" fontFamily="var(--font-mono)" fontSize="5.6" fill="currentColor">PDF</text>
    </svg>
  );
}
function GlyphGraph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <circle cx="5.5" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="18.5" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12" cy="17" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7.2 8.2 10.8 15.2M16.8 8.2 13.2 15.2M7.5 7h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/* ————————————————————————————————————————————————————————————————
 * Chapter 02 — MCP RACK: list of servers with an active connection
 * ———————————————————————————————————————————————————————————————— */

function ExtendVisual() {
  /* Full workflow: 3 connected tools → add a 4th → call it.
   *   0  idle list of 3 tools
   *   1  "+ Add server" button pulses
   *   2  add-server form opens
   *   3  URL typing in form
   *   4  connecting spinner
   *   5  Notion appears in list, "Connected"
   *   6  tool call on Notion (row pulses, reply overlay shows)
   *   7  settled with 4 tools + reply result
   */
  const step = useStep({ count: 8, interval: 1150 });

  const baseServers = [
    { Mark: MarkGithub, name: "GitHub", description: "Pull requests, issues, code" },
    { Mark: MarkLinear, name: "Linear", description: "Issues, projects, cycles" },
    { Mark: MarkSlack,  name: "Slack",  description: "Messages, channels, files" },
  ];
  const newServer = {
    Mark: MarkNotion,
    name: "Notion",
    description: "Pages, databases, blocks",
  };

  const URL_TEXT = "https://mcp.notion.so";
  const urlTyped = step >= 3 ? URL_TEXT : "";
  const formOpen = step >= 2 && step <= 4;
  const notionAdded = step >= 5;
  const notionCalling = step === 6;
  const showReply = step >= 6;
  const totalCount = notionAdded ? 4 : 3;
  const activeCount = notionCalling ? 1 : 0;

  return (
    <figure className="relative overflow-hidden border border-foreground/15 tint-azure aspect-[5/4] w-full">
      {/* grain */}
      <div aria-hidden className="grain pointer-events-none absolute inset-0" />

      {/* azure ambient glow — top-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[12%] -top-[12%] h-[70%] w-[70%]"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 70% 30%, oklch(0.58 0.11 240 / 0.32), transparent 70%)",
        }}
      />
      {/* rose ambient glow — bottom-left */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[12%] -left-[12%] h-[60%] w-[60%]"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 30% 70%, oklch(0.805 0.028 18 / 0.32), transparent 70%)",
        }}
      />

      {/* frame chrome */}
      <div className="relative z-10 flex items-center justify-between border-b border-foreground/15 bg-background/70 px-4 py-2">
        <div className="flex items-center gap-2 text-[12.5px] font-medium tracking-[-0.01em]">
          <span className="h-1.5 w-1.5 rounded-sm bg-primary" />
          Connected tools
        </div>
        <div className="text-[11.5px] text-muted-foreground">
          {totalCount} connected
          {activeCount > 0 ? ` · ${activeCount} calling` : ""}
        </div>
      </div>

      {/* server rows */}
      <ul className="relative z-[2] flex flex-col">
        {baseServers.map((s, i) => (
          <li
            key={s.name}
            className="reveal-stagger group relative flex items-center gap-3 border-b border-foreground/10 px-4 py-2 transition-colors duration-500"
            style={{ ["--stagger"]: `${140 + i * 80}ms` }}
          >
            <span className="flex h-8 w-8 items-center justify-center border border-foreground/15 bg-background text-foreground/75">
              <s.Mark className="h-4 w-4" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="text-[13px] font-medium tracking-[-0.01em]">
                {s.name}
              </span>
              <span className="mt-0.5 text-[11.5px] text-muted-foreground">
                {s.description}
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 border border-foreground/20 bg-background/70 px-2 py-0.5 text-[10.5px] font-medium tracking-[-0.005em] text-foreground/70">
              <span className="h-1 w-1 rounded-full bg-foreground/50" />
              Connected
            </span>
          </li>
        ))}

        {/* the server being added — slides in at step 5 */}
        {notionAdded && (
          <li
            key="notion"
            className={cn(
              "group relative flex items-center gap-3 border-b border-foreground/10 px-4 py-2 transition-colors duration-500",
              notionCalling ? "bg-primary/10" : ""
            )}
            style={{
              animation:
                "file-drop-in 500ms cubic-bezier(0.22,0.61,0.36,1) both",
            }}
          >
            {notionCalling && (
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-0 left-0 top-0 w-[2px] bg-primary"
              />
            )}
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center border transition-colors duration-500",
                notionCalling
                  ? "border-primary/60 bg-background text-foreground"
                  : "border-primary/40 bg-background text-foreground"
              )}
            >
              <newServer.Mark className="h-4 w-4" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="text-[13px] font-medium tracking-[-0.01em]">
                {newServer.name}
              </span>
              <span className="mt-0.5 text-[11.5px] text-muted-foreground">
                {newServer.description}
              </span>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10.5px] font-medium tracking-[-0.005em] transition-colors duration-500",
                notionCalling
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-primary/50 bg-primary/10 text-primary"
              )}
            >
              <span
                className={cn(
                  "h-1 w-1 rounded-full",
                  notionCalling ? "bg-primary status-blink" : "bg-primary"
                )}
              />
              {notionCalling ? "Calling" : step === 5 ? "New" : "Connected"}
            </span>
          </li>
        )}
      </ul>

      {/* footer — add-server CTA, morphs into form, then vault reassurance */}
      <div
        className="reveal-stagger relative z-[2] border-t border-foreground/10 bg-background/70 px-4 py-2"
        style={{ ["--stagger"]: "640ms" }}
      >
        {formOpen ? (
          <div
            className="flex items-center gap-2"
            style={{
              animation:
                "fade-up-in 400ms cubic-bezier(0.22,0.61,0.36,1) both",
            }}
          >
            <span className="text-[10.5px] font-medium text-foreground/80">
              URL
            </span>
            <div className="flex flex-1 items-center gap-1.5 border border-primary/40 bg-background px-2 py-1">
              <span className="truncate font-mono text-[10.5px] text-foreground/85">
                {urlTyped}
                {step === 3 && urlTyped.length < URL_TEXT.length && (
                  <span
                    aria-hidden
                    className="cursor-blink ml-0.5 inline-block h-[9px] w-[1.5px] translate-y-[1px] bg-primary"
                  />
                )}
              </span>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 border px-2 py-1 text-[10.5px] font-medium transition-colors",
                step === 4
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-foreground/30 bg-background text-foreground/75"
              )}
            >
              {step === 4 && (
                <span
                  className="inline-block h-2 w-2 rounded-full border-2 border-primary/30 border-t-primary"
                  style={{ animation: "spin 0.7s linear infinite" }}
                  aria-hidden
                />
              )}
              {step === 4 ? "Connecting" : "Connect"}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] text-muted-foreground">
              Credentials stored in a secure vault
            </span>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-2 border px-2 py-1 text-[11px] font-medium transition-all duration-500",
                step === 1
                  ? "border-primary/60 bg-primary/10 text-primary shadow-[0_0_0_4px_oklch(0.805_0.028_18/0.1)]"
                  : "border-foreground/25 bg-background text-foreground/80"
              )}
            >
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center border border-current leading-none">
                +
              </span>
              Add server
            </button>
          </div>
        )}
      </div>

      {/* tool-reply overlay — shows during Notion tool call */}
      <div
        key={`reply-${step}`}
        className={cn(
          "absolute right-3 top-[34%] z-[3] w-[200px] select-none border border-foreground/15 bg-background/95 px-3 py-2.5 paper-drop transition-all duration-500",
          showReply ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        style={{
          transform: "rotate(1.2deg)",
          animation: showReply
            ? "tool-reply-in 500ms cubic-bezier(0.22, 0.61, 0.36, 1) both"
            : undefined,
        }}
      >
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] tracking-[-0.005em] text-primary/90">
            query_database
          </span>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            524ms
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-foreground/85">
          <newServer.Mark className="h-3 w-3 shrink-0 text-foreground/70" />
          <span className="truncate">{newServer.name}</span>
        </div>
        <div className="mt-1.5 flex items-start gap-2 border-t border-foreground/10 pt-1.5">
          <span
            aria-hidden
            className="mt-[7px] inline-block h-[1.5px] w-2 shrink-0 bg-primary/80"
          />
          <span className="text-[11px] leading-[1.4] text-foreground/80">
            18 pages matched · synced just now
          </span>
        </div>
      </div>
    </figure>
  );
}

/* ————————————————————————————————————————————————————————————————
 * Chapter 03 — PUBLISH COLLAGE: three floating output artifacts
 * ———————————————————————————————————————————————————————————————— */

function PublishVisual() {
  /* Full publish workflow:
   *   0  agent ready, "Publish" button visible
   *   1  publish button click-pulse
   *   2  publishing spinner
   *   3  URL card appears
   *   4  iframe card appears
   *   5  JSON API card appears
   *   6  all three live, agent card shows "Live"
   *   7  settled with usage stats
   */
  const step = useStep({ count: 8, interval: 1100 });
  const showUrl     = step >= 3;
  const showIframe  = step >= 4;
  const showApi     = step >= 5;
  const isLive      = step >= 3;
  const showUsage   = step >= 7;

  return (
    <figure className="relative overflow-hidden border border-foreground/15 aspect-[5/4] w-full tint-ink">
      {/* grain */}
      <div aria-hidden className="grain pointer-events-none absolute inset-0" />

      {/* ambient rose glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[10%] -top-[10%] h-[60%] w-[70%]"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 70% 30%, oklch(0.805 0.028 18 / 0.35), transparent 70%)",
        }}
      />
      {/* ambient azure glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[10%] -left-[10%] h-[60%] w-[70%]"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 30% 70%, oklch(0.58 0.11 240 / 0.28), transparent 70%)",
        }}
      />

      {/* stage */}
      <div className="relative z-[1] h-full w-full">
        {/* Agent publish card — top center, morphs: Ready → Clicked → Publishing → Live */}
        <div
          className={cn(
            "absolute left-1/2 top-[5%] z-[5] flex w-[78%] max-w-[340px] -translate-x-1/2 items-center gap-3 border border-foreground/15 bg-background px-3 py-2 paper-drop transition-all duration-500",
            step === 1 && "scale-[1.02] shadow-[0_0_0_6px_oklch(0.805_0.028_18/0.15)]"
          )}
        >
          <span className="flex h-6 w-6 items-center justify-center bg-foreground text-[11px] font-mono leading-none text-background">
            a
          </span>
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="text-[12px] font-medium tracking-[-0.01em]">
              Ops copilot
            </span>
            <span className="text-[10.5px] text-muted-foreground">
              {isLive
                ? "Published · 3 outputs live"
                : step === 2
                ? "Publishing everywhere…"
                : "Ready to publish"}
            </span>
          </div>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 border px-2 py-1 text-[10.5px] font-medium tracking-[-0.005em] transition-all duration-500",
              isLive
                ? "border-primary/50 bg-primary/10 text-primary"
                : step === 2
                ? "border-primary/50 bg-primary/10 text-primary"
                : step === 1
                ? "border-foreground bg-foreground text-background"
                : "border-foreground/80 bg-foreground text-background"
            )}
          >
            {step === 2 && (
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full border-2 border-primary/30 border-t-primary"
                style={{ animation: "spin 0.7s linear infinite" }}
              />
            )}
            {isLive ? (
              <>
                <span className="h-1 w-1 rounded-full bg-primary status-blink" />
                Live
              </>
            ) : step === 2 ? (
              "Publishing"
            ) : (
              "Publish →"
            )}
          </button>
        </div>

        {/* Browser URL card */}
        <div
          className={cn(
            "absolute left-[4%] top-[32%] w-[62%] border border-foreground/15 bg-background paper-drop transition-all duration-700",
            showUrl
              ? "opacity-100 translate-y-0 rotate-[-2.2deg]"
              : "pointer-events-none opacity-0 translate-y-4 rotate-0"
          )}
          style={{ willChange: "transform, opacity" }}
        >
          <div className="flex items-center justify-between border-b border-foreground/10 bg-foreground/[0.04] px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-foreground/25" />
              <span className="h-2 w-2 rounded-full bg-foreground/25" />
              <span className="h-2 w-2 rounded-full bg-foreground/25" />
            </div>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-muted-foreground">
              live · /a/ops-copilot
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-primary">●</span>
            <span className="font-mono text-[10px] tabular-nums text-foreground/80">
              persona.dev/a/ops-copilot
            </span>
            <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              200 ok
            </span>
          </div>
          <div className="flex items-center gap-2 border-t border-foreground/10 px-3 py-2.5">
            <span className="flex h-5 w-5 items-center justify-center bg-foreground text-[10px] font-mono leading-none text-background">
              a
            </span>
            <span className="text-[12px] font-medium tracking-[-0.01em]">
              Ops copilot
            </span>
            <span className="ml-auto inline-flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-primary status-blink" />
              typing
            </span>
          </div>
        </div>

        {/* Code / iframe card */}
        <div
          className={cn(
            "absolute right-[4%] top-[42%] w-[56%] border border-foreground/15 bg-foreground paper-drop transition-all duration-700",
            showIframe
              ? "opacity-100 translate-y-0 rotate-[-0.5deg]"
              : "pointer-events-none opacity-0 translate-y-4 rotate-0"
          )}
          style={{ willChange: "transform, opacity" }}
        >
          <div className="flex items-center justify-between border-b border-background/10 px-3 py-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-background/65">
              iframe · embed
            </span>
            <span className="font-mono text-[8.5px] tabular-nums text-background/40">
              copy ⌘ C
            </span>
          </div>
          <pre className="m-0 overflow-hidden px-3 py-2.5 font-mono text-[9.5px] leading-[1.55] text-background/90">
{`<iframe
  src="https://persona.dev/embed/ops-copilot"
  style="border:0; width:100%; height:640px"
  loading="lazy"
/>`}
          </pre>
        </div>

        {/* JSON API card */}
        <div
          className={cn(
            "absolute bottom-[4%] left-[8%] w-[58%] border border-foreground/15 bg-background paper-drop transition-all duration-700",
            showApi
              ? "opacity-100 translate-y-0 rotate-[1.8deg]"
              : "pointer-events-none opacity-0 translate-y-4 rotate-0"
          )}
          style={{ willChange: "transform, opacity" }}
        >
          <div className="flex items-center justify-between border-b border-foreground/10 bg-foreground/[0.04] px-3 py-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              POST · /api/a/ops-copilot
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-primary">
              <span className="h-1 w-1 rounded-full bg-primary" />
              cors · on
            </span>
          </div>
          <pre className="m-0 overflow-hidden px-3 py-2.5 font-mono text-[10px] leading-[1.55] text-foreground/85">
{`{
  "message": "Draft a PR summary.",
  "context": { "repo": "persona" }
}`}
          </pre>
          <div className="flex items-center justify-between border-t border-foreground/10 px-3 py-1.5">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-muted-foreground">
              response · stream
            </span>
            <span className="font-mono text-[9px] tabular-nums text-foreground/70">
              200 · 412 ms
            </span>
          </div>
        </div>

        {/* usage stats chip — appears only after everything is live (step 7) */}
        <div
          className={cn(
            "absolute right-[6%] bottom-[38%] z-[4] select-none border border-foreground/15 bg-background/95 px-2.5 py-1.5 paper-drop transition-all duration-700",
            showUsage
              ? "opacity-100 translate-y-0 rotate-[-1.2deg]"
              : "pointer-events-none opacity-0 translate-y-2 rotate-0"
          )}
        >
          <div className="mb-0.5 flex items-center gap-2">
            <span className="font-mono text-[9px] text-primary/80">
              usage · 30d
            </span>
            <span className="h-1 w-1 rounded-full bg-primary status-blink" />
          </div>
          <div className="flex items-baseline gap-3">
            <div className="flex flex-col leading-tight">
              <span className="font-mono text-[8.5px] text-muted-foreground">
                runs
              </span>
              <span className="font-mono text-[11px] tabular-nums text-foreground">
                1,248
              </span>
            </div>
            <span className="h-6 w-px bg-foreground/15" />
            <div className="flex flex-col leading-tight">
              <span className="font-mono text-[8.5px] text-muted-foreground">
                tok
              </span>
              <span className="font-mono text-[11px] tabular-nums text-foreground">
                426k
              </span>
            </div>
            <span className="h-6 w-px bg-foreground/15" />
            <div className="flex flex-col leading-tight">
              <span className="font-mono text-[8.5px] text-muted-foreground">
                err
              </span>
              <span className="font-mono text-[11px] tabular-nums text-foreground">
                3
              </span>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

/* ————————————————————————————————————————————————————————————————
 * Chapter shell — numbered marker + text + visual
 * ———————————————————————————————————————————————————————————————— */

function Chapter({ index, no, kicker, title, body, Visual }) {
  const [ref, inView] = useReveal({ threshold: 0.2, rootMargin: "-14% 0px" });
  const [activeRef, active] = useActive({ topFrac: 0.02, bottomFrac: 0.04 });

  return (
    <article
      ref={ref}
      className={cn(
        "relative grid grid-cols-1 gap-5 px-6 py-8 md:grid-cols-[64px_1.2fr_0.9fr] md:gap-8 md:px-10 md:py-10",
        inView && "in-view"
      )}
    >
      {/* active-zone sentinel */}
      <span
        ref={activeRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-full w-px"
      />

      {/* numbered marker — starts centered against the visual; sticks
          to top-48 once scroll pushes it above that threshold */}
      <div className="relative order-1 md:order-none md:flex md:items-center">
        <div className="md:sticky md:top-48">
          <div
            className="flow-marker relative z-[2] inline-flex items-center gap-3 md:block"
            data-active={active ? "true" : "false"}
          >
            <span className="flow-marker-circle relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-foreground/25 bg-background font-mono text-[11.5px] tabular-nums tracking-[0.04em] text-foreground transition-[border-color,color,transform,box-shadow] duration-[900ms] ease-out">
              {no}
              <span aria-hidden className="flow-marker-halo" />
            </span>
          </div>
        </div>
      </div>

      {/* text block — paragraph only, no jot notes */}
      <div className="order-2 min-w-0 md:order-none md:self-center">
        <h3
          className="reveal-stagger font-display text-[1.75rem] font-normal leading-[1.05] tracking-[-0.02em] sm:text-[2rem] md:text-[2.15rem]"
          style={{ ["--stagger"]: "0ms" }}
        >
          {title}
        </h3>
        <p
          className="reveal-stagger mt-3 max-w-[52ch] text-[14.5px] leading-[1.65] text-muted-foreground"
          style={{ ["--stagger"]: "150ms" }}
        >
          {body}
        </p>
      </div>

      {/* visual panel — narrower column, shorter aspect */}
      <div
        className="reveal-stagger order-3 md:order-none"
        style={{ ["--stagger"]: "180ms" }}
      >
        <Visual />
      </div>
    </article>
  );
}

/* ————————————————————————————————————————————————————————————————
 * Outcomes — 2×2 of tinted-gradient stat tiles
 * ———————————————————————————————————————————————————————————————— */

function OutcomesGrid() {
  const outcomes = [
    {
      value: "1-click",
      label: "to publish",
      detail: "url · iframe · json api",
      tint: "tint-rose",
      badge: "OUT",
    },
    {
      value: "< 60s",
      label: "first-token",
      detail: "your keys · your edges",
      tint: "tint-azure",
      badge: "LAT",
    },
    {
      value: "∞",
      label: "mcp servers",
      detail: "built-in + any custom",
      tint: "tint-cream",
      badge: "EXT",
    },
    {
      value: "0",
      label: "vendor lock",
      detail: "byok · mit-licensed · self-host",
      tint: "tint-ink",
      badge: "OWN",
    },
  ];

  const [ref, inView] = useReveal({ threshold: 0.18, rootMargin: "-8% 0px" });

  return (
    <div
      ref={ref}
      className={cn(
        "relative border-b border-foreground/15",
        inView && "in-view"
      )}
    >
      <div className="grid grid-cols-1 gap-px bg-foreground/12 sm:grid-cols-2 lg:grid-cols-4">
        {outcomes.map((o, i) => (
          <article
            key={o.label}
            className={cn(
              "reveal-stagger relative overflow-hidden bg-background px-6 py-10 sm:px-8 sm:py-12"
            )}
            style={{ ["--stagger"]: `${i * 90}ms` }}
          >
            {/* tinted wash */}
            <div
              aria-hidden
              className={cn("pointer-events-none absolute inset-0", o.tint)}
            />
            <div aria-hidden className="grain pointer-events-none absolute inset-0" />

            <div className="relative z-[1] flex h-full flex-col gap-4">
              <div className="font-display text-[3.4rem] font-normal leading-[0.95] tracking-[-0.035em] text-foreground sm:text-[4rem]">
                {o.value}
              </div>
              <div className="mt-auto text-[14px] font-medium tracking-[-0.01em]">
                {o.label}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ————————————————————————————————————————————————————————————————
 * Public export
 * ———————————————————————————————————————————————————————————————— */

const CHAPTERS = [
  {
    no: "01",
    kicker: "Ground",
    title: "Ground your agent in your data.",
    body:
      "Attach the files your team already uses: docs, PDFs, spreadsheets, and graphs. Every answer comes back with citations to the file it pulled from, so anyone can verify the claim before acting on it. Update a source once and the next reply reflects the change instantly, with no re-upload or rebuild.",
    Visual: GroundingVisual,
  },
  {
    no: "02",
    kicker: "Extend",
    title: "Plug in any tool your agent needs.",
    body:
      "Plug in the apps your team already runs on: Slack, GitHub, Linear, Notion, or any MCP-compatible tool. You decide which agents can reach which tools with a single click, and nothing requires custom code or adapters to maintain along the way.",
    Visual: ExtendVisual,
  },
  {
    no: "03",
    kicker: "Publish",
    title: "Ship your agent in one click.",
    body:
      "One click ships three artifacts at once: a hosted URL, an embeddable iframe, and a JSON API. Streaming and CORS are on by default, you bring your own model keys, and you can unpublish or revert any time without redeploying.",
    Visual: PublishVisual,
  },
];

export function Flow() {
  const railRef = useRailProgress();

  return (
    <section className="relative" aria-labelledby="flow-title">
      {/* outcomes strip — opens the section */}
      <OutcomesGrid />

      {/* rail container — holds chapters and the progress rail */}
      <div ref={railRef} className="relative pt-4 sm:pt-8">
        {/* faint ink track */}
        <span
          aria-hidden
          className="flow-rail-track pointer-events-none absolute top-0 bottom-0 w-px left-[calc(1.5rem+22px)] md:left-[calc(2.5rem+22px)]"
        />
        {/* rose progress fill */}
        <span
          aria-hidden
          className="flow-rail-fill pointer-events-none absolute top-0 bottom-0 w-px left-[calc(1.5rem+22px)] md:left-[calc(2.5rem+22px)]"
        />

        <div>
          {CHAPTERS.map((c, i) => (
            <Chapter key={c.no} index={i} {...c} />
          ))}
        </div>
      </div>
    </section>
  );
}
