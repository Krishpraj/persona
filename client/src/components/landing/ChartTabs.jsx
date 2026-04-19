"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SignalChart } from "./SignalChart";

/**
 * Mono-labeled tab bar above the chart. Only "Signal density" renders a live
 * chart; the other tabs are stubs — hovering shows a "coming" note. Keeps the
 * landing honest while still projecting the editorial "multiple views" feel.
 */
const TABS = [
  { id: "signal", label: "Signal density" },
  { id: "latency", label: "Retrieval latency" },
  { id: "setup", label: "Setup time" },
  { id: "prov", label: "Provenance coverage" },
  { id: "scale", label: "Scale" },
  { id: "cost", label: "Inference cost" },
];

export function ChartTabs() {
  const [active, setActive] = useState("signal");

  return (
    <div className="flex flex-col">
      <div
        className="scrollbar-thin flex overflow-x-auto border-b border-border/60"
        role="tablist"
        aria-label="Chart views"
      >
        {TABS.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(t.id)}
              className={cn(
                "group relative shrink-0 px-5 py-3 text-left font-mono text-[11.5px] uppercase tracking-[0.18em] transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-5 -bottom-px h-px transition-colors",
                  isActive ? "bg-primary" : "bg-transparent"
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="relative px-6 py-8 sm:px-10 md:px-14">
        <div className="mb-2 flex items-baseline gap-3">
          <h3 className="text-[18px] font-medium tracking-tight">
            Signal density
          </h3>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
            · precision per retrieved token (higher is better)
          </span>
        </div>

        {active === "signal" ? (
          <SignalChart className="mt-4 text-foreground" />
        ) : (
          <div className="flex h-[340px] items-center justify-center border border-dashed border-border/60 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            — view shipping next release —
          </div>
        )}

        <div className="mt-6 flex items-center justify-center border-t border-border/60 pt-5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
          numbers illustrative · see the{" "}
          <a
            href="https://github.com/KushalPraja/persona"
            target="_blank"
            rel="noreferrer"
            className="ml-1.5 underline underline-offset-4 decoration-primary/50 hover:text-foreground"
          >
            repo
          </a>
          <span className="ml-1.5">for methodology</span>
        </div>
      </div>
    </div>
  );
}
