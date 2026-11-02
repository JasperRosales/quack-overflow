/** Tiny, safe markdown subset: `inline code` and *emphasis*. No HTML injection possible. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(`[^`\n]+`|\*[^*\n]+\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.length > 2 && p.startsWith("`") && p.endsWith("`"))
          return (
            <code key={i} className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/15">
              {p.slice(1, -1)}
            </code>
          );
        if (p.length > 2 && p.startsWith("*") && p.endsWith("*")) return <em key={i}>{p.slice(1, -1)}</em>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
