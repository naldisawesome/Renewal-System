"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

/**
 * Shown to an adviser viewing a client's policy that someone else holds. They can read everything but change
 * nothing, and can ask for the policy to be moved to them. A Super Admin approves or declines the request.
 */
export default function TransferCard({
  renewalId,
  heldBy,
  pendingSince,
  lastDeclined,
  closed,
}: {
  renewalId: string;
  heldBy: string | null;
  pendingSince: string | null;
  lastDeclined: { at: string; by: string | null; note: string | null } | null;
  closed: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reasonId = useId();
  const day = (iso: string) => new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });

  async function send(method: "POST" | "DELETE") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/renewals/${renewalId}/transfer-request`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "POST" ? JSON.stringify({ reason: reason.trim() || undefined }) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "That didn't work. Try again.");
      setOpen(false);
      setReason("");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card border-brand-200 bg-brand-50/60 p-5 dark:border-brand-900/60 dark:bg-brand-900/40">
      <h2 className="text-[0.875rem] font-semibold text-slate-900 dark:text-slate-100">View only</h2>
      <p className="mt-1 text-[0.8125rem] text-slate-600 dark:text-slate-400">
        {heldBy ? <>This policy is with {heldBy}.</> : <>This policy isn't assigned yet.</>} You can see it because you look
        after another policy for this client.
      </p>

      {error && <p className="alert-error mt-3" role="alert">{error}</p>}

      {closed ? null : pendingSince ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[0.8125rem] font-medium text-slate-800 dark:text-slate-200">Transfer requested {day(pendingSince)}. Waiting for an admin.</p>
          <button type="button" onClick={() => send("DELETE")} disabled={busy} className="btn-ghost shrink-0 px-2 py-1 text-[0.8125rem]">
            Cancel request
          </button>
        </div>
      ) : open ? (
        <div className="mt-3 space-y-2">
          <label htmlFor={reasonId} className="block text-[0.8125rem] font-medium text-slate-700 dark:text-slate-300">
            Why should it move to you? <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <textarea
            id={reasonId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="For example: I look after this client's other policies."
            className="input w-full resize-y text-[0.8125rem]"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} disabled={busy} className="btn-ghost px-3 py-1.5 text-[0.8125rem]">Back</button>
            <button type="button" onClick={() => send("POST")} disabled={busy} aria-busy={busy} className="btn-primary px-3 py-1.5 text-[0.8125rem]">
              {busy && <Spinner />}
              {busy ? "Sending…" : "Send request"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {lastDeclined && (
            <p className="mt-3 text-[0.8125rem] text-slate-600 dark:text-slate-400">
              Your last request was declined {day(lastDeclined.at)}{lastDeclined.by ? ` by ${lastDeclined.by}` : ""}
              {lastDeclined.note ? `: ${lastDeclined.note}` : "."}
            </p>
          )}
          <button type="button" onClick={() => setOpen(true)} className="btn-primary mt-3 w-full justify-center px-3 py-2 text-[0.8125rem]">
            Request transfer
          </button>
          <p className="mt-2 text-[0.75rem] text-slate-500">An admin approves it before the policy moves to you.</p>
        </>
      )}
    </div>
  );
}
