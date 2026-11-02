import { expect, it } from "vitest";
import { buildDemoJournal, computeStats } from "@/lib/journalStats";

it("computes journal stats and the weekly pattern", () => {
  const now = new Date("2026-11-02T12:00:00Z");
  const s = computeStats(buildDemoJournal(now), now);
  expect(s.solved).toBe(7);
  expect(s.byCategory[0]).toEqual({ category: "off-by-one", count: 3 });
  expect(s.pattern).toEqual({ category: "off-by-one", count: 3 });
  expect(s.noHintSolves).toBe(2);
  expect(s.hintsUsed).toBe(12);
  expect(s.avgQuestions).toBeCloseTo(32 / 7);
});

it("handles an empty journal", () => {
  const s = computeStats([], new Date());
  expect(s).toMatchObject({ solved: 0, avgQuestions: 0, pattern: null, byCategory: [] });
});
