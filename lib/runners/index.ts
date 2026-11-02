"use client";
import { CONFIG } from "../config";
import type { Language, RunResult } from "../types";
import { MAX_OUTPUT_CHARS, type RunnerIn, type RunnerOut } from "./protocol";
import { cleanTraceback } from "./traceback";

type Status = (message: string | null) => void;

let pyWorker: Worker | null = null;
let pyReady: Promise<void> | null = null;

function createWorker(language: Language): Worker {
  return language === "python"
    ? new Worker(
        `/runners/pyodide.worker.mjs?pyodide=${encodeURIComponent(CONFIG.pyodideUrl)}&max=${MAX_OUTPUT_CHARS}`,
        { type: "module", name: "python-runner" }
      )
    : new Worker(new URL("./js.worker.ts", import.meta.url), { type: "module" });
}

function waitReady(w: Worker, onStatus: Status): Promise<void> {
  return new Promise((resolve, reject) => {
    const onMsg = (e: MessageEvent<RunnerOut>) => {
      if (e.data.type === "loading") onStatus(e.data.message);
      if (e.data.type === "ready") {
        w.removeEventListener("message", onMsg);
        resolve();
      }
      if (e.data.type === "fatal") {
        w.removeEventListener("message", onMsg);
        reject(new Error(e.data.message));
      }
    };
    w.addEventListener("message", onMsg);
  });
}

/** Start loading Pyodide in the background (e.g. when a Python sample is opened). */
export function prewarmPython(onStatus: Status = () => {}): Promise<void> {
  if (!pyWorker) {
    pyWorker = createWorker("python");
    pyReady = waitReady(pyWorker, onStatus).catch((err) => {
      pyWorker?.terminate();
      pyWorker = null;
      pyReady = null;
      throw err;
    });
  }
  return pyReady!;
}

/**
 * Run code in a sandboxed Web Worker. Kills the worker after CONFIG.runTimeoutMs
 * (the Python worker is then re-created, which means a fresh Pyodide warm-up).
 */
export async function runCode(language: Language, code: string, stdin: string, onStatus: Status = () => {}): Promise<RunResult> {
  let worker: Worker;
  if (language === "python") {
    onStatus("Warming up the pond…");
    await prewarmPython(onStatus);
    worker = pyWorker!;
  } else {
    worker = createWorker("javascript");
    await waitReady(worker, onStatus);
  }
  onStatus("Running…");

  return new Promise<RunResult>((resolve) => {
    let stdout = "";
    let stderr = "";
    const start = performance.now();
    const finish = (timedOut: boolean) => {
      clearTimeout(timer);
      worker.removeEventListener("message", onMsg);
      if (language === "javascript" || timedOut) worker.terminate();
      if (language === "python" && timedOut) {
        pyWorker = null;
        pyReady = null;
      }
      onStatus(null);
      resolve({ stdout, stderr, timedOut, durationMs: Math.round(performance.now() - start) });
    };
    const onMsg = (e: MessageEvent<RunnerOut>) => {
      const m = e.data;
      if (m.type === "out") {
        if (m.stream === "stdout") stdout += m.text;
        else stderr += m.kind === "traceback" ? cleanTraceback(m.text) : m.text;
      } else if (m.type === "done") finish(false);
    };
    const timer = setTimeout(() => finish(true), CONFIG.runTimeoutMs);
    worker.addEventListener("message", onMsg);
    worker.postMessage({ type: "run", code, stdin } satisfies RunnerIn);
  });
}

/** Turn a run result into the text shown in the chat (and sent to the duck). */
export function formatRunResult(r: RunResult): string {
  let text = r.stdout.trimEnd();
  if (r.stderr.trim()) text += (text ? "\n" : "") + r.stderr.trimEnd();
  if (r.timedOut) text += `${text ? "\n" : ""}⏱️ Stopped after ${CONFIG.runTimeoutMs / 1000} seconds. Is there a loop that never ends?`;
  if (!text.trim()) text = "(no output)";
  return text.replace(/\n+$/, "");
}
