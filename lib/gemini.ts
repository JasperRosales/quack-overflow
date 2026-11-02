import "server-only";
import { FinishReason, GoogleGenAI, ThinkingLevel, type Content } from "@google/genai";
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

function apiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || undefined;
}

/** Mock mode: MOCK_AI=true, or no Gemini key configured (so the app is always demoable). */
export function isMock(): boolean {
  if (process.env.MOCK_AI === "true") return true;
  return !apiKey();
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: apiKey() });
  return client;
}

export class RefusalError extends Error {}

const BLOCKED = new Set<string>([
  FinishReason.SAFETY,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
  FinishReason.RECITATION,
]);

/** Zod schema → JSON Schema accepted by Gemini's `responseJsonSchema`. */
function jsonSchema(schema: z.ZodType) {
  const out = z.toJSONSchema(schema) as Record<string, unknown>;
  delete out.$schema;
  return out;
}

/**
 * One structured-output call. Returns the parsed object, or null if the model was
 * blocked / produced unparseable output. `blocked` tells the caller which case it was.
 */
async function generateJson<T extends z.ZodType>(opts: {
  model: string;
  system: string;
  contents: Content[] | string;
  schema: T;
  maxOutputTokens: number;
}): Promise<{ data: z.infer<T> | null; blocked: boolean; finish?: string }> {
  const res = await getClient().models.generateContent({
    model: opts.model,
    contents: opts.contents,
    config: {
      systemInstruction: opts.system,
      maxOutputTokens: opts.maxOutputTokens,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema(opts.schema),
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });
  const finish = res.candidates?.[0]?.finishReason;
  const blocked = Boolean(res.promptFeedback?.blockReason) || (finish !== undefined && BLOCKED.has(finish));
  if (blocked) return { data: null, blocked: true, finish };
  try {
    const parsed = opts.schema.safeParse(JSON.parse(res.text ?? ""));
    return { data: parsed.success ? parsed.data : null, blocked: false, finish };
  } catch {
    return { data: null, blocked: false, finish };
  }
}

// ---------------------------------------------------------------------------
// Duck
// ---------------------------------------------------------------------------

const DuckReplySchema = z.object({
  reply: z.string(),
  highlight_lines: z.array(z.number().int()),
  solved_signal: z.boolean(),
  duck_mood: z.enum(DUCK_STATES as [string, ...string[]]),
});

/** Gemini roles are user/model; consecutive same-role turns are merged to keep the history well formed. */
function toContents(req: DuckRequest, extraInstruction?: string): Content[] {
  const turns: { role: "user" | "model"; text: string }[] = [{ role: "user", text: buildDuckContext(req) }];
  for (const m of req.messages.slice(-CONFIG.historyLimit)) {
    if (m.role === "duck") turns.push({ role: "model", text: m.text || "…" });
    else if (m.role === "system-run")
      turns.push({ role: "user", text: `[Program output]\n${m.text.slice(0, CONFIG.maxRunOutputChars)}` });
    else turns.push({ role: "user", text: m.text || "…" });
  }
  turns.push({ role: "user", text: triggerNote(req) + (extraInstruction ? "\n" + extraInstruction : "") });

  const contents: Content[] = [];
  for (const t of turns) {
    const last = contents[contents.length - 1];
    if (last?.role === t.role) last.parts!.push({ text: t.text });
    else contents.push({ role: t.role, parts: [{ text: t.text }] });
  }
  return contents;
}

export async function generateDuckReply(req: DuckRequest, leakReason?: string): Promise<DuckReply> {
  const { data, blocked, finish } = await generateJson({
    model: MODELS.duck,
    system: DUCK_SYSTEM,
    contents: toContents(req, leakReason ? regenerateInstruction(leakReason) : undefined),
    schema: DuckReplySchema,
    maxOutputTokens: CONFIG.duckMaxTokens,
  });
  if (blocked) throw new RefusalError("duck reply blocked");
  if (!data) throw new Error(`Duck reply could not be parsed (finishReason=${finish})`);
  return {
    reply: data.reply,
    highlight_lines: data.highlight_lines.filter((n) => n > 0),
    solved_signal: data.solved_signal,
    duck_mood: data.duck_mood as DuckReply["duck_mood"],
  };
}

// ---------------------------------------------------------------------------
// LLM judge
// ---------------------------------------------------------------------------

const JudgeSchema = z.object({ leak: z.boolean(), reason: z.string() });

export async function judgeLeak(code: string, hintLevel: HintLevel, draft: string): Promise<{ leak: boolean; reason: string }> {
  const { data } = await generateJson({
    model: MODELS.guard,
    system: GUARD_SYSTEM,
    contents: buildGuardPrompt(code, hintLevel, draft),
    schema: JudgeSchema,
    maxOutputTokens: CONFIG.guardMaxTokens,
  });
  // If the judge can't answer, fail closed: treat the draft as a leak.
  return data ?? { leak: true, reason: "judge could not verify the draft" };
}

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

const ClassifySchema = z.object({ category: z.enum(CATEGORY_IDS), lessonLearned: z.string() });

export async function classifySession(code: string, language: string, transcript: string) {
  const { data, finish } = await generateJson({
    model: MODELS.classify,
    system: CLASSIFY_SYSTEM,
    contents: buildClassifyPrompt(code, language, transcript),
    schema: ClassifySchema,
    maxOutputTokens: CONFIG.classifyMaxTokens,
  });
  if (!data) throw new Error(`Classifier failed (finishReason=${finish})`);
  return data;
}
