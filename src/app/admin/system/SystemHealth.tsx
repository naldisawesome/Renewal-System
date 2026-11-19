"use client";

import { useState } from "react";
import { RefreshIcon } from "@/components/icons";
import type { HealthCheck } from "@/lib/systemHealth";

const TONE: Record<HealthCheck["status"], { dot: string; badge: string; word: string }> = {
  ok: { dot: "bg-[#1d7465]", badge: "bg-[#e6f2ee] text-[#16685a] dark:bg-[#132a25] dark:text-[#8fd3c2]", word: "Working" },
  warn: { dot: "bg-[#b08a1f]", badge: "bg-[#f7f0de] text-[#80600f] dark:bg-[#2d2615] dark:text-[#e2c47c]", word: "Needs attention" },
  fail: { dot: "bg-[#a33a2c]", badge: "bg-[#f8e9e6] text-[#a33a2c] dark:bg-[#311c19] dark:text-[#eda499]", word: "Not working" },
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "medium", timeZone: "Pacific/Auckland" });

export default function SystemHealth({ initial, checkedAt }: { initial: HealthCheck[]; checkedAt: string }) {
  const [checks, setChecks] = useState(initial);
  const [checkedAtState, setCheckedAtState] = useState(checkedAt);
  const [loading, setLoading] = useState(false);
  const [bump, setBump] = useState(0); // re-key the list so rows replay their entrance animation on re-check

  const worst = checks.reduce<HealthCheck["status"]>((acc, c) => (c.status === "fail" ? "fail" : acc === "fail" ? acc : c.status === "warn" ? "warn" : acc), "ok");

  async function recheck() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/system-health", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setChecks(data.checks);
        setCheckedAtState(data.checkedAt);
        setBump((b) => b + 1);
      }
    } catch {
      // Leave the last known results showing - a failed re-check is itself informative but not worth a crash.
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="health-h" className="mb-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="health-h" className="section-title flex items-center gap-2">
          System health
          <span className={`badge badge-dot ${TONE[worst].badge}`}>{TONE[worst].word === "Working" ? "All good" : TONE[worst].word}</span>
        </h2>
        <button type="button" onClick={recheck} disabled={loading} className="btn-secondary h-8 px-3 text-[0.8125rem]">
          <RefreshIcon size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Checking…" : "Re-check now"}
        </button>
      </div>

      <ul key={bump} className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {checks.map((c, i) => {
          const label = (
            <span className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100">
              <span className="relative inline-flex h-2 w-2 shrink-0">
                <span className={`h-2 w-2 rounded-full ${TONE[c.status].dot} ${c.status === "ok" ? "rs-live-dot" : ""}`} />
                {c.status === "ok" && <span key={bump} className={`rs-ping absolute inset-0 text-[#1d7465]`} />}
              </span>
              {c.label}
            </span>
          );
          const right = (
            <span className="flex items-center gap-3">
              <span className="text-[0.8125rem] text-slate-500">{c.detail}</span>
              <span className={`badge badge-dot ${TONE[c.status].badge}`}>{c.status === "ok" ? "Working" : c.status === "warn" ? "Needs attention" : "Not working"}</span>
            </span>
          );
          return (
            <li key={c.id} className="rs-enter text-[0.875rem]" style={{ animationDelay: `${i * 35}ms` }}>
              {c.parts?.length ? (
                // An accordion: opens by itself when one of its parts isn't working.
                <details className="group" open={c.status === "fail" || undefined}>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 py-2.5 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      {label}
                      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-180">
                        <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-[0.75rem] text-slate-500 group-open:hidden">Show each part</span>
                    </span>
                    {right}
                  </summary>
                  <ul className="mb-3 ml-[18px] grid gap-x-8 rounded-lg border border-slate-200 px-4 py-1 dark:border-slate-800 sm:grid-cols-2">
                    {c.parts.map((p) => (
                      <li key={p.label} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-[0.8125rem] last:border-0 dark:border-slate-800 sm:[&:nth-last-child(2):nth-child(odd)]:border-0">
                        <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE[p.status].dot}`} />
                          {p.label}
                        </span>
                        <span className={p.status === "fail" ? "text-[color:var(--late)]" : p.status === "warn" ? "text-[color:var(--soon)]" : "text-slate-500"}>{p.detail}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  {label}
                  {right}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[0.8125rem] text-slate-500">
        These run for real each time - a query, a workbook round trip, a check of when the daily job last ran - rather than just checking whether a setting is present. Last checked {when(checkedAtState)}.
      </p>
    </section>
  );
}
