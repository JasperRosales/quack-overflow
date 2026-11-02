/// <reference lib="webworker" />
import { MAX_OUTPUT_CHARS, type RunnerIn, type RunnerOut } from "./protocol";

declare const self: DedicatedWorkerGlobalScope;

let sent = 0;
let truncated = false;
function post(msg: RunnerOut) {
  if (msg.type === "out") {
    if (truncated) return;
    if (sent + msg.text.length > MAX_OUTPUT_CHARS) {
      truncated = true;
      self.postMessage({ type: "out", stream: "stderr", text: "\n…output truncated…\n" } satisfies RunnerOut);
      return;
    }
    sent += msg.text.length;
  }
  self.postMessage(msg);
}

/** Node-style value formatting so output looks familiar (e.g. `Promise { <pending> }`). */
function inspect(v: unknown, depth = 0, nested = false): string {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (typeof v === "string") return nested ? `'${v}'` : v;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return String(v);
  if (typeof v === "symbol") return v.toString();
  if (typeof v === "function") return `[Function: ${v.name || "(anonymous)"}]`;
  if (v instanceof Promise) return "Promise { <pending> }";
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  if (depth > 2) return Array.isArray(v) ? "[Array]" : "[Object]";
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    return `[ ${v.map((x) => inspect(x, depth + 1, true)).join(", ")} ]`;
  }
  if (v instanceof Map) return `Map(${v.size}) { ${[...v].map(([k, x]) => `${inspect(k, depth + 1, true)} => ${inspect(x, depth + 1, true)}`).join(", ")} }`;
  if (v instanceof Set) return `Set(${v.size}) { ${[...v].map((x) => inspect(x, depth + 1, true)).join(", ")} }`;
  const entries = Object.entries(v as Record<string, unknown>);
  if (entries.length === 0) return "{}";
  return `{ ${entries.map(([k, x]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`}: ${inspect(x, depth + 1, true)}`).join(", ")} }`;
}

const fmt = (args: unknown[]) => args.map((a) => inspect(a)).join(" ") + "\n";

// The AsyncFunction wrapper adds 2 lines before the user's code.
const LINE_OFFSET = 2;

function describeError(err: unknown): string {
  if (err instanceof Error) {
    const m = err.stack?.match(/<anonymous>:(\d+):(\d+)/);
    const line = m ? Number(m[1]) - LINE_OFFSET : null;
    return `${err.name}: ${err.message}${line && line > 0 ? `\n    at line ${line}` : ""}\n`;
  }
  return `Uncaught ${inspect(err)}\n`;
}

self.onmessage = async (e: MessageEvent<RunnerIn>) => {
  if (e.data.type !== "run") return;
  const { code, stdin } = e.data;
  const inputs = stdin.split("\n");
  let pending = 0;
  let mainDone = false;
  let finished = false;
  const finish = () => {
    if (!finished && mainDone && pending === 0) {
      finished = true;
      post({ type: "done" });
    }
  };

  const timers = new Set<number>();
  const fakeConsole = {
    log: (...a: unknown[]) => post({ type: "out", stream: "stdout", text: fmt(a) }),
    info: (...a: unknown[]) => post({ type: "out", stream: "stdout", text: fmt(a) }),
    debug: (...a: unknown[]) => post({ type: "out", stream: "stdout", text: fmt(a) }),
    table: (...a: unknown[]) => post({ type: "out", stream: "stdout", text: fmt(a) }),
    warn: (...a: unknown[]) => post({ type: "out", stream: "stderr", text: fmt(a) }),
    error: (...a: unknown[]) => post({ type: "out", stream: "stderr", text: fmt(a) }),
  };
  const fakePrompt = (msg?: string) => {
    const v = inputs.length ? inputs.shift()! : null;
    post({ type: "out", stream: "stdout", text: `${msg ?? ""}${v ?? ""}\n` });
    return v;
  };
  const wrapCb = (fn: TimerHandler, once: boolean, id: () => number) => () => {
    try {
      if (typeof fn === "function") fn();
    } catch (err) {
      post({ type: "out", stream: "stderr", text: describeError(err) });
    } finally {
      if (once && timers.delete(id())) pending--;
      finish();
    }
  };
  const fakeSetTimeout = (fn: TimerHandler, ms?: number) => {
    pending++;
    const id: number = self.setTimeout(wrapCb(fn, true, () => id), ms);
    timers.add(id);
    return id;
  };
  const fakeSetInterval = (fn: TimerHandler, ms?: number) => {
    pending++;
    const id: number = self.setInterval(wrapCb(fn, false, () => id), ms);
    timers.add(id);
    return id;
  };
  const clear = (id: number) => {
    self.clearTimeout(id);
    self.clearInterval(id);
    if (timers.delete(id)) pending--;
    finish();
  };

  self.onunhandledrejection = (ev) => {
    ev.preventDefault();
    post({ type: "out", stream: "stderr", text: describeError(ev.reason) });
  };

  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (...args: string[]) => (...a: unknown[]) => Promise<unknown>;
    const fn = new AsyncFunction("console", "prompt", "alert", "setTimeout", "setInterval", "clearTimeout", "clearInterval", code);
    await fn(fakeConsole, fakePrompt, fakeConsole.log, fakeSetTimeout, fakeSetInterval, clear, clear);
  } catch (err) {
    post({ type: "out", stream: "stderr", text: describeError(err) });
  }
  // Let already-resolved promise chains flush before deciding we're done.
  await new Promise((r) => self.setTimeout(r, 0));
  mainDone = true;
  finish();
};

post({ type: "ready" });
