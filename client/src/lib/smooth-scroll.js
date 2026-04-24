"use client";

import { useEffect } from "react";

/* useSmoothScroll — delegates clicks on same-page anchors (`href="#..."`)
 * to `window.scrollTo({ behavior: "smooth", ... })` while accounting for
 * the sticky nav. No scroll hijacking — this is a light polish over native
 * smooth scroll so anchor clicks land clean of the sticky bar. Skipped for
 * reduced-motion users and for anchors that explicitly opt out via
 * data-no-smooth. */
export function useSmoothScroll({ navOffset = 72 } = {}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const onClick = (e) => {
      const t = e.target;
      if (!t || typeof t.closest !== "function") return;
      const a = t.closest('a[href^="#"]');
      if (!a) return;
      if (a.dataset.noSmooth != null) return;

      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      const id = href.slice(1);
      const el = document.getElementById(id);
      if (!el) return;

      e.preventDefault();
      const y = el.getBoundingClientRect().top + window.scrollY - navOffset;
      window.scrollTo({
        top: y,
        behavior: reduced ? "auto" : "smooth",
      });
      try {
        history.pushState(null, "", `#${id}`);
      } catch {
        /* noop — some sandboxes block pushState */
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navOffset]);
}
