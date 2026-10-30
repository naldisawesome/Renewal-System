"use client";

import { useEffect } from "react";

const sent = new Set<string>();

/** Sends a short report to the server when something breaks in the browser. */
export function reportProblem(message: string, detail?: string, digest?: string) {
  try {
    const key = `${message}|${location.pathname}`;
    if (sent.has(key) || sent.size > 20) return;
    sent.add(key);
    const body = JSON.stringify({ message: message.slice(0, 2000), detail: detail?.slice(0, 8000), url: location.href.slice(0, 500), digest });
    fetch("/api/problems", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    // ignore
  }
}

export default function ProblemReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // Only this app's own scripts; browser extensions and noise are ignored.
      if (e.filename && !e.filename.startsWith(location.origin)) return;
      if (/ResizeObserver loop/.test(e.message)) return;
      reportProblem(e.message || "Script error", e.error?.stack);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      const message = r instanceof Error ? r.message : typeof r === "string" ? r : "Unhandled promise rejection";
      if (/Failed to fetch|NetworkError|Load failed|AbortError/i.test(message)) return; // connection drops, not bugs
      reportProblem(message, r instanceof Error ? r.stack : undefined);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
