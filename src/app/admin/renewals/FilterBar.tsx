"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function FilterBar({
  advisers,
  underwriters,
  monthOptions,
  current,
}: {
  advisers: { id: string; name: string }[];
  underwriters: { id: string; name: string }[];
  monthOptions: { key: string; label: string; count: number }[];
  current: { [key: string]: string | undefined };
}) {
  const router = useRouter();
  const [q, setQ] = useState(current.q || "");

  function update(params: Record<string, string | undefined>) {
    const usp = new URLSearchParams();
    const merged = { ...current, ...params };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) usp.set(k, v);
    });
    router.push(`/admin/renewals?${usp.toString()}`);
  }

  return (
    <div className="card p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label className="label">Portfolio</label>
        <select
          className="input"
          value={current.company || ""}
          onChange={(e) => update({ company: e.target.value || undefined })}
        >
          <option value="">All</option>
          <option value="CACTUS">Cactus</option>
          <option value="BLANKET">Blanket</option>
        </select>
      </div>

      <div>
        <label className="label">Type</label>
        <select
          className="input"
          value={current.bookType || ""}
          onChange={(e) => update({ bookType: e.target.value || undefined })}
        >
          <option value="">All</option>
          <option value="RENEWALS">Renewals</option>
          <option value="CONTRACT_WORKS">Contract Works</option>
        </select>
      </div>

      <div>
        <label className="label">Status</label>
        <select
          className="input"
          value={current.status || ""}
          onChange={(e) => update({ status: e.target.value || undefined })}
        >
          <option value="">All</option>
          <option value="UNASSIGNED">Unassigned</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="CONTACTED">Contacted</option>
          <option value="RENEWED">Renewed</option>
          <option value="LOST">Lost</option>
          <option value="LAPSED">Lapsed</option>
        </select>
      </div>

      <div>
        <label className="label">Adviser</label>
        <select
          className="input"
          value={current.adviserId || ""}
          onChange={(e) => update({ adviserId: e.target.value || undefined })}
        >
          <option value="">All</option>
          {advisers.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Underwriter</label>
        <select
          className="input"
          value={current.underwriterId || ""}
          onChange={(e) => update({ underwriterId: e.target.value || undefined })}
        >
          <option value="">All</option>
          {underwriters.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Month/Year</label>
        <select
          className="input"
          value={current.month || ""}
          onChange={(e) => update({ month: e.target.value || undefined })}
        >
          <option value="">All</option>
          {monthOptions.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label} ({m.count})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Sort by Renewal Date</label>
        <select
          className="input"
          value={current.sort || "date_asc"}
          onChange={(e) => update({ sort: e.target.value })}
        >
          <option value="date_asc">Earliest first</option>
          <option value="date_desc">Latest first</option>
        </select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="label">Search</label>
        <input
          className="input"
          placeholder="Client, policy #, insurer..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && update({ q: q || undefined })}
        />
      </div>

      <button className="btn-secondary" onClick={() => update({ q: q || undefined })}>
        Search
      </button>
      <button className="btn-secondary" onClick={() => router.push("/admin/renewals")}>
        Clear
      </button>
    </div>
  );
}
