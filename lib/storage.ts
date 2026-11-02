"use client";
import type { DebugSession } from "./types";

const KEYS = {
  sessions: "qo.sessions.v1",
  current: "qo.current.v1",
  settings: "qo.settings.v1",
  guard: "qo.guard.v1",
} as const;

export interface Settings {
  duckSpeaks: boolean;
  theme: "light" | "dark" | "system";
}

const DEFAULT_SETTINGS: Settings = { duckSpeaks: false, theme: "system" };

function read<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("qo-storage", { detail: key }));
  } catch {
    // Storage full or disabled (private mode) — the app keeps working in memory.
  }
}

export const storage = {
  /** Solved (journal) sessions, newest first. */
  getSessions(): DebugSession[] {
    const v = read<DebugSession[]>(KEYS.sessions, []);
    return Array.isArray(v) ? v : [];
  },
  saveSession(session: DebugSession): void {
    const all = storage.getSessions().filter((s) => s.id !== session.id);
    write(KEYS.sessions, [session, ...all]);
  },
  setSessions(sessions: DebugSession[]): void {
    write(KEYS.sessions, sessions);
  },
  clearSessions(): void {
    write(KEYS.sessions, []);
  },

  getCurrent(): DebugSession | null {
    return read<DebugSession | null>(KEYS.current, null);
  },
  setCurrent(session: DebugSession | null): void {
    write(KEYS.current, session);
  },

  getSettings(): Settings {
    return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEYS.settings, {}) };
  },
  setSettings(patch: Partial<Settings>): Settings {
    const next = { ...storage.getSettings(), ...patch };
    write(KEYS.settings, next);
    return next;
  },

  getGuardCatches(): number {
    return read<number>(KEYS.guard, 0);
  },
  addGuardCatches(n: number): void {
    if (n > 0) write(KEYS.guard, storage.getGuardCatches() + n);
  },
};
