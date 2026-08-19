"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import { STATUS_LABELS, getSettableNextStatuses } from "@/lib/statusFlow";

const ALL_STATUSES = [
  "UNASSIGNED",
  "ASSIGNED",
  "IN_PROGRESS",
  "QUOTED",
  "CONTACTED",
  "RENEWED",
  "CANCELLED",
  "LAPSED",
];

export default function StatusControl({
  renewalId,
  currentStatus,
  role,
}: {
  renewalId: string;
  currentStatus: string;
  role: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Super Admin can correct a renewal to any status. Everyone else only
  // ever sees their current status plus whichever status(es) they're
  // actually allowed to move it into next - so the dropdown never offers a
  // choice the server would reject.
  const options =
    role === "SUPER_ADMIN"
      ? ALL_STATUSES
      : Array.from(new Set([currentStatus, ...getSettableNextStatuses(role, currentStatus)]));

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (next === status) return;
    const previous = status;
    setStatus(next);
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/renewals/${renewalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Couldn't update the status.");
      setStatus(previous);
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <div>
      <label className="label flex items-center gap-2">
        Status
        {loading && <Spinner className="text-brand-500" />}
      </label>
      <select className="input" value={status} onChange={handleChange} disabled={loading}>
        {options.map((value) => (
          <option key={value} value={value}>
            {STATUS_LABELS[value] || value}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
