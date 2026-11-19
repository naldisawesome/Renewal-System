"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

export default function TransferDecision({ id, requester, stacked = false }: { id: string; requester: string; stacked?: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"" | "APPROVE" | "DECLINE">("");
  const [error, setError] = useState("");

  async function decide(decision: "APPROVE" | "DECLINE") {
    setBusy(decision);
    setError("");
    try {
      const res = await fetch(`/api/transfer-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "That didn't work. Try again.");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setBusy("");
    }
  }

  return (
    <div className={stacked ? "mt-3" : "mt-4 border-t border-slate-100 pt-4 dark:border-slate-800"}>
      {error && <p className="alert-error mb-3" role="alert">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`note-${id}`} className="sr-only">Note for {requester} (optional)</label>
        <input
          id={`note-${id}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="Note for the adviser (optional)"
          className={`input-sm min-w-0 ${stacked ? "w-full" : "flex-1"}`}
        />
        <button type="button" onClick={() => decide("DECLINE")} disabled={!!busy} className={`btn-secondary justify-center px-3 py-1.5 text-[0.8125rem] ${stacked ? "flex-1" : "w-24"}`}>
          {busy === "DECLINE" && <Spinner />}Decline
        </button>
        <button type="button" onClick={() => decide("APPROVE")} disabled={!!busy} className={`btn-primary justify-center px-3 py-1.5 text-[0.8125rem] ${stacked ? "flex-1" : "w-24"}`}>
          {busy === "APPROVE" && <Spinner />}Approve
        </button>
      </div>
    </div>
  );
}
