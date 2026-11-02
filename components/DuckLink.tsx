"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { duckSerial, isSerialSupported, type DuckCommand } from "@/lib/duckSerial";

interface DuckLinkValue {
  supported: boolean;
  connected: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  send: (cmd: DuckCommand, opts?: { force?: boolean }) => void;
  /** Subscribe to messages from the hardware duck (e.g. BTN_HINT). */
  subscribe: (fn: (msg: string) => void) => () => void;
  lastMessage: string | null;
}

const Ctx = createContext<DuckLinkValue | null>(null);

export function DuckLinkProvider({ children }: { children: ReactNode }) {
  const [supported, setSupported] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection must run on the client
    setSupported(isSerialSupported());
    if (!duckSerial) return;
    const offStatus = duckSerial.onStatus(setConnected);
    const offMsg = duckSerial.onMessage(setLastMessage);
    return () => {
      offStatus();
      offMsg();
    };
  }, []);

  const connect = useCallback(() => duckSerial?.connect() ?? Promise.resolve(false), []);
  const disconnect = useCallback(() => duckSerial?.disconnect() ?? Promise.resolve(), []);
  const send = useCallback((cmd: DuckCommand, opts?: { force?: boolean }) => {
    void duckSerial?.send(cmd, opts);
  }, []);
  const subscribe = useCallback((fn: (msg: string) => void) => duckSerial?.onMessage(fn) ?? (() => {}), []);

  return (
    <Ctx.Provider value={{ supported, connected, connect, disconnect, send, subscribe, lastMessage }}>
      {children}
    </Ctx.Provider>
  );
}

export function useDuckLink(): DuckLinkValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDuckLink must be used inside DuckLinkProvider");
  return v;
}
