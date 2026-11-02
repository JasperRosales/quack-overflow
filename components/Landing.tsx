"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Cpu, Layers, Mic, Play, ShieldCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HeroDuck } from "./HeroDuck";
import { RevealList, fadeUp, stagger } from "./Motion";
import { buttonVariants } from "./ui/button";

const STEPS = [
  { title: "Paste your code", body: "Python or JavaScript. Describe what it should do, then run it right in your browser." },
  { title: "Explain it to the duck", body: "Type or talk. Quack only asks questions that make you trace, predict, and compare." },
  { title: "Find the bug yourself", body: "Stuck? Climb the four-step hint ladder. Quack points the way but never writes the fix." },
];

const FEATURES: [LucideIcon, string, string][] = [
  [ShieldCheck, "Leak guard", "Every reply is checked by code diffing and an AI judge, so the answer never slips out."],
  [Layers, "Hint ladder", "Nudge, concept, highlighted line, then why it's wrong. Still no spoilers."],
  [Play, "Runs in your browser", "Python (Pyodide) and JavaScript in sandboxed workers, with infinite-loop protection."],
  [BookOpen, "Bug journal", "See your patterns, like three off-by-one errors this week."],
  [Mic, "Voice mode", "Talk to the duck like a real rubber duck. It talks back."],
  [Cpu, "Hardware duck", "Optional ESP32 rubber duck that quacks and lights up over USB."],
];

export function Landing() {
  return (
    <div className="w-full overflow-x-clip">
      {/* ---------------- hero ---------------- */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-14 pb-16 sm:px-6 md:grid-cols-[1.15fr_1fr] md:pt-24 md:pb-24">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.p
            variants={fadeUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            <span className="size-1.5 rounded-full bg-[var(--brand)]" aria-hidden />
            Rubber duck debugging, upgraded
          </motion.p>
          <motion.h1 variants={fadeUp} className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-[3.5rem] md:leading-[1.05]">
            The AI rubber duck that <span className="text-muted-foreground">refuses</span> to give you the answer.
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            AI tools fix your code and you learn nothing, so the same bug bites again next week. Quack asks the right questions until{" "}
            <em className="text-foreground not-italic">you</em> spot the bug. That&apos;s the part that sticks.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/debug" className={cn(buttonVariants({ size: "lg" }), "group h-11 px-5")}>
              Start debugging
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link href="/debug?sample=js-off-by-one" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-5")}>
              Try a sample bug
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 160, damping: 22, delay: 0.15 }}
          className="surface mx-auto w-full max-w-sm rounded-2xl p-6 sm:p-8"
        >
          <HeroDuck />
        </motion.div>
      </section>

      {/* ---------------- how it works ---------------- */}
      <section aria-labelledby="how-title" className="border-t">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 md:py-24">
          <SectionHeading id="how-title" eyebrow="How it works" title="Three steps. Zero spoilers." />
          <RevealList className="grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((s, i) => (
              <motion.li key={s.title} variants={fadeUp} className="border-t pt-6">
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                <h3 className="mt-3 font-medium">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </motion.li>
            ))}
          </RevealList>
        </div>
      </section>

      {/* ---------------- features ---------------- */}
      <section aria-labelledby="features-title" className="border-t">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 md:py-24">
          <SectionHeading id="features-title" eyebrow="Features" title="Everything in the pond." />
          <RevealList className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([Icon, title, body]) => (
              <motion.li key={title} variants={fadeUp} className="group bg-card p-6 transition-colors hover:bg-muted/50">
                <Icon className="size-5 text-muted-foreground transition-colors group-hover:text-foreground" strokeWidth={1.75} aria-hidden />
                <p className="mt-4 font-medium">{title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </motion.li>
            ))}
          </RevealList>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <span>Quack Overflow</span>
          <span>Built for Next Byte Hacks V5</span>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div className="mb-12">
      <p className="text-sm text-muted-foreground">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>
    </div>
  );
}
