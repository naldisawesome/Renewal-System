"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import { CloseIcon } from "@/components/icons";

type Person = { id: string; name: string; role: string; active: boolean; open: number };

/** Move all of one person's renewals to someone else in one go (leave, or someone leaving). */
export default function ReassignDialog({ people }: { people: Person[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [as, setAs] = useState<"ADVISER" | "UNDERWRITER">("ADVISER");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [scope, setScope] = useState<"OPEN" | "ALL">("OPEN");
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const holders = people.filter((p) => p.role === as && p.open > 0);
  const targets = people.filter((p) => p.role === as && p.active && p.id !== from);

  useEffect(() => {
    setCount(null);
    if (!from || !to) return;
    let cancelled = false;
    fetch("/api/renewals/reassign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUserId: from, toUserId: to, as, scope, dryRun: true }),
    })
      .then((r) => r.json())
      .then((d) => !cancelled && setCount(typeof d.count === "number" ? d.count : null))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [from, to, as, scope]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  async function move() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/renewals/reassign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUserId: from, toUserId: to, as, scope }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error || "Couldn't move the renewals.");
    const f = people.find((p) => p.id === from)?.name;
    const t = people.find((p) => p.id === to)?.name;
    setDone(`Moved ${d.count} ${d.count === 1 ? "renewal" : "renewals"} from ${f} to ${t}.`);
    setFrom("");
    setTo("");
    router.refresh();
  }

  function close() {
    setOpen(false);
    setDone(null);
    setError(null);
  }

  return (
    <>
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
        Move someone&apos;s renewals
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center whitespace-normal px-4 text-left">
            <div className="rs-backdrop absolute inset-0 bg-slate-950/40" onClick={() => !busy && close()} />
            <div role="dialog" aria-modal="true" aria-labelledby="move-h" className="rs-dialog relative w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-pop dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <h2 id="move-h" className="font-serif text-[1.375rem] leading-tight text-slate-900 dark:text-slate-50">Move renewals</h2>
                <button type="button" onClick={close} aria-label="Close" className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <CloseIcon size={18} />
                </button>
              </div>
              <p className="text-[0.875rem] text-slate-600 dark:text-slate-300">
                For leave, or when someone leaves. Status, notes and history stay with each renewal, and the person taking over is notified.
              </p>

              {done && <p className="alert-ok" role="status">{done}</p>}

              <fieldset>
                <legend className="label">Move them as</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(["ADVISER", "UNDERWRITER"] as const).map((r) => (
                    <label key={r} className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-[0.875rem] ${as === r ? "border-slate-900 ring-1 ring-slate-900 dark:border-slate-200 dark:ring-slate-200" : "border-slate-200 dark:border-slate-700"}`}>
                      <input type="radio" name="as" className="sr-only" checked={as === r} onChange={() => { setAs(r); setFrom(""); setTo(""); }} />
                      {r === "ADVISER" ? "Adviser" : "Underwriter"}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="mv-from" className="label">From</label>
                <select id="mv-from" className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
                  <option value="">Choose who to move them from</option>
                  {holders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.active ? "" : " (no longer active)"}, {p.open} open
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="mv-to" className="label">To</label>
                <select id="mv-to" className="input" value={to} onChange={(e) => setTo(e.target.value)}>
                  <option value="">Choose who takes them over</option>
                  {targets.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2.5 text-[0.875rem] text-slate-700 dark:text-slate-200">
                <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={scope === "ALL"} onChange={(e) => setScope(e.target.checked ? "ALL" : "OPEN")} />
                Include finished renewals (renewed, cancelled, lapsed)
              </label>

              {error && <p className="alert-error" role="alert">{error}</p>}

              <button type="button" className="btn-primary w-full" disabled={!from || !to || busy || count === 0} aria-busy={busy} onClick={move}>
                {busy && <Spinner />}
                {count == null ? "Move renewals" : count === 0 ? "Nothing to move" : `Move ${count} ${count === 1 ? "renewal" : "renewals"}`}
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
