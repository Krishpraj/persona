import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/Reveal";
import { HeroChat } from "@/components/HeroChat";
import {
  MarkNotion,
  MarkAnthropic,
  MarkOpenAI,
  MarkSupabase,
  MarkPostgres,
  MarkSlack,
  MarkGithub,
  MarkLinear,
} from "@/components/landing-art";
import { DashedCircle } from "@/components/landing/DashedCircle";
import { AgentAnatomy } from "@/components/landing/AgentAnatomy";
import { cn } from "@/lib/utils";

/* ——————————————————————————————————————————————————————————————
 * DATA
 * —————————————————————————————————————————————————————————————— */

const integrations = [
  { name: "Notion", Mark: MarkNotion },
  { name: "Anthropic", Mark: MarkAnthropic },
  { name: "OpenAI", Mark: MarkOpenAI },
  { name: "Supabase", Mark: MarkSupabase },
  { name: "Postgres", Mark: MarkPostgres },
  { name: "Slack", Mark: MarkSlack },
  { name: "GitHub", Mark: MarkGithub },
  { name: "Linear", Mark: MarkLinear },
];

const stats = [
  { value: "4", unit: "source kinds", note: "docs · graphs · csvs · pdfs" },
  { value: "∞", unit: "mcp servers", note: "built-in + any custom" },
  { value: "1-click", unit: "to publish", note: "url · iframe · json api" },
];

const faqs = [
  {
    q: "What is Persona?",
    a: "A workspace for building AI agents that are grounded in your own data, extended with MCP servers and reusable skills, and published in one click as a shareable URL, an embeddable iframe, or a public JSON API.",
  },
  {
    q: "How do I give an agent context?",
    a: "Create a project and attach data sources — docs, node graphs, CSVs, or PDFs. Every agent in the project inherits a built-in project-knowledge MCP that searches across them and can query CSV rows. Edit a source and the next answer reflects it — no re-ingestion.",
  },
  {
    q: "Can I plug in my own tools?",
    a: "Yes. Connect any MCP server over streamable HTTP or SSE. Bearer tokens are stored in Supabase Vault; toggle per-agent which servers it has access to, and their tools land directly in the agent's tool list.",
  },
  {
    q: "What's a skill?",
    a: "A reusable instruction set — write one inline, or upload a markdown file with name/description frontmatter. Agents you opt in load the skill into their system prompt, so behaviors compound across agents and projects.",
  },
  {
    q: "How do I deploy an agent?",
    a: "Click publish. You get a /a/<slug> URL, a ready-to-paste iframe snippet, and a public POST endpoint — all CORS-enabled so you can call it from your own backend or frontend. Unpublish any time.",
  },
  {
    q: "Which models does it support?",
    a: "Bring your own API key for Anthropic or OpenAI in settings. Every agent uses that credential — no bundled inference, no markup.",
  },
];

const useCases = [
  {
    title: "Internal knowledge desk",
    body: "Upload PDFs and specs, plug the agent into your Slack or Linear MCP, and drop an iframe into your intranet. Answers come from the source, cited by name.",
    meta: ["PDF · Doc", "External MCP", "iframe embed"],
  },
  {
    title: "Data analyst",
    body: "Attach CSVs. The built-in csv_query tool filters, projects, and cites rows — no embedding pipeline, no stale retriever, just structured answers.",
    meta: ["CSV · Graph", "csv_query", "public API"],
  },
  {
    title: "Ops copilot",
    body: "Connect GitHub or Linear via a custom MCP server, add a skill like “write PR summaries”, and ship the agent to the team as a single URL.",
    meta: ["MCP · HTTP / SSE", "Skills", "publish → share"],
  },
];

/* ——————————————————————————————————————————————————————————————
 * PRIMITIVES
 * ——
 * Every section is a `Cell`: a full-viewport-width band (so the horizontal
 * divider bleeds edge-to-edge) with a centered inner rail column that carries
 * the vertical borders and holds the content. The horizontal lines span the
 * page; the content stays inside the rails.
 * —————————————————————————————————————————————————————————————— */

