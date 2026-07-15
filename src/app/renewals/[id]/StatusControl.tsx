"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

const OPTIONS = [
  ["ASSIGNED", "Assigned"],
  ["IN_PROGRESS", "In Progress"],
  ["CONTACTED", "Contacted"],
  ["RENEWED", "Renewed"],
  ["LOST", "Lost"],
  ["LAPSED", "Lapsed"],
];

export default function StatusControl({
  renewalId,
  currentStatus,
}: {
  renewalId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setStatus(next);
    setLoading(true);
    await fetch(`/api/renewals/${renewalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
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
        {OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
