"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

type Batch = {
  id: string;
  fileName: string;
  company: string;
  createdAt: string;
  by: string | null;
  newCount: number;
  updatedCount: number;
  undoneAt: string | null;
  canUndo: boolean;
};

/** The latest uploads, with Undo on the most recent one. */
export default function RecentUploads({ batches }: { batches: Batch[] }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function undo(id: string) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/upload/undo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId: id }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    setConfirm(null);
    if (!res.ok) return setError(d.error || "Couldn't undo the upload.");
    setMessage(
      `Undone. ${d.removed} new ${d.removed === 1 ? "renewal" : "renewals"} removed and ${d.restored} put back as they were.` +
        (d.keptStarted ? ` ${d.keptStarted} new ${d.keptStarted === 1 ? "renewal was" : "renewals were"} kept because someone had already started on ${d.keptStarted === 1 ? "it" : "them"}.` : "") +
        (d.keptEdits ? ` ${d.keptEdits} ${d.keptEdits === 1 ? "value was" : "values were"} left alone because they'd been changed again since.` : "")
    );
    router.refresh();
  }

  const when = (d: string) => new Date(d).toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Pacific/Auckland" });

  return (
    <section aria-labelledby="recent-h" className="mt-10">
      <h2 id="recent-h" className="section-title mb-3">Recent uploads</h2>
      {message && <p className="alert-ok mb-3" role="status">{message}</p>}
      {error && <p className="alert-error mb-3" role="alert">{error}</p>}
      {batches.length === 0 ? (
        <p className="text-[0.875rem] text-slate-500">No uploads yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {batches.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[0.875rem]">
              <div className="min-w-0">
                <p className="truncate text-slate-900 dark:text-slate-100">
                  {b.fileName}
                  <span className="ml-2 text-slate-500">{b.company === "BLANKET" ? "Blanket" : "Cactus"}</span>
                </p>
                <p className="text-[0.8125rem] text-slate-500">
                  {when(b.createdAt)}
                  {b.by ? `, ${b.by}` : ""}. {b.newCount} new, {b.updatedCount} changed.
                  {b.undoneAt && <span className="ml-1 font-medium text-[#93561b] dark:text-[#e3b17f]">Undone {when(b.undoneAt)}.</span>}
                </p>
              </div>
              {b.canUndo &&
                (confirm === b.id ? (
                  <span className="flex items-center gap-2">
                    <span className="text-[0.8125rem] text-slate-600 dark:text-slate-300">Undo this upload?</span>
                    <button type="button" className="btn-danger min-h-[34px] text-[0.8125rem]" onClick={() => undo(b.id)} disabled={busy} aria-busy={busy}>
                      {busy && <Spinner />}
                      Undo upload
                    </button>
                    <button type="button" className="btn-ghost min-h-[34px] text-[0.8125rem]" onClick={() => setConfirm(null)} disabled={busy}>
                      Keep it
                    </button>
                  </span>
                ) : (
                  <button type="button" className="btn-secondary min-h-[34px] text-[0.8125rem]" onClick={() => setConfirm(b.id)}>
                    Undo
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