function Cell({ children, className, innerClassName, as = "section", id }) {
  const Tag = as;
  return (
    <Tag
      id={id}
      className={cn("border-b border-foreground/20 bg-background", className)}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-[1320px] border-x border-foreground/20",
          innerClassName
        )}
      >
        {children}
      </div>
    </Tag>
  );
}

function Pill({ tone = "default", children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.24em]",
        tone === "accent"
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-foreground/20 bg-transparent text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}

function MonoButton({ href, children, variant = "ghost", external = false }) {
  const base =
    "inline-flex h-10 items-center gap-2 border px-4 font-mono text-[11.5px] uppercase tracking-[0.2em] transition-colors";
  const styles =
    variant === "solid"
      ? "border-foreground/85 bg-foreground text-background hover:bg-foreground/90"
      : "border-foreground/25 bg-transparent text-foreground hover:border-foreground/60 hover:bg-transparent";
  const Comp = external ? "a" : Link;
  const extProps = external ? { target: "_blank", rel: "noreferrer" } : {};
  return (
    <Comp href={href} className={cn(base, styles)} {...extProps}>
      {children}
    </Comp>
  );
}

/* ——————————————————————————————————————————————————————————————
 * TOP BAR
 * —————————————————————————————————————————————————————————————— */

function TopBar() {
  return (
    <Cell className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-6 sm:px-10">
        <Link href="/" className="flex items-baseline tracking-tight">
          <span className="text-[15px] font-medium">persona</span>
          <span className="cursor-blink ml-0.5 font-mono text-[18px] leading-none text-primary">
            _
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/signin"
            className="inline-flex h-9 items-center border border-foreground/80 bg-foreground px-3.5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-background transition-colors hover:bg-foreground/90"
          >
            Sign in
          </Link>
        </div>
      </div>
    </Cell>
  );
}

function Announcement() {
  return (
    <Cell className="border-b border-foreground/15 bg-primary/20">
      <a
        href="#anatomy"
        className="group flex items-center justify-center gap-2.5 px-6 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/80 transition-colors hover:text-foreground"
      >
        <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="font-medium">Launch</span>
        <span className="h-3 w-px bg-foreground/20" />
        <span>Project data sources and first-party MCP</span>
        <span className="text-primary transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </a>
    </Cell>
  );
}

/* ——————————————————————————————————————————————————————————————
 * HERO CELL — scroll-driven chat demo occupies the hero; left rail carries
 * headline, copy, stats, CTAs. Uses the HeroChat component (260vh tall with
 * its own internal sticky stage).
 * —————————————————————————————————————————————————————————————— */

function HeroCell() {
  return (
    <Cell>
      <HeroChat
        title={
          <div className="relative">
            <Reveal delay={60}>
              <h1 className="text-[2.75rem] font-medium leading-[0.96] tracking-[-0.035em] sm:text-[3.5rem] md:text-[4.25rem]">
                Ship AI agents
                <br />
                that{" "}
                <span className="italic text-primary">know your stuff</span>.
              </h1>
            </Reveal>

            <Reveal delay={140}>
              <p className="mt-6 max-w-[460px] text-[15px] leading-[1.65] text-muted-foreground">
                Ground an agent in your docs, PDFs, CSVs or graphs. Extend it
                with any MCP server. Layer on reusable skills. Publish in one
                click as a URL, an iframe, or a JSON API.
              </p>
            </Reveal>

            <Reveal delay={200}>
              <div className="mt-8 flex flex-wrap items-center gap-px">
                <MonoButton href="/signin" variant="solid">
                  Start free
                </MonoButton>
              </div>
            </Reveal>
          </div>
        }
      />
    </Cell>
  );
}

/* ——————————————————————————————————————————————————————————————
 * STATS ROW
 * —————————————————————————————————————————————————————————————— */

function StatsCell() {
  return (
    <Cell>
      <div className="grid grid-cols-1 divide-y divide-foreground/20 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {stats.map((s, i) => (
          <div
            key={s.unit}
            className="flex items-baseline gap-4 px-6 py-6 sm:px-8"
          >
            <div
              className={cn(
                "font-sans text-[34px] font-medium leading-none tracking-[-0.04em]",
                i === 1 && "text-primary"
              )}
            >
              {s.value}
            </div>
            <div>
              <div className="text-[13px] font-medium tracking-tight">
                {s.unit}
              </div>
              <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                {s.note}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Cell>
  );
}

