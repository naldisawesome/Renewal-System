"use client";

import { useState } from "react";
import Spinner from "@/components/Spinner";
import { money, pct, premiumChange } from "@/lib/outcomeRules";

/** The quoted premium, asked for when the underwriter marks a renewal Quoted. */
export default function QuoteForm({
  invoiceTotal,
  onSubmit,
  onCancel,
}: {
  invoiceTotal: number | null;
  onSubmit: (premium: number) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const n = value.trim() === "" ? null : Number(value);
  const change = n != null && Number.isFinite(n) ? premiumChange(invoiceTotal, n) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (n == null || !Number.isFinite(n)) return setError("Enter the quoted premium.");
    setBusy(true);
    setError(null);
    const err = await onSubmit(n);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <form onSubmit={submit} className="rs-pop space-y-3" aria-label="Record the quote">
      <div>
        <label htmlFor="q-premium" className="label">Quoted premium (NZD)</label>
        <input
          id="q-premium"
          className="input"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          required
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={invoiceTotal != null ? `Last invoice ${money(invoiceTotal, 2)}` : undefined}
        />
        {change != null && (
          <p className="mt-1 text-[0.75rem] text-slate-500">
            <span className="num">{pct(change)}</span> on the last invoice of {money(invoiceTotal, 2)}
          </p>
        )}
      </div>
      {error && <p className="alert-error" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1" disabled={busy} aria-busy={busy}>
          {busy && <Spinner />}
          Save as Quoted
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
