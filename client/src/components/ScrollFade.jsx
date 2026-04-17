"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

/* Scroll-progress-driven fade/slide/scale.
 * Smoothly animates as the element enters AND leaves the viewport. */
export function ScrollFade({
  as: Tag = "div",
  className,
  children,
  y = 40,
  scale = 0.96,
  delay = 0,
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.95", "end 0.2"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.85, 1], [0, 1, 1, 0.9]);
  const translateY = useTransform(scrollYProgress, [0, 0.35], [y, 0]);
  const s = useTransform(scrollYProgress, [0, 0.35], [scale, 1]);

  const MotionTag = motion[Tag] ?? motion.div;

  return (
    <MotionTag
      ref={ref}
      style={{ opacity, y: translateY, scale: s, transitionDelay: `${delay}ms` }}
      className={cn(className)}
    >
      {children}
    </MotionTag>
  );
}

/* Staggered children — each child animates in with an offset delay. */
export function ScrollStagger({ as: Tag = "div", className, children, stagger = 80 }) {
  return (
    <Tag className={cn(className)}>
      {Array.isArray(children)
        ? children.map((c, i) => (
            <ScrollFade key={i} delay={i * stagger}>
              {c}
            </ScrollFade>
          ))
        : children}
    </Tag>
  );
}
