const currency = (v: number) => v.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });

/** Forecast by adviser: one row per adviser, largest first, with a bar for value and the policy count. */
export default function BarBreakdownChart({ data }: { data: { label: string; total: number; count: number }[]; height?: number }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-[0.875rem] text-slate-500">No policies in this view.</p>;
  }
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.label} className="grid grid-cols-[9rem_1fr_7rem_4rem] items-center gap-4 text-[0.8125rem] sm:grid-cols-[12rem_1fr_8rem_5rem]">
          <span className={`truncate ${d.label === "Unassigned" ? "text-slate-500" : "text-slate-800 dark:text-slate-200"}`}>{d.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
            <span
              className={`rs-grow-x block h-full rounded-full ${d.label === "Unassigned" ? "bg-slate-300 dark:bg-slate-600" : "bg-brand-600 dark:bg-brand-300"}`}
              style={{ width: `${(d.total / max) * 100}%`, animationDelay: `${i * 40}ms` }}
            />
          </span>
          <span className="num text-right text-slate-900 dark:text-slate-100">{currency(d.total)}</span>
          <span className="num text-right text-slate-500">
            {d.count} {d.count === 1 ? "policy" : "policies"}
          </span>
        </li>
      ))}
    </ul>
  );
}
