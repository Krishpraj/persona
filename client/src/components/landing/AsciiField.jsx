"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/* ——————————————————————————————————————————————————————————————
 * AsciiField — canvas-based monospace flowfield. Each cell picks a
 * character from RAMP based on a noise value; the pointer adds a
 * radial "heat" bump that warps and lights the field.
 * —————————————————————————————————————————————————————————————— */

const RAMP = " ·:-+=*x#%@";

export function AsciiField({ className, density = 11, palette = "rose" }) {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: -9999, y: -9999, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cellW = density;
    const cellH = Math.round(density * 1.6);

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = mq.matches;
    const onReduce = (e) => {
      reduced = e.matches;
    };
    mq.addEventListener?.("change", onReduce);

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / cellW) + 1;
      rows = Math.ceil(height / cellH) + 1;
      ctx.font = `500 ${cellH - 3}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
      ctx.textBaseline = "top";
    }
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
      mouse.current.active = true;
    }
    function onPointerLeave() {
      mouse.current.active = false;
      mouse.current.x = -9999;
      mouse.current.y = -9999;
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);

    let t = 0;
    let raf = 0;
    let last = 0;
    const FRAME_MS = 1000 / 30;

    function draw(now) {
      raf = requestAnimationFrame(draw);
      if (now - last < FRAME_MS) return;
      last = now;

      if (!reduced) t += 0.012;

      ctx.clearRect(0, 0, width, height);

      const mx = mouse.current.x / cellW;
      const my = mouse.current.y / cellH;
      const active = mouse.current.active;
      const R = 16;
      const R2 = R * R;

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const a =
            Math.sin(i * 0.18 + t * 1.1) * 0.5 +
            Math.cos(j * 0.22 - t * 0.85) * 0.5 +
            Math.sin((i + j) * 0.07 + t * 0.55) * 0.45;
          let v = (a + 1.45) / 2.9;

          let heat = 0;
          if (active) {
            const dx = i - mx;
            const dy = j - my;
            const d2 = dx * dx + dy * dy;
            if (d2 < R2) {
              heat = 1 - d2 / R2;
              v = Math.min(1, v + heat * 0.7);
            }
          }

          if (v < 0.06) continue;
          const idx = Math.min(
            RAMP.length - 1,
            Math.floor(v * (RAMP.length - 1))
          );
          const ch = RAMP[idx];
          if (ch === " ") continue;

          const alpha = 0.2 + v * 0.55 + heat * 0.45;
          if (palette === "spectrum") {
            // fire-and-ice: rose peaks, blue troughs, pointer stays hot
            if (heat > 0.3) {
              // pointer heat: blazing warm rose
              ctx.fillStyle = `oklch(0.6 0.22 28 / ${Math.min(1, alpha + 0.25).toFixed(3)})`;
            } else if (v > 0.78) {
              // high peaks: hot rose/coral
              ctx.fillStyle = `oklch(0.64 0.2 24 / ${alpha.toFixed(3)})`;
            } else if (v > 0.58) {
              // warm mid: dusty rose
              ctx.fillStyle = `oklch(0.7 0.14 22 / ${alpha.toFixed(3)})`;
            } else if (v > 0.42) {
              // cool mid: vivid azure
              ctx.fillStyle = `oklch(0.56 0.17 252 / ${alpha.toFixed(3)})`;
            } else if (v > 0.24) {
              // lower mid: teal-cyan
              ctx.fillStyle = `oklch(0.68 0.13 218 / ${(alpha * 0.95).toFixed(3)})`;
            } else {
              // troughs: deep indigo ink
              ctx.fillStyle = `oklch(0.38 0.14 258 / ${(alpha * 0.6).toFixed(3)})`;
            }
          } else if (heat > 0.3 || v > 0.82) {
            // pointer: saturated warm rose
            ctx.fillStyle = `oklch(0.58 0.22 28 / ${Math.min(1, alpha + 0.22).toFixed(3)})`;
          } else if (v > 0.58) {
            ctx.fillStyle = `oklch(0.66 0.16 24 / ${alpha.toFixed(3)})`;
          } else if (v > 0.3) {
            ctx.fillStyle = `oklch(0.74 0.11 22 / ${(alpha * 0.9).toFixed(3)})`;
          } else {
            ctx.fillStyle = `oklch(0.5 0.1 22 / ${(alpha * 0.55).toFixed(3)})`;
          }
          ctx.fillText(ch, i * cellW, j * cellH);
        }
      }
    }

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mq.removeEventListener?.("change", onReduce);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
    };
  }, [density, palette]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("block h-full w-full", className)}
    />
  );
}
