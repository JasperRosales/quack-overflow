// Python runner: a plain ES-module Web Worker (served as-is, not bundled, because
// Pyodide refuses to load inside the classic-worker wrapper bundlers generate).
// Protocol: see lib/runners/protocol.ts.
const params = new URL(self.location.href).searchParams;
const PYODIDE_URL = params.get("pyodide");
const MAX_OUTPUT_CHARS = Number(params.get("max") || 20000);

let sent = 0;
let truncated = false;
function post(msg) {
  if (msg.type === "out") {
    if (truncated) return;
    if (sent + msg.text.length > MAX_OUTPUT_CHARS) {
      truncated = true;
      self.postMessage({ type: "out", stream: "stderr", text: "\n…output truncated…\n" });
      return;
    }
    sent += msg.text.length;
  }
  self.postMessage(msg);
}

const decoder = new TextDecoder();
let inputs = [];

const ready = (async () => {
  post({ type: "loading", message: "Warming up the pond…" });
  const { loadPyodide } = await import(PYODIDE_URL);
  const py = await loadPyodide();
  py.setStdout({ write: (buf) => (post({ type: "out", stream: "stdout", text: decoder.decode(buf) }), buf.length) });
  py.setStderr({ write: (buf) => (post({ type: "out", stream: "stderr", text: decoder.decode(buf) }), buf.length) });
  py.setStdin({
    stdin: () => {
      const v = inputs.length ? inputs.shift() : undefined;
      post({ type: "out", stream: "stdout", text: (v ?? "") + "\n" }); // echo, like a terminal
      return v;
    },
  });
  return py;
})();

ready.then(
  () => post({ type: "ready" }),
  (err) => post({ type: "fatal", message: `Could not load Python (Pyodide): ${String(err)}` })
);

self.onmessage = async (e) => {
  if (e.data?.type !== "run") return;
  const py = await ready;
  inputs = e.data.stdin ? e.data.stdin.split("\n") : [];
  sent = 0;
  truncated = false;
  try {
    const globals = py.globals.get("dict")();
    await py.runPythonAsync(e.data.code, { globals, filename: "main.py" });
  } catch (err) {
    post({ type: "out", stream: "stderr", kind: "traceback", text: String(err?.message ?? err) });
  }
  post({ type: "done" });
};
