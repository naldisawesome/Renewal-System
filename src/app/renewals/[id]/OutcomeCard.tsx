"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { money, pct, premiumChange } from "@/lib/outcomeRules";
import OutcomeForm from "./OutcomeForm";

export type OutcomeView = {
  status: "RENEWED" | "CANCELLED" | "LAPSED";
  premium: number | null;
  insurer: string | null;
  reason: string | null;
  note: string | null;
  at: string | null;
  byName: string | null;
};

/** The recorded outcome, with a way for the adviser or a Super Admin to correct it. */
export default function OutcomeCard({
  renewalId,
  outcome,
  invoiceTotal,
  currentInsurer,
  canEdit,
}: {
  renewalId: string;
  outcome: OutcomeView;
  invoiceTotal: number | null;
  currentInsurer: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const renewed = outcome.status === "RENEWED";
  const recorded = renewed ? outcome.premium != null : outcome.reason != null;
  const change = renewed ? premiumChange(invoiceTotal, outcome.premium) : null;

  async function save(o: any): Promise<string | null> {
    const res = await fetch(`/api/renewals/${renewalId}/outcome`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome: o }),
    });
    if (!res.ok) return (await res.json().catch(() => null))?.error || "Couldn't save the outcome.";
    setEditing(false);
    router.refresh();
    return null;
  }

  return (
    <section aria-labelledby="outcome-h" className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="outcome-h" className="text-[0.8125rem] text-slate-500">Outcome</h2>
        {canEdit && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-[0.8125rem] font-medium text-brand-700 hover:underline dark:text-brand-300">
            {recorded ? "Correct" : "Record it"}
          </button>
        )}
      </div>

      {editing ? (
        <OutcomeForm
          status={outcome.status}
          currentInsurer={currentInsurer}
          invoiceTotal={invoiceTotal}
          initial={{ premium: outcome.premium ?? undefined, insurer: outcome.insurer ?? undefined, reason: outcome.reason ?? undefined, note: outcome.note ?? undefined }}
          submitLabel="Save outcome"
          onSubmit={save}
          onCancel={() => setEditing(false)}
        />
      ) : !recorded ? (
        <p className="text-[0.8125rem] text-slate-500">
          {renewed ? "The renewed premium wasn't recorded." : "The reason it was lost wasn't recorded."}
        </p>
      ) : (
        <div className="space-y-2 text-[0.875rem]">
          {renewed ? (
            <>
              <p>
                <span className="figure text-[1.5rem] leading-none">{money(outcome.premium, 2)}</span>
                {change != null && (
                  <span className={`num ml-2 text-[0.8125rem] ${change > 0 ? "text-[#16685a] dark:text-[#8fd3c2]" : change < 0 ? "text-[#a33a2c] dark:text-[#eda499]" : "text-slate-500"}`}>
                    {pct(change)}
                  </span>
                )}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                {invoiceTotal != null ? `From ${money(invoiceTotal, 2)} last time` : "No previous invoice on file"}
                {outcome.insurer ? `, renewed with ${outcome.insurer}` : ""}
              </p>
            </>
          ) : (
            <p className="text-slate-900 dark:text-slate-100">{outcome.reason}</p>
          )}
          {outcome.note && <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">{outcome.note}</p>}
          {outcome.at && (
            <p className="text-[0.75rem] text-slate-500">
              Recorded {new Date(outcome.at).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "Pacific/Auckland" })}
              {outcome.byName ? ` by ${outcome.byName}` : ""}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
