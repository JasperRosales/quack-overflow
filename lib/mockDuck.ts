/**
 * MOCK_AI mode: scripted duck replies so the app is fully demoable without an API key.
 * Samples have hand-written scripts in data/mock; anything else gets generic Socratic questions.
 */
import pyAverage from "@/data/mock/py-average.json";
import pyInputCompare from "@/data/mock/py-input-compare.json";
import pyRemoveEvens from "@/data/mock/py-remove-evens.json";
import jsOffByOne from "@/data/mock/js-off-by-one.json";
import jsAssignInIf from "@/data/mock/js-assign-in-if.json";
import jsMissingAwait from "@/data/mock/js-missing-await.json";
import { findSampleByCode, getSample } from "@/data/samples";
import type { DuckReply, DuckRequest, DuckState, SampleProgram } from "./types";

interface HintBeat {
  reply: string;
  highlight_lines?: number[];
  duck_mood: string;
}

export interface MockScript {
  sampleId: string;
  opening: string;
  onRun: string[];
  questions: string[];
  hints: Record<string, HintBeat>;
  solvedPatterns: string[];
  solvedReply: string;
  begReply: string;
}

export const MOCK_SCRIPTS: Record<string, MockScript> = Object.fromEntries(
  [pyAverage, pyInputCompare, pyRemoveEvens, jsOffByOne, jsAssignInIf, jsMissingAwait].map((s) => [s.sampleId, s as MockScript])
);

const GENERIC: MockScript = {
  sampleId: "generic",
  opening: "Quack! I'm all ears (well, feathers). What is this code supposed to do, and what is it doing instead?",
  onRun: [
    "Look at that output! Which part of it surprised you the most?",
    "Read the output (or error) line by line. What is it trying to tell you, in your own words?",
  ],
  questions: [
    "Walk me through your code one line at a time. What does each line do?",
    "Which line are you least sure about? What do you *think* it does?",
    "Pick the most important variable. What value should it have at the end? What value does it really have?",
    "Try it in your head with the tiniest possible input. What happens on the first step?",
    "Where do your expectations and the real output first start to differ?",
    "If you could print one value right before things go wrong, which value would you pick, and why?",
  ],
  hints: {
    "1": { reply: "Hint 1: Focus on the part of the code that produces the wrong result. Trace it slowly.", duck_mood: "curious" },
    "2": { reply: "Hint 2: Common culprits: loop boundaries, types (text vs numbers), and comparisons. Which could apply here?", duck_mood: "curious" },
    "3": { reply: "Hint 3: I'm only a mock duck right now, so I can't pinpoint lines without the AI. Which line would *you* highlight?", duck_mood: "curious" },
    "4": { reply: "Hint 4: Explain the suspicious line to me as if I'm a very small duck. Every word. Where does your explanation wobble?", duck_mood: "curious" },
  },
  solvedPatterns: [],
  solvedReply: "QUAAACK!! You found it! Nicely done, detective.",
  begReply: "I'm a duck of principle, so no answers, only questions! If you're stuck, climb the hint ladder.",
};

const GENERIC_SOLVED = /\b(found (it|the bug)|i (see|get) it( now)?|that'?s the (bug|problem|issue)|figured it out|oh+[,!.]* (i see|wait|now i see)|aha+|i fixed it|it works now)\b/i;

export const BEG_PATTERN =
  /(just (tell|give|show)|give me the (answer|fix|code|solution)|write (the |it )?(fixed|correct|working)|fixed version|correct (code|version)|what('?s| is) the (answer|fix|solution)|fix it (for me)?|tell me the (answer|fix)|pretend|ignore (your|all|previous)|i('?ll| will) fail|please just|do it for me|show me the (answer|fix|solution))/i;

export function scriptFor(req: Pick<DuckRequest, "sampleId" | "code">): { script: MockScript; sample?: SampleProgram } {
  const sample = getSample(req.sampleId) ?? findSampleByCode(req.code);
  const script = (sample && MOCK_SCRIPTS[sample.id]) || GENERIC;
  return { script, sample };
}

/** Deterministically produce the next duck reply for a conversation. */
export function mockDuckReply(req: DuckRequest): DuckReply {
  const { script } = scriptFor(req);
  const mood = (m: string) => m as DuckState;

  if (req.trigger === "hint" && req.hintLevel > 0) {
    const h = script.hints[String(req.hintLevel)];
    return { reply: h.reply, highlight_lines: h.highlight_lines, solved_signal: false, duck_mood: mood(h.duck_mood) };
  }

  if (req.trigger === "start") {
    return { reply: script.opening, solved_signal: false, duck_mood: "curious" };
  }

  if (req.trigger === "run") {
    const runs = req.messages.filter((m) => m.role === "system-run").length;
    return { reply: script.onRun[Math.max(0, runs - 1) % script.onRun.length], solved_signal: false, duck_mood: "curious" };
  }

  const lastUser = [...req.messages].reverse().find((m) => m.role === "user")?.text ?? "";

  if (BEG_PATTERN.test(lastUser)) {
    return { reply: script.begReply, solved_signal: false, duck_mood: "curious" };
  }

  const solved =
    GENERIC_SOLVED.test(lastUser) || script.solvedPatterns.some((p) => new RegExp(p, "i").test(lastUser));
  if (solved) {
    return { reply: script.solvedReply, solved_signal: true, duck_mood: "celebrating" };
  }

  const answered = req.messages.filter((m) => m.role === "user").length - 1;
  const q = script.questions[Math.max(0, answered) % script.questions.length];
  return { reply: q, solved_signal: false, duck_mood: answered % 2 === 0 ? "curious" : "thinking" };
}

/** Mock classifier: uses the sample's known category. */
export function mockClassify(code: string, sampleId?: string): { category: string; lessonLearned: string } {
  const sample = getSample(sampleId) ?? findSampleByCode(code);
  const lessons: Record<string, string> = {
    "py-average": "You learned that `range(1, n)` starts at 1, so it skips the first item at index 0.",
    "py-input-compare": "You learned that `input()` always gives you text, even when the user types a number.",
    "py-remove-evens": "You learned that removing items from a list while looping over it makes the loop skip items.",
    "js-off-by-one": "You learned that an array of length n has its last item at index n - 1, so `<=` goes one step too far.",
    "js-assign-in-if": "You learned that a single `=` assigns a value, while `===` compares two values.",
    "js-missing-await": "You learned that an async function hands back a Promise, and you need to wait for it to get the value.",
  };
  if (sample) return { category: sample.category, lessonLearned: lessons[sample.id] };
  return { category: "other", lessonLearned: "You learned to trace your code step by step until the bug had nowhere to hide." };
}
