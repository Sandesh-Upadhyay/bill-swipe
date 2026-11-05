"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Fades/slides children in when scrolled into view. Respects reduced motion. */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 18,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  light,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "center" | "left";
  light?: boolean;
}) {
  return (
    <Reveal className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${light ? "text-mint" : "text-primary"}`}>{eyebrow}</p>
      )}
      <h2 className={`mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl ${light ? "text-white" : ""}`}>{title}</h2>
      {description && (
        <p className={`mt-4 text-base leading-relaxed ${light ? "text-white/70" : "text-muted-foreground"}`}>{description}</p>
      )}
    </Reveal>
  );
}
