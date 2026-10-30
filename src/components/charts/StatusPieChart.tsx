import { STATUS_CHART_COLORS } from "@/lib/statusFlow";

const currency = (v: number) => v.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });

/**
 * How the forecast splits across statuses: one bar divided in proportion to value, with a list of the
 * statuses, their value, share and policy count underneath. (Replaces the old pie chart, which made the
 * shares hard to compare.)
 */
export default function StatusPieChart({ data }: { data: { label: string; status: string; total: number; count: number }[]; height?: number }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  if (data.length === 0 || total === 0) {
    return <p className="py-16 text-center text-[0.875rem] text-slate-500">No policies in this view.</p>;
  }
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="img" aria-label="Share of forecast by status">
        {data.map((d, i) => (
          <span
            key={d.status}
            className="rs-grow-x block h-full"
            title={`${d.label}: ${currency(d.total)}`}
            style={{ width: `${(d.total / total) * 100}%`, background: STATUS_CHART_COLORS[d.status], animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
      <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        {data.map((d) => (
          <li key={d.status} className="flex items-center gap-3 py-2 text-[0.8125rem]">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_CHART_COLORS[d.status] }} />
            <span className="flex-1 text-slate-700 dark:text-slate-300">{d.label}</span>
            <span className="num w-10 text-right text-slate-500">{Math.round((d.total / total) * 100)}%</span>
            <span className="num w-24 text-right text-slate-900 dark:text-slate-100">{currency(d.total)}</span>
            <span className="num w-16 text-right text-slate-500">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