/* ——————————————————————————————————————————————————————————————
 * ACCORDION CELL — FAQ with sticky side label
 * —————————————————————————————————————————————————————————————— */

function AccordionCell() {
  return (
    <Cell id="faq">
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
        <div className="border-b border-foreground/20 bg-background/40 p-6 md:border-b-0 md:border-r md:p-10">
          <div className="sticky top-24">
            <h2 className="text-[22px] font-medium leading-[1.1] tracking-[-0.02em]">
              Asked and
              <br />
              answered.
            </h2>
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
              If we haven&apos;t covered it, open an issue.
            </p>
          </div>
        </div>
        <Accordion type="single" collapsible defaultValue="q-0">
          {faqs.map((item, i) => (
            <AccordionItem
              key={i}
              value={`q-${i}`}
              className="border-b border-foreground/20 last:border-b-0"
            >
              <AccordionTrigger
                className={cn(
                  "group flex w-full items-center justify-between px-6 py-5 text-left text-[15px] font-medium tracking-tight hover:no-underline md:px-10",
                  "[&>svg]:hidden"
                )}
              >
                <span className="flex items-baseline gap-4">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="tracking-[-0.015em]">{item.q}</span>
                </span>
                <span
                  aria-hidden
                  className="ml-4 font-mono text-[13px] text-primary transition-transform duration-300 group-data-[state=open]:rotate-180"
                >
                  ∨
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pl-[4.75rem] pr-10 text-[13.5px] leading-[1.75] text-muted-foreground md:px-10 md:pl-[5.5rem]">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Cell>
  );
}

/* ——————————————————————————————————————————————————————————————
 * CHART CELL
 * —————————————————————————————————————————————————————————————— */

function AnatomyCell() {
  return (
    <Cell id="anatomy">
      <AgentAnatomy />
    </Cell>
  );
}

/* ——————————————————————————————————————————————————————————————
 * CTA CELL — dashed circle + headline
 * —————————————————————————————————————————————————————————————— */

function CtaCell() {
  return (
    <Cell className="tinted-amber">
      <div className="grid grid-cols-1 items-center gap-10 px-6 py-16 sm:px-10 md:grid-cols-[360px_1fr] md:gap-16 md:py-20">
        <div className="flex items-center justify-center md:justify-start">
          <DashedCircle value="6" label="first-class primitives" />
        </div>
        <div className="max-w-xl">
          <h2 className="text-[2rem] font-medium leading-[1.06] tracking-[-0.025em] sm:text-[2.5rem]">
            Six primitives. One workspace. Shippable agents.
          </h2>
          <p className="mt-4 max-w-md text-[14px] leading-[1.7] text-muted-foreground">
            Projects, data sources, agents, MCP integrations, skills, and a
            one-click publish that hands you a URL, an iframe, and a JSON API.
            Bring your own model key and you&apos;re live.
          </p>
          <div className="mt-8">
            <MonoButton href="/signin" variant="solid">
              Get started
            </MonoButton>
          </div>
        </div>
      </div>
    </Cell>
  );
}

/* ——————————————————————————————————————————————————————————————
 * USE CASES
 * —————————————————————————————————————————————————————————————— */

function UseCasesCell() {
  return (
    <>
      <Cell id="cases">
        <div className="px-6 py-10 sm:px-10">
          <h2 className="text-[2rem] font-medium leading-[1.06] tracking-[-0.025em] sm:text-[2.5rem]">
            An agent for every job that deserves one.
          </h2>
          <p className="mt-3 max-w-lg text-[13.5px] leading-relaxed text-muted-foreground">
            Three shapes we see teams ship first. Start with one; the same
            primitives cover the rest.
          </p>
        </div>
      </Cell>
      <Cell>
        <div className="grid grid-cols-1 divide-y divide-foreground/20 md:grid-cols-3 md:divide-x md:divide-y-0">
          {useCases.map((uc, i) => (
            <article
              key={uc.title}
              className="group relative flex flex-col gap-5 px-6 py-8 transition-colors hover:bg-primary/5 sm:px-8"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground"
                >
                  0{i + 1}
                </span>
                <span className="h-px flex-1 bg-foreground/15" />
              </div>
              <h3 className="text-[17px] font-medium tracking-[-0.015em]">
                {uc.title}
              </h3>
              <p className="text-[13px] leading-[1.7] text-muted-foreground">
                {uc.body}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                {uc.meta.map((m, j) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1.5 border border-foreground/20 bg-background/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
                  >
                    <span
                      className={cn(
                        "h-1 w-1 rounded-full",
                        j === 0
                          ? "bg-primary/80"
                          : "bg-primary/60"
                      )}
                    />
                    {m}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </Cell>
    </>
  );
}

/* ——————————————————————————————————————————————————————————————
 * INTEGRATIONS RAIL
 * —————————————————————————————————————————————————————————————— */

function IntegrationsCell() {
  const trailing = [...integrations, ...integrations, ...integrations];
  return (
    <Cell>
      <div className="px-6 pt-12 sm:px-10 sm:pt-16">
        <h2 className="text-[2rem] font-medium leading-[1.06] tracking-[-0.025em] sm:text-[2.5rem]">
          Any MCP server plugs straight in.
        </h2>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
          Bring the tools you already use. Drop in a streamable-HTTP or SSE
          endpoint, store the token in vault, and toggle which agents get
          access.
        </p>
      </div>
      <div className="marquee-pause relative overflow-hidden">
        <div
          className="flex w-max animate-slide-left items-center gap-14 py-10"
          style={{ ["--duration"]: "40s" }}
        >
          {trailing.map(({ name, Mark }, i) => (
            <div
              key={`${name}-${i}`}
              className="flex shrink-0 items-center gap-2.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Mark className="h-4 w-4" />
              <span className="font-mono text-[11.5px] uppercase tracking-[0.18em]">
                {name}
              </span>
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background via-background/80 to-transparent" />
      </div>
    </Cell>
  );
}

/* ——————————————————————————————————————————————————————————————
 * FOOTER — thin meta row + giant wordmark
 * —————————————————————————————————————————————————————————————— */

function FooterMeta() {
  return (
    <Cell>
      <div className="flex flex-col items-start justify-between gap-4 px-6 py-5 sm:flex-row sm:items-center sm:px-10">
        <Link href="/" className="flex items-baseline tracking-tight">
          <span className="text-[14px] font-medium">persona</span>
          <span className="cursor-blink ml-0.5 font-mono text-[16px] leading-none text-primary">
            _
          </span>
        </Link>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
          © {new Date().getFullYear()} persona · mit license
        </div>
      </div>
    </Cell>
  );
}

function FooterWordmark() {
  return (
    <Cell as="footer" className="relative overflow-hidden">
      <div className="relative px-6 pb-8 pt-14 sm:px-10">
        <div
          aria-hidden
          className="grid-bg pointer-events-none absolute inset-0 opacity-50"
        />
        <div
          aria-hidden
          className="amber-wash pointer-events-none absolute inset-0 opacity-80"
        />
        <div
          aria-hidden
          className="relative flex items-baseline leading-[0.82] tracking-[-0.06em] text-foreground"
        >
          <span className="select-none font-medium text-[clamp(4rem,22vw,17rem)]">
            persona
          </span>
          <span className="cursor-blink -ml-1 select-none font-mono font-medium text-primary text-[clamp(4rem,22vw,17rem)]">
            _
          </span>
        </div>
      </div>
    </Cell>
  );
}

/* ——————————————————————————————————————————————————————————————
 * PAGE
 * —————————————————————————————————————————————————————————————— */

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Announcement />
      <TopBar />
      <HeroCell />
      <StatsCell />
      <AccordionCell />
      <AnatomyCell />
      <CtaCell />
      <UseCasesCell />
      <IntegrationsCell />
      <FooterMeta />
      <FooterWordmark />
    </div>
  );
}
