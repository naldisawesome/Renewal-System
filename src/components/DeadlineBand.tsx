import Link from "next/link";
import { DUE_WINDOWS, type DueKey } from "@/lib/deadlines";

const URGENCY: Record<DueKey, string> = {
  overdue: "#b5483a",
  today: "#b5483a",
  "3": "#b8752f",
  "7": "#c79a2e",
  "14": "var(--hair-strong, #b9c1bc)",
  "30": "var(--hair-strong, #b9c1bc)",
};

/**
 * Open renewals by how soon they are due: Overdue, Today, 3, 7, 14 and 30 days. The windows don't overlap, so the
 * numbers add up. Each one opens the matching list. Presentational only.
 */
export default function DeadlineBand({
  counts,
  hrefFor,
  activeKey,
  compact = false,
}: {
  counts: Record<DueKey, number>;
  hrefFor: (key: DueKey) => string;
  activeKey?: string;
  compact?: boolean;
}) {
  return (
    <ol className="grid grid-cols-3 border-y border-slate-200 dark:border-slate-800 sm:grid-cols-6">
      {DUE_WINDOWS.map((w, i) => {
        const n = counts[w.key];
        const active = activeKey === w.key;
        return (
          <li key={w.key} className={`${i % 3 ? "border-l" : ""} ${i >= 3 ? "border-t sm:border-t-0" : ""} ${i === 3 ? "sm:border-l" : ""} border-slate-200 dark:border-slate-800`}>
            <Link
              href={hrefFor(w.key)}
              aria-current={active ? "true" : undefined}
              aria-label={`${w.label}: ${n} ${n === 1 ? "renewal" : "renewals"}, ${w.range.toLowerCase()}`}
              className={`relative block h-full px-2 transition-colors sm:px-4 ${compact ? "py-3" : "py-4"} ${
                active ? "bg-white dark:bg-slate-900" : "hover:bg-white dark:hover:bg-slate-900"
              }`}
            >
              {n > 0 && <span aria-hidden="true" className="absolute inset-x-0 -top-px h-[2px]" style={{ background: URGENCY[w.key] }} />}
              <span className={`block text-[0.8125rem] ${active ? "font-medium text-slate-900 dark:text-slate-50" : "text-slate-600 dark:text-slate-300"}`}>{w.label}</span>
              <span className={`figure mt-1 block leading-none ${compact ? "text-[1.625rem]" : "text-[2rem]"} ${n === 0 ? "!text-slate-300 dark:!text-slate-600" : ""}`}>{n}</span>
              <span className="mt-1.5 block text-[0.75rem] text-slate-500">{w.range}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
