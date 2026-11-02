"use client";

import { MotionConfig, motion, type HTMLMotionProps } from "framer-motion";

/** App-wide motion defaults: honour the OS "reduce motion" setting everywhere. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 380, damping: 30 }}>
      {children}
    </MotionConfig>
  );
}

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 26 } },
} as const;

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
} as const;

/** A list whose items fade up one after another when scrolled into view. */
export function RevealList({ className, children, ...rest }: HTMLMotionProps<"ul">) {
  return (
    <motion.ul className={className} variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} {...rest}>
      {children}
    </motion.ul>
  );
}
