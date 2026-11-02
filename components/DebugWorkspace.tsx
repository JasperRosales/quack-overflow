"use client";

import confetti from "canvas-confetti";
import { BookOpen, Loader2, Play, RotateCcw, Usb } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { SAMPLES, getSample } from "@/data/samples";
import { askDuck, classify } from "@/lib/duckClient";
import { commandForState } from "@/lib/duckSerial";
import { formatRunResult, prewarmPython, runCode } from "@/lib/runners";
import { storage } from "@/lib/storage";
import type { ChatMessage, DebugSession, DuckRequest, DuckState, DuckTrigger, HintLevel, Language } from "@/lib/types";
import { categoryLabel } from "@/lib/categories";
import { speak, stopSpeaking } from "@/lib/voice";
import { ChatPanel } from "./ChatPanel";
import { CodeEditor } from "./CodeEditor";
import { Duck } from "./Duck";
import { useDuckLink } from "./DuckLink";
import { HintLadder } from "./HintLadder";
import { Button, buttonVariants } from "./ui/button";
import { Switch } from "./ui/switch";
import { RichText } from "./RichText";

const STARTERS: Record<Language, string> = {
  python: "# Paste your Python code here\n",
  javascript: "// Paste your JavaScript code here\n",
};

const THINKING_COPY = ["Quack is thinking…", "Paddling through your code…", "Tilting head thoughtfully…", "Consulting the pond…"];
const STAGE_COPY = {
  checking: "Making sure I don't spoil the answer…",
  rewriting: "Oops, almost gave it away! Rephrasing as a question…",
};
const SLEEPY_AFTER_MS = 90_000;

function newSession(language: Language, sampleId?: string): DebugSession {
  const s = getSample(sampleId);
  return {
    id: uuid(),
    title: s?.title ?? "My bug",
    language: s?.language ?? language,
    code: s?.code ?? STARTERS[language],
    expectedBehavior: s?.expectedBehavior ?? "",
    messages: [],
    maxHintUsed: 0,
    solved: false,
    questionsAsked: 0,
    startedAt: new Date().toISOString(),
    sampleId: s?.id,
  };
}

const msg = (role: ChatMessage["role"], text: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id: uuid(),
  role,
  text,
  createdAt: new Date().toISOString(),
  ...extra,
});

