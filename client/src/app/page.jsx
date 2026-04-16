import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/Reveal";
import {
  GraphHero,
  MarkNotion,
  MarkAnthropic,
  MarkOpenAI,
  MarkSupabase,
  MarkPostgres,
  MarkSlack,
  MarkGithub,
  MarkLinear,
  FeatureGraph,
  FeatureDocs,
  FeatureTerminal,
  FeatureFlow,
  FeatureGuard,
  FeatureClock,
} from "@/components/landing-art";
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

const features = [
  {
    tag: "graph",
    title: "Typed knowledge graph",
    body: "Model entities and relationships explicitly. Retrieval follows the shape of your domain — not a pile of chunks.",
    Art: FeatureGraph,
  },
  {
    tag: "docs",
    title: "Living documents",
    body: "Every node renders as a document. Edit one field — every downstream agent updates instantly.",
    Art: FeatureDocs,
  },
  {
    tag: "runtime",
    title: "Any model, one runtime",
    body: "Route to Anthropic, OpenAI, or a local model per agent. Persona handles retrieval and provenance.",
    Art: FeatureTerminal,
  },
  {
    tag: "flow",
    title: "Visual flow builder",
    body: "Draw your logic as a graph. Connect triggers, nodes, agents. No YAML. No buried config.",
    Art: FeatureFlow,
  },
  {
    tag: "trust",
    title: "Provenance by default",
    body: "Every answer carries its source. Click a sentence, land on the node. Debug facts, not prompts.",
    Art: FeatureGuard,
  },
  {
    tag: "live",
    title: "Continuous operation",
    body: "Agents react to change, not to cron. Hook them into chat, helpdesk or internal tools.",
    Art: FeatureClock,
  },
];

const steps = [
  { n: "01", title: "Model", body: "Sketch your domain as a graph of typed nodes and edges." },
  { n: "02", title: "Deploy", body: "Point an agent at any subgraph. It inherits shape, not just text." },
  { n: "03", title: "Run", body: "Edit a node; every surface reflects the change in seconds." },
];

const faqs = [
  {
    q: "What is Persona?",
    a: "A workspace for building typed knowledge graphs and the AI agents that read from them.",
  },
  {
    q: "How is it different from a RAG pipeline?",
    a: "Persona isn't a chunk store — it's a typed graph. Retrieval is precise because the shape of your domain is explicit, not inferred.",
  },
  {
    q: "Which models does it support?",
    a: "Anthropic, OpenAI, and local models. Agents are model-agnostic; you pick per agent.",
  },
  {
    q: "Is it self-hostable?",
    a: "Yes. Bring your own Postgres and object storage, run the stack in Docker, point Persona at it.",
  },
  {
    q: "Who is it for?",
    a: "Teams whose knowledge lives in too many places — product, support, ops, research.",
  },
];

/* ——————————————————————————————————————————————————————————————
 * PRIMITIVES
 * —————————————————————————————————————————————————————————————— */

function Plus({ className }) {
  /* signature "+" corner marker — diagram / terminal-UI feel */
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

function Frame({ className, children, plus = true }) {
  /* boxy section container with optional plus markers at the corners */
  return (
    <div className={cn("relative", className)}>
      {plus && (
        <>
          <Plus className="-left-[6px] -top-[6px]" />
          <Plus className="-right-[6px] -top-[6px]" />
          <Plus className="-left-[6px] -bottom-[6px]" />
          <Plus className="-right-[6px] -bottom-[6px]" />
        </>
      )}
      {children}
    </div>
  );
}

function Eyebrow({ children }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
      <span className="h-px w-8 bg-primary/60" />
      {children}
    </span>
  );
}

