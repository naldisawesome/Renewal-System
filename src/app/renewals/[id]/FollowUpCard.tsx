"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

function toInput(d: string | null) {
  return d ? d.slice(0, 10) : "";
}

/** When to contact the client next, and why. A reminder arrives in the bell (and the morning email) on the day. */
export default function FollowUpCard({
  renewalId,
  date,
  note,
  canEdit,
  todayKey,
}: {
  renewalId: string;
  date: string | null;
  note: string | null;
  canEdit: boolean;
  /** Today's date in New Zealand, YYYY-MM-DD. */
  todayKey: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [d, setD] = useState(toInput(date));
  const [n, setN] = useState(note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = toInput(date);
  const due = !!key && key <= todayKey;

  async function save(clear = false) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/renewals/${renewalId}/follow-up`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clear ? { date: null } : { date: d || null, note: n }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Couldn't save the follow-up.");
    setEditing(false);
    router.refresh();
  }

  const quick = (days: number) => {
    const [y, m, dd] = todayKey.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1, dd + days));
    setD(t.toISOString().slice(0, 10));
  };

  return (
    <section aria-labelledby="fu-h" className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="fu-h" className="text-[0.8125rem] text-slate-500">Next follow-up</h2>
        {canEdit && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-[0.8125rem] font-medium text-brand-700 hover:underline dark:text-brand-300">
            {date ? "Change" : "Set one"}
          </button>
        )}
      </div>

      {editing ? (
        <form
          className="rs-pop space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div>
            <label htmlFor="fu-date" className="label">Date</label>
            <input id="fu-date" type="date" required className="input" value={d} min={todayKey} onChange={(e) => setD(e.target.value)} />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[
                ["Tomorrow", 1],
                ["In 3 days", 3],
                ["Next week", 7],
              ].map(([label, days]) => (
                <button key={label} type="button" onClick={() => quick(days as number)} className="rounded-md border border-slate-200 px-2 py-1 text-[0.75rem] text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300">
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="fu-note" className="label">What for (optional)</label>
            <input id="fu-note" className="input" maxLength={300} placeholder="Call back about the higher excess" value={n} onChange={(e) => setN(e.target.value)} />
          </div>
          {error && <p className="alert-error" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={busy} aria-busy={busy}>
              {busy && <Spinner />}
              Save
            </button>
            {date && (
              <button type="button" className="btn-ghost" onClick={() => save(true)} disabled={busy}>
                Clear
              </button>
            )}
            <button type="button" className="btn-ghost" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      ) : date ? (
        <div className="text-[0.875rem]">
          <p className={due ? "font-medium text-[#a33a2c] dark:text-[#eda499]" : "text-slate-900 dark:text-slate-100"}>
            {new Date(date).toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}
            {key === todayKey ? ", today" : key < todayKey ? ", overdue" : ""}
          </p>
          {note && <p className="mt-0.5 text-slate-600 dark:text-slate-300">{note}</p>}
        </div>
      ) : (
        <p className="text-[0.8125rem] text-slate-500">None set. {canEdit ? "Set one to get a reminder on the day." : ""}</p>
      )}
    </section>
  );
}
