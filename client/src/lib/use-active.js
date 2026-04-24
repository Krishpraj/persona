"use client";

import { useEffect, useRef, useState } from "react";

/* useActive — returns `true` while the observed element is crossing the
 * middle band of the viewport (default: middle 20% strip). Used to flag
 * the "currently reading" chapter without tracking scroll position by
 * hand. Re-toggles as you scroll past each chapter. Respects
 * prefers-reduced-motion by remaining permanently false (no glow flicker). */
export function useActive({
  topFrac = 0.45,
  bottomFrac = 0.45,
} = {}) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    if (typeof IntersectionObserver === "undefined") return;

    const rootMargin = `-${(topFrac * 100).toFixed(2)}% 0px -${(
      bottomFrac * 100
    ).toFixed(2)}% 0px`;

    const io = new IntersectionObserver(
      ([e]) => setActive(!!e.isIntersecting),
      { rootMargin, threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [topFrac, bottomFrac]);

  return [ref, active];
}
