"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

type Item = { id: string; message: string; tone: string; active: boolean; createdAt: string; createdBy: string | null };
const stamp = (iso: string) => new Date(iso).toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Pacific/Auckland" });

export default function AnnouncementManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"info" | "warning">("info");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(key: string, url: string, init: RequestInit) {
    setBusy(key);
    setError(null);
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (await call("post", "/api/announcements", { method: "POST", body: JSON.stringify({ message, tone }) })) setMessage("");
  }

  return (
    <div className="space-y-10">
      <form onSubmit={post} className="space-y-3">
        {error && <p className="alert-error" role="alert">{error}</p>}
        <div>
          <label htmlFor="ann-msg" className="label">Message for everyone</label>
          <textarea id="ann-msg" className="input min-h-[88px]" maxLength={600} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="For example: Cactus upload is due by Friday 5pm." />
          <p className="mt-1 text-right text-[0.75rem] text-slate-400">{message.length}/600</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="radiogroup" aria-label="Style" className="flex gap-4 text-[0.875rem]">
            {(["info", "warning"] as const).map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="tone" checked={tone === t} onChange={() => setTone(t)} />
                {t === "info" ? "Notice" : "Important"}
              </label>
            ))}
          </div>
          <button type="submit" disabled={busy === "post" || !message.trim()} className="btn-primary">
            {busy === "post" && <Spinner className="mr-1.5" />}
            Post announcement
          </button>
        </div>
        <p className="text-[0.8125rem] text-slate-500">Posting replaces the one that is showing now. People see it the next time they open or refresh a page, and can dismiss it on their own screen.</p>
      </form>

      <section aria-labelledby="ann-h">
        <h2 id="ann-h" className="section-title mb-3">Previous announcements</h2>
        {items.length === 0 ? (
          <p className="border-y border-slate-200 py-6 text-[0.875rem] text-slate-500 dark:border-slate-800">Nothing posted yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {items.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-[0.875rem]">
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-slate-900 dark:text-slate-100">{a.message}</p>
                  <p className="mt-0.5 text-[0.75rem] text-slate-500">
                    {stamp(a.createdAt)}{a.createdBy ? `, ${a.createdBy}` : ""}{a.tone === "warning" ? ", important" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {a.active && <span className="badge badge-dot bg-[#e6f2ee] text-[#16685a] dark:bg-[#132a25] dark:text-[#8fd3c2]">Showing</span>}
                  <button type="button" disabled={busy === a.id} onClick={() => call(a.id, `/api/announcements/${a.id}`, { method: "PATCH", body: JSON.stringify({ active: !a.active }) })} className="btn-secondary min-h-[32px] px-3 py-1.5 text-[0.8125rem]">
                    {a.active ? "Take down" : "Show again"}
                  </button>
                  <button type="button" disabled={busy === a.id} onClick={() => confirm("Delete this announcement?") && call(a.id, `/api/announcements/${a.id}`, { method: "DELETE" })} className="btn-ghost min-h-[32px] px-3 py-1.5 text-[0.8125rem]">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
