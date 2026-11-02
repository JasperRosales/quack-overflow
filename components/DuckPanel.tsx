"use client";

import { useEffect, useState } from "react";
import { Usb, Unplug } from "lucide-react";
import { DUCK_COMMANDS, commandForState, type DuckCommand } from "@/lib/duckSerial";
import type { DuckState } from "@/lib/types";
import { useDuckLink } from "./DuckLink";
import { DuckStatePreview } from "./DuckStatePreview";
import { Button } from "./ui/button";

const DESCRIPTIONS: Record<DuckCommand, string> = {
  IDLE: "Soft yellow breathing",
  THINK: "Spinning blue",
  CURIOUS: "Blinking yellow + short “quack?”",
  QUACK: "Flash + quack",
  PARTY: "Rainbow chase for 3 s + triple quack",
  SLEEP: "Dim glow",
};

/** Hardware duck setup + test panel. */
export function DuckPanel() {
  const link = useDuckLink();
  const [log, setLog] = useState<{ t: string; dir: "→" | "←"; msg: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [syncPreview, setSyncPreview] = useState(true);

  const push = (dir: "→" | "←", msg: string) =>
    setLog((l) => [{ t: new Date().toLocaleTimeString(), dir, msg }, ...l].slice(0, 50));

  useEffect(() => link.subscribe((m) => push("←", m)), [link]);

  const send = (cmd: DuckCommand) => {
    link.send(cmd, { force: true });
    push("→", cmd);
  };

  const onPreview = (s: DuckState) => {
    if (syncPreview && link.connected) send(commandForState(s));
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Hardware duck 🦆</h1>
        <p className="text-sm text-muted-foreground">
          Optional: an ESP32 rubber duck with LEDs and a speaker that mirrors Quack&apos;s mood. Plug it in over USB and connect. Everything
          works without it. See <code className="rounded bg-muted px-1">hardware/wiring.md</code> for parts and wiring.
        </p>
      </div>

      <section aria-labelledby="conn-title" className="rounded-xl border bg-card p-4">
        <h2 id="conn-title" className="mb-3 font-semibold">
          Connection
        </h2>
        {!link.supported ? (
          <p role="status" className="rounded-lg bg-muted p-3 text-sm">
            Web Serial isn&apos;t available in this browser. Use desktop <strong>Chrome</strong> or <strong>Edge</strong> to connect a hardware duck.
            The on-screen duck works everywhere.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 text-sm" role="status" data-testid="duck-conn-status">
              <span className={`size-2.5 rounded-full ${link.connected ? "bg-green-500" : "bg-zinc-400"}`} aria-hidden />
              {link.connected ? "Duck connected" : "No duck connected"}
            </span>
            {link.connected ? (
              <Button variant="outline" onClick={() => void link.disconnect()}>
                <Unplug aria-hidden /> Disconnect
              </Button>
            ) : (
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const ok = await link.connect();
                  push("→", ok ? "connected" : "connection cancelled / failed");
                  setBusy(false);
                }}
              >
                <Usb aria-hidden /> Connect duck 🦆
              </Button>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="test-title" className="rounded-xl border bg-card p-4">
          <h2 id="test-title" className="mb-3 font-semibold">
            Test commands
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {DUCK_COMMANDS.map((c) => (
              <li key={c}>
                <Button
                  variant="outline"
                  className="h-auto w-full flex-col items-start gap-0.5 py-2 text-left"
                  disabled={!link.connected}
                  onClick={() => send(c)}
                  data-testid={`cmd-${c}`}
                >
                  <span className="font-mono font-semibold">{c}</span>
                  <span className="text-xs font-normal whitespace-normal text-muted-foreground">{DESCRIPTIONS[c]}</span>
                </Button>
              </li>
            ))}
          </ul>
          <h3 className="mt-5 mb-2 text-sm font-semibold">Serial log</h3>
          <ol className="h-40 overflow-y-auto rounded-lg bg-zinc-950 p-2 font-mono text-xs text-zinc-100" aria-label="Serial log" aria-live="polite">
            {log.length === 0 && <li className="text-zinc-400">Nothing yet. Press the duck&apos;s button to see BTN_HINT.</li>}
            {log.map((l, i) => (
              <li key={i}>
                <span className="text-zinc-400">{l.t}</span> {l.dir} {l.msg}
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="preview-title" className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="preview-title" className="font-semibold">
              On-screen duck states
            </h2>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={syncPreview} onChange={(e) => setSyncPreview(e.target.checked)} />
              Mirror to hardware
            </label>
          </div>
          <DuckStatePreview onChange={onPreview} />
        </section>
      </div>
    </div>
  );
}
