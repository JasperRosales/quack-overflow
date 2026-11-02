"use client";

import { motion } from "framer-motion";
import { Repeat } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BUG_CATEGORIES, categoryLabel } from "@/lib/categories";
import { CONFIG } from "@/lib/config";
import { storage } from "@/lib/storage";
import type { DebugSession } from "@/lib/types";
import { buildDemoJournal, computeStats } from "@/lib/journalStats";
import { RichText } from "./RichText";
import { Button, buttonVariants } from "./ui/button";
import { Duck } from "./Duck";
import { fadeUp, stagger } from "./Motion";

// Single-series bar colour. Validated with the dataviz palette validator against both card
// surfaces (#ffffff light, #111113 dark): lightness band, chroma floor and 3:1 contrast all pass.
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

const NARROW_QUERY = "(max-width: 639px)";
function subscribeNarrow(cb: () => void) {
  const mq = window.matchMedia(NARROW_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const useNarrow = () =>
  useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW_QUERY).matches, () => false);

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <motion.div variants={fadeUp} className="bg-card p-4 sm:p-5">
      <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </motion.div>
  );
}

export function Journal() {
  const sessions = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const [now, setNow] = useState<Date | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [guardCatches, setGuardCatches] = useState(0);
  const [showTable, setShowTable] = useState(false);
  const narrow = useNarrow();
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
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-5 py-16 text-center">
        <Duck state="sleepy" size={160} />
        <h1 className="text-xl font-semibold tracking-tight">Your bug journal is empty</h1>
        <p className="text-muted-foreground">
          Every bug you squash with Quack lands here, with its category and the lesson you learned. Patterns show up after a few bugs.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link href="/debug?sample=js-off-by-one" className={buttonVariants()}>
            Try a sample bug
          </Link>
          <Button variant="outline" onClick={() => storage.setSessions(buildDemoJournal(now))} data-testid="load-demo-journal">
            Load demo journal
          </Button>
        </div>
      </div>
    );
  }

  const chartData = stats.byCategory.map((c) => ({ ...c, label: categoryLabel(c.category) }));

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bug journal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every bug you found yourself, and what it taught you.</p>
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
        <motion.div
          variants={fadeUp}
          role="status"
          data-testid="pattern-callout"
          className="surface flex items-start gap-3 rounded-xl p-4 text-sm"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-[var(--brand-ink)]" aria-hidden>
            <Repeat className="size-4" />
          </span>
          <p className="pt-1.5">
            You&apos;ve had <strong>{stats.pattern.count}</strong> {categoryLabel(stats.pattern.category).toLowerCase()}{" "}
            {stats.pattern.count === 1 ? "error" : "errors"} this week.{" "}
            {stats.pattern.count >= 2 ? "Quack suggests double-checking that next time!" : "Keep an eye on it!"}
          </p>
        </motion.div>
      )}

      <motion.div variants={stagger} className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-4" data-testid="journal-stats">
        <StatCard label="Bugs solved" value={String(stats.solved)} />
        <StatCard label="Avg. questions to solve" value={stats.avgQuestions.toFixed(1)} hint="Duck questions per bug" />
        <StatCard label="Hints used" value={String(stats.hintsUsed)} hint={`${stats.noHintSolves} solved with no hints`} />
        <StatCard label="Answer leaks blocked" value={String(guardCatches)} hint="Times the leak guard stopped a spoiler" />
      </motion.div>

      <motion.section variants={fadeUp} aria-labelledby="cat-title" className="surface rounded-xl p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="cat-title" className="text-sm font-medium">
            Bugs by category
          </h2>
          <button className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>
            {showTable ? "Show chart" : "Show as table"}
          </button>
        </div>
        {showTable ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-1 font-medium">Category</th>
                <th className="py-1 text-right font-medium">Bugs</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((d) => (
                <tr key={d.category} className="border-b last:border-0">
                  <td className="py-2">{d.label}</td>
                  <td className="py-2 text-right tabular-nums">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ height: Math.max(140, chartData.length * 40 + 30) }} role="img" aria-label={`Bar chart: ${chartData.map((d) => `${d.label} ${d.count}`).join(", ")}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: narrow ? 0 : 8 }} barCategoryGap={8}>
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} stroke="var(--border)" tickLine={false} />
                <YAxis type="category" dataKey="label" width={narrow ? 104 : 170} tick={{ fill: "var(--muted-foreground)", fontSize: narrow ? 11 : 12 }} stroke="var(--border)" tickLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", boxShadow: "var(--elevation-lg)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v} bug${v === 1 ? "" : "s"}`, "Solved"]}
                />
                <Bar dataKey="count" fill={BAR} isAnimationActive={!reduceMotion} radius={[0, 4, 4, 0]} maxBarSize={20}>
                  <LabelList dataKey="count" position="right" style={{ fill: "var(--foreground)", fontSize: 12 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.section>

      <motion.section variants={fadeUp} aria-labelledby="lessons-title" className="surface rounded-xl p-4 sm:p-5">
        <h2 id="lessons-title" className="mb-4 text-sm font-medium">
          Lessons learned
        </h2>
        <ol className="relative ml-1 space-y-5 border-l pl-5" data-testid="lessons">
          {solved.map((s) => (
            <li key={s.id} className="relative">
              <span className="absolute -left-[25px] top-1.5 size-2 rounded-full ring-4 ring-card" style={{ background: BAR }} aria-hidden />
              <p className="text-xs text-muted-foreground">
                <time dateTime={s.solvedAt}>{s.solvedAt ? new Date(s.solvedAt).toLocaleString() : ""}</time> · {categoryLabel(s.category)} ·{" "}
                {s.maxHintUsed === 0 ? "no hints" : `hint level ${s.maxHintUsed}`}
              </p>
              <p className="mt-1 text-sm font-medium">{s.title}</p>
              {s.lessonLearned && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <RichText text={s.lessonLearned} />
                </p>
              )}
            </li>
          ))}
        </ol>
      </motion.section>
      <p className="text-xs text-muted-foreground">
        Patterns look at the last {CONFIG.patternWindowDays} days. Categories: {BUG_CATEGORIES.length} types, classified by AI (may be imperfect).
      </p>
    </motion.div>
  );
}
