"use client";

import { useState } from "react";
import { Duck } from "./Duck";
import { Button } from "./ui/button";
import { DUCK_STATES, type DuckState } from "@/lib/types";

/** Dev toggle: cycles the on-screen duck through every mood. */
export function DuckStatePreview({ onChange }: { onChange?: (s: DuckState) => void }) {
  const [i, setI] = useState(0);
  const state = DUCK_STATES[i];
  const pick = (idx: number) => {
    setI(idx);
    onChange?.(DUCK_STATES[idx]);
  };
  return (
    <div className="flex flex-col items-center gap-4">
      <Duck state={state} size={220} />
      <p className="text-sm text-muted-foreground" aria-live="polite">
        State: <strong className="text-foreground">{state}</strong>
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => pick((i + 1) % DUCK_STATES.length)} data-testid="cycle-duck">
          Cycle state ↻
        </Button>
        {DUCK_STATES.map((s, idx) => (
          <Button key={s} variant={idx === i ? "secondary" : "outline"} size="sm" onClick={() => pick(idx)}>
            {s}
          </Button>
        ))}
      </div>
    </div>
  );
}
