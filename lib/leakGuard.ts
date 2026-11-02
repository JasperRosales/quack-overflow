/**
 * Leak guard: makes sure the duck never hands out the fix.
 *
 * Layer 1 (this file, deterministic, unit-tested):
 *   a. Code blocks / inline code that are NOT quotes of the user's own code → leak.
 *   b. Any stretch of the reply that is a *near-copy* of a real code line (small token
 *      edit distance, but not identical) → leak. This catches "fixed" lines even
 *      without backticks.
 *   c. Known fix snippets for the sample programs → leak.
 *   d. Red-flag phrases ("change X to Y", "replace … with …", "should be `…`") → suspicious,
 *      escalated to the LLM judge.
 * Layer 2 (lib/guardPipeline.ts): LLM judge, regenerate once, then a safe fallback question.
 */
import { CONFIG } from "./config";
import type { GuardVerdict, HintLevel } from "./types";

export interface GuardContext {
  code: string;
  hintLevel?: HintLevel;
  /** Program output — values from here (e.g. `undefined`, `NaN`) may be quoted freely. */
  runOutput?: string;
  /** Exact fix snippets known in advance (sample programs). */
  fixSnippets?: string[];
}

// ---------------------------------------------------------------------------
// Tokenising
// ---------------------------------------------------------------------------

const TOKEN_RE =
  /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\\n]|\\.)*`|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|===|!==|\*\*=?|\/\/=?|<<=?|>>=?|==|!=|<=|>=|=>|\+\+|--|&&|\|\||\+=|-=|\*=|\/=|%=|->|[^\s\w]/g;

export function tokenize(s: string): string[] {
  return s.match(TOKEN_RE) ?? [];
}

const isSymbol = (t: string) => !/^[A-Za-z_$\d"'`]/.test(t);

/** Collapse whitespace so `range(1,len(x))` and `range(1, len(x))` compare equal. */
export function normalize(s: string): string {
  return tokenize(s).join(" ");
}

// ---------------------------------------------------------------------------
// Extracting code from a reply
// ---------------------------------------------------------------------------

export interface ExtractedCode {
  blocks: string[]; // fenced ``` blocks
  inline: string[]; // `inline` spans
  prose: string; // reply with all code removed
}

export function extractCode(reply: string): ExtractedCode {
  const blocks: string[] = [];
  const inline: string[] = [];
  let rest = reply.replace(/```[\w+-]*\n?([\s\S]*?)(```|$)/g, (_, body: string) => {
    blocks.push(body);
    return " ";
  });
  // Indented code blocks (4 spaces / tab) in markdown also count as blocks.
  rest = rest.replace(/(^|\n)((?: {4}|\t)[^\n]+(?:\n(?: {4}|\t)[^\n]+)*)/g, (_m, pre: string, body: string) => {
    blocks.push(body);
    return pre + " ";
  });
  rest = rest.replace(/`([^`\n]+)`/g, (_, body: string) => {
    inline.push(body);
    return " ";
  });
  return { blocks, inline, prose: rest };
}

// ---------------------------------------------------------------------------
// Rule a: quoted code must come from the user's code
// ---------------------------------------------------------------------------

const ATOM_RE = /^(?:[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*|\d+(?:\.\d+)?|"[^"]*"|'[^']*')$/;
const OPERATOR_RE = /^(?:=|==|===|!=|!==|<|<=|>|>=|\+|-|\*|\/|\/\/|%|\+=|-=|\+\+|--|&&|\|\||!|\[\]|\(\)|:|;)$/;
const INDEX_RE = /^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\[(?:\d+|[A-Za-z_$][\w$]*)\]$/;
const EMPTY_CALL_RE = /^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\(\)$/;

/** Is an inline snippet harmless even though it is not a verbatim quote of the code? */
export function isSafeAtom(snippet: string, code: string): boolean {
  const s = snippet.trim();
  if (!s) return true;
  if (ATOM_RE.test(s)) return true; // `undefined`, `i`, `scores.length`, `NaN`, `0`
  if (OPERATOR_RE.test(s)) return true; // `<=`, `==`
  const idx = s.match(INDEX_RE);
  if (idx && normalize(code).includes(normalize(idx[1]))) return true; // `nums[0]`, `scores[i]`
  const call = s.match(EMPTY_CALL_RE);
  if (call && normalize(code).includes(normalize(call[1] + "("))) return true; // `input()`
  return false;
}

function isQuoteOf(snippet: string, haystack: string): boolean {
  const n = normalize(snippet);
  return n.length === 0 || normalize(haystack).includes(n);
}

// ---------------------------------------------------------------------------
// Rule b: near-copies of real code lines (local token alignment)
// ---------------------------------------------------------------------------

export interface NearCopy {
  line: number;
  replyFragment: string;
  edits: number;
}

interface Alignment {
  score: number;
  matches: number;
  edits: number;
  rStart: number;
  rEnd: number; // exclusive
  symbolsInRegion: number;
}

const MATCH = 3;
const MISMATCH = -2;
const GAP = -2;

/** Smith–Waterman local alignment of reply tokens r against code-line tokens l. */
function localAlign(r: string[], l: string[], masked: boolean[]): Alignment | null {
  const rows = r.length + 1;
  const cols = l.length + 1;
  const H = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  let best = 0;
  let bi = 0;
  let bj = 0;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const eq = !masked[i - 1] && r[i - 1] === l[j - 1];
      const diag = H[i - 1][j - 1] + (eq ? MATCH : MISMATCH);
      const v = Math.max(0, diag, H[i - 1][j] + GAP, H[i][j - 1] + GAP);
      H[i][j] = v;
      if (v > best) {
        best = v;
        bi = i;
        bj = j;
      }
    }
  }
  if (best === 0) return null;
  // traceback
  let i = bi;
  let j = bj;
  let matches = 0;
  let edits = 0;
  while (i > 0 && j > 0 && H[i][j] > 0) {
    const eq = !masked[i - 1] && r[i - 1] === l[j - 1];
    if (H[i][j] === H[i - 1][j - 1] + (eq ? MATCH : MISMATCH)) {
      if (eq) matches++;
      else edits++;
      i--;
      j--;
    } else if (H[i][j] === H[i - 1][j] + GAP) {
      edits++;
      i--;
    } else {
      edits++;
      j--;
    }
  }
  let symbolsInRegion = 0;
  for (let k = i; k < bi; k++) if (isSymbol(r[k])) symbolsInRegion++;
  return { score: best, matches, edits, rStart: i, rEnd: bi, symbolsInRegion };
}

export function findNearCopies(text: string, code: string): NearCopy[] {
  const out: NearCopy[] = [];
  const codeLines = code.split("\n");
  const codeNorm = " " + normalize(code) + " ";
  const replyLines = text.split("\n").map(tokenize).filter((t) => t.length > 0);
  for (const r of replyLines) {
    for (let ln = 0; ln < codeLines.length; ln++) {
      const l = tokenize(codeLines[ln]);
      if (l.length < CONFIG.guardMinLineTokens) continue;
      const masked = new Array<boolean>(r.length).fill(false);
      // Repeatedly take the best alignment; mask it out so a verbatim quote can't hide a fixed copy.
      for (let iter = 0; iter < 4; iter++) {
        const a = localAlign(r, l, masked);
        if (!a || a.matches < CONFIG.guardMinAlignedTokens) break;
        const fragment = r.slice(a.rStart, a.rEnd).join(" ");
        const maxEdits = Math.max(1, Math.floor(a.matches * CONFIG.guardEditDistanceRatio));
        const verbatimElsewhere = codeNorm.includes(" " + fragment + " ");
        if (a.edits >= 1 && a.edits <= maxEdits && a.symbolsInRegion >= 2 && !verbatimElsewhere) {
          out.push({ line: ln + 1, replyFragment: fragment, edits: a.edits });
          break;
        }
        for (let k = a.rStart; k < a.rEnd; k++) masked[k] = true;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rule d: red-flag phrases
// ---------------------------------------------------------------------------

export const SUSPICIOUS_PATTERNS: RegExp[] = [
  /\bchange\b[^.?!\n]{0,60}\bto\b/i,
  /\breplace\b[^.?!\n]{0,60}\bwith\b/i,
  /\bshould (?:be|say|read|use)\s*[`'"]/i,
  /\bthe (?:fix|solution|answer|correct (?:code|line|version))\b/i,
  /\bhere(?:'s| is) (?:the|a|your) (?:fixed|corrected|working|updated)/i,
  /\b(?:fixed|corrected) (?:version|code|line)\b/i,
  /\byou (?:need|have|want) to (?:use|change|add|remove|replace|write|put|swap|convert)\b/i,
  /\b(?:just|simply) (?:use|change|add|remove|replace|write|swap|put)\b/i,
  /\binstead of\b/i,
  /\btry (?:using|changing|adding|replacing|writing)\b/i,
  /\bswap\b[^.?!\n]{0,40}\bfor\b/i,
];

