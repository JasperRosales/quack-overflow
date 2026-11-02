"use client";
import { CONFIG } from "./config";
import type { DuckState } from "./types";

export type DuckCommand = "QUACK" | "THINK" | "CURIOUS" | "PARTY" | "SLEEP" | "IDLE";
export type DuckMessage = "BTN_HINT" | "READY" | string;

export const DUCK_COMMANDS: DuckCommand[] = ["IDLE", "THINK", "CURIOUS", "QUACK", "PARTY", "SLEEP"];

/** Map the on-screen duck's mood to a hardware command. */
export function commandForState(state: DuckState): DuckCommand {
  switch (state) {
    case "thinking":
      return "THINK";
    case "curious":
      return "CURIOUS";
    case "celebrating":
      return "PARTY";
    case "sleepy":
      return "SLEEP";
    case "listening":
    case "idle":
    default:
      return "IDLE";
  }
}

export function isSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

type Listener = (msg: DuckMessage) => void;
type StatusListener = (connected: boolean) => void;

/**
 * Thin wrapper around the Web Serial API for the hardware duck.
 * Protocol: 115200 baud, newline-terminated ASCII commands.
 */
export class DuckSerial {
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private encoder = new TextEncoder();
  private lastCommand: DuckCommand | null = null;

  get connected(): boolean {
    return this.port !== null && this.writer !== null;
  }

  onMessage(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onStatus(fn: StatusListener): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  private emitStatus() {
    for (const fn of this.statusListeners) fn(this.connected);
  }

  /** Must be called from a user gesture (button click). */
  async connect(): Promise<boolean> {
    if (!isSerialSupported()) return false;
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: CONFIG.serialBaudRate });
      this.port = port;
      this.writer = port.writable!.getWriter();
      this.emitStatus();
      void this.readLoop();
      port.addEventListener("disconnect", () => void this.disconnect());
      await this.send("QUACK");
      return true;
    } catch (err) {
      console.warn("[duckSerial] connect failed", err);
      await this.disconnect();
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.reader?.cancel();
    } catch {}
    try {
      this.reader?.releaseLock();
    } catch {}
    try {
      this.writer?.releaseLock();
    } catch {}
    try {
      await this.port?.close();
    } catch {}
    this.reader = null;
    this.writer = null;
    this.port = null;
    this.lastCommand = null;
    this.emitStatus();
  }

  /** Send a command. Silently no-ops when no duck is connected. */
  async send(cmd: DuckCommand, { force = false } = {}): Promise<void> {
    if (!this.writer) return;
    if (!force && cmd === this.lastCommand && cmd !== "QUACK") return;
    this.lastCommand = cmd;
    try {
      await this.writer.write(this.encoder.encode(cmd + "\n"));
    } catch (err) {
      console.warn("[duckSerial] write failed", err);
      await this.disconnect();
    }
  }

  private async readLoop() {
    if (!this.port?.readable) return;
    const decoder = new TextDecoder();
    let buffer = "";
    this.reader = this.port.readable.getReader();
    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (line) for (const fn of this.listeners) fn(line);
        }
      }
    } catch {
      // port closed / unplugged
    }
  }
}

/** One duck per browser tab, shared across pages. */
export const duckSerial = typeof window !== "undefined" ? new DuckSerial() : (null as unknown as DuckSerial);
