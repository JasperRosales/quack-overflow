import { z } from "zod";
import { CONFIG } from "./config";

export const LanguageSchema = z.enum(["python", "javascript"]);
export const HintLevelSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

export const DuckRequestSchema = z.object({
  code: z.string().max(CONFIG.maxCodeChars),
  language: LanguageSchema,
  expectedBehavior: z.string().max(2000).default(""),
  lastRunOutput: z.string().max(50000).optional(),
  hintLevel: HintLevelSchema.default(0),
  messages: z
    .array(z.object({ role: z.enum(["user", "duck", "system-run"]), text: z.string().max(10000) }))
    .max(500)
    .default([]),
  trigger: z.enum(["start", "message", "run", "hint"]),
  sampleId: z.string().max(100).optional(),
});

export const GuardRequestSchema = z.object({
  reply: z.string().max(10000),
  code: z.string().max(CONFIG.maxCodeChars),
  hintLevel: HintLevelSchema.default(0),
  runOutput: z.string().max(50000).optional(),
  useJudge: z.boolean().default(true),
});

export const ClassifyRequestSchema = z.object({
  code: z.string().max(CONFIG.maxCodeChars),
  language: LanguageSchema,
  sampleId: z.string().max(100).optional(),
  messages: z.array(z.object({ role: z.enum(["user", "duck", "system-run"]), text: z.string().max(10000) })).max(500),
});
