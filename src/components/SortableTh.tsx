"use client";

import { useRouter } from "next/navigation";

/**
 * A table header cell that's clickable to sort the table by that column.
 * Preserves every other current query param (filters, search, etc.) and
 * just toggles sortField/sortDir for this column - clicking an inactive
 * column sorts ascending first; clicking the active column flips direction.
 */
export default function SortableTh({
  label,
  sortKey,
  currentParams,
  activeField,
  activeDir,
  basePath,
  className = "",
}: {
  label: string;
  sortKey: string;
  currentParams: Record<string, string | undefined>;
  activeField?: string;
  activeDir?: "asc" | "desc";
  basePath: string;
  className?: string;
}) {
  const router = useRouter();
  const isActive = activeField === sortKey;
  const nextDir: "asc" | "desc" = isActive && activeDir === "asc" ? "desc" : "asc";

  function handleClick() {
    const usp = new URLSearchParams();
    const merged = { ...currentParams, sortField: sortKey, sortDir: nextDir };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) usp.set(k, v);
    });
    router.push(`${basePath}?${usp.toString()}`);
  }

  return (
    <th className={`px-3 py-3 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        title={`Sort by ${label}`}
        className={`flex items-center gap-1.5 uppercase text-xs tracking-wide font-medium ${
          isActive
            ? "text-brand-600 dark:text-brand-300"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        }`}
      >
        <span>{label}</span>
        <span className="flex flex-col leading-none shrink-0">
          <svg width="8" height="6" viewBox="0 0 8 6" className={isActive && activeDir === "asc" ? "fill-brand-600 dark:fill-brand-300" : "fill-slate-300 dark:fill-slate-600"}>
            <path d="M4 0L8 6H0L4 0Z" />
          </svg>
          <svg width="8" height="6" viewBox="0 0 8 6" className={`mt-[2px] ${isActive && activeDir === "desc" ? "fill-brand-600 dark:fill-brand-300" : "fill-slate-300 dark:fill-slate-600"}`}>
            <path d="M4 6L0 0H8L4 6Z" />
          </svg>
        </span>
      </button>
    </th>
  );
}
