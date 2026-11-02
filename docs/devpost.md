# Quack Overflow — Devpost draft

**Tagline:** The AI rubber duck that refuses to give you the answer. 🦆

## Inspiration

We've all done it: paste an error into an AI chatbot, copy the fix, move on. It works, but nothing is learned, and the same off-by-one bug bites again next week. Programmers have long known a better trick: **rubber duck debugging**. Explain your code, line by line, to a rubber duck, and somewhere in the middle you hear yourself say the bug out loud. The only problem is that a real duck can't ask "…and what value does `i` have on the last loop?"

So we built a duck that can, and that is stubbornly, delightfully unwilling to just tell you.

## What it does

Paste your Python or JavaScript, say what it *should* do, and talk to **Quack** by typing or by voice. Quack only asks Socratic questions that make you predict, trace and compare until you find the bug yourself.

- **Run your code in the browser.** Python (Pyodide) and JavaScript run in sandboxed Web Workers. The output appears in the chat, and Quack asks you to interpret it.
- **Hint ladder.** Truly stuck? Climb 4 levels: a nudge, then the bug's concept, then a highlighted line in the editor, then *why* that line is wrong. Each step asks "Are you sure? Try one more think first 🦆". Even at the top, never the fix.
- **Leak guard.** Every reply is checked before you see it, so the answer can't slip out, not even when you beg, threaten to fail your class, or ask Quack to "pretend it's not a duck".
- **Celebration + bug journal.** Find it and Quack throws a party (confetti and a happy duck). The session is classified (off-by-one, wrong type, async/await, …) with a one-line lesson, and the journal shows your patterns: *"You've had 3 off-by-one errors this week 👀"*.
- **Voice mode.** Talk to the duck like a real rubber duck; it answers in a squeaky voice.
- **Optional hardware duck.** An ESP32 inside a real rubber duck lights up and quacks along with Quack's mood over USB (Web Serial). Its button means "I'm stuck", which climbs the hint ladder.

## How we built it

- **Next.js 16 + TypeScript + Tailwind + shadcn/ui.** UI and API routes in one app.
- **Gemini 3.6 Flash** plays Quack, with a persona prompt and **structured JSON output** (`reply`, `highlight_lines`, `solved_signal`, `duck_mood`) validated with zod. **Gemini 3.5 Flash-Lite** acts as the fast leak judge and as the bug classifier.
- **Monaco Editor** with line decorations for hint level 3.
- **Pyodide** in a module Web Worker and a JS Web Worker with console capture, Node-style value formatting (`Promise { <pending> }`), stdin, and a 5-second kill switch.
- **Framer Motion** SVG duck with six moods (idle, listening, thinking, curious, celebrating, sleepy), all respecting reduced motion.
- **Recharts** for the journal and localStorage for storage (no accounts).
- **Web Speech API** for voice in and out, **Web Serial** for the hardware duck, **Arduino on ESP32** for the firmware (non-blocking LED animations plus a synthesized quack on a buzzer or I2S amp).
- **Vitest + Playwright** for unit tests, an end-to-end smoke test, a red-team script and screenshot automation.
- A full **MOCK_AI** mode with scripted conversations, so the demo can never be ruined by Wi-Fi.

## Challenges we ran into

- **The leak guard.** LLMs *love* to be helpful, and a model told "never give the fix" will still sometimes write "try `i < scores.length`". We layered defenses:
  1. *Deterministic checks.* Any code in the reply must be a verbatim quote of the learner's code. Then a **Smith–Waterman token alignment** compares every reply line with every code line to catch "fixed copies": text that's almost one of your lines but not quite, like `range(len(nums))` vs `range(1, len(nums))`. This catches leaks even without backticks.
  2. An **LLM judge** that fails closed.
  3. **Regenerate once** with the reason, then fall back to a safe question.
  The hard part was false positives: quoting `undefined`, `nums[0]` or a fragment of the user's own line must stay legal. We built 22 fixture replies (leaks and non-leaks) and tuned until all of them pass.
- **Streaming vs. guarding.** You can't stream tokens to the user *and* guard the full reply. We stream *progress* instead ("Quack is thinking…", "Making sure I don't spoil the answer…", "Oops, almost gave it away! Rephrasing…") and only send the reply once it's verified.
- **Pyodide in a worker.** Our bundler wraps module workers in a classic-worker bootstrap, and Pyodide refuses to load in classic workers. We serve the Python worker as a plain ES module instead. Infinite loops are handled by terminating the worker after 5 s, and Python 3.14 tracebacks are cleaned up to show only the learner's frames.
- **Web Serial.** Keeping one serial connection alive across page navigation (a React context around a singleton), mapping six on-screen moods to LED and sound states, and making sure everything degrades gracefully when no duck is plugged in or the browser doesn't support Web Serial.

## Accomplishments that we're proud of

- A tutor that is genuinely **Socratic**: it asks, it never tells.
- A leak guard that catches "fixed" lines even when they aren't formatted as code.
- Everything runs client-side except the AI calls: code execution, stats and storage.
- Lighthouse accessibility **100** on every page, plus dark mode and reduced-motion support.
- A rubber duck that quacks when you solve your bug. Need we say more?

## What we learned

- Prompting alone isn't a safety mechanism. Deterministic checks plus a judge plus a fallback is.
- Small UX choices (a confirm step on hints, a celebration when you solve it) change how people *feel* about being stuck.
- Browsers can do a lot now: run Python, talk, listen, and talk to a microcontroller over USB.

## What's next for Quack Overflow

- A VS Code extension, so the duck lives in your editor.
- A classroom mode where teachers see anonymized class-wide bug patterns.
- More languages (Java, C++), using server-side sandboxed execution.
- Duck personalities: Pirate Duck, Professor Duck, Gen-Z Duck.
- A Wi-Fi duck (no USB cable) and a cheaper 3D-printed duck kit.

## Built with

`nextjs` `react` `typescript` `tailwindcss` `shadcn-ui` `gemini` `google-genai` `monaco-editor` `pyodide` `web-workers` `framer-motion` `recharts` `zod` `web-speech-api` `web-serial-api` `esp32` `arduino` `c++` `vitest` `playwright` `vercel`
