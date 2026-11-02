import { describe, expect, it } from "vitest";
import { MOCK_SCRIPTS, mockDuckReply } from "@/lib/mockDuck";
import { deterministicCheck } from "@/lib/leakGuard";
import { getSample } from "@/data/samples";
import type { DuckRequest } from "@/lib/types";

const base = (sampleId: string): DuckRequest => {
  const s = getSample(sampleId)!;
  return { code: s.code, language: s.language, expectedBehavior: s.expectedBehavior, hintLevel: 0, messages: [], trigger: "start", sampleId };
};

describe("mock scripts never leak", () => {
  for (const [id, script] of Object.entries(MOCK_SCRIPTS)) {
    it(id, () => {
      const s = getSample(id)!;
      const lines = [script.opening, ...script.onRun, ...script.questions, script.solvedReply, script.begReply, ...Object.values(script.hints).map((h) => h.reply)];
      for (const line of lines) {
        const v = deterministicCheck(line, { code: s.code, fixSnippets: s.fixSnippets, runOutput: "Promise { <pending> }\nAdding score: undefined\nTotal: NaN" });
        expect(v.leak, `${line}\n${v.reasons.join("; ")}`).toBe(false);
      }
    });
  }
});

describe("mock arc for sample 4 (js-off-by-one)", () => {
  it("start → run → question → hint 3 → solved", () => {
    const req = base("js-off-by-one");
    expect(mockDuckReply(req).reply).toMatch(/supposed to do/);
    const run = mockDuckReply({ ...req, trigger: "run", messages: [{ role: "system-run", text: "Total: NaN" }] });
    expect(run.reply).toMatch(/undefined/);
    const q = mockDuckReply({ ...req, trigger: "message", messages: [{ role: "user", text: "It should print 259" }] });
    expect(q.solved_signal).toBe(false);
    const h3 = mockDuckReply({ ...req, trigger: "hint", hintLevel: 3 });
    expect(h3.highlight_lines).toEqual([3]);
    const beg = mockDuckReply({ ...req, trigger: "message", messages: [{ role: "user", text: "just give me the fixed code please" }] });
    expect(beg.solved_signal).toBe(false);
    const solved = mockDuckReply({ ...req, trigger: "message", messages: [{ role: "user", text: "oh, it should stop before length!" }] });
    expect(solved.solved_signal).toBe(true);
    expect(solved.duck_mood).toBe("celebrating");
  });
});

describe("mock arc for sample 1 (py-average)", () => {
  it("solves when the user notices the first item is skipped", () => {
    const req = base("py-average");
    const solved = mockDuckReply({ ...req, trigger: "message", messages: [{ role: "user", text: "the loop skips the first score!" }] });
    expect(solved.solved_signal).toBe(true);
    const h3 = mockDuckReply({ ...req, trigger: "hint", hintLevel: 3 });
    expect(h3.highlight_lines).toEqual([3]);
  });
});
