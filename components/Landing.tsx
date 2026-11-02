"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HeroDuck } from "./HeroDuck";
import { RevealList, fadeUp, stagger } from "./Motion";
import { buttonVariants } from "./ui/button";

const STEPS = [
  { emoji: "📋", title: "Paste your code", body: "Python or JavaScript. Tell Quack what it should do, then run it right in your browser." },
  { emoji: "🗣️", title: "Explain it to the duck", body: "Type or talk. Quack only asks questions that make you trace, predict, and compare." },
  { emoji: "💡", title: "Find the bug yourself", body: "Stuck? Climb the 4-step hint ladder. Quack points the way but never writes the fix." },
];

const FEATURES = [
  ["🛡️", "Leak guard", "Every reply is checked (code diffing + an AI judge) so the answer never slips out."],
  ["🪜", "Hint ladder", "Nudge → concept → highlighted line → why it's wrong. Still no spoilers."],
  ["▶️", "Runs in your browser", "Python (Pyodide) and JavaScript in sandboxed workers, with infinite-loop protection."],
  ["📓", "Bug journal", "See your patterns: “You've had 3 off-by-one errors this week 👀”."],
  ["🎙️", "Voice mode", "Talk to the duck like a real rubber duck. It talks back."],
  ["🦆", "Real duck (optional)", "An ESP32 rubber duck that quacks and lights up over USB."],
];

const hover = { y: -4, transition: { type: "spring", stiffness: 400, damping: 22 } } as const;

export function Landing() {
  return (
    <div className="w-full overflow-x-clip">
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-5 pt-8 pb-12 sm:px-6 md:grid-cols-[1.1fr_1fr] md:gap-10 md:py-20">
        <motion.div variants={stagger} initial="hidden" animate="show" className="text-center md:text-left">
          <motion.p
            variants={fadeUp}
            className="neu-inset-sm mb-4 inline-block rounded-full px-4 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-200"
          >
            Rubber duck debugging, upgraded
          </motion.p>
          <motion.h1 variants={fadeUp} className="text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
            The AI rubber duck that{" "}
            <span className="underline decoration-amber-400 decoration-4 underline-offset-4">refuses</span> to give you the answer.
          </motion.h1>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg md:mx-0">
            AI tools fix your code and you learn nothing, so the same bug bites you again next week. Quack asks the right questions until{" "}
            <em>you</em> spot the bug. That&apos;s the part that sticks.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center md:justify-start">
            <Link href="/debug" className={cn(buttonVariants({ size: "lg" }), "h-12 px-6 text-base")}>
              Start debugging
            </Link>
            <Link href="/debug?sample=js-off-by-one" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-6 text-base")}>
              Try a sample bug
            </Link>
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 18, delay: 0.15 }}
          className="neu mx-auto w-full max-w-sm rounded-[2.5rem] p-6 sm:p-8"
        >
          <HeroDuck />
        </motion.div>
      </section>

      <section aria-labelledby="how-title" className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
        <h2 id="how-title" className="mb-8 text-center text-2xl font-bold">
          How it works
        </h2>
        <RevealList className="grid gap-6 md:grid-cols-3" role="list">
          {STEPS.map((s, i) => (
            <motion.li key={s.title} variants={fadeUp} whileHover={hover} className="neu rounded-3xl p-6">
              <div className="mb-3 flex items-center gap-3">
                <span className="neu-inset-sm flex size-10 items-center justify-center rounded-full font-bold text-amber-700 dark:text-amber-300">
                  {i + 1}
                </span>
                <span className="text-2xl" aria-hidden>
                  {s.emoji}
                </span>
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </motion.li>
          ))}
        </RevealList>
      </section>

      <section aria-labelledby="features-title" className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
        <h2 id="features-title" className="mb-8 text-center text-2xl font-bold">
          What&apos;s in the pond
        </h2>
        <RevealList className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([emoji, title, body]) => (
            <motion.li key={title} variants={fadeUp} whileHover={hover} className="neu-sm rounded-3xl p-5">
              <p className="flex items-center font-semibold">
                <span aria-hidden className="neu-inset-sm mr-3 flex size-9 items-center justify-center rounded-xl">
                  {emoji}
                </span>
                {title}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </motion.li>
          ))}
        </RevealList>
      </section>

      <footer className="px-5 py-8 text-center text-sm text-muted-foreground">
        Quack Overflow · built for Next Byte Hacks V5 · debug your code, level up your brain 🦆
      </footer>
    </div>
  );
}
