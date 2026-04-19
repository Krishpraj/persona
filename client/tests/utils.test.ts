import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins class names and ignores falsy values", () => {
    expect(cn("a", false, "b", null, undefined, "c")).toBe("a b c");
  });

  it("dedupes tailwind conflicts (later wins)", () => {
    // twMerge is what backs cn — px-4 should be overridden by px-8.
    expect(cn("px-4", "px-8")).toBe("px-8");
  });

  it("respects variant-like keys without merging unrelated utilities", () => {
    const out = cn("text-sm", "font-medium", "text-sm");
    // dedup collapses duplicates but leaves unrelated keys intact
    expect(out).toContain("font-medium");
    expect(out.match(/text-sm/g)?.length).toBe(1);
  });
});
