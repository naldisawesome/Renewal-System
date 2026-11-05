import Link from "next/link";
import { monthKey } from "@/lib/dates";

export type RulerMonth = { key: string; label: string; count: number; total?: number };

const money = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}m` : n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`;

/**
 * Renewals due per month, as a ruler: one column per month with a bar for the number of policies and the
 * invoice value underneath. Each month links to the renewals list filtered to that month; the current month and
 * the selected month are marked.
 */
export default function MonthRuler({
  months,
  hrefFor,
  activeKey,
  size = "lg",
  allHref,
}: {
  months: RulerMonth[];
  hrefFor: (key: string) => string;
  activeKey?: string;
  size?: "lg" | "sm";
  /** Shown as a leading "All months" stop when given (used as a filter). */
  allHref?: string;
}) {
  if (months.length === 0) {
    return <p className="py-6 text-[0.875rem] text-slate-500">No renewal dates to show yet.</p>;
  }
  const max = Math.max(...months.map((m) => m.count), 1);
  const now = monthKey(new Date());
  const barH = size === "lg" ? 96 : 28;

  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <ol className="flex min-w-full items-stretch gap-1 px-1" aria-label="Renewals by month">
        {allHref && (
          <li className="flex">
            <Link
              href={allHref}
              aria-current={!activeKey ? "true" : undefined}
              className={`flex min-w-[5.5rem] flex-col justify-end rounded-lg px-3 pb-2.5 pt-3 text-left transition-colors ${
                !activeKey ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span className="text-[0.8125rem] font-medium">All months</span>
              <span className={`text-[0.75rem] ${!activeKey ? "opacity-70" : "text-slate-500"}`}>
                {months.reduce((s, m) => s + m.count, 0)} policies
              </span>
            </Link>
          </li>
        )}
        {months.map((m, i) => {
          const active = m.key === activeKey;
          const current = m.key === now;
          const h = Math.max(3, Math.round((m.count / max) * barH));
          return (
            <li key={m.key} className={`flex flex-1 ${size === "lg" ? "max-w-[10rem]" : "max-w-[9rem]"}`}>
              <Link
                href={hrefFor(m.key)}
                aria-current={active ? "true" : undefined}
                title={`${m.label}: ${m.count} ${m.count === 1 ? "policy" : "policies"}`}
                className={`group flex min-w-[5.5rem] flex-1 flex-col rounded-lg px-3 pb-2.5 pt-3 transition-colors ${
                  active ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span className="flex items-end" style={{ height: barH }} aria-hidden="true">
                  <span
                    className={`rs-grow-y block w-full max-w-[4.5rem] rounded-[3px] ${
                      active
                        ? "bg-white/90 dark:bg-slate-900/80"
                        : current
                          ? "bg-brand-600 dark:bg-brand-300"
                          : "bg-slate-300 group-hover:bg-slate-400 dark:bg-slate-700 dark:group-hover:bg-slate-600"
                    }`}
                    style={{ height: h, animationDelay: `${i * 30}ms` }}
                  />
                </span>
                <span className="mt-2.5 flex items-baseline justify-between gap-2">
                  <span className="text-[0.8125rem] font-medium">{m.label}</span>
                  {current && !active && <span className="text-[0.6875rem] text-brand-700 dark:text-brand-300">Now</span>}
                </span>
                <span className={`num text-[0.75rem] ${active ? "opacity-75" : "text-slate-500 dark:text-slate-400"}`}>
                  {m.count} {m.count === 1 ? "policy" : "policies"}
                </span>
                {m.total != null && size === "lg" && (
                  <span className={`num text-[0.75rem] ${active ? "opacity-75" : "text-slate-500 dark:text-slate-400"}`}>{money(m.total)}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
