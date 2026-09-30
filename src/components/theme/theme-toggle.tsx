"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "system" | "light" | "dark";

const EVENT = "100dials:themechange";

function readTheme(): Theme {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);

  // Follow OS changes while on "system".
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readTheme() === "system") apply("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function choose(next: Theme) {
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {}
    apply(next);
    window.dispatchEvent(new Event(EVENT));
  }

  const options: { id: Theme; icon: typeof Sun; label: string }[] = [
    { id: "light", icon: Sun, label: "Light" },
    { id: "system", icon: Monitor, label: "System" },
    { id: "dark", icon: Moon, label: "Dark" },
  ];

  return (
    <div className={cn("bg-muted inline-flex rounded-md p-0.5", className)} role="radiogroup" aria-label="Theme">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={theme === o.id}
          title={o.label}
          onClick={() => choose(o.id)}
          className={cn(
            "grid size-7 cursor-pointer place-items-center rounded-[5px] transition-colors",
            theme === o.id ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <o.icon className="size-3.5" />
          <span className="sr-only">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
