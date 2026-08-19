"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    router.push(basePath);
  }

  return (
    <div className="card p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label className="label">Month</label>
        <select
          className="input"
          value={current.month || ""}
          onChange={(e) => selectMonth(e.target.value)}
        >
          <option value="">All time</option>
          {monthOptions.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">From</label>
        <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>

      <div>
        <label className="label">To</label>
        <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      <button onClick={applyRange} className="btn-secondary">
        Apply range
      </button>

      {advisers && (
        <div>
          <label className="label">Adviser</label>
          <select
            className="input"
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
        </div>
      )}

      <button onClick={clearAll} className="btn-secondary">
        Clear filters
      </button>
    </div>
  );
}
