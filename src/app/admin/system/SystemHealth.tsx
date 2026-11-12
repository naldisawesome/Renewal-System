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
        {checks.map((c, i) => (
          <li
            key={c.id}
            className="rs-enter flex flex-wrap items-center justify-between gap-3 py-2.5 text-[0.875rem]"
            style={{ animationDelay: `${i * 35}ms` }}
          >
            <span className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100">
              <span className="relative inline-flex h-2 w-2 shrink-0">
                <span className={`h-2 w-2 rounded-full ${TONE[c.status].dot} ${c.status === "ok" ? "rs-live-dot" : ""}`} />
                {c.status === "ok" && <span key={bump} className={`rs-ping absolute inset-0 text-[#1d7465]`} />}
              </span>
              {c.label}
            </span>
            <span className="flex items-center gap-3">
              <span className="text-[0.8125rem] text-slate-500">{c.detail}</span>
              <span className={`badge badge-dot ${TONE[c.status].badge}`}>{c.status === "ok" ? "Working" : c.status === "warn" ? "Needs attention" : "Not working"}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[0.8125rem] text-slate-500">
        These run for real each time - a query, a workbook round trip, a check of when the daily job last ran - rather than just checking whether a setting is present. Last checked {when(checkedAtState)}.
      </p>
    </section>
  );
}
