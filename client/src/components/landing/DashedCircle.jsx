import { cn } from "@/lib/utils";

/**
 * Large dashed circle with a centered stat. SVG so the dashes stay crisp at
 * any size and the gap stays consistent.
 */
export function DashedCircle({ value, label, className }) {
  return (
    <div className={cn("relative aspect-square w-full max-w-[280px]", className)}>
      <svg
        viewBox="0 0 200 200"
        className="h-full w-full text-muted-foreground"
        aria-hidden
      >
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.55"
          strokeWidth="1"
          strokeDasharray="2 8"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-sans text-[52px] font-medium leading-[1] tracking-[-0.04em] text-foreground">
          {value}
        </div>
        <div className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}
