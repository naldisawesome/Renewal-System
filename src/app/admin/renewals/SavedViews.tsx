"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import { startProgress } from "@/components/NavProgress";

type View = { id: string; name: string; query: string; shared: boolean; mine: boolean };
// The filters that make up a view (matches the server's list); paging and sorting are not part of one.
const FILTER_KEYS = ["q", "company", "bookType", "status", "adviserId", "underwriterId", "salesTeam", "month", "due", "missing", "followup"];

/** Saved filter combinations for All renewals: open one with a click, or save what's on screen. */
export default function SavedViews({ current, canShare }: { current: { [key: string]: string | undefined }; canShare: boolean }) {
  const router = useRouter();
  const [views, setViews] = useState<View[] | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const currentQuery = (() => {
    const u = new URLSearchParams();
    for (const k of FILTER_KEYS) if (current[k]) u.set(k, current[k]!);
    return u.toString();
  })();
  const active = views?.find((v) => new URLSearchParams(v.query).toString() === currentQuery);

  useEffect(() => {
    fetch("/api/saved-views")
      .then((r) => (r.ok ? r.json() : { views: [] }))
      .then((d) => setViews(d.views))
      .catch(() => setViews([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function openView(v: View) {
    setOpen(false);
    startProgress();
    router.push(`/admin/renewals?${v.query}`);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/saved-views", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, query: currentQuery, shared }) });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not save.");
      return;
    }
    setViews((vs) => [...(vs ?? []), data.view]);
    setName("");
    setShared(false);
  }

  async function remove(v: View) {
    if (!confirm(`Delete the view "${v.name}"?`)) return;
    const res = await fetch(`/api/saved-views/${v.id}`, { method: "DELETE" });
    if (res.ok) setViews((vs) => (vs ?? []).filter((x) => x.id !== v.id));
  }

  return (
    <div className="relative" ref={box}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="input-sm flex w-auto items-center gap-1.5 pr-3 text-slate-600 dark:text-slate-300">
        {active ? <span className="font-medium text-slate-900 dark:text-slate-50">{active.name}</span> : "Saved views"}
        {views && views.length > 0 && <span className="num text-[0.75rem] text-slate-400">{views.length}</span>}
      </button>
      {open && (
        <div className="rs-pop absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-pop dark:border-slate-800 dark:bg-slate-900">
          {views === null ? (
            <p className="px-2 py-3 text-[0.8125rem] text-slate-500">Loading…</p>
          ) : views.length === 0 ? (
            <p className="px-2 py-3 text-[0.8125rem] text-slate-500">No saved views yet. Set some filters, then save them below.</p>
          ) : (
            <ul className="max-h-60 overflow-y-auto">
              {views.map((v) => (
                <li key={v.id} className="group flex items-center gap-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                  <button type="button" onClick={() => openView(v)} className="min-w-0 flex-1 truncate px-2 py-2 text-left text-[0.875rem] text-slate-800 dark:text-slate-100">
                    {v.name}
                    {v.shared && <span className="ml-2 text-[0.75rem] text-slate-400">Team</span>}
                  </button>
                  {(v.mine || canShare) && (
                    <button type="button" aria-label={`Delete ${v.name}`} onClick={() => remove(v)} className="px-2 py-2 text-[0.75rem] text-slate-400 opacity-0 hover:text-[#a33a2c] focus:opacity-100 group-hover:opacity-100">
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={save} className="mt-1 space-y-2 border-t border-slate-100 p-2 pt-3 dark:border-slate-800">
            <p className="text-[0.75rem] text-slate-500">{currentQuery ? "Save the filters on screen as a view" : "Choose some filters to save a view"}</p>
            <input className="input-sm" placeholder="Name, e.g. Cactus due soon" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} disabled={!currentQuery} aria-label="View name" />
            {canShare && (
              <label className="flex items-center gap-2 text-[0.8125rem] text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} /> Share with the team
              </label>
            )}
            {error && <p className="text-[0.75rem] text-[#a33a2c] dark:text-[#eda499]">{error}</p>}
            <button type="submit" disabled={saving || !name.trim() || !currentQuery} className="btn-primary min-h-[32px] w-full px-3 py-1.5 text-[0.8125rem]">
              {saving && <Spinner />}
              Save view
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
