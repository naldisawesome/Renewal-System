"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import { StatusBadge } from "@/components/Badges";
import { STATUS_LABELS, getSettableNextStatuses } from "@/lib/statusFlow";
import type { OutcomeInput } from "@/lib/outcomeRules";
import OutcomeForm from "./OutcomeForm";
import QuoteForm from "./QuoteForm";

const ALL_STATUSES = ["UNASSIGNED", "ASSIGNED", "IN_PROGRESS", "QUOTED", "CONTACTED", "RENEWED", "CANCELLED", "LAPSED"];
const OUTCOMES = ["RENEWED", "CANCELLED", "LAPSED"];

const ACTION_LABEL: Record<string, string> = {
  IN_PROGRESS: "Start working on it",
  QUOTED: "Mark as quoted",
  CONTACTED: "Mark client as contacted",
  RENEWED: "Renewed",
  CANCELLED: "Cancelled",
  LAPSED: "Lapsed",
};

/**
 * Moves a renewal along. People see only the next step(s) their role may take (the server enforces the same
 * rule); Super Admins can also correct a renewal to any status. Choosing an outcome asks for what really happened
 * before it's saved.
 */
export default function StatusControl({
  renewalId,
  currentStatus,
  role,
  insurer,
  invoiceTotal,
  quotedPremium,
}: {
  renewalId: string;
  currentStatus: string;
  role: string;
  insurer: string | null;
  invoiceTotal: number | null;
  quotedPremium?: number | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const next = getSettableNextStatuses(role, status);
  const isOutcomeStep = next.length > 1;

  async function save(target: string, outcome?: OutcomeInput, quote?: { premium?: number }): Promise<string | null> {
    setError(null);
    const res = await fetch(`/api/renewals/${renewalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: target, ...(outcome ? { outcome } : {}), ...(quote ? { quote } : {}) }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return data?.error || "Couldn't update the status.";
    }
    setStatus(target);
    setPending(null);
    router.refresh();
    return null;
  }

  async function choose(target: string) {
    if (target === status) return;
    if (OUTCOMES.includes(target) || target === "QUOTED") {
      setPending(target);
      setError(null);
      return;
    }
    setBusy(target);
    const err = await save(target);
    if (err) setError(err);
    setBusy(null);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[0.8125rem] text-slate-500">Status</span>
        <StatusBadge status={status} />
      </div>

      {pending ? (
        <div>
          <p className="mb-3 text-[0.875rem] text-slate-700 dark:text-slate-200">
            Mark as <strong className="font-medium">{STATUS_LABELS[pending]}</strong>
          </p>
          {pending === "QUOTED" ? (
            <QuoteForm
              invoiceTotal={invoiceTotal}
              onSubmit={(premium) => save("QUOTED", undefined, { premium })}
              onCancel={() => setPending(null)}
            />
          ) : (
          <OutcomeForm
            key={pending}
            status={pending as any}
            currentInsurer={insurer}
            invoiceTotal={invoiceTotal}
            quotedPremium={quotedPremium ?? null}
            submitLabel={`Save as ${STATUS_LABELS[pending]}`}
            onSubmit={(o) => save(pending, o)}
            onCancel={() => setPending(null)}
          />
          )}
        </div>
      ) : (
        next.length > 0 && (
          <div className="space-y-2">
            {isOutcomeStep && <p className="text-[0.8125rem] text-slate-600 dark:text-slate-300">Record the outcome:</p>}
            <div className={isOutcomeStep ? "grid grid-cols-3 gap-2" : ""}>
              {next.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => choose(s)}
                  disabled={!!busy}
                  aria-busy={busy === s}
                  className={isOutcomeStep ? "btn-secondary w-full px-2" : "btn-primary w-full"}
                >
                  {busy === s && <Spinner />}
                  {ACTION_LABEL[s] ?? STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        )
      )}

      {role === "SUPER_ADMIN" && !pending && (
        <label className="mt-4 block">
          <span className="label">Correct the status</span>
          <select className="input-sm" value={status} onChange={(e) => choose(e.target.value)} disabled={!!busy}>
            {ALL_STATUSES.map((v) => (
              <option key={v} value={v}>
                {STATUS_LABELS[v] || v}
              </option>
            ))}
          </select>
        </label>
      )}

      {next.length === 0 && role !== "SUPER_ADMIN" && (
        <p className="text-[0.8125rem] text-slate-500">Nothing for you to do at this step.</p>
      )}
      {error && <p className="alert-error mt-3" role="alert">{error}</p>}
    </div>
  );
}
