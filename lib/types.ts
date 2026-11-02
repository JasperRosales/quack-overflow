export type Language = "python" | "javascript";
export type DuckState = "idle" | "listening" | "thinking" | "curious" | "celebrating" | "sleepy";
export type HintLevel = 0 | 1 | 2 | 3 | 4;
// 0 = pure Socratic questions (default)
// 1 = nudge toward the general area ("Look at how your loop ends")
// 2 = name the concept ("This might be an off-by-one issue")
// 3 = point to the line(s) (editor highlights them)
// 4 = explain WHY that line is wrong, still without writing the corrected code

export const DUCK_STATES: DuckState[] = ["idle", "listening", "thinking", "curious", "celebrating", "sleepy"];

export interface ChatMessage {
  id: string;
  role: "user" | "duck" | "system-run"; // system-run = program output/error
  text: string;
  hintLevel?: HintLevel;
  highlightLines?: number[];
  createdAt: string;
}

export interface DebugSession {
  id: string;
  title: string;
  language: Language;
  code: string;
  expectedBehavior: string; // what the user says it SHOULD do
  messages: ChatMessage[];
  maxHintUsed: HintLevel;
  solved: boolean;
  solvedAt?: string;
  category?: string; // from bug-categories.json
  lessonLearned?: string; // 1-line summary written by the AI, in second person
  questionsAsked: number;
  startedAt: string;
  sampleId?: string;
}

/** Structured reply the duck model must produce. */
export interface DuckReply {
  reply: string;
  highlight_lines?: number[];
  solved_signal: boolean;
  duck_mood: DuckState;
}

export type DuckTrigger = "start" | "message" | "run" | "hint";

export interface DuckRequest {
  code: string;
  language: Language;
  expectedBehavior: string;
  lastRunOutput?: string;
  hintLevel: HintLevel;
  messages: Pick<ChatMessage, "role" | "text">[];
  trigger: DuckTrigger;
  sampleId?: string;
}

export interface GuardVerdict {
  leak: boolean;
  suspicious: boolean;
  reasons: string[];
}

/** Events streamed (NDJSON) from /api/duck. */
export type DuckStreamEvent =
  | { type: "status"; stage: "thinking" | "checking" | "rewriting" }
  | { type: "reply"; reply: DuckReply; guardCatches: number; usedFallback: boolean; mock: boolean }
  | { type: "error"; message: string };

export interface SampleProgram {
  id: string;
  title: string;
  language: Language;
  code: string;
  expectedBehavior: string;
  category: string;
  stdin?: string;
  /** Lines the bug lives on (1-indexed) — used by mock mode and tests. */
  bugLines: number[];
  /** Snippets that would constitute "the fix" — the duck must never say these. */
  fixSnippets: string[];
}

export interface RunResult {
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
}
