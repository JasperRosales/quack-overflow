import { expect, it } from "vitest";
import { cleanTraceback } from "@/lib/runners/traceback";

it("keeps the learner's frames and the error line", () => {
  const raw = `Traceback (most recent call last):
  File "/lib/python314.zip/_pyodide/_base.py", line 597, in eval_code_async
    await CodeRunner(
  File "/lib/python314.zip/_pyodide/_base.py", line 411, in run_async
    coroutine = eval(self.code, globals, locals)
  File "main.py", line 2, in <module>
    if age >= 18:
       ^^^^^^^^^
TypeError: '>=' not supported between instances of 'str' and 'int'`;
  const clean = cleanTraceback(raw);
  expect(clean).toContain('File "main.py", line 2');
  expect(clean).toContain("TypeError");
  expect(clean).not.toContain("_pyodide");
  expect(clean).not.toContain("^^^");
});

it("drops Python 3.14 elided-frame markers", () => {
  const raw = `Traceback (most recent call last):
  File "/lib/python314.zip/_pyodide/_base.py", line 597, in eval_code_async
    await CodeRunner(
    ...<10 lines>...
    .run_async(globals, locals)
  File "main.py", line 2, in <module>
    if age >= 18:
TypeError: boom`;
  expect(cleanTraceback(raw)).toBe(`Traceback (most recent call last):\n  File "main.py", line 2, in <module>\n    if age >= 18:\nTypeError: boom\n`);
});
