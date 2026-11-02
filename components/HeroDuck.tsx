"use client";

import { useReducedMotion } from "framer-motion";
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
      <div className="relative mb-2 max-w-xs rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-50">
        {c.bubble}
        <span className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 border-r border-b border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-[#2a2111]" aria-hidden />
      </div>
      <Duck state={c.state} size={260} />
    </div>
  );
}
