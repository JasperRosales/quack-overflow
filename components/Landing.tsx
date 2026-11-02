"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Duck } from "./Duck";
import { buttonVariants } from "./ui/button";

const STEPS = [
  { title: "Paste your code", body: "Python or JavaScript. Say what it should do, then run it here in the browser." },
  { title: "Explain it to the duck", body: "Type or talk. Quack replies with one question at a time." },
  { title: "Find the fix yourself", body: "Stuck? Take a hint. Four levels, from a nudge to the exact line, but never the fix." },
];

const FEATURES = [
  ["Answers stay hidden", "Every reply is checked before you see it. If it gives the fix away, Quack rewrites it as a question."],
  ["Runs in your browser", "Python and JavaScript run in a sandbox, and infinite loops stop after five seconds."],
  ["Bug journal", "Each solved bug is saved with what you learned, so repeat mistakes start to stand out."],
  ["Voice", "Talk to the duck and it talks back. Works in Chrome and Edge."],
];

export function Landing() {
  return (
    <div className="w-full overflow-x-clip">
      <section className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-14 px-5 pt-12 pb-20 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-16 md:pt-24 md:pb-28">
        <div className="max-w-xl">
          <h1 className="display text-[2.6rem] leading-[0.98] sm:text-6xl md:text-[4.25rem]">
            The rubber duck that refuses to give you the answer.
          </h1>
          <p className="mt-7 max-w-[34rem] text-lg leading-relaxed text-muted-foreground">
            Quack asks questions until you find the problem yourself. It never writes the fix, so what you learn sticks.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/debug" className={cn(buttonVariants({ size: "lg" }), "h-12 px-6 text-[15px]")}>
              Start debugging
            </Link>
            <Link href="/debug?sample=js-off-by-one" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-6 text-[15px]")}>
              Try a sample bug
            </Link>
          </div>
        </div>
        <HeroDemo />
      </section>

      <section aria-labelledby="how-title" className="border-t">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-28">
          <h2 id="how-title" className="display max-w-md text-3xl sm:text-4xl">
            How a session goes
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
            {STEPS.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[2.25rem_1fr] gap-x-3">
                <span className="display text-3xl leading-none text-[var(--brand-ink)]" aria-hidden>
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="features-title" className="border-t">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:py-28">
          <h2 id="features-title" className="display max-w-xs text-3xl sm:text-4xl">
            What else it does
          </h2>
          <dl className="grid gap-x-12 gap-y-9 sm:grid-cols-2">
            {FEATURES.map(([term, desc]) => (
              <div key={term}>
                <dt className="font-semibold tracking-tight">{term}</dt>
                <dd className="mt-1.5 leading-relaxed text-muted-foreground">{desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-8">
          <span>Quack Overflow</span>
          <span>Built for Next Byte Hacks V5</span>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero: a real off-by-one bug. The duck asks its question, then the line it's
// asking about gets a highlighter swipe. Plays once; reduced motion shows the end state.
// ---------------------------------------------------------------------------

const CODE = [
  "const scores = [88, 92, 79];",
  "let total = 0;",
  "for (let i = 0; i <= scores.length; i++) {",
  "  total += scores[i];",
  "}",
  "console.log(total); // NaN",
];
const HIGHLIGHT = 2; // 0-indexed: line 3
const QUESTION = "On the last trip through the loop, what value does i have?";

function HeroDemo() {
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState(0);
  const shown = reduce ? QUESTION.length : typed;
  const done = shown >= QUESTION.length;

  useEffect(() => {
    if (reduce) return;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i += 1;
      setTyped(i);
      if (i < QUESTION.length) timer = setTimeout(tick, 28);
    };
    timer = setTimeout(tick, 700);
    return () => clearTimeout(timer);
  }, [reduce]);

  return (
    <figure className="w-full min-w-0" aria-label="Example: Quack asks about a loop that reads past the end of an array">
      <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--elevation-lg)]">
        <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs text-muted-foreground">
          <span>scores.js</span>
          <span>prints NaN, expected 259</span>
        </div>
        <pre className="overflow-x-auto py-3 font-mono text-[12.5px] leading-7 sm:text-[13.5px]">
          {CODE.map((line, i) => (
            <div key={i} className="relative grid grid-cols-[2.75rem_1fr] pr-4">
              {i === HIGHLIGHT && (
                <motion.span
                  aria-hidden
                  className="absolute inset-y-0.5 left-9 right-2 origin-left rounded-[3px] bg-[var(--highlight)]"
                  initial={{ scaleX: reduce ? 1 : 0 }}
                  animate={{ scaleX: done ? 1 : 0 }}
                  transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1], delay: reduce ? 0 : 0.25 }}
                />
              )}
              <span className="relative text-right pr-4 text-muted-foreground/60 select-none">{i + 1}</span>
              <code className="relative whitespace-pre">{line}</code>
            </div>
          ))}
        </pre>
      </div>

      <figcaption className="mt-5 flex items-end gap-3 pl-1">
        <Duck state={done ? "curious" : "thinking"} size={64} className="shrink-0" />
        <p className="duck-voice relative mb-2 min-h-[3.5rem] rounded-2xl rounded-bl-sm border bg-card px-4 py-3 text-[17px] leading-snug">
          <span aria-hidden>{QUESTION.slice(0, shown)}</span>
          <span className="sr-only">{QUESTION}</span>
          {!done && <span aria-hidden className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-foreground" />}
        </p>
      </figcaption>
    </figure>
  );
}
