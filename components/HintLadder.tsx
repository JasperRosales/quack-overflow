"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { HINT_CONFIRM } from "@/lib/prompts";
import type { HintLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS: { level: Exclude<HintLevel, 0>; label: string; desc: string }[] = [
  { level: 1, label: "Nudge", desc: "Point me toward the general area" },
  { level: 2, label: "Concept", desc: "Name the kind of bug" },
  { level: 3, label: "Line", desc: "Highlight the exact line" },
  { level: 4, label: "Why", desc: "Explain why that line is wrong (still no fix!)" },
];

interface HintLadderProps {
  level: HintLevel;
  disabled?: boolean;
  onClimb: (next: HintLevel) => void;
}

/** A 4-step hint ladder. Each step asks "Are you sure?" before climbing. */
export function HintLadder({ level, disabled, onClimb }: HintLadderProps) {
  const [pending, setPending] = useState<HintLevel | null>(null);
  const next = (level + 1) as HintLevel;

  return (
    <section aria-labelledby="hint-ladder-title" className="neu rounded-3xl p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="hint-ladder-title" className="text-sm font-semibold">
          🪜 Hint ladder
        </h2>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {level === 0 ? "No hints used, nice!" : `Level ${level} of 4`}
        </span>
      </div>
      <ol className="grid grid-cols-4 gap-2 sm:gap-3">
        {STEPS.map((s) => {
          const used = s.level <= level;
          const isNext = s.level === next;
          return (
            <li key={s.level}>
              <motion.button
                whileTap={disabled || !isNext ? undefined : { scale: 0.94 }}
                type="button"
                data-testid={`hint-${s.level}`}
                disabled={disabled || !isNext}
                onClick={() => setPending(s.level)}
                title={s.desc}
                className={cn(
                  "relative flex min-h-14 w-full flex-col items-center justify-center rounded-2xl px-1 py-2 text-xs font-medium transition-shadow",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  used && "neu-inset-sm text-amber-800 dark:text-amber-200",
                  isNext && !disabled && "neu-sm ring-1 ring-amber-400/60",
                  !used && (!isNext || disabled) && "neu-sm opacity-50"
                )}
              >
                {isNext && !disabled && (
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-amber-400"
                    animate={{ opacity: [0.15, 0.7, 0.15] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <span className="text-base leading-none">{s.level}</span>
                <span>{s.label}</span>
                <span className="sr-only">
                  {" "}hint: {s.desc}
                  {used ? " (used)" : ""}
                </span>
              </motion.button>
            </li>
          );
        })}
      </ol>

      <Dialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{HINT_CONFIRM}</DialogTitle>
            <DialogDescription>
              {pending ? `Hint ${pending}: ${STEPS[pending - 1].desc}.` : ""} Bugs you find yourself stick in your brain way longer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              I&apos;ll think more
            </Button>
            <Button
              data-testid="confirm-hint"
              onClick={() => {
                if (pending) onClimb(pending);
                setPending(null);
              }}
            >
              Yes, give me hint {pending}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