/* — custom, reliable marquee — */
function LogoRail({ items }) {
  const all = [...items, ...items, ...items];
  return (
    <div className="marquee-pause relative overflow-hidden">
      <div
        className="flex w-max animate-slide-left items-center gap-16 py-1"
        style={{ ["--duration"]: "32s" }}
      >
        {all.map(({ name, Mark }, i) => (
          <div
            key={`${name}-${i}`}
            className="flex shrink-0 items-center gap-3 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Mark className="h-5 w-5" />
            <span className="text-[15px] tracking-tight">{name}</span>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}

/* ——————————————————————————————————————————————————————————————
 * HEADER
 * —————————————————————————————————————————————————————————————— */

function Header() {
  const navLinks = [
    { href: "#primitives", label: "Primitives" },
    { href: "#workflow", label: "Workflow" },
    { href: "#faq", label: "FAQ" },
  ];

  const btn =
    "inline-flex h-9 items-center justify-center rounded-none px-4 text-[12px] font-medium tracking-tight transition-colors";

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 sm:px-8">
        {/* logo */}
        <Link href="/" className="flex items-baseline tracking-tight">
          <span className="text-[16px] font-medium">persona</span>
          <span className="cursor-blink ml-0.5 font-mono text-[18px] leading-none text-primary">_</span>
        </Link>

        {/* middle nav */}
        <nav className="hidden items-center md:flex">
          {navLinks.map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              className={cn(
                "flex h-9 items-center border-y border-r border-border/60 px-4 text-[12px] tracking-tight text-muted-foreground transition-colors hover:text-foreground hover:bg-card/60",
                i === 0 && "border-l"
              )}
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* right actions */}
        <div className="flex items-center">
          <a
            href="https://github.com/KushalPraja/persona"
            target="_blank"
            rel="noreferrer"
            className={cn(
              btn,
              "border border-border/60 text-muted-foreground hover:border-border hover:bg-card/60 hover:text-foreground"
            )}
          >
            GitHub
          </a>
          <Link
            href="/home"
            className={cn(
              btn,
              "-ml-px border border-primary/70 bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            Open app
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ——————————————————————————————————————————————————————————————
 * HERO
 * —————————————————————————————————————————————————————————————— */

function Hero() {
  const capabilities = [
    ["typed nodes", "not chunks"],
    ["any model", "one runtime"],
    ["provenance", "by default"],
    ["self-hostable", "byo postgres"],
  ];

  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="grid-bg absolute inset-0" aria-hidden />
      <div className="amber-wash absolute inset-0" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6 sm:px-8">
        <div className="grid grid-cols-1 items-center gap-12 py-20 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:py-24">
          <Reveal>
            <h1 className="text-[2.75rem] font-medium leading-[1.02] tracking-[-0.03em] text-foreground sm:text-[3.5rem] md:text-[4rem]">
              A knowledge graph
              <br />
              for software{" "}
              <span className="text-primary">that remembers</span>.
            </h1>

            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Model your domain as typed nodes. Deploy agents that read from
              them — with provenance, by default. No chunks, no guessing.
            </p>

            <div className="mt-8 flex items-center">
              <Link
                href="/home"
                className="inline-flex h-10 items-center justify-center rounded-none border border-primary/70 bg-primary px-5 text-[13px] font-medium tracking-tight text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Open app
              </Link>
              <a
                href="https://github.com/KushalPraja/persona"
                target="_blank"
                rel="noreferrer"
                className="-ml-px inline-flex h-10 items-center justify-center rounded-none border border-border/70 bg-card/40 px-5 text-[13px] font-medium tracking-tight text-muted-foreground transition-colors hover:border-border hover:bg-card/80 hover:text-foreground"
              >
                GitHub
              </a>
            </div>

            {/* capability grid */}
            <div className="mt-10 grid max-w-md grid-cols-2 gap-x-6 gap-y-3 border-t border-border/50 pt-6">
              {capabilities.map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-baseline gap-2 font-mono text-[11px] text-muted-foreground"
                >
                  <span className="text-primary/80">+</span>
                  <span className="text-foreground/90">{k}</span>
                  <span className="text-border">/</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </Reveal>

          {/* product frame */}
          <Reveal delay={180} className="relative">
            <Frame>
              <div className="relative overflow-hidden rounded-md border border-border/80 bg-card/70 backdrop-blur-sm">
                {/* accent rail */}
                <div
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                  aria-hidden
                />

                {/* breadcrumb header */}
                <div className="flex items-center justify-between border-b border-border/60 bg-background/40 px-4 py-2.5 font-mono text-[11px]">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-[2px] bg-primary/80" />
                    <span className="text-foreground/80">graph</span>
                    <span className="text-border">/</span>
                    <span>main</span>
                    <span className="text-border">/</span>
                    <span className="text-foreground/50">customers</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>
                      <span className="text-foreground/80">6</span>n
                    </span>
                    <span className="text-border">·</span>
                    <span>
                      <span className="text-foreground/80">12</span>e
                    </span>
                  </div>
                </div>

                {/* schema hint */}
                <div className="hidden items-center gap-4 border-b border-border/60 bg-background/25 px-4 py-2 font-mono text-[11px] text-muted-foreground sm:flex">
                  <span className="text-primary/70">type</span>
                  <span className="text-foreground/80">Customer</span>
                  <span className="text-border">{"{"}</span>
                  <span className="text-foreground/60">uses:</span>
                  <span className="text-foreground/80">UseCase[]</span>
                  <span className="text-border">{"}"}</span>
                </div>

                {/* graph */}
                <div className="relative text-foreground/80">
                  <GraphHero className="w-full" />
                </div>

                {/* grounded-answer strip */}
                <div className="border-t border-border/60 bg-background/50 px-4 py-3 font-mono text-[11px]">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 rounded-sm border border-primary/40 bg-primary/10 px-1.5 py-px text-[10px] uppercase tracking-[0.18em] text-primary/90">
                      ask
                    </span>
                    <span className="text-foreground/75">
                      how do customers use Feature X?
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-muted-foreground">
                    <span className="truncate">
                      <span className="text-primary/80">→</span> Customer{" "}
                      <span className="text-border">·</span> Use case{" "}
                      <span className="text-border">·</span> Feature
                    </span>
                    <span className="shrink-0">
                      <span className="text-foreground/70">3 sources</span>{" "}
                      <span className="mx-1.5 text-border">|</span>
                      1.8s{" "}
                      <span className="mx-1.5 text-border">|</span>
                      <span className="text-primary/80">✓</span>
                    </span>
                  </div>
                </div>
              </div>
            </Frame>

            <div className="pointer-events-none absolute inset-x-10 -bottom-6 h-10 rounded-full bg-primary/20 blur-3xl" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ——————————————————————————————————————————————————————————————
 * INTEGRATIONS MARQUEE
 * —————————————————————————————————————————————————————————————— */

function Integrations() {
  return (
    <section className="border-y border-border/60 bg-card/30">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
        <div className="mb-5 flex items-center justify-between">
          <Eyebrow>[ 00 ] / integrations</Eyebrow>
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground sm:inline">
            <span className="text-primary">+</span> many more
          </span>
        </div>
        <LogoRail items={integrations} />
      </div>
    </section>
  );
}

/* ——————————————————————————————————————————————————————————————
 * FEATURES — boxy shared-border grid
 * —————————————————————————————————————————————————————————————— */

function Features() {
  return (
    <section id="primitives" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20 sm:px-8">
      <Reveal>
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <Eyebrow>[ 01 ] / primitives</Eyebrow>
            <h2 className="mt-3 max-w-xl text-3xl font-medium leading-[1.1] tracking-[-0.02em] sm:text-4xl">
              The building blocks.
            </h2>
          </div>
          <p className="hidden max-w-xs text-sm leading-relaxed text-muted-foreground sm:block">
            Six primitives that define how Persona thinks about knowledge —
            each first-class, none optional.
          </p>
        </div>
      </Reveal>

      <Frame>
        <div className="grid grid-cols-1 gap-px overflow-hidden border border-border/70 bg-border/70 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ tag, title, body, Art }, i) => (
            <Reveal
              key={title}
              delay={(i % 3) * 80}
              as="article"
              className="group relative bg-card/40 backdrop-blur-sm transition-colors hover:bg-card/80"
            >
              {/* illustration cell */}
              <div className="relative flex h-32 items-center justify-center border-b border-border/60 bg-background/40 text-foreground/60 transition-colors group-hover:text-foreground/85">
                <Art className="h-20" />
                <span className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")} · {tag}
                </span>
              </div>
              {/* copy */}
              <div className="p-6">
                <h3 className="text-[15px] font-medium tracking-tight">
                  {title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-[1.65] text-muted-foreground">
                  {body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Frame>
    </section>
  );
}

/* ——————————————————————————————————————————————————————————————
 * HOW IT WORKS
 * —————————————————————————————————————————————————————————————— */

function HowItWorks() {
  return (
    <section id="workflow" className="scroll-mt-20 border-y border-border/60 bg-card">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
        <Reveal className="mb-10 flex items-end justify-between gap-6">
          <div>
            <Eyebrow>[ 02 ] / workflow</Eyebrow>
            <h2 className="mt-3 text-3xl font-medium leading-[1.1] tracking-[-0.02em] sm:text-4xl">
              How it works.
            </h2>
          </div>
          <p className="hidden max-w-xs text-sm leading-relaxed text-muted-foreground sm:block">
            Three steps, no CLI required.
          </p>
        </Reveal>

        <Frame>
          <ol className="grid grid-cols-1 gap-px overflow-hidden border border-border/70 bg-border/70 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal
                key={s.n}
                as="li"
                delay={i * 120}
                className="relative bg-card/50 p-8"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-5xl tracking-tight text-primary/90">
                    {s.n}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    step {i + 1}/3
                  </span>
                </div>
                <h3 className="mt-6 text-[17px] font-medium tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.65] text-muted-foreground">
                  {s.body}
                </p>
              </Reveal>
            ))}
          </ol>
        </Frame>
      </div>
    </section>
  );
}

/* ——————————————————————————————————————————————————————————————
 * FAQ
 * —————————————————————————————————————————————————————————————— */

function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20 sm:px-8">
      <Reveal className="mb-10">
        <Eyebrow>[ 03 ] / questions</Eyebrow>
        <h2 className="mt-3 text-3xl font-medium leading-[1.1] tracking-[-0.02em] sm:text-4xl">
          Frequently asked.
        </h2>
      </Reveal>

      <Reveal delay={100}>
        <Frame>
          <Accordion
            type="single"
            collapsible
            className="overflow-hidden border border-border/70 bg-card/30"
          >
            {faqs.map((item, i) => (
              <AccordionItem
                key={i}
                value={`q-${i}`}
                className="border-b border-border/70 last:border-b-0"
              >
                <AccordionTrigger className="px-6 py-5 text-left text-[15px] font-medium tracking-tight hover:no-underline [&>svg]:text-muted-foreground">
                  <span className="flex items-baseline gap-4">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{item.q}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 pl-[4.25rem] text-[14px] leading-[1.7] text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Frame>
      </Reveal>
    </section>
  );
}

/* ——————————————————————————————————————————————————————————————
 * CTA
 * —————————————————————————————————————————————————————————————— */

function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24 sm:px-8">
      <Reveal className="mb-10">
        <Eyebrow>[ 04 ] / start</Eyebrow>
        <h2 className="mt-3 text-3xl font-medium leading-[1.1] tracking-[-0.02em] sm:text-4xl">
          Ready when you are.
        </h2>
      </Reveal>

      <Reveal delay={100}>
        <Frame>
          <div className="amber-wash relative overflow-hidden border border-border/70 bg-card/30">
            <div
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
              aria-hidden
            />
            <div
              className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
              aria-hidden
            />
            <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
            <div className="relative flex flex-col items-start justify-between gap-8 px-8 py-16 sm:flex-row sm:items-center sm:px-12">
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Open the app, start with a blank canvas, or import what
                you already have. No signup ceremony.
              </p>
              <div className="flex shrink-0 items-center">
                <Link
                  href="/home"
                  className="inline-flex h-10 items-center justify-center rounded-none border border-primary/70 bg-primary px-5 text-[13px] font-medium tracking-tight text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Open app
                </Link>
                <a
                  href="https://github.com/KushalPraja/persona"
                  target="_blank"
                  rel="noreferrer"
                  className="-ml-px inline-flex h-10 items-center justify-center rounded-none border border-border/70 bg-card/40 px-5 text-[13px] font-medium tracking-tight text-muted-foreground transition-colors hover:border-border hover:bg-card/80 hover:text-foreground"
                >
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </Frame>
      </Reveal>
    </section>
  );
}

/* ——————————————————————————————————————————————————————————————
 * FOOTER
 * —————————————————————————————————————————————————————————————— */

function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border/60">
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        aria-hidden
      />
      <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-6 sm:px-8">
        {/* meta row above the big wordmark */}
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          <span className="h-px w-8 bg-primary/60" />
          <span>© {new Date().getFullYear()} persona</span>
        </div>

        {/* giant trendy wordmark */}
        <div
          aria-hidden
          className="relative mt-8 flex items-baseline leading-[0.82] tracking-[-0.06em] text-foreground"
        >
          <span className="select-none font-medium text-[clamp(4rem,22vw,17rem)]">
            persona
          </span>
          <span className="cursor-blink -ml-1 select-none font-mono font-medium text-primary text-[clamp(4rem,22vw,17rem)]">
            _
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ——————————————————————————————————————————————————————————————
 * PAGE
 * —————————————————————————————————————————————————————————————— */

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <Integrations />
        <Features />
        <HowItWorks />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
