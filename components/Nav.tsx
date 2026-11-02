"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { LogoMark } from "./Logo";

const LINKS = [
  { href: "/debug", label: "Debug" },
  { href: "/journal", label: "Journal" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Close the mobile menu whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
        <Link href="/" className="mr-2 flex items-center gap-2.5 text-[15px] font-semibold tracking-tight sm:mr-6">
          <motion.span whileHover={{ rotate: -8 }} className="flex">
            <LogoMark />
          </motion.span>
          <span>Quack Overflow</span>
        </Link>

        {/* desktop links */}
        <ul className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => {
            const active = pathname?.startsWith(l.href);
            return (
              <li key={l.href} className="relative">
                {active && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-md bg-muted" aria-hidden />
                )}
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative z-10 block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                    active && "text-foreground"
                  )}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground sm:hidden focus-visible:outline-2 focus-visible:outline-ring"
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
                {open ? <X className="size-[18px]" aria-hidden /> : <Menu className="size-[18px]" aria-hidden />}
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
              className="flex flex-col border-t px-2 py-2"
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
                      className="flex items-center rounded-md px-3 py-3 text-sm font-medium text-muted-foreground aria-[current=page]:bg-muted aria-[current=page]:text-foreground"
                    >
                      {l.label}
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
