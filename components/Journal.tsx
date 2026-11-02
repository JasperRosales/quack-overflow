"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BUG_CATEGORIES, categoryLabel } from "@/lib/categories";
import { CONFIG } from "@/lib/config";
import { storage } from "@/lib/storage";
import type { DebugSession } from "@/lib/types";
import { buildDemoJournal, computeStats } from "@/lib/journalStats";
import { RichText } from "./RichText";
import { Button } from "./ui/button";
import { Duck } from "./Duck";

// Single-series bar colour, validated (light + dark surfaces) with the dataviz palette validator.
const BAR = "#D97706";

function subscribe(cb: () => void) {
  window.addEventListener("qo-storage", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("qo-storage", cb);
    window.removeEventListener("storage", cb);
  };
}

const EMPTY: DebugSession[] = [];
let cache: { raw: string | null; sessions: DebugSession[] } = { raw: null, sessions: [] };
function snapshot(): DebugSession[] {
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem("qo.sessions.v1");
  if (raw !== cache.raw) cache = { raw, sessions: storage.getSessions() };
  return cache.sessions;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Journal() {
  const sessions = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const [now, setNow] = useState<Date | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [guardCatches, setGuardCatches] = useState(0);
  const [showTable, setShowTable] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read localStorage after hydration
    setNow(new Date());
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setGuardCatches(storage.getGuardCatches());
  }, [sessions]);

  const solved = useMemo(() => sessions.filter((s) => s.solved), [sessions]);
  const stats = useMemo(() => computeStats(solved, now ?? new Date(0)), [solved, now]);

  if (!now) return <div className="p-10 text-center text-muted-foreground">Opening your journal…</div>;

  if (solved.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 p-10 text-center">
        <Duck state="sleepy" size={160} />
        <h1 className="text-2xl font-bold">Your bug journal is empty</h1>
        <p className="text-muted-foreground">
          Every bug you squash with Quack lands here, with its category and the lesson you learned. Patterns show up after a few bugs.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button render={<Link href="/debug?sample=js-off-by-one" />} nativeButton={false}>
            Try a sample bug
          </Button>
          <Button variant="outline" onClick={() => storage.setSessions(buildDemoJournal(now))} data-testid="load-demo-journal">
            Load demo journal
          </Button>
        </div>
      </div>
    );
  }

  const chartData = stats.byCategory.map((c) => ({ ...c, label: categoryLabel(c.category) }));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Bug journal</h1>
          <p className="text-sm text-muted-foreground">Every bug you found yourself, and what it taught you.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (window.confirm("Clear your whole bug journal? This can't be undone.")) storage.clearSessions();
          }}
        >
          Clear journal
        </Button>
      </div>

      {stats.pattern && (
        <div
          role="status"
          data-testid="pattern-callout"
          className="flex items-center gap-3 rounded-xl border border-amber-400 bg-amber-50 p-4 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-50"
        >
          <span className="text-3xl" aria-hidden>
            👀
          </span>
          <p>
            You&apos;ve had <strong>{stats.pattern.count}</strong> {categoryLabel(stats.pattern.category).toLowerCase()}{" "}
            {stats.pattern.count === 1 ? "error" : "errors"} this week.{" "}
            {stats.pattern.count >= 2 ? "Quack suggests double-checking that next time!" : "Keep an eye on it!"}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="journal-stats">
        <StatCard label="Bugs solved" value={String(stats.solved)} />
        <StatCard label="Avg. questions to solve" value={stats.avgQuestions.toFixed(1)} hint="Duck questions per bug" />
        <StatCard label="Hints used" value={String(stats.hintsUsed)} hint={`${stats.noHintSolves} solved with no hints`} />
        <StatCard label="Answer leaks blocked" value={String(guardCatches)} hint="Times the leak guard stopped a spoiler" />
      </div>

      <section aria-labelledby="cat-title" className="rounded-xl border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="cat-title" className="font-semibold">
            Bugs by category
          </h2>
          <button className="text-sm underline-offset-2 hover:underline" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>
            {showTable ? "Show chart" : "Show as table"}
          </button>
        </div>
        {showTable ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 font-medium">Category</th>
                <th className="py-1 text-right font-medium">Bugs</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((d) => (
                <tr key={d.category} className="border-b last:border-0">
                  <td className="py-1">{d.label}</td>
                  <td className="py-1 text-right tabular-nums">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ height: Math.max(140, chartData.length * 40 + 30) }} role="img" aria-label={`Bar chart: ${chartData.map((d) => `${d.label} ${d.count}`).join(", ")}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 8 }} barCategoryGap={8}>
                <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity={0.1} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: "currentColor", fontSize: 12 }} stroke="currentColor" strokeOpacity={0.2} />
                <YAxis type="category" dataKey="label" width={170} tick={{ fill: "currentColor", fontSize: 12 }} stroke="currentColor" strokeOpacity={0.2} />
                <Tooltip
                  cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
                  contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v} bug${v === 1 ? "" : "s"}`, "Solved"]}
                />
                <Bar dataKey="count" fill={BAR} isAnimationActive={!reduceMotion} radius={[0, 4, 4, 0]} maxBarSize={24}>
                  <LabelList dataKey="count" position="right" style={{ fill: "currentColor", fontSize: 12 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section aria-labelledby="lessons-title" className="rounded-xl border bg-card p-4">
        <h2 id="lessons-title" className="mb-3 font-semibold">
          Lessons learned
        </h2>
        <ol className="relative space-y-4 border-l pl-5" data-testid="lessons">
          {solved.map((s) => (
            <li key={s.id} className="relative">
              <span className="absolute -left-[27px] top-1 size-3 rounded-full border-2 border-background" style={{ background: BAR }} aria-hidden />
              <p className="text-xs text-muted-foreground">
                <time dateTime={s.solvedAt}>{s.solvedAt ? new Date(s.solvedAt).toLocaleString() : ""}</time> · {categoryLabel(s.category)} ·{" "}
                {s.maxHintUsed === 0 ? "no hints 💪" : `hint level ${s.maxHintUsed}`}
              </p>
              <p className="font-medium">{s.title}</p>
              {s.lessonLearned && (
                <p className="text-sm">
                  <RichText text={s.lessonLearned} />
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>
      <p className="text-xs text-muted-foreground">
        Patterns look at the last {CONFIG.patternWindowDays} days. Categories: {BUG_CATEGORIES.length} types, classified by AI (may be imperfect).
      </p>
    </div>
  );
}
