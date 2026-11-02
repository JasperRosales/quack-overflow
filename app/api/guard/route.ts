import { GuardRequestSchema } from "@/lib/apiSchemas";
import { isMock, judgeLeak } from "@/lib/anthropic";
import { deterministicCheck } from "@/lib/leakGuard";
import { guardStats } from "@/lib/guardPipeline";
import { findSampleByCode } from "@/data/samples";

/** Internal: POST a draft reply → leak verdict (deterministic + optional LLM judge). */
export async function POST(request: Request) {
  const parsed = GuardRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { reply, code, hintLevel, runOutput, useJudge } = parsed.data;
  const det = deterministicCheck(reply, { code, hintLevel, runOutput, fixSnippets: findSampleByCode(code)?.fixSnippets });
  let judge: { leak: boolean; reason: string } | null = null;
  if (useJudge && !isMock() && !det.leak) {
    try {
      judge = await judgeLeak(code, hintLevel, reply);
    } catch {
      judge = null;
    }
  }
  return Response.json({
    leak: det.leak || Boolean(judge?.leak),
    deterministic: det,
    judge,
    stats: guardStats(),
  });
}
