import { CONFIG } from "./config";
import type { DebugSession, HintLevel } from "./types";

export interface JournalStats {
  solved: number;
  avgQuestions: number;
  hintsUsed: number; // total hint levels climbed
  noHintSolves: number;
  byCategory: { category: string; count: number }[];
  /** Most frequent category in the pattern window, if any bugs fall in it. */
  pattern: { category: string; count: number } | null;
}

/** Pure, deterministic stats (no LLM) for the bug journal. */
export function computeStats(sessions: DebugSession[], now: Date): JournalStats {
  const solved = sessions.filter((s) => s.solved);
  const counts = new Map<string, number>();
  for (const s of solved) counts.set(s.category ?? "other", (counts.get(s.category ?? "other") ?? 0) + 1);
  const byCategory = [...counts].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  const since = now.getTime() - CONFIG.patternWindowDays * 24 * 3600 * 1000;
  const recent = new Map<string, number>();
  for (const s of solved) {
    const t = Date.parse(s.solvedAt ?? s.startedAt);
    if (Number.isFinite(t) && t >= since) recent.set(s.category ?? "other", (recent.get(s.category ?? "other") ?? 0) + 1);
  }
  let pattern: JournalStats["pattern"] = null;
  for (const [category, count] of recent) {
    if (category === "other") continue;
    if (!pattern || count > pattern.count) pattern = { category, count };
  }

  return {
    solved: solved.length,
    avgQuestions: solved.length ? solved.reduce((a, s) => a + s.questionsAsked, 0) / solved.length : 0,
    hintsUsed: solved.reduce((a, s) => a + s.maxHintUsed, 0),
    noHintSolves: solved.filter((s) => s.maxHintUsed === 0).length,
    byCategory,
    pattern,
  };
}

/** Sample data for demos and screenshots. */
export function buildDemoJournal(now: Date): DebugSession[] {
  const day = 24 * 3600 * 1000;
  const rows: [string, string, number, HintLevel, number, string][] = [
    ["JavaScript: total of scores is NaN", "off-by-one", 0.2, 3, 6, "You learned that an array of length n has its last item at index n - 1, so `<=` goes one step too far."],
    ["Python: the class average is too low", "off-by-one", 1.1, 1, 4, "You learned that `range(1, n)` starts at 1, so it skips the first item at index 0."],
    ["Python: voting age check crashes", "wrong-type", 1.9, 0, 3, "You learned that `input()` always gives you text, even when the user types a number."],
    ["JS: pagination shows one extra page", "off-by-one", 3.2, 2, 5, "You learned that counting pages needs care at the boundary: the last page index is one less than the count."],
    ["JavaScript: everyone is always logged in", "wrong-operator", 4.5, 0, 2, "You learned that a single `=` assigns a value, while `===` compares two values."],
    ["JavaScript: user is a Promise, not a user", "async-await", 9, 4, 7, "You learned that an async function hands back a Promise, and you need to wait for it to get the value."],
    ["Python: removing even numbers leaves some behind", "mutation-aliasing", 12, 2, 5, "You learned that removing items from a list while looping over it makes the loop skip items."],
  ];
  return rows.map(([title, category, daysAgo, maxHintUsed, questionsAsked, lessonLearned], i) => {
    const solvedAt = new Date(now.getTime() - daysAgo * day).toISOString();
    return {
      id: `demo-${i}`,
      title,
      language: title.startsWith("Python") ? "python" : "javascript",
      code: "",
      expectedBehavior: "",
      messages: [],
      maxHintUsed,
      solved: true,
      solvedAt,
      category,
      lessonLearned,
      questionsAsked,
      startedAt: new Date(now.getTime() - daysAgo * day - 600_000).toISOString(),
    };
  });
}
