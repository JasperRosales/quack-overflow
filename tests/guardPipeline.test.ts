import { describe, expect, it } from "vitest";
import { guardedReply } from "@/lib/guardPipeline";
import { FALLBACK_QUESTIONS } from "@/lib/leakGuard";
import { getSample } from "@/data/samples";
import type { DuckReply } from "@/lib/types";

const s = getSample("js-off-by-one")!;
const ctx = { code: s.code, fixSnippets: s.fixSnippets, hintLevel: 0 as const };
const r = (reply: string, extra: Partial<DuckReply> = {}): DuckReply => ({ reply, solved_signal: false, duck_mood: "curious", ...extra });

describe("guard pipeline", () => {
  it("passes a clean reply through", async () => {
    const out = await guardedReply(ctx, { generate: async () => r("What is the last index?"), judge: async () => ({ leak: false, reason: "" }) });
    expect(out.guardCatches).toBe(0);
    expect(out.reply.reply).toBe("What is the last index?");
  });

  it("regenerates once after a deterministic leak", async () => {
    const drafts = [r("Use `i < scores.length`."), r("When does your loop stop?")];
    let calls = 0;
    const out = await guardedReply(ctx, { generate: async () => drafts[calls++], judge: null });
    expect(calls).toBe(2);
    expect(out.guardCatches).toBe(1);
    expect(out.reply.reply).toBe("When does your loop stop?");
  });

  it("regenerates when only the LLM judge catches it", async () => {
    let calls = 0;
    const out = await guardedReply(ctx, {
      generate: async () => (calls++ === 0 ? r("Make the comparison strict.") : r("What is `i` on the last loop?")),
      judge: async (d) => ({ leak: d.includes("strict"), reason: "states the fix" }),
    });
    expect(out.guardCatches).toBe(1);
    expect(out.usedFallback).toBe(false);
  });

  it("falls back to a safe question when it keeps leaking", async () => {
    const out = await guardedReply(ctx, { generate: async () => r("```js\nfor (let i = 0; i < scores.length; i++) {\n```"), judge: null });
    expect(out.usedFallback).toBe(true);
    expect(out.guardCatches).toBe(2);
    expect(FALLBACK_QUESTIONS).toContain(out.reply.reply);
  });

  it("keeps celebrating when a solved reply leaks", async () => {
    const out = await guardedReply(ctx, { generate: async () => r("Yes! Just write `i < scores.length`.", { solved_signal: true }), judge: null });
    expect(out.reply.solved_signal).toBe(true);
    expect(out.reply.reply).not.toContain("scores.length");
  });

  it("fails safe if the judge throws on a suspicious draft", async () => {
    let calls = 0;
    const out = await guardedReply(ctx, {
      generate: async () => (calls++ === 0 ? r("You need to change the comparison to something else.") : r("What does the loop do last?")),
      judge: async () => {
        throw new Error("network");
      },
    });
    expect(out.guardCatches).toBe(1);
  });
});
