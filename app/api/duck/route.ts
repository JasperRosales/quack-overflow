import { DuckRequestSchema } from "@/lib/apiSchemas";
import { RefusalError, generateDuckReply, isMock, judgeLeak } from "@/lib/anthropic";
import { guardedReply } from "@/lib/guardPipeline";
import { pickFallback } from "@/lib/leakGuard";
import { mockDuckReply, scriptFor } from "@/lib/mockDuck";
import type { DuckRequest, DuckStreamEvent } from "@/lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * POST a conversation → streams NDJSON events: status updates while the duck thinks
 * and the leak guard checks, then the final (guarded) reply. Raw model tokens are never
 * streamed to the client, because the guard must see the whole reply before anyone does.
 */
export async function POST(request: Request) {
  const parsed = DuckRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }
  const req = parsed.data as DuckRequest;
  const mock = isMock();
  const { sample } = scriptFor(req);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (e: DuckStreamEvent) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      try {
        send({ type: "status", stage: "thinking" });
        const result = await guardedReply(
          { code: req.code, hintLevel: req.hintLevel, runOutput: req.lastRunOutput, fixSnippets: sample?.fixSnippets },
          {
            generate: async (leakReason) => {
              if (mock) {
                await sleep(500 + Math.random() * 400);
                return mockDuckReply(req);
              }
              return generateDuckReply(req, leakReason);
            },
            judge: mock ? null : (draft) => judgeLeak(req.code, req.hintLevel, draft),
            onStage: (stage) => send({ type: "status", stage }),
          }
        );
        send({ type: "reply", reply: result.reply, guardCatches: result.guardCatches, usedFallback: result.usedFallback, mock });
      } catch (err) {
        if (err instanceof RefusalError) {
          send({
            type: "reply",
            reply: { reply: pickFallback(Date.now()), solved_signal: false, duck_mood: "curious" },
            guardCatches: 0,
            usedFallback: true,
            mock,
          });
        } else {
          console.error("[api/duck]", err);
          send({ type: "error", message: "Quack got its feathers tangled talking to the AI. Try again in a moment." });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
