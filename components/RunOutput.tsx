"use client";

import { Terminal } from "lucide-react";

/** Program output shown inside the chat, styled like a terminal. */
export function RunOutput({ text }: { text: string }) {
  const isError = /(Error|Traceback|Exception|⏱️)/.test(text);
  return (
    <figure className="w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-100" data-testid="run-output">
      <figcaption className="flex items-center gap-1.5 border-b border-zinc-800 px-3 py-1 text-xs text-zinc-300">
        <Terminal className="size-3.5" aria-hidden /> Program output
        {isError && <span className="ml-auto rounded bg-red-500/20 px-1.5 text-red-200">error</span>}
      </figcaption>
      <pre className="max-h-64 overflow-auto px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap">{text}</pre>
    </figure>
  );
}
