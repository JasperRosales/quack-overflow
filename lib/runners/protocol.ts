/** Messages exchanged between the page and the runner workers. */
export type RunnerIn = { type: "run"; code: string; stdin: string };
export type RunnerOut =
  | { type: "ready" }
  | { type: "loading"; message: string }
  | { type: "out"; stream: "stdout" | "stderr"; text: string; kind?: "traceback" }
  | { type: "done" }
  | { type: "fatal"; message: string };

/** Cap output so a runaway print loop can't freeze the tab. */
export const MAX_OUTPUT_CHARS = 20000;
