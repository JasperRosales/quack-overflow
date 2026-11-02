# Progress

| Phase | Status | Notes |
|---|---|---|
| 1 — Scaffold | ✅ Done | Next.js 16 (App Router, Turbopack) + TS + Tailwind v4 + shadcn/ui, Monaco, Framer Motion, zod, uuid, Recharts, Anthropic SDK, Vitest. Types, storage wrapper, nav, dark-mode toggle, animated `Duck.tsx` with 6 states. Dev toggle on `/duck` cycles states. |
| 2 — Samples & mock mode | ✅ Done | 6 sample buggy programs (`data/samples/`), scripted MOCK_AI conversations for all 6 (full arcs for samples 1 & 4), mock engine `lib/mockDuck.ts` + tests. The deterministic leak guard was pulled forward so tests can prove mock scripts never leak. End-to-end mock demo verified in the UI in Phase 4. |
