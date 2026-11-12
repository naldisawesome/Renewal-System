"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { key: string; label: string; description: string; group: string; locked?: boolean; enabled: boolean; message: string; by: string | null };

export default function FeatureSwitches({ items, groups }: { items: Item[]; groups: string[] }) {
  const router = useRouter();
  const [state, setState] = useState(items);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(key: string, enabled: boolean, message: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save that.");
      setState((s) => s.map((i) => (i.key === key ? { ...i, enabled, message } : i)));
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Couldn't save that.");
    } finally {
      setBusy(null);
    }
  }

  const offCount = state.filter((i) => !i.enabled).length;
  const locked = state.filter((i) => i.locked);
  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[0.875rem] text-red-700">{error}</p>}
      <p className="text-[0.875rem] text-slate-600 dark:text-slate-300">{offCount ? `${offCount} switched off.` : "Everything is on."} Changes reach everyone within a few seconds.</p>
      {groups.filter((g) => state.some((i) => i.group === g && !i.locked)).map((g) => (
        <section key={g}>
          <h2 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{g}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.filter((i) => i.group === g).map((i) => (
              <li key={i.key} className={`flex h-[6.25rem] flex-col rounded-xl border px-3.5 py-3 ${i.enabled ? "border-slate-200 dark:border-slate-800" : "border-amber-300 bg-amber-50/60 dark:border-amber-700/60 dark:bg-amber-950/20"}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-medium text-slate-900 dark:text-slate-50" title={i.description}>{i.label}</p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={i.enabled}
                    aria-label={`${i.label} is ${i.enabled ? "on" : "off"}`}
                    title={i.description}
                    disabled={busy === i.key}
                    onClick={() => save(i.key, !i.enabled, i.enabled ? "" : i.message)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${i.enabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${i.enabled ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
                {i.enabled ? (
                  <p className="mt-1 line-clamp-2 text-[0.75rem] leading-snug text-slate-500 dark:text-slate-400">{i.description}</p>
                ) : (
                  <input
                    className="input mt-auto w-full !py-1 text-[0.8125rem]"
                    aria-label={`Message for ${i.label}`}
                    placeholder="Message for people (optional)"
                    defaultValue={i.message}
                    maxLength={200}
                    onBlur={(e) => e.target.value !== i.message && save(i.key, false, e.target.value)}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-[0.8125rem] text-slate-500 dark:text-slate-400">
        Always on: {locked.map((i) => i.label).join(", ")}.
      </p>
    </div>
  );
}
