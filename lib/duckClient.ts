"use client";
import type { DuckRequest, DuckStreamEvent } from "./types";

type ReplyEvent = Extract<DuckStreamEvent, { type: "reply" }>;

/** POST to /api/duck and read the NDJSON stream of status events + the final reply. */
export async function askDuck(
  req: DuckRequest,
  onStatus: (stage: "thinking" | "checking" | "rewriting") => void,
  signal?: AbortSignal
): Promise<ReplyEvent> {
  const res = await fetch("/api/duck", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`Duck API error ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let result: ReplyEvent | null = null;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      const ev = JSON.parse(line) as DuckStreamEvent;
      if (ev.type === "status") onStatus(ev.stage);
      else if (ev.type === "reply") result = ev;
      else if (ev.type === "error") throw new Error(ev.message);
    }
  }
  if (!result) throw new Error("The duck didn't reply.");
  return result;
}

export async function classify(body: { code: string; language: string; sampleId?: string; messages: { role: string; text: string }[] }) {
  const res = await fetch("/api/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Classify error ${res.status}`);
  return (await res.json()) as { category: string; lessonLearned: string };
}
