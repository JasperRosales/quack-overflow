import { describe, expect, it } from "vitest";
import { deterministicCheck, extractCode, findNearCopies, isSafeAtom } from "@/lib/leakGuard";
import { SAMPLES, getSample } from "@/data/samples";

const js = getSample("js-off-by-one")!;
const py = getSample("py-average")!;
const jsRun = "Adding score: 88\nAdding score: 92\nAdding score: 79\nAdding score: undefined\nTotal: NaN";

const ctx = (s = js, runOutput?: string) => ({ code: s.code, runOutput, fixSnippets: s.fixSnippets });

interface Fixture {
  name: string;
  reply: string;
  sample?: typeof js;
  run?: string;
  leak: boolean;
}

const FIXTURES: Fixture[] = [
  // ---- non-leaks ----
  { name: "pure question", reply: "What's the last index your loop visits?", leak: false },
  { name: "quotes original line exactly", reply: "Look at `for (let i = 0; i <= scores.length; i++) {` — when does it stop?", leak: false },
  { name: "quotes fragment of original", reply: "When `i <= scores.length` is checked for the last time, what is `i`?", leak: false },
  { name: "mentions atoms and output values", reply: "Why would `scores[i]` be `undefined`, and what does adding `undefined` to a number give you? (`NaN`!)", run: jsRun, leak: false },
  { name: "quotes run output", reply: "You saw `Adding score: undefined`. Which index produced that?", run: jsRun, leak: false },
  { name: "operators as atoms", reply: "What's the difference between `<` and `<=` when you count from 0?", leak: false },
  { name: "python index atom", reply: "Which score lives at `nums[0]`? Does the loop ever read it?", sample: py, leak: false },
  { name: "python exact range quote", reply: "What numbers does `range(1, len(nums))` produce for 4 items?", sample: py, leak: false },
  { name: "prose without code", reply: "Quack! Read the loop condition out loud. When exactly does it decide to stop?", leak: false },
  { name: "level 4 explanation without fix", reply: "On line 3, `i <= scores.length` lets `i` reach 3, but the last valid index is 2, so `scores[3]` is `undefined`. How could the loop stop one step earlier?", leak: false },
  { name: "empty call atom", reply: "What type of value does `input()` give back?", sample: getSample("py-input-compare")!, leak: false },

  // ---- leaks ----
  { name: "fenced fixed loop", reply: "Here you go:\n```js\nfor (let i = 0; i < scores.length; i++) {\n```", leak: true },
  { name: "inline fixed condition", reply: "Your condition should be `i < scores.length`.", leak: true },
  { name: "unbackticked fixed line", reply: "Write for (let i = 0; i < scores.length; i++) and it works.", leak: true },
  { name: "python fixed range inline", reply: "Use `range(len(nums))` instead.", sample: py, leak: true },
  { name: "python fixed range prose", reply: "Make it for i in range(len(nums)): and you're done.", sample: py, leak: true },
  { name: "python fixed line in fence", reply: "```python\n    for i in range(0, len(nums)):\n```", sample: py, leak: true },
  { name: "brand-new code in fence", reply: "```js\nconst total = scores.reduce((a, b) => a + b, 0);\n```", leak: true },
  { name: "length minus one prose", reply: "Loop while i <= scores.length - 1 instead.", leak: true },
  { name: "await fix", reply: "Put `await` in front: `const user = await fetchUser(1);`", sample: getSample("js-missing-await")!, leak: true },
  { name: "int conversion", reply: "Wrap it: `age = int(input(\"How old are you? \"))`", sample: getSample("py-input-compare")!, leak: true },
  { name: "comparison fix", reply: "Change it to if (isLoggedIn === true) {", sample: getSample("js-assign-in-if")!, leak: true },
];

describe("deterministic leak guard fixtures", () => {
  it("has at least 10 fixtures", () => expect(FIXTURES.length).toBeGreaterThanOrEqual(10));
  for (const f of FIXTURES) {
    it(`${f.leak ? "LEAK" : "ok  "} — ${f.name}`, () => {
      const v = deterministicCheck(f.reply, ctx(f.sample ?? js, f.run));
      expect(v.leak, v.reasons.join("; ") || "no reasons").toBe(f.leak);
    });
  }
});

describe("suspicious phrases escalate", () => {
  it("flags 'change X to Y' even without code", () => {
    expect(deterministicCheck("Change the less-or-equal to a less-than.", ctx()).suspicious).toBe(true);
  });
  it("does not flag a plain question", () => {
    expect(deterministicCheck("What value does i have on the last loop?", ctx()).suspicious).toBe(false);
  });
});

describe("helpers", () => {
  it("extracts fenced and inline code", () => {
    const e = extractCode("a `x` b\n```py\nprint(1)\n```\nc");
    expect(e.inline).toEqual(["x"]);
    expect(e.blocks[0]).toContain("print(1)");
  });
  it("safe atoms", () => {
    expect(isSafeAtom("undefined", "")).toBe(true);
    expect(isSafeAtom("scores.length", "")).toBe(true);
    expect(isSafeAtom("i < scores.length", js.code)).toBe(false);
  });
  it("near-copy finds edited line numbers", () => {
    const nc = findNearCopies("for (let i = 0; i < scores.length; i++) {", js.code);
    expect(nc[0]?.line).toBe(3);
  });
  it("no sample code is flagged against itself", () => {
    for (const s of SAMPLES) {
      expect(deterministicCheck("```\n" + s.code + "\n```", ctx(s)).leak).toBe(false);
    }
  });
});
