"use client";

/**
 * A thin line at the top of the window while a page loads. The App Router has no "navigation started" event,
 * so it starts on any internal link click (or startProgress() before router.push) and finishes when the URL changes.
 */

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

const START = "rs:progress-start";

export function startProgress() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(START));
}

function Bar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timers = useRef<number[]>([]);
  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => {
    const begin = () => {
      clear();
      setState("loading");
      timers.current.push(window.setTimeout(() => setState("idle"), 15000));
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      begin();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener(START, begin);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(START, begin);
      clear();
    };
  }, []);

  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
    clear();
    timers.current.push(window.setTimeout(() => setState("idle"), 450));
  }, [pathname, params]);

  return <div className={`rs-progress is-${state}`} aria-hidden="true" />;
}

export default function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
