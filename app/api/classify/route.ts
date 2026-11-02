import { ClassifyRequestSchema } from "@/lib/apiSchemas";
import { classifySession, isMock } from "@/lib/anthropic";
import { mockClassify } from "@/lib/mockDuck";

/** POST a solved session → { category, lessonLearned }. */
export async function POST(request: Request) {
  const parsed = ClassifyRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { code, language, sampleId, messages } = parsed.data;
  if (isMock()) return Response.json(mockClassify(code, sampleId));
  const transcript = messages
    .slice(-30)
    .map((m) => `${m.role === "duck" ? "Quack" : m.role === "user" ? "Learner" : "Program output"}: ${m.text}`)
    .join("\n");
  try {
    return Response.json(await classifySession(code, language, transcript));
  } catch (err) {
    console.error("[api/classify]", err);
    // Fall back to the sample's known category, or "other".
    return Response.json(mockClassify(code, sampleId));
  }
}
