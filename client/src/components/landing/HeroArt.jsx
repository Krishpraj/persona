"use client";

import Link from "next/link";
import { AsciiField } from "./AsciiField";
import { cn } from "@/lib/utils";

function MonoButton({ href, children, variant = "ghost", external = false }) {
  const base =
    "group/btn relative inline-flex h-11 items-center gap-2 overflow-hidden border px-5 font-mono text-[11.5px] uppercase tracking-[0.2em] transition-all duration-300 ease-out will-change-transform hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const styles =
    variant === "solid"
      ? "border-foreground/85 bg-foreground text-background shadow-[0_1px_0_oklch(0.215_0.015_245/0.15)] hover:shadow-[0_10px_24px_-12px_oklch(0.215_0.015_245/0.55)]"
      : "border-foreground/25 bg-background/60 text-foreground backdrop-blur-sm hover:border-foreground/60 hover:bg-background/80";
  const Comp = external ? "a" : Link;
  const extProps = external ? { target: "_blank", rel: "noreferrer" } : {};
  return (
    <Comp href={href} className={cn(base, styles)} {...extProps}>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -translate-x-full skew-x-[-18deg] transition-transform duration-700 ease-out group-hover/btn:translate-x-full",
          variant === "solid"
            ? "bg-gradient-to-r from-transparent via-background/15 to-transparent"
            : "bg-gradient-to-r from-transparent via-primary/15 to-transparent"
        )}
      />
      <span className="relative z-10">{children}</span>
    </Comp>
  );
}

export function HeroArt() {
  return (
    <section
      aria-label="Persona hero"
      className="relative overflow-hidden bg-background"
    >
      <div className="pointer-events-none absolute inset-0">
        <AsciiField className="opacity-95" palette="spectrum" />
      </div>

      {/* blue ambient glow — top-left */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[10%] -top-[10%] h-[70%] w-[70%] bg-[radial-gradient(ellipse_60%_50%_at_30%_30%,oklch(0.56_0.17_252/0.28),transparent_70%)]"
      />
      {/* rose ambient glow — bottom-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[10%] -bottom-[10%] h-[70%] w-[70%] bg-[radial-gradient(ellipse_60%_50%_at_70%_70%,oklch(0.6_0.22_28/0.25),transparent_70%)]"
      />

      {/* cream legibility vignette — center */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_62%_58%_at_50%_45%,oklch(0.925_0.010_82/0.95),oklch(0.925_0.010_82/0.72)_45%,oklch(0.925_0.010_82/0.22)_70%,transparent_90%)]"
      />

      <div className="relative mx-auto flex min-h-[78vh] w-full max-w-[1040px] flex-col items-center justify-center px-6 py-20 text-center sm:px-10 sm:py-24">
        <h1 className="font-display text-[2.6rem] font-normal leading-[1.02] tracking-[-0.02em] text-foreground sm:text-[3.6rem] md:text-[4.4rem]">
          Ship AI agents
          <br />
          that{" "}
          <em className="relative whitespace-nowrap font-display italic">
            know your stuff
            <svg
              aria-hidden
              viewBox="0 0 240 10"
              preserveAspectRatio="none"
              className="absolute -bottom-1 left-0 h-[0.35em] w-full text-primary/70"
            >
              <path
                d="M2 6 Q 60 1 120 5 T 238 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </em>
          .
        </h1>

        <p className="mt-6 max-w-[520px] text-[14.5px] font-medium leading-[1.65] text-foreground/90">
          Ground an agent in your docs, PDFs, CSVs or graphs. Extend it with any
          MCP server. Publish in one click as a URL, an iframe, or a JSON API.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <MonoButton href="/signin" variant="solid">
            Start free
          </MonoButton>
          <MonoButton href="#anatomy">See how it works</MonoButton>
        </div>
      </div>
    </section>
  );
}
