"use client";

import { MotionConfig } from "framer-motion";

/** App-wide motion defaults: honour the OS "reduce motion" setting everywhere. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 380, damping: 30 }}>
      {children}
    </MotionConfig>
  );
}
