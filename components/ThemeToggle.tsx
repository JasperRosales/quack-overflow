"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { storage } from "@/lib/storage";

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the class set by the pre-paint script
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    applyTheme(next);
    storage.setSettings({ theme: next ? "dark" : "light" });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="neu-press inline-flex size-9 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}

/** Runs before paint to avoid a flash of the wrong theme. */
export const THEME_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem('qo.settings.v1')||'{}');var t=s.theme||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;
