"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "./icons";
import { STATUS_LABELS } from "@/lib/statusFlow";
import type { NavItem } from "./Sidebar";

type Hit = { id: string; clientName: string; policyNumber: string | null; insurer: string | null; status: string; renewalDate: string | null };
type Row = { key: string; href: string; title: string; detail: string; kind: "renewal" | "page" };

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "No date");

/**
 * Search from anywhere: Ctrl+K (or ⌘K) opens it, typing finds renewals by client or policy number and pages by
 * name, arrow keys move, Enter opens. The trigger sits in the top bar (an icon on small screens).
 */
export default function CommandSearch({ pages, variant = "sidebar" }: { pages: NavItem[]; variant?: "sidebar" | "bar" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const [mac, setMac] = useState(false);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setHits([]);
    setAt(0);
    const t = setTimeout(() => input.current?.focus(), 10);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/renewals/search?q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        const data = res.ok ? await res.json() : { results: [] };
        setHits(data.results ?? []);
        setAt(0);
      } catch {
        /* a newer keystroke replaced this search */
      } finally {
        if (!ctl.signal.aborted) setBusy(false);
      }
    }, 160);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  const rows: Row[] = useMemo(() => {
    const term = q.trim().toLowerCase();
    const pageRows = pages
      .filter((p) => !term || p.label.toLowerCase().includes(term))
      .map((p) => ({ key: p.href, href: p.href, title: p.label, detail: "Page", kind: "page" as const }));
    const renewalRows = hits.map((h) => ({
      key: h.id,
      href: `/renewals/${h.id}`,
      title: h.clientName,
      detail: [h.policyNumber, STATUS_LABELS[h.status] ?? h.status, `Renews ${fmt(h.renewalDate)}`].filter(Boolean).join(", "),
      kind: "renewal" as const,
    }));
    return [...renewalRows, ...pageRows];
  }, [hits, pages, q]);

  function go(r: Row | undefined) {
    if (!r) return;
    setOpen(false);
    router.push(r.href);
  }

  const shortcut = mac ? "⌘K" : "Ctrl K";
  return (
    <>
      {variant === "sidebar" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 w-56 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 text-left text-[0.8125rem] text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
        >
          <SearchIcon size={15} className="shrink-0 opacity-70" />
          <span className="flex-1 truncate">Find a renewal</span>
          <kbd className="rounded border border-slate-200 px-1.5 py-px font-sans text-[0.6875rem] text-slate-400 dark:border-slate-700">{shortcut}</kbd>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Find a renewal"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <SearchIcon size={19} />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Find a renewal or page">
          <div className="rs-backdrop absolute inset-0 bg-slate-950/45" onClick={() => setOpen(false)} />
          <div className="rs-dialog relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
              <SearchIcon size={18} className="shrink-0 text-slate-400" />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                  else if (e.key === "ArrowDown") { e.preventDefault(); setAt((i) => Math.min(i + 1, rows.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setAt((i) => Math.max(i - 1, 0)); }
                  else if (e.key === "Enter") go(rows[at]);
                }}
                placeholder="Client name or policy number"
                aria-label="Search"
                className="h-[52px] w-full bg-transparent text-[0.9375rem] text-slate-900 !outline-none placeholder:text-slate-400 dark:text-slate-100"
              />
              {busy && <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" aria-hidden="true" />}
            </div>
            <ul className="max-h-[52vh] overflow-y-auto p-1.5" role="listbox">
              {rows.length === 0 && (
                <li className="px-3 py-6 text-center text-[0.875rem] text-slate-500">
                  {q.trim().length >= 2 && !busy ? "No renewal matches that. Check the spelling or try the policy number." : "Type at least two letters."}
                </li>
              )}
              {rows.map((r, i) => (
                <li key={r.key} role="option" aria-selected={i === at}>
                  <button
                    type="button"
                    onMouseEnter={() => setAt(i)}
                    onClick={() => go(r)}
                    className={`flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2 text-left ${i === at ? "bg-brand-50 dark:bg-brand-900/40" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[0.875rem] font-medium text-slate-900 dark:text-slate-100">{r.title}</span>
                      {r.kind === "renewal" && <span className="block truncate text-[0.75rem] text-slate-500 dark:text-slate-400">{r.detail}</span>}
                    </span>
                    <span className="shrink-0 text-[0.6875rem] text-slate-400">{r.kind === "page" ? "Page" : "Renewal"}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="border-t border-slate-200 px-4 py-2 text-[0.6875rem] text-slate-500 dark:border-slate-800">Arrow keys to move, Enter to open, Esc to close</p>
          </div>
        </div>
      )}
    </>
  );
}
