/**
 * Leak-guard pipeline: draft → deterministic checks → LLM judge → regenerate once → safe fallback.
 * Pure orchestration (dependencies injected) so it can be tested without the API.
 */
import { CONFIG } from "./config";
import { deterministicCheck, pickFallback, type GuardContext } from "./leakGuard";
import type { DuckReply } from "./types";

export interface PipelineDeps {
  /** Produce a draft; `leakReason` is set when regenerating after a caught leak. */
  generate: (leakReason?: string) => Promise<DuckReply>;
  /** LLM judge, or null in mock mode. */
  judge: ((draft: string) => Promise<{ leak: boolean; reason: string }>) | null;
  onStage?: (stage: "checking" | "rewriting") => void;
}

export interface PipelineResult {
  reply: DuckReply;
  guardCatches: number;
  usedFallback: boolean;
  reasons: string[];
}

let totalCatches = 0;
/** Guard catches since the server started (count only — no content is logged). */
export const guardStats = () => ({ totalCatches });

export async function guardedReply(ctx: GuardContext, deps: PipelineDeps): Promise<PipelineResult> {
  let draft = await deps.generate();
  let catches = 0;
  const reasons: string[] = [];

  for (let attempt = 0; ; attempt++) {
    deps.onStage?.("checking");
    const det = deterministicCheck(draft.reply, ctx);
    let leak = det.leak;
    let reason = det.reasons[0] ?? "";
    if (!leak && deps.judge && (CONFIG.guardJudgeMode === "always" || det.suspicious)) {
      try {
        const j = await deps.judge(draft.reply);
        if (j.leak) {
          leak = true;
          reason = j.reason || "the judge flagged the draft";
        }
      } catch (err) {
        // Judge unavailable: deterministic checks already passed; only block if the phrasing was suspicious.
        console.warn("[leakGuard] judge failed", err);
        if (det.suspicious) {
          leak = true;
          reason = "suspicious phrasing and the judge was unavailable";
        }
      }
    }

    if (!leak) return { reply: draft, guardCatches: catches, usedFallback: false, reasons };

    catches++;
    totalCatches++;
    reasons.push(reason);
    console.info(`[leakGuard] blocked a leaky draft (total this server: ${totalCatches})`);

    if (attempt < CONFIG.guardRegenerateAttempts) {
      deps.onStage?.("rewriting");
      draft = await deps.generate(reason);
      continue;
    }

    const fallback: DuckReply = draft.solved_signal
      ? { reply: "QUAAACK!! 🎉 You found it! Go ahead and make the change yourself, you've earned it.", solved_signal: true, duck_mood: "celebrating" }
      : {
          reply: pickFallback(Date.now()),
          // Line numbers are never a leak; keep them so the hint ladder still works.
          highlight_lines: (ctx.hintLevel ?? 0) >= 3 ? draft.highlight_lines : undefined,
          solved_signal: false,
          duck_mood: "curious",
        };
    return { reply: fallback, guardCatches: catches, usedFallback: true, reasons };
  }
}
