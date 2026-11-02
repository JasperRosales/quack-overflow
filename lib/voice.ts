"use client";
import { CONFIG } from "./config";

/* Minimal typings for the Web Speech API (not in lib.dom for all TS versions). */
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
export interface Recognizer {
  start(): void;
  stop(): void;
  abort(): void;
}
interface RecognitionCtor {
  new (): Recognizer & {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult: ((e: SpeechRecognitionEventLike) => void) | null;
    onerror: ((e: { error: string }) => void) | null;
    onend: (() => void) | null;
  };
}

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const isRecognitionSupported = () => getCtor() !== null;
export const isSynthesisSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** Speech-to-text. `onText(text, final)` fires with interim and final transcripts. */
export function createRecognizer(handlers: {
  onText: (text: string, final: boolean) => void;
  onEnd: () => void;
  onError?: (err: string) => void;
}): Recognizer | null {
  const Ctor = getCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = (e) => {
    let text = "";
    let final = false;
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      if (e.results[i].isFinal) final = true;
    }
    handlers.onText(text.trim(), final);
  };
  rec.onerror = (e) => handlers.onError?.(e.error);
  rec.onend = handlers.onEnd;
  return rec;
}

/** Make text speakable: drop emoji, markdown backticks and the hint-ladder prefix. */
export function speakable(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " (code) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(?:🪜\s*)?Hint (\d):/g, "Hint $1.")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Text-to-speech with a higher-pitched "duck" voice. */
export function speak(text: string): void {
  if (!isSynthesisSupported()) return;
  const u = new SpeechSynthesisUtterance(speakable(text));
  u.pitch = CONFIG.duckVoicePitch;
  u.rate = CONFIG.duckVoiceRate;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (isSynthesisSupported()) window.speechSynthesis.cancel();
}
