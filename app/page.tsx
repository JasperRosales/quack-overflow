import Link from "next/link";
import { cn } from "@/lib/utils";
import { HeroDuck } from "@/components/HeroDuck";
import { buttonVariants } from "@/components/ui/button";

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

export default function Home() {
  return (
    <div className="w-full">
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-12 md:grid-cols-[1.1fr_1fr] md:py-20">
        <div>
          <p className="mb-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-950 dark:bg-amber-500/15 dark:text-amber-100">
            Rubber duck debugging, upgraded
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
            The AI rubber duck that <span className="underline decoration-amber-400 decoration-4 underline-offset-4">refuses</span> to give you the answer.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            AI tools fix your code and you learn nothing, so the same bug bites you again next week. Quack asks the right questions until{" "}
            <em>you</em> spot the bug. That&apos;s the part that sticks.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/debug" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-base")}>
              Start debugging
            </Link>
            <Link href="/debug?sample=js-off-by-one" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-5 text-base")}>
              Try a sample bug
            </Link>
          </div>
        </div>
        <HeroDuck />
      </section>

      <section aria-labelledby="how-title" className="border-y bg-muted/40">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 id="how-title" className="mb-8 text-center text-2xl font-bold">
            How it works
          </h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-xl border bg-card p-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{i + 1}</span>
                  <span className="text-2xl" aria-hidden>
                    {s.emoji}
                  </span>
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="features-title" className="mx-auto max-w-6xl px-6 py-14">
        <h2 id="features-title" className="mb-8 text-center text-2xl font-bold">
          What&apos;s in the pond
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([emoji, title, body]) => (
            <li key={title} className="rounded-xl border p-5">
              <p className="font-semibold">
                <span aria-hidden className="mr-2">
                  {emoji}
                </span>
                {title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Quack Overflow · built for Next Byte Hacks V5 · debug your code, level up your brain 🦆
      </footer>
    </div>
  );
}
