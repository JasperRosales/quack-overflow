"use client";

import { AnimatePresence, motion } from "framer-motion";
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
        className="relative flex min-h-[200px] flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto overscroll-contain p-3 sm:p-4"
        aria-label="Conversation with Quack"
        aria-live="polite"
        aria-relevant="additions"
        data-testid="chat-log"
      >
        {messages.length === 0 && !busy && (
          <li className="m-auto max-w-xs text-center text-sm text-muted-foreground">
            Paste your code, describe what it should do, then hit <strong className="font-medium text-foreground">Run</strong> or start explaining.
          </li>
        )}
        <AnimatePresence initial={false}>
        {messages.map((m) => (
          <motion.li
            key={m.id}
            layout="position"
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            style={{ originX: m.role === "user" ? 1 : 0 }}
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
                  "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap sm:max-w-[80%]",
                  m.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "well rounded-bl-md text-foreground"
                )}
              >
                <span className="sr-only">{m.role === "user" ? "You said: " : "Quack said: "}</span>
                <RichText text={m.text} />
              </div>
            )}
          </motion.li>
        ))}
        {busy && (
          <motion.li
            key="busy"
            className="flex justify-start"
            data-testid="duck-busy"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md px-1 py-2 text-sm text-muted-foreground">
              <span className="flex gap-1" aria-hidden>
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="size-1.5 rounded-full bg-muted-foreground"
                    animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
                  />
                ))}
              </span>
              {busyLabel}
            </div>
          </motion.li>
        )}
        </AnimatePresence>
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
          placeholder={disabled ? "Session solved. Start a new one to keep going." : "Explain what your code does…"}
          title="Enter to send, Shift+Enter for a new line"
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
          className="field min-h-10 min-w-0 flex-1 resize-none rounded-lg px-3 py-2 text-sm disabled:opacity-60"
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
        <motion.button
          whileTap={{ scale: 0.9 }}
          type="submit"
          data-testid="chat-send"
          disabled={busy || disabled || !draft.trim()}
          aria-label="Send message"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40"
        >
          <SendHorizonal className="size-[18px]" aria-hidden />
        </motion.button>
      </form>
    </div>
  );
}
