"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";
export type TextSize = "normal" | "large" | "xlarge";
const SIZE_PERCENT: Record<TextSize, string> = { normal: "", large: "112.5%", xlarge: "125%" };

type ThemeContextValue = {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
  reduceMotion: boolean;
  setReduceMotion: (value: boolean) => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_KEY = "rs-theme";
const MOTION_KEY = "rs-reduce-motion";
const SIZE_KEY = "rs-text-size";

// Storage can be blocked (private windows, strict settings): reading or writing then quietly does nothing.
function readStore(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStore(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function getSystemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
}

function applyMotion(reduceMotion: boolean) {
  document.documentElement.classList.toggle("reduce-motion", reduceMotion);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [textSize, setTextSizeState] = useState<TextSize>("normal");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Read persisted preferences on mount. The inline script in the root
  // layout already applied the correct class before paint, so this just
  // syncs React state up to match - no flash of the wrong theme.
  useEffect(() => {
    const storedTheme = (readStore(THEME_KEY) as ThemeMode | null) || "system";
    const storedMotion = readStore(MOTION_KEY) === "true";
    const storedSize = readStore(SIZE_KEY);
    if (storedSize === "large" || storedSize === "xlarge") setTextSizeState(storedSize);
    setThemeState(storedTheme);
    setReduceMotionState(storedMotion);
    setResolvedTheme(storedTheme === "system" ? (getSystemPrefersDark() ? "dark" : "light") : storedTheme);
  }, []);

  // Track the OS setting live while "system" is selected.
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    function handleChange(e: MediaQueryListEvent) {
      const next = e.matches ? "dark" : "light";
      setResolvedTheme(next);
      applyTheme(next);
    }
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [theme]);

  function setTheme(next: ThemeMode) {
    setThemeState(next);
    writeStore(THEME_KEY, next);
    const resolved = next === "system" ? (getSystemPrefersDark() ? "dark" : "light") : next;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }

  function setReduceMotion(value: boolean) {
    setReduceMotionState(value);
    writeStore(MOTION_KEY, String(value));
    applyMotion(value);
  }

  function setTextSize(size: TextSize) {
    setTextSizeState(size);
    try { localStorage.setItem(SIZE_KEY, size); } catch {}
    document.documentElement.style.fontSize = SIZE_PERCENT[size];
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, reduceMotion, setReduceMotion, textSize, setTextSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
