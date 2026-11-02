"use client";

import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createRecognizer, isRecognitionSupported, type Recognizer } from "@/lib/voice";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  onText: (text: string, final: boolean) => void;
  onListeningChange?: (listening: boolean) => void;
  disabled?: boolean;
}

/** Push to talk: speech-to-text via the Web Speech API (Chrome/Edge). */
export function VoiceButton({ onText, onListeningChange, disabled }: VoiceButtonProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognizer | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection must run on the client
  useEffect(() => setSupported(isRecognitionSupported()), []);
  useEffect(() => onListeningChange?.(listening), [listening, onListeningChange]);
  useEffect(() => () => recRef.current?.abort(), []);

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    setError(null);
    const rec = createRecognizer({
      onText,
      onEnd: () => setListening(false),
      onError: (e) => {
        setError(e === "not-allowed" ? "Microphone permission denied" : `Voice error: ${e}`);
        setListening(false);
      },
    });
    if (!rec) return;
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-pressed={listening}
      aria-label={listening ? "Stop listening" : "Talk to the duck"}
      title={error ?? (listening ? "Listening… click to stop" : "Talk to the duck")}
      className={cn(
        "neu-press inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-background",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50",
        listening && "animate-pulse bg-red-500 text-white",
        error && "text-red-600"
      )}
    >
      {listening ? <MicOff className="size-5" aria-hidden /> : <Mic className="size-5" aria-hidden />}
    </button>
  );
}