export function DebugWorkspace() {
  const params = useSearchParams();
  const router = useRouter();
  const duckLink = useDuckLink();

  const [session, setSession] = useState<DebugSession | null>(null);
  const [stdin, setStdin] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState(THINKING_COPY[0]);
  const [running, setRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [lastRunOutput, setLastRunOutput] = useState<string>("");
  const [mood, setMood] = useState<DuckState>("idle");
  const [typing, setTyping] = useState(false);
  const [sleptAt, setSleptAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duckSpeaks, setDuckSpeaks] = useState(false);
  const [isMockMode, setIsMockMode] = useState<boolean | null>(null);
  const [solvedInfo, setSolvedInfo] = useState<{ category?: string; lesson?: string } | null>(null);

  const sessionRef = useRef<DebugSession | null>(null);
  const busyRef = useRef(false);
  const lastRunOutputRef = useRef("");
  const markSolvedRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    sessionRef.current = session;
    lastRunOutputRef.current = lastRunOutput;
  }, [session, lastRunOutput]);

  // ------------------------------------------------------------------ persistence
  const update = useCallback((fn: (s: DebugSession) => DebugSession) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      sessionRef.current = next;
      storage.setCurrent(next);
      return next;
    });
  }, []);

  // ------------------------------------------------------------------ duck calls
  const callDuck = useCallback(
    async (trigger: DuckTrigger, opts: { messages?: ChatMessage[]; hintLevel?: HintLevel; runOutput?: string } = {}) => {
      const s = sessionRef.current;
      if (!s || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      setBusyLabel(THINKING_COPY[Math.floor(Math.random() * THINKING_COPY.length)]);
      setMood("thinking");
      const messages = opts.messages ?? s.messages;
      const req: DuckRequest = {
        code: s.code,
        language: s.language,
        expectedBehavior: s.expectedBehavior,
        lastRunOutput: opts.runOutput ?? lastRunOutputRef.current,
        hintLevel: opts.hintLevel ?? s.maxHintUsed,
        messages: messages.map((m) => ({ role: m.role, text: m.text })),
        trigger,
        sampleId: s.sampleId,
      };
      try {
        const res = await askDuck(req, (stage) => {
          if (stage !== "thinking") setBusyLabel(STAGE_COPY[stage]);
        });
        setIsMockMode(res.mock);
        if (res.guardCatches) storage.addGuardCatches(res.guardCatches);
        const r = res.reply;
        const hintLevel = req.hintLevel;
        const duckMsg = msg("duck", r.reply, {
          hintLevel,
          highlightLines: hintLevel >= 3 && r.highlight_lines?.length ? r.highlight_lines : undefined,
        });
        update((cur) => ({
          ...cur,
          messages: [...cur.messages, duckMsg],
          questionsAsked: cur.questionsAsked + (r.reply.includes("?") ? 1 : 0),
        }));
        setMood(r.duck_mood);
        if (r.duck_mood !== "celebrating") duckLink.send("QUACK", { force: true });
        if (storage.getSettings().duckSpeaks) speak(r.reply);
        if (r.solved_signal) void markSolvedRef.current();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setMood("idle");
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [update, duckLink]
  );

  // ------------------------------------------------------------------ solved
  const markSolved = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || s.solved) return;
    setMood("celebrating");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      void confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ["#FFD43B", "#FF8C1A", "#3B82F6", "#22C55E"] });
    }
    const solvedAt = new Date().toISOString();
    update((cur) => ({ ...cur, solved: true, solvedAt }));
    setSolvedInfo({});
    let category = getSample(s.sampleId)?.category ?? "other";
    let lessonLearned = "You learned to trace your code step by step until the bug had nowhere to hide.";
    try {
      const c = await classify({
        code: s.code,
        language: s.language,
        sampleId: s.sampleId,
        messages: sessionRef.current!.messages.map((m) => ({ role: m.role, text: m.text })),
      });
      category = c.category;
      lessonLearned = c.lessonLearned;
    } catch {
      // keep fallbacks
    }
    const final: DebugSession = { ...sessionRef.current!, solved: true, solvedAt, category, lessonLearned };
    storage.saveSession(final);
    storage.setCurrent(final);
    setSession(final);
    setSolvedInfo({ category, lesson: lessonLearned });
  }, [update]);
  useEffect(() => {
    markSolvedRef.current = markSolved;
  }, [markSolved]);

  // ------------------------------------------------------------------ init
  const sampleParam = params.get("sample");
  /* eslint-disable react-hooks/set-state-in-effect -- hydrate from localStorage (an external store) on mount */
  useEffect(() => {
    setDuckSpeaks(storage.getSettings().duckSpeaks);
    const current = storage.getCurrent();
    let s: DebugSession;
    if (sampleParam && getSample(sampleParam)) {
      s = current && current.sampleId === sampleParam && !current.solved ? current : newSession("javascript", sampleParam);
    } else {
      s = current ?? newSession("python");
    }
    storage.setCurrent(s);
    sessionRef.current = s;
    setSession(s);
    setStdin(getSample(s.sampleId)?.stdin ?? "");
    if (s.solved) setSolvedInfo({ category: s.category, lesson: s.lessonLearned });
    const lastRun = [...s.messages].reverse().find((m) => m.role === "system-run");
    setLastRunOutput(lastRun?.text ?? "");
    if (s.language === "python") void prewarmPython().catch(() => {});
  }, [sampleParam]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Greet once when a fresh session opens.
  const greetedRef = useRef<string | null>(null);
  useEffect(() => {
    if (session && session.messages.length === 0 && greetedRef.current !== session.id) {
      greetedRef.current = session.id;
      void callDuck("start");
    }
  }, [session, callDuck]);

  // ------------------------------------------------------------------ actions
  const send = (text: string) => {
    const s = sessionRef.current;
    if (!s) return;
    const m = msg("user", text);
    const messages = [...s.messages, m];
    update((cur) => ({ ...cur, messages }));
    void callDuck("message", { messages });
  };

  const run = async () => {
    const s = sessionRef.current;
    if (!s || running) return;
    setRunning(true);
    setError(null);
    setMood("thinking");
    duckLink.send("THINK");
    try {
      const result = await runCode(s.language, s.code, stdin, setRunStatus);
      const text = formatRunResult(result);
      setLastRunOutput(text);
      const runMsg = msg("system-run", text);
      const messages = [...sessionRef.current!.messages, runMsg];
      update((cur) => ({ ...cur, messages }));
      setRunning(false);
      if (!s.solved) await callDuck("run", { messages, runOutput: text });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run the code.");
      setMood("idle");
    } finally {
      setRunning(false);
      setRunStatus(null);
    }
  };

  const climb = useCallback(
    (level: HintLevel) => {
      const s = sessionRef.current;
      if (!s || s.solved || busyRef.current || level !== s.maxHintUsed + 1) return;
      const m = msg("user", `🪜 I'd like hint ${level}, please.`, { hintLevel: level });
      const messages = [...s.messages, m];
      update((cur) => ({ ...cur, maxHintUsed: level, messages }));
      sessionRef.current = { ...s, maxHintUsed: level, messages };
      void callDuck("hint", { messages, hintLevel: level });
    },
    [update, callDuck]
  );

  const reset = (sampleId?: string, language?: Language) => {
    stopSpeaking();
    const s = newSession(language ?? session?.language ?? "python", sampleId);
    storage.setCurrent(s);
    sessionRef.current = s;
    setSession(s);
    setLastRunOutput("");
    setStdin(getSample(sampleId)?.stdin ?? "");
    setSolvedInfo(null);
    setMood("idle");
    setError(null);
    if (s.language === "python") void prewarmPython().catch(() => {});
    router.replace(sampleId ? `/debug?sample=${sampleId}` : "/debug", { scroll: false });
  };

  // ------------------------------------------------------------------ duck state
  const highlightLines = useMemo(() => {
    if (!session || session.maxHintUsed < 3) return [];
    const last = [...session.messages].reverse().find((m) => m.highlightLines?.length);
    return last?.highlightLines ?? [];
  }, [session]);

  // Sleepy after a long idle period: any activity changes the key and wakes the duck.
  const activityKey = `${session?.messages.length}|${typing}|${session?.code.length}|${busy}|${running}`;
  useEffect(() => {
    const t = setTimeout(() => setSleptAt(activityKey), SLEEPY_AFTER_MS);
    return () => clearTimeout(t);
  }, [activityKey]);
  const sleepy = sleptAt === activityKey;

  const duckState: DuckState = session?.solved
    ? "celebrating"
    : busy || running
      ? "thinking"
      : typing
        ? "listening"
        : sleepy
          ? "sleepy"
          : mood;

  useEffect(() => {
    duckLink.send(commandForState(duckState));
  }, [duckState, duckLink]);

  // Hardware "I'm stuck" button climbs the ladder (the physical press is the confirmation).
  useEffect(
    () =>
      duckLink.subscribe((m) => {
        const s = sessionRef.current;
        if (m === "BTN_HINT" && s && s.maxHintUsed < 4) climb((s.maxHintUsed + 1) as HintLevel);
      }),
    [duckLink, climb]
  );

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" aria-hidden /> Filling the pond…
      </div>
    );
  }

  const duckCaption: Record<DuckState, string> = {
    idle: "Quack is waiting for you",
    listening: "Quack is listening…",
    thinking: busy ? busyLabel : running ? (runStatus ?? "Running your code…") : "Hmm…",
    curious: "Quack is curious",
    celebrating: "Quack is celebrating! 🎉",
    sleepy: "Quack dozed off… say something!",
  };

  return (
    <div className="mx-auto grid w-full max-w-7xl flex-1 gap-4 p-4 lg:h-[calc(100dvh-3.5rem)] lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <h1 className="sr-only">Debug with Quack</h1>
      {/* ---------------- left: code ---------------- */}
      <section aria-label="Your code" className="flex min-h-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="sample-select">
            Load a sample bug
          </label>
          <select
            id="sample-select"
            data-testid="sample-select"
            value={session.sampleId ?? ""}
            onChange={(e) => reset(e.target.value || undefined)}
            className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm"
          >
            <option value="">✏️ My own code</option>
            {SAMPLES.map((s, i) => (
              <option key={s.id} value={s.id}>
                Sample {i + 1}: {s.title}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="language-select">
            Language
          </label>
          <select
            id="language-select"
            value={session.language}
            onChange={(e) => {
              const language = e.target.value as Language;
              if (session.sampleId || session.code === STARTERS[session.language]) reset(undefined, language);
              else update((cur) => ({ ...cur, language }));
              if (language === "python") void prewarmPython().catch(() => {});
            }}
            className="h-9 rounded-lg border bg-background px-2 text-sm"
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
          </select>
          <Button onClick={run} disabled={running} data-testid="run-button" className="h-9 px-4">
            {running ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />}
            {running ? (runStatus ?? "Running…") : "Run"}
          </Button>
        </div>

        <div className="min-h-[320px] flex-1 overflow-hidden rounded-xl border lg:min-h-0">
          <CodeEditor
            value={session.code}
            language={session.language}
            highlightLines={highlightLines}
            onChange={(code) => update((cur) => ({ ...cur, code }))}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <div>
            <label htmlFor="expected" className="mb-1 block text-sm font-medium">
              What should this code do?
            </label>
            <textarea
              id="expected"
              data-testid="expected-input"
              rows={2}
              value={session.expectedBehavior}
              onChange={(e) => update((cur) => ({ ...cur, expectedBehavior: e.target.value }))}
              placeholder="e.g. Print the average of the scores (75.0)"
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>
          <div>
            <label htmlFor="stdin" className="mb-1 block text-sm font-medium">
              Input (stdin)
            </label>
            <textarea
              id="stdin"
              rows={2}
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="One line per input() / prompt()"
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 font-mono text-sm focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>
        </div>
      </section>

      {/* ---------------- right: duck + chat ---------------- */}
      <section aria-label="Quack the duck" className="flex min-h-[600px] flex-col gap-3 lg:min-h-0">
        <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
          <Duck state={duckState} size={96} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Quack</p>
            <p className="truncate text-sm text-muted-foreground" aria-live="polite" data-testid="duck-caption">
              {duckCaption[duckState]}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <label className="flex items-center gap-2">
                <Switch
                  checked={duckSpeaks}
                  onCheckedChange={(v) => {
                    setDuckSpeaks(v);
                    storage.setSettings({ duckSpeaks: v });
                    if (!v) stopSpeaking();
                  }}
                  aria-label="Duck speaks replies out loud"
                />
                Duck speaks
              </label>
              {duckLink.supported && (
                <button
                  type="button"
                  onClick={() => (duckLink.connected ? duckLink.disconnect() : duckLink.connect())}
                  className="inline-flex items-center gap-1 rounded px-1 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Usb className="size-3.5" aria-hidden />
                  {duckLink.connected ? "Duck connected ✓" : "Connect duck 🦆"}
                </button>
              )}
              {isMockMode && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground" title="MOCK_AI mode: scripted replies, no API calls">
                  demo mode
                </span>
              )}
            </div>
          </div>
        </div>

        <HintLadder level={session.maxHintUsed} disabled={busy || session.solved} onClimb={climb} />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
          {solvedInfo && (
            <div className="border-b bg-green-50 p-3 text-sm text-green-950 dark:bg-green-500/10 dark:text-green-100" role="status" data-testid="solved-banner">
              <p className="font-semibold">🎉 Bug squashed!{solvedInfo.category ? ` Category: ${categoryLabel(solvedInfo.category)}` : ""}</p>
              {solvedInfo.lesson ? <p className="mt-1"><RichText text={solvedInfo.lesson} /></p> : <p className="mt-1 opacity-80">Writing it in your bug journal…</p>}
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => reset()}>
                  <RotateCcw aria-hidden /> New session
                </Button>
                <Link href="/journal" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <BookOpen aria-hidden /> View journal
                </Link>
              </div>
            </div>
          )}
          <ChatPanel
            messages={session.messages}
            busy={busy}
            busyLabel={busyLabel}
            onSend={send}
            onTyping={setTyping}
            disabled={session.solved}
          />
          {error && (
            <p role="alert" className="border-t bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-500/10 dark:text-red-200">
              {error}{" "}
              <button className="underline" onClick={() => setError(null)}>
                Dismiss
              </button>
            </p>
          )}
          {!session.solved && (
            <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
              <span>Found it on your own?</span>
              <Button size="sm" variant="secondary" onClick={() => void markSolved()} data-testid="mark-solved">
                ✅ Mark as solved
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
