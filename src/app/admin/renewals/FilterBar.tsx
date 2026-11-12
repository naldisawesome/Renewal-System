"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import Spinner from "@/components/Spinner";
import { SearchIcon } from "@/components/icons";
import { startProgress } from "@/components/NavProgress";
import { DUE_FILTER_OPTIONS } from "@/lib/deadlines";
import { Feature } from "@/components/FeatureProvider";

/**
 * Search and filters for All Renewals, in one toolbar. Search stays visible; every other filter lives in one Filters panel,
 * and whatever is applied shows as a removable chip underneath. The deadline stops above the table set the same Deadline filter.
 */
export default function FilterBar({
  monthOptions,
  advisers,
  underwriters,
  salesTeams,
  current,
  canShare = false,
}: {
  advisers: { id: string; name: string }[];
  underwriters: { id: string; name: string }[];
  monthOptions?: { key: string; label: string; count: number }[];
  salesTeams: string[];
  current: { [key: string]: string | undefined };
  /** Super Admins can share a saved view with the whole team. */
  canShare?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(current.q || "");
  const [isPending, startTransition] = useTransition();

  function update(params: Record<string, string | undefined>) {
    const usp = new URLSearchParams();
    const merged = { ...current, ...params, page: undefined };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) usp.set(k, v);
    });
    startProgress();
    startTransition(() => router.push(`/admin/renewals?${usp.toString()}`));
  }

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close the panel on Escape or a click outside it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  type Field = { key: string; label: string; hint?: string; options: { value: string; label: string }[] };
  const fields: Field[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "NOT_FINISHED", label: "Not finished (incl. unassigned)" },
        { value: "OPEN", label: "Being worked on (assigned and onward)" },
        { value: "UNASSIGNED", label: "Not assigned" },
        { value: "NEEDS_QUOTE", label: "Needs quote" },
        { value: "QUOTED", label: "Quoted" },
        { value: "CONTACTED", label: "Contacted" },
        { value: "RENEWED", label: "Renewed" },
        { value: "CANCELLED", label: "Cancelled" },
        { value: "LAPSED", label: "Lapsed" },
        { value: "LOST", label: "Lost (cancelled or lapsed)" },
      ],
    },
    { key: "due", label: "Deadline", hint: "Open renewals by how soon they are due", options: DUE_FILTER_OPTIONS },
    { key: "month", label: "Renewal month", options: (monthOptions ?? []).map((m) => ({ value: m.key, label: `${m.label} (${m.count})` })) },
    {
      key: "company",
      label: "Portfolio",
      options: [
        { value: "CACTUS", label: "Cactus" },
        { value: "BLANKET", label: "Blanket" },
      ],
    },
    {
      key: "bookType",
      label: "Type",
      options: [
        { value: "RENEWALS", label: "Renewals" },
        { value: "CONTRACT_WORKS", label: "Contract Works" },
      ],
    },
    { key: "adviserId", label: "Adviser", options: advisers.map((a) => ({ value: a.id, label: a.name })) },
    { key: "underwriterId", label: "Underwriter", options: underwriters.map((u) => ({ value: u.id, label: u.name })) },
    { key: "salesTeam", label: "Sales team", hint: "From the file's original Sales Team column", options: salesTeams.map((t) => ({ value: t, label: t })) },
  ];
  const active = fields.filter((f) => !!current[f.key]);
  const valueLabel = (f: Field) => f.options.find((o) => o.value === current[f.key])?.label ?? current[f.key];

  const hasFilters = Object.keys(current).some((k) => !!current[k] && !["sort", "sortField", "sortDir", "page"].includes(k));

  function clearAll() {
    setQ("");
    setOpen(false);
    startProgress();
    startTransition(() => router.push("/admin/renewals"));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="relative min-w-[15rem] flex-1"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: q.trim() || undefined });
          }}
        >
          <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
          <input
            aria-label="Search renewals"
            className="input-sm pl-9 pr-20"
            placeholder="Client, policy number or insurer"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            type="submit"
            disabled={isPending}
            className="absolute right-1 top-1 flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[0.75rem] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {isPending ? <Spinner /> : null}
            Search
          </button>
        </form>

        <div ref={wrapRef} className="relative">
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen((o) => !o)}
            className={`input-sm flex w-auto items-center gap-2 ${active.length ? "border-slate-400 text-slate-900 dark:border-slate-500 dark:text-slate-50" : "text-slate-600 dark:text-slate-300"}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            Filters
            {active.length > 0 && (
              <span className="rounded-full bg-brand-700 px-1.5 text-[0.6875rem] font-medium leading-4 text-white dark:bg-brand-300 dark:text-slate-900">{active.length}</span>
            )}
          </button>

          {open && (
            <div
              role="dialog"
              aria-label="Filters"
              className="absolute right-0 z-30 mt-2 w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {fields.map((f) => (
                  <label key={f.key} className="block" title={f.hint}>
                    <span className="mb-1 block text-[0.75rem] font-medium text-slate-500 dark:text-slate-400">{f.label}</span>
                    <select
                      className="input-sm w-full pr-8"
                      value={current[f.key] || ""}
                      onChange={(e) => update({ [f.key]: e.target.value || undefined })}
                      disabled={isPending}
                    >
                      <option value="">Any</option>
                      {f.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isPending || !hasFilters}
                  onClick={clearAll}
                  className="text-[0.8125rem] font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline disabled:opacity-40 dark:text-slate-300 dark:hover:text-white"
                >
                  Clear all
                </button>
                <button type="button" className="btn-secondary min-h-[34px] text-[0.8125rem]" onClick={() => setOpen(false)}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {(active.length > 0 || current.q) && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
          {current.q && (
            <Chip
              text={`Search: ${current.q}`}
              onRemove={() => {
                setQ("");
                update({ q: undefined });
              }}
            />
          )}
          {active.map((f) => (
            <Chip key={f.key} text={`${f.label}: ${valueLabel(f)}`} onRemove={() => update({ [f.key]: undefined })} />
          ))}
          {hasFilters && (
            <button
              type="button"
              className="ml-1 text-[0.8125rem] font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-white"
              disabled={isPending}
              onClick={clearAll}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ text, onRemove }: { text: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-0.5 pl-2.5 pr-1 text-[0.75rem] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
      {text}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${text}`}
        className="flex h-5 w-5 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
      >
        ×
      </button>
    </span>
  );
}
