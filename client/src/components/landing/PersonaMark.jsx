import { cn } from "@/lib/utils";

/**
 * Angular architectural mark for the hero — two solid rectangular "nodes"
 * joined by a thin edge bar, with a secondary accent block. Reads as a tiny
 * graph diagram without being literal. Uses `currentColor` so the surrounding
 * text color flows through; amber accent is explicit via fill.
 */
export function PersonaMark({ className }) {
  return (
    <svg
      viewBox="0 0 220 220"
      fill="none"
      className={cn("text-foreground", className)}
      aria-hidden
    >
      {/* primary block — left-aligned vertical rectangle */}
      <rect x="10" y="28" width="88" height="144" fill="currentColor" />

      {/* edge — horizontal bar connecting the two blocks */}
      <rect
        x="88"
        y="92"
        width="66"
        height="8"
        fill="currentColor"
        opacity="0.35"
      />

      {/* secondary block — top-right solid square, offset */}
      <rect x="140" y="18" width="72" height="72" fill="currentColor" />

      {/* tertiary block — bottom-right, amber accent */}
      <rect
        x="140"
        y="120"
        width="72"
        height="72"
        fill="var(--primary)"
      />

      {/* cutaway notch on primary block — makes it feel machined */}
      <rect x="10" y="28" width="22" height="22" fill="var(--background)" />

      {/* tiny dot on the edge bar — "transit" marker */}
      <rect x="118" y="88" width="6" height="16" fill="var(--background)" />
    </svg>
  );
}
