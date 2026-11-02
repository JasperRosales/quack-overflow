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
    <section aria-labelledby="hint-ladder-title" className="surface rounded-xl p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="hint-ladder-title" className="text-sm font-medium">
          Hint ladder
        </h2>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {level === 0 ? "No hints used" : `Level ${level} of 4`}
        </span>
      </div>
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((s) => {
          const used = s.level <= level;
          const isNext = s.level === next;
          const active = isNext && !disabled;
          return (
            <li key={s.level}>
              <motion.button
                whileTap={active ? { scale: 0.97 } : undefined}
                type="button"
                data-testid={`hint-${s.level}`}
                disabled={disabled || !isNext}
                onClick={() => setPending(s.level)}
                title={s.desc}
                className={cn(
                  "group flex w-full flex-col gap-2 rounded-lg px-1 pt-1 pb-1.5 text-left text-xs transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active && "hover:bg-muted",
                  !used && !active && "opacity-45"
                )}
              >
                {/* progress segment */}
                <span className="relative block h-1 overflow-hidden rounded-full bg-border">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full bg-[var(--brand)]"
                    initial={false}
                    animate={{ width: used ? "100%" : "0%" }}
                    transition={{ type: "spring", stiffness: 200, damping: 30 }}
                  />
                </span>
                <span className="flex items-baseline gap-1.5 px-0.5">
                  <span className="text-muted-foreground tabular-nums">{s.level}</span>
                  <span className={cn("font-medium", active && "text-foreground", used && "text-foreground")}>{s.label}</span>
                </span>
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
