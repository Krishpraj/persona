"use client";

import { useEffect, useState } from "react";

/* useStep — returns an integer 0..count-1 that advances on an interval
 * and wraps. Drives looped product-demo animations. Skipped under
 * prefers-reduced-motion; the step is pinned to the final frame so
 * reduced-motion users still see the completed state of each demo. */
export function useStep({ count = 8, interval = 900 } = {}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (m.matches) {
      setStep(count - 1);
      return;
    }
    const id = setInterval(
      () => setStep((s) => (s + 1) % count),
      interval
    );
    return () => clearInterval(id);
  }, [count, interval]);

  return step;
}
