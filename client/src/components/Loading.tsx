import { cn } from "@/lib/utils";

type Variant = "page" | "panel" | "inline";

type LoadingProps = {
  label?: string;
  variant?: Variant;
  className?: string;
};

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
      style={{ width: size, height: size }}
    />
  );
}

export function Loading({
  label = "loading",
  variant = "panel",
  className,
}: LoadingProps) {
  const inner = (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground",
        variant === "inline" && "text-[10px]"
      )}
    >
      <span className="text-primary/80">
        <Spinner size={variant === "inline" ? 10 : 12} />
      </span>
      <span className="text-foreground/70">{label}</span>
      <span className="cursor-blink text-primary">_</span>
    </span>
  );

  if (variant === "inline") {
    return <span className={className}>{inner}</span>;
  }

  if (variant === "page") {
    return (
      <div
        className={cn(
          "flex min-h-[60vh] flex-col items-center justify-center gap-3",
          className
        )}
        role="status"
        aria-live="polite"
      >
        {inner}
      </div>
    );
  }

  // panel — dashed empty-state style so it blends with nearby lists/cards
  return (
    <div
      className={cn(
        "flex items-center justify-center border border-dashed border-border/60 bg-card/20 px-6 py-10",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {inner}
    </div>
  );
}

export default Loading;
