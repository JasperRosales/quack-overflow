/** Keep only the learner's frames from a Pyodide traceback (drop Pyodide/stdlib internals). */
export function cleanTraceback(msg: string): string {
  const lines = msg.split("\n");
  const firstUserFrame = lines.findIndex((l) => /^\s+File "main\.py"/.test(l));
  const body = firstUserFrame >= 0 ? lines.slice(firstUserFrame) : lines;
  const header = firstUserFrame >= 0 && /^Traceback/.test(lines[0]) ? [lines[0]] : [];
  const out: string[] = [];
  let skipCode = false;
  for (const line of body) {
    if (skipCode) {
      skipCode = false;
      if (/^\s{4}\S/.test(line)) continue;
    }
    if (/^\s+File "(\/lib\/|<frozen)/.test(line)) {
      skipCode = true;
      continue;
    }
    if (/^\s+[~^]+\s*$/.test(line) || /^\s+\.\.\.<\d+ lines?>\.\.\.\s*$/.test(line)) continue;
    out.push(line);
  }
  return [...header, ...out].join("\n").trim() + "\n";
}
