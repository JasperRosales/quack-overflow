/** Wordmark glyph: a minimal duck silhouette in the brand amber. */
export function LogoMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" className="fill-foreground" />
      <path
        d="M14.2 6.2a3.3 3.3 0 0 0-3.2 4.1c-.9-.5-2.2-.8-3.7-.5-.5.1-.6.7-.3 1 .8.9 1 2.3 1.3 3.4.6 2 2.4 3.3 4.7 3.3h.6a4.4 4.4 0 0 0 4.4-4.4c0-1-.3-1.9-.9-2.6l.2-.2h1.6c.4 0 .6-.4.4-.7a3.2 3.2 0 0 0-1.5-1.3A3.3 3.3 0 0 0 14.2 6.2Z"
        fill="var(--brand)"
      />
      <circle cx="14.6" cy="8.9" r="0.8" className="fill-foreground" />
    </svg>
  );
}
