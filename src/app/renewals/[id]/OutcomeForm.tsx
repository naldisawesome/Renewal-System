"use client";

import { useState } from "react";
import Spinner from "@/components/Spinner";
import { LOST_REASONS, money, pct, premiumChange, type OutcomeInput } from "@/lib/outcomeRules";

/**
 * What really happened: for Renewed, the premium and insurer it renewed with; for Cancelled or Lapsed, why it was
 * lost. Used when recording an outcome and when correcting one.
 */
export default function OutcomeForm({
  status,
  currentInsurer,
  invoiceTotal,
  quotedPremium,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  status: "RENEWED" | "CANCELLED" | "LAPSED";
  currentInsurer: string | null;
  invoiceTotal: number | null;
  quotedPremium?: number | null;
  initial?: OutcomeInput;
  submitLabel: string;
  onSubmit: (o: OutcomeInput) => Promise<string | null>;
  onCancel: () => void;
}) {
  const renewed = status === "RENEWED";
  // Starts from the quote when there is one; the adviser changes it if the final premium differs.
  const [premium, setPremium] = useState(initial?.premium != null ? String(initial.premium) : quotedPremium != null ? String(quotedPremium) : "");
  const [insurer, setInsurer] = useState(initial?.insurer ?? currentInsurer ?? "");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const p = premium.trim() === "" ? null : Number(premium);
  const change = renewed && p != null && Number.isFinite(p) ? premiumChange(invoiceTotal, p) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const err = await onSubmit(
      renewed
        ? { premium: p ?? undefined, insurer: insurer.trim() || undefined, note: note.trim() || undefined }
        : { reason: reason || undefined, note: note.trim() || undefined }
    );
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <form onSubmit={submit} className="rs-pop space-y-3" aria-label={renewed ? "Record the renewal" : "Record why it was lost"}>
      {renewed ? (
        <>
          <div>
            <label htmlFor="o-premium" className="label">Renewed premium (NZD)</label>
            <input
              id="o-premium"
              className="input"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              autoFocus
              value={premium}
              onChange={(e) => setPremium(e.target.value)}
              placeholder={invoiceTotal != null ? `Last invoice ${money(invoiceTotal, 2)}` : undefined}
            />
            {change != null && (
              <p className="mt-1 text-[0.75rem] text-slate-500">
                <span className="num">{pct(change)}</span> on the last invoice of {money(invoiceTotal, 2)}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="o-insurer" className="label">Renewed with</label>
            <input id="o-insurer" className="input" autoComplete="off" value={insurer} onChange={(e) => setInsurer(e.target.value)} />
          </div>
        </>
      ) : (
        <div>
          <label htmlFor="o-reason" className="label">Why was it {status === "LAPSED" ? "lapsed" : "cancelled"}?</label>
          <select id="o-reason" className="input" required autoFocus value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Choose a reason</option>
            {LOST_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="o-note" className="label">
          Note{!renewed && reason === "Other" ? " (required)" : " (optional)"}
        </label>
        <textarea
          id="o-note"
          className="input min-h-[4.5rem]"
          required={!renewed && reason === "Other"}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      {error && <p className="alert-error" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1" disabled={busy} aria-busy={busy}>
          {busy && <Spinner />}
          {submitLabel}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
