"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startProgress } from "./NavProgress";

export default function DashboardFilters({
  basePath,
  monthOptions,
  advisers,
  current,
}: {
  basePath: string;
  monthOptions: { key: string; label: string }[];
  advisers?: { id: string; name: string }[];
  current: { [key: string]: string | undefined };
}) {
  const router = useRouter();
  const [from, setFrom] = useState(current.from || "");
  const [to, setTo] = useState(current.to || "");

  function update(params: Record<string, string | undefined>) {
    const usp = new URLSearchParams();
    const merged = { ...current, ...params };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) usp.set(k, v);
    });
    startProgress();
    router.push(`${basePath}?${usp.toString()}`);
  }

  function selectMonth(month: string) {
    // A month quick-pick and a custom date range are mutually exclusive.
    setFrom("");
    setTo("");
    update({ month: month || undefined, from: undefined, to: undefined });
  }

  function applyRange() {
    update({ from: from || undefined, to: to || undefined, month: undefined });
  }

  function clearAll() {
    setFrom("");
    setTo("");
    startProgress();
    router.push(basePath);
  }

  const hasFilters = !!(current.month || current.from || current.to || current.adviserId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Month" className="input-sm w-auto min-w-[9rem]" value={current.month || ""} onChange={(e) => selectMonth(e.target.value)}>
        <option value="">All months</option>
        {monthOptions.map((m) => (
          <option key={m.key} value={m.key}>
            {m.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white py-0.5 pl-2.5 pr-0.5 dark:border-slate-800 dark:bg-slate-900">
        <span className="text-[0.8125rem] text-slate-500">From</span>
        <input type="date" aria-label="From date" className="h-8 rounded-md border-0 bg-transparent px-1.5 text-[0.8125rem] text-slate-900 focus:outline-none dark:text-slate-100" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-[0.8125rem] text-slate-500">to</span>
        <input type="date" aria-label="To date" className="h-8 rounded-md border-0 bg-transparent px-1.5 text-[0.8125rem] text-slate-900 focus:outline-none dark:text-slate-100" value={to} onChange={(e) => setTo(e.target.value)} />
        <button onClick={applyRange} disabled={!from && !to} className="h-8 rounded-md bg-slate-100 px-3 text-[0.8125rem] font-medium text-slate-800 hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
          Apply
        </button>
      </div>

      {advisers && (
        <select
          aria-label="Adviser"
          className="input-sm w-auto min-w-[10rem]"
          value={current.adviserId || ""}
          onChange={(e) => update({ adviserId: e.target.value || undefined })}
        >
          <option value="">All advisers</option>
          {advisers.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}

      {hasFilters && (
        <button onClick={clearAll} className="h-9 rounded-lg px-2.5 text-[0.8125rem] font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-300">
          Clear filters
        </button>
      )}
    </div>
  );
}
