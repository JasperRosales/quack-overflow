"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import type { DuckState } from "@/lib/types";
import { Duck } from "./Duck";

const CYCLE: { state: DuckState; bubble: string }[] = [
  { state: "curious", bubble: "What value does i have on the last loop?" },
  { state: "thinking", bubble: "Hmm… and what did you expect it to be?" },
  { state: "curious", bubble: "Which line decides when the loop stops?" },
  { state: "celebrating", bubble: "QUACK! You found it yourself! 🎉" },
];

/** Landing-page duck that acts out a tiny debugging conversation. */
export function HeroDuck() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((v) => (v + 1) % CYCLE.length), 3200);
    return () => clearInterval(t);
  }, [reduce]);
  const c = CYCLE[i];
  return (
    <div className="flex flex-col items-center">
      <div className="neu-inset-sm relative mb-3 flex min-h-[3.75rem] w-full max-w-xs items-center justify-center rounded-2xl px-4 py-2 text-center text-sm text-amber-950 dark:text-amber-50">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {c.bubble}
          </motion.span>
        </AnimatePresence>
      </div>
      <Duck state={c.state} size={260} />
    </div>
  );
}
