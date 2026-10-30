"use client";

import { useRouter } from "next/navigation";
import { startProgress } from "./NavProgress";

/**
 * A table header cell that sorts the table by that column. Keeps every other query param (filters, search) and
 * toggles sortField/sortDir: an inactive column sorts ascending first; the active column flips direction.
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
    const merged = { ...currentParams, sortField: sortKey, sortDir: nextDir, page: undefined };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) usp.set(k, v);
    });
    startProgress();
    router.push(`${basePath}?${usp.toString()}`);
  }

  return (
    <th className={className} aria-sort={isActive ? (activeDir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={handleClick}
        title={`Sort by ${label}`}
        className={`inline-flex items-center gap-1 whitespace-nowrap font-medium transition-colors ${
          isActive ? "text-slate-900 dark:text-slate-100" : "hover:text-slate-800 dark:hover:text-slate-200"
        }`}
      >
        {label}
        <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true" className={isActive ? "opacity-100" : "opacity-30"}>
          {isActive && activeDir === "desc" ? (
            <path d="M5 8 1.5 3h7L5 8Z" fill="currentColor" />
          ) : (
            <path d="M5 2 8.5 7h-7L5 2Z" fill="currentColor" />
          )}
        </svg>
      </button>
    </th>
  );
}