// ---------------------------------------------------------------------------
// Main deterministic check
// ---------------------------------------------------------------------------

export function deterministicCheck(reply: string, ctx: GuardContext): GuardVerdict {
  const reasons: string[] = [];
  const { blocks, inline, prose } = extractCode(reply);
  const allowed = ctx.code + "\n" + (ctx.runOutput ?? "");

  for (const block of blocks) {
    for (const line of block.split("\n")) {
      if (!line.trim()) continue;
      if (!isQuoteOf(line, allowed)) {
        reasons.push(`Code block line is not from the user's code: "${line.trim().slice(0, 80)}"`);
      }
    }
  }
  for (const snip of inline) {
    if (!isQuoteOf(snip, allowed) && !isSafeAtom(snip, ctx.code)) {
      reasons.push(`Inline code is not from the user's code: \`${snip.slice(0, 80)}\``);
    }
  }

  // Near-copies anywhere in the reply (code or prose).
  const everything = [prose, ...inline, ...blocks].join("\n");
  for (const nc of findNearCopies(everything, ctx.code)) {
    reasons.push(`Looks like an edited copy of line ${nc.line}: "${nc.replyFragment.slice(0, 80)}" (${nc.edits} edit(s))`);
  }

  // Known fixes (sample programs).
  const replyNorm = normalize(reply.replace(/`/g, " "));
  for (const fix of ctx.fixSnippets ?? []) {
    const f = normalize(fix);
    if (f && replyNorm.includes(f) && !normalize(ctx.code).includes(f)) {
      reasons.push(`Contains a known fix: "${fix}"`);
    }
  }

  const suspicious = SUSPICIOUS_PATTERNS.some((re) => re.test(reply));
  return { leak: reasons.length > 0, suspicious, reasons };
}

/** Safe, generic Socratic questions used when the model keeps leaking. */
export const FALLBACK_QUESTIONS = [
  "Quack! Let's slow down. Can you walk me through your code one line at a time and tell me what each line does?",
  "What did you expect to happen, and what actually happened? Where do those two stories start to differ?",
  "Pick one variable that matters here. What value do you think it has right before the problem shows up?",
  "If you added a print right before the line you're most suspicious of, what do you predict it would show?",
  "Which line are you *least* sure about? Tell me what you think it does, step by step.",
  "Try running it in your head with a tiny input. What happens on the very first step? And the last?",
];

export function pickFallback(seed: number): string {
  return FALLBACK_QUESTIONS[Math.abs(seed) % FALLBACK_QUESTIONS.length];
}
