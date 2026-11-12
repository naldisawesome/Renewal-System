import Link from "next/link";

export type RunwayStop = { key: string; label: string; range: string; count: number };

const TONE: Record<string, { bar: string; text: string }> = {
  overdue: { bar: "bg-[color:var(--late)]", text: "text-[color:var(--late)]" },
  today: { bar: "bg-[color:var(--soon)]", text: "text-[color:var(--soon)]" },
  "3": { bar: "bg-[color:var(--soon)]", text: "text-[color:var(--soon)]" },
  "7": { bar: "bg-brand-500 dark:bg-brand-300", text: "text-slate-900 dark:text-slate-50" },
  "14": { bar: "bg-brand-400/80 dark:bg-brand-300/70", text: "text-slate-900 dark:text-slate-50" },
  "30": { bar: "bg-slate-400 dark:bg-slate-500", text: "text-slate-900 dark:text-slate-50" },
};

/**
 * The runway: open renewals laid out by how close their renewal date is, soonest on the left. Each stop is a
 * filter (choosing it again clears it). The bar under a number is its share of the busiest stop, so the shape of
 * the coming month can be read at a glance.
 */
export default function Runway({ stops, activeKey, hrefFor }: { stops: RunwayStop[]; activeKey?: string; hrefFor: (key?: string) => string }) {
  const max = Math.max(...stops.map((s) => s.count), 1);
  return (
    <nav aria-label="Open renewals by due date" className="card overflow-hidden">
      <ol className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800 sm:grid-cols-6">
        {stops.map((s, i) => {
          const active = s.key === activeKey;
          const tone = TONE[s.key] ?? TONE["30"];
          return (
            <li key={s.key} className={i >= 3 ? "border-t border-slate-200 dark:border-slate-800 sm:border-t-0" : ""}>
              <Link
                href={hrefFor(active ? undefined : s.key)}
                aria-current={active ? "true" : undefined}
                title={`${s.range}. ${active ? "Showing these now; choose again to show everything." : "Show only these."}`}
                className={`relative block px-4 pb-3.5 pt-3 no-underline transition-colors ${
                  active ? "bg-brand-50 dark:bg-brand-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`num text-[1.375rem] font-semibold leading-none tracking-[-0.02em] ${s.count ? tone.text : "text-slate-400 dark:text-slate-600"}`}>
                    {s.count.toLocaleString("en-NZ")}
                  </span>
                  {active && <span className="text-[0.6875rem] font-medium text-brand-700 dark:text-brand-200">Showing</span>}
                </span>
                <span className="mt-1.5 block text-[0.75rem] text-slate-500 dark:text-slate-400">{s.label}</span>
                <span aria-hidden="true" className="mt-2.5 block h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <span
                    className={`rs-grow-x block h-full rounded-full ${tone.bar}`}
                    style={{ width: `${s.count ? Math.max(6, Math.round((s.count / max) * 100)) : 0}%`, animationDelay: `${i * 45}ms` }}
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
