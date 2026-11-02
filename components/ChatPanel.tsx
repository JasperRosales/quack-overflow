"use client";

import { SendHorizonal } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RunOutput } from "./RunOutput";
import { VoiceButton } from "./VoiceButton";
import { RichText } from "./RichText";

interface ChatPanelProps {
  messages: ChatMessage[];
  busy: boolean;
  busyLabel: string;
  onSend: (text: string) => void;
  onTyping?: (typing: boolean) => void;
  disabled?: boolean;
}

export function ChatPanel({ messages, busy, busyLabel, onSend, onTyping, disabled }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, busy]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || busy || disabled) return;
    onSend(text);
    setDraft("");
    onTyping?.(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ol
        ref={listRef}
        className="flex min-h-[200px] flex-1 flex-col gap-3 overflow-y-auto p-3"
        aria-label="Conversation with Quack"
        aria-live="polite"
        aria-relevant="additions"
        data-testid="chat-log"
      >
        {messages.length === 0 && !busy && (
          <li className="m-auto max-w-xs text-center text-sm text-muted-foreground">
            Paste your code, tell Quack what it should do, then hit <strong>Run</strong> or just start explaining. 🦆
          </li>
        )}
        {messages.map((m) => (
          <li
            key={m.id}
            data-role={m.role}
            className={cn(
              "flex",
              m.role === "user" && "justify-end",
              m.role === "duck" && "justify-start",
              m.role === "system-run" && "justify-center"
            )}
          >
            {m.role === "system-run" ? (
              <RunOutput text={m.text} />
            ) : (
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "rounded-br-sm bg-sky-600 text-white"
                    : "rounded-bl-sm border border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-50"
                )}
              >
                <span className="sr-only">{m.role === "user" ? "You said: " : "Quack said: "}</span>
                <RichText text={m.text} />
              </div>
            )}
          </li>
        ))}
        {busy && (
          <li className="flex justify-start" data-testid="duck-busy">
            <div className="rounded-2xl rounded-bl-sm border border-dashed border-amber-300 px-3.5 py-2 text-sm text-muted-foreground">
              {busyLabel}
            </div>
          </li>
        )}
      </ol>

      <form onSubmit={submit} className="flex items-end gap-2 border-t p-3">
        <label htmlFor="chat-input" className="sr-only">
          Explain your bug to Quack
        </label>
        <textarea
          id="chat-input"
          data-testid="chat-input"
          value={draft}
          rows={2}
          disabled={disabled}
          placeholder={disabled ? "Session solved! Start a new one 🎉" : "Explain what your code does… (Enter to send, Shift+Enter for newline)"}
          onChange={(e) => {
            setDraft(e.target.value);
            onTyping?.(e.target.value.length > 0);
          }}
          onBlur={() => onTyping?.(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="min-h-10 flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
        />
        <VoiceButton
          disabled={disabled}
          onText={(text, final) => {
            setDraft(text);
            if (final && text) {
              onSend(text);
              setDraft("");
            }
          }}
          onListeningChange={(l) => onTyping?.(l)}
        />
        <button
          type="submit"
          data-testid="chat-send"
          disabled={busy || disabled || !draft.trim()}
          aria-label="Send message"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          <SendHorizonal className="size-5" aria-hidden />
        </button>
      </form>
    </div>
  );
}
