"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Spinner from "@/components/Spinner";
import { SearchIcon } from "@/components/icons";
import { startProgress } from "@/components/NavProgress";
import { DUE_FILTER_OPTIONS } from "@/lib/deadlines";
import { QUALITY_FIELDS } from "@/lib/qualityFields";

/**
 * Search and filters for All Renewals, in one toolbar. Each filter is a compact select whose first option names
 * it ("All advisers"), so the row stays short. The month filter lives in the month ruler above the table.
 */
export default function FilterBar({
  advisers,
  underwriters,
  salesTeams,
  current,
}: {
  advisers: { id: string; name: string }[];
  underwriters: { id: string; name: string }[];
  monthOptions?: { key: string; label: string; count: number }[];
  salesTeams: string[];
  current: { [key: string]: string | undefined };
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

  const select = (allLabel: string, key: string, options: { value: string; label: string }[], title?: string) => (
    <select
      key={key}
      aria-label={allLabel.replace(/^(All|Any) /, "")}
      title={title}
      className={`input-sm w-auto min-w-[8.5rem] pr-8 ${current[key] ? "border-slate-400 text-slate-900 dark:border-slate-500 dark:text-slate-50" : "text-slate-600 dark:text-slate-300"}`}
      value={current[key] || ""}
      onChange={(e) => update({ [key]: e.target.value || undefined })}
      disabled={isPending}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  const hasFilters = Object.keys(current).some((k) => !!current[k] && !["sort", "sortField", "sortDir", "page"].includes(k));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        className="relative min-w-[15rem] flex-1"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: q.trim() || undefined });
        }}
      >
        <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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

      {select("All portfolios", "company", [
        { value: "CACTUS", label: "Cactus" },
        { value: "BLANKET", label: "Blanket" },
      ])}
      {select("All types", "bookType", [
        { value: "RENEWALS", label: "Renewals" },
        { value: "CONTRACT_WORKS", label: "Contract Works" },
      ])}
      {select("All statuses", "status", [
        { value: "NOT_FINISHED", label: "Not finished (incl. unassigned)" },
        { value: "OPEN", label: "Being worked on" },
        { value: "UNASSIGNED", label: "Unassigned" },
        { value: "ASSIGNED", label: "Assigned" },
        { value: "IN_PROGRESS", label: "In Progress" },
        { value: "QUOTED", label: "Quoted" },
        { value: "CONTACTED", label: "Contacted" },
        { value: "RENEWED", label: "Renewed" },
        { value: "CANCELLED", label: "Cancelled" },
        { value: "LAPSED", label: "Lapsed" },
        { value: "LOST", label: "Lost (cancelled or lapsed)" },
      ])}
      {select("Any deadline", "due", DUE_FILTER_OPTIONS, "Open renewals by how soon they are due")}
      {current.missing && select("Any details", "missing", QUALITY_FIELDS.map((f) => ({ value: f.key, label: `Missing ${f.label.toLowerCase()}` })), "From the data quality report")}
      {select("All advisers", "adviserId", advisers.map((a) => ({ value: a.id, label: a.name })))}
      {select("All underwriters", "underwriterId", underwriters.map((u) => ({ value: u.id, label: u.name })))}
      {select("All sales teams", "salesTeam", salesTeams.map((t) => ({ value: t, label: t })), "From the file's original Sales Team column")}

      {hasFilters && (
        <button
          type="button"
          className="h-9 rounded-lg px-2.5 text-[0.8125rem] font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-white"
          disabled={isPending}
          onClick={() => {
            setQ("");
            startProgress();
            startTransition(() => router.push("/admin/renewals"));
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
