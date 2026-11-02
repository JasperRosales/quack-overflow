/** All tunable numbers live here. */
export const CONFIG = {
  /** Kill a running program after this many ms. */
  runTimeoutMs: 5000,
  /** How many chat messages are sent to the model each turn. */
  historyLimit: 20,
  /** Max characters of program output forwarded to the model. */
  maxRunOutputChars: 2000,
  /** Max characters of user code accepted by the API. */
  maxCodeChars: 20000,
  /** Leak guard: regenerate this many times before falling back to a canned question. */
  guardRegenerateAttempts: 1,
  /** Leak guard: when to call the LLM judge. "always" is safest; "suspicious" only on red-flag phrases. */
  guardJudgeMode: "always" as "always" | "suspicious",
  /** Leak guard: a reply line counts as a "fixed" copy of a code line if its token edit distance is ≤ this fraction. */
  guardEditDistanceRatio: 0.34,
  /** Leak guard: ignore code lines with fewer tokens than this for the near-copy check. */
  guardMinLineTokens: 4,
  /** Leak guard: a near-copy must align at least this many tokens with a real code line. */
  guardMinAlignedTokens: 5,
  /** Max output tokens (Gemini counts thinking tokens here too, so leave headroom). */
  duckMaxTokens: 4000,
  guardMaxTokens: 2000,
  classifyMaxTokens: 2000,
  /** Pyodide CDN. */
  pyodideUrl: "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs",
  /** Journal pattern window. */
  patternWindowDays: 7,
  /** Speech synthesis pitch/rate for the duck voice. */
  duckVoicePitch: 1.8,
  duckVoiceRate: 1.1,
  serialBaudRate: 115200,
} as const;

export const MODELS = {
  duck: process.env.GEMINI_MODEL || "gemini-3.6-flash",
  guard: process.env.GEMINI_GUARD_MODEL || "gemini-3.5-flash-lite",
  classify: process.env.GEMINI_CLASSIFY_MODEL || "gemini-3.5-flash-lite",
};
