"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import RenewalProgress from "@/components/RenewalProgress";
import { STATUS_LABELS, getSettableNextStatuses } from "@/lib/statusFlow";

export default function StatusControl({
  renewalId,
  currentStatus,
  statusSince,
  role,
}: {
  renewalId: string;
  currentStatus: string;
  statusSince: string;
  role: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SUPER_ADMIN can override into any forward step from here - everyone else
  // only sees the step(s) their role is trusted to set next.
  const nextOptions =
    role === "SUPER_ADMIN"
      ? getSettableNextStatuses("ADVISER", currentStatus).concat(
          getSettableNextStatuses("UNDERWRITER", currentStatus)
        )
      : getSettableNextStatuses(role, currentStatus);

  async function advanceTo(next: string) {
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
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="label mb-0 flex items-center gap-2">
          Status
          {loading && <Spinner className="text-brand-500" />}
        </div>
        {nextOptions.length > 0 && (
          <div className="flex gap-2">
            {nextOptions.map((next) => (
              <button
                key={next}
                type="button"
                className="btn-secondary text-xs px-3 py-1.5"
                disabled={loading}
                onClick={() => advanceTo(next)}
              >
                Mark {STATUS_LABELS[next]}
              </button>
            ))}
          </div>
        )}
      </div>
      <RenewalProgress currentStatus={currentStatus} statusSince={new Date(statusSince)} />
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
