"use client";

import { useEffect, useRef } from "react";

/* useRailProgress — binds a numeric 0..1 scroll-progress to the
 * `--rail-progress` CSS custom property on the returned ref.
 *
 * Progress starts as the section's top crosses ~72% of viewport
 * height, and reaches 1 as the section's bottom crosses ~28%.
 * Uses a single rAF-throttled scroll listener — no library, no
 * scroll hijacking. Skipped under prefers-reduced-motion (value is
 * pinned to 1 so the rail appears fully drawn). */
export function useRailProgress({ startFrac = 0.72, endFrac = 0.28 } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) {
      el.style.setProperty("--rail-progress", "1");
      return;
    }

    let raf = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const startY = vh * startFrac;
      const endY = vh * endFrac;
      // p starts growing once rect.top drops below startY, reaches 1
      // when rect.bottom has risen above endY.
      const traveled = startY - rect.top;
      const total = rect.height - (startY - endY);
      const p = Math.max(0, Math.min(1, traveled / Math.max(1, total)));
      el.style.setProperty("--rail-progress", p.toFixed(4));
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [startFrac, endFrac]);

  return ref;
}
