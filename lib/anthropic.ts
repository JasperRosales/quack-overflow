import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { CONFIG, MODELS } from "./config";
import { CATEGORY_IDS } from "./categories";
import {
  CLASSIFY_SYSTEM,
  DUCK_SYSTEM,
  GUARD_SYSTEM,
  buildClassifyPrompt,
  buildDuckContext,
  buildGuardPrompt,
  regenerateInstruction,
  triggerNote,
} from "./prompts";
import type { DuckReply, DuckRequest, HintLevel } from "./types";
import { DUCK_STATES } from "./types";

/** Mock mode: MOCK_AI=true, or no credentials configured (so the app is always demoable). */
export function isMock(): boolean {
  if (process.env.MOCK_AI === "true") return true;
  return !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

/** Models that accept server-side refusal fallbacks ("default" routing). */
const FALLBACK_MODELS = new Set(["claude-sonnet-5-5", "claude-opus-5-5", "claude-opus-5", "claude-fable-5-1"]);
function fallbackParams(model: string) {
  return FALLBACK_MODELS.has(model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {};
}

export class RefusalError extends Error {}

// ---------------------------------------------------------------------------
// Duck
// ---------------------------------------------------------------------------

const DuckReplySchema = z.object({
  reply: z.string(),
  highlight_lines: z.array(z.number().int()),
  solved_signal: z.boolean(),
  duck_mood: z.enum(DUCK_STATES as [string, ...string[]]),
});

function toMessages(req: DuckRequest, extraInstruction?: string): Anthropic.Beta.BetaMessageParam[] {
  const history = req.messages.slice(-CONFIG.historyLimit);
  const msgs: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: buildDuckContext(req) }];
  for (const m of history) {
    if (m.role === "duck") msgs.push({ role: "assistant", content: m.text || "…" });
    else if (m.role === "system-run")
      msgs.push({ role: "user", content: `[Program output]\n${m.text.slice(0, CONFIG.maxRunOutputChars)}` });
    else msgs.push({ role: "user", content: m.text || "…" });
  }
  msgs.push({ role: "user", content: triggerNote(req) + (extraInstruction ? "\n" + extraInstruction : "") });
  return msgs;
}

export async function generateDuckReply(req: DuckRequest, leakReason?: string): Promise<DuckReply> {
  const model = MODELS.duck;
  const res = await getClient().beta.messages.parse({
    model,
    max_tokens: CONFIG.duckMaxTokens,
    system: [{ type: "text", text: DUCK_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: toMessages(req, leakReason ? regenerateInstruction(leakReason) : undefined),
    output_config: { effort: "low", format: betaZodOutputFormat(DuckReplySchema) },
    ...fallbackParams(model),
  });
  if (res.stop_reason === "refusal") throw new RefusalError("duck refused");
  const parsed = res.parsed_output;
  if (!parsed) throw new Error(`Duck reply could not be parsed (stop_reason=${res.stop_reason})`);
  return {
    reply: parsed.reply,
    highlight_lines: parsed.highlight_lines.filter((n) => n > 0),
    solved_signal: parsed.solved_signal,
    duck_mood: parsed.duck_mood as DuckReply["duck_mood"],
  };
}

// ---------------------------------------------------------------------------
// LLM judge
// ---------------------------------------------------------------------------

const JudgeSchema = z.object({ leak: z.boolean(), reason: z.string() });

export async function judgeLeak(code: string, hintLevel: HintLevel, draft: string): Promise<{ leak: boolean; reason: string }> {
  const res = await getClient().beta.messages.parse({
    model: MODELS.guard,
    max_tokens: CONFIG.guardMaxTokens,
    system: GUARD_SYSTEM,
    messages: [{ role: "user", content: buildGuardPrompt(code, hintLevel, draft) }],
    output_config: { effort: "low", format: betaZodOutputFormat(JudgeSchema) },
  });
  // If the judge can't answer, fail closed: treat the draft as a leak.
  if (res.stop_reason === "refusal" || !res.parsed_output) return { leak: true, reason: "judge could not verify the draft" };
  return res.parsed_output;
}

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

const ClassifySchema = z.object({ category: z.enum(CATEGORY_IDS), lessonLearned: z.string() });

export async function classifySession(code: string, language: string, transcript: string) {
  const res = await getClient().beta.messages.parse({
    model: MODELS.classify,
    max_tokens: CONFIG.classifyMaxTokens,
    system: CLASSIFY_SYSTEM,
    messages: [{ role: "user", content: buildClassifyPrompt(code, language, transcript) }],
    output_config: { effort: "low", format: betaZodOutputFormat(ClassifySchema) },
  });
  if (!res.parsed_output) throw new Error(`Classifier failed (stop_reason=${res.stop_reason})`);
  return res.parsed_output;
}
