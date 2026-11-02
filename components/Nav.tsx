"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  const [open, setOpen] = useState(false);
  // Close the mobile menu whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const dot = connected && (
    <span className="ml-1.5 inline-block size-2 rounded-full bg-green-500" aria-label="(hardware duck connected)" />
  );

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
        <Link href="/" className="mr-2 flex items-center gap-2 font-heading text-lg font-bold sm:mr-4">
          <motion.span
            aria-hidden
            className="neu-sm flex size-9 items-center justify-center rounded-xl text-xl"
            whileHover={{ rotate: -12, scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
          >
            🦆
          </motion.span>
          <span>Quack Overflow</span>
        </Link>

        {/* desktop links */}
        <ul className="neu-inset-sm hidden items-center gap-1 rounded-2xl p-1 sm:flex">
          {LINKS.map((l) => {
            const active = pathname?.startsWith(l.href);
            return (
              <li key={l.href} className="relative">
                {active && (
                  <motion.span layoutId="nav-pill" className="neu-sm absolute inset-0 rounded-xl" aria-hidden />
                )}
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative z-10 block rounded-xl px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                    active && "text-foreground"
                  )}
                >
                  {l.label}
                  {l.href === "/duck" && dot}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="neu-press inline-flex size-9 items-center justify-center rounded-xl sm:hidden focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={open ? "x" : "menu"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </nav>

      {/* mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="overflow-hidden sm:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 36 }}
          >
            <motion.ul
              className="flex flex-col gap-3 px-4 pt-1 pb-5"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
            >
              {LINKS.map((l) => {
                const active = pathname?.startsWith(l.href);
                return (
                  <motion.li key={l.href} variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}>
                    <Link
                      href={l.href}
                      aria-current={active ? "page" : undefined}
                      className="neu-press flex items-center rounded-2xl px-4 py-3 font-medium"
                    >
                      {l.label}
                      {l.href === "/duck" && dot}
                    </Link>
                  </motion.li>
                );
              })}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
