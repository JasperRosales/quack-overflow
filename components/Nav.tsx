"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { useDuckLink } from "./DuckLink";

const LINKS = [
  { href: "/debug", label: "Debug" },
  { href: "/journal", label: "Journal" },
  { href: "/duck", label: "Duck" },
];

export function Nav() {
  const pathname = usePathname();
  const { connected } = useDuckLink();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
        <Link href="/" className="mr-4 flex items-center gap-2 font-heading text-lg font-bold">
          <span aria-hidden>🦆</span> Quack Overflow
        </Link>
        <ul className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = pathname?.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-muted",
                    active && "bg-muted text-foreground"
                  )}
                >
                  {l.label}
                  {l.href === "/duck" && connected && (
                    <span className="ml-1.5 inline-block size-2 rounded-full bg-green-500" aria-label="(hardware duck connected)" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
