import type { ReactNode } from "react";

function currency(v: number) {
  return v.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
}

export type DashboardSummary = {
  title: string;
  subtitle: string;
  total: number;
  count: number;
  average: number;
  secured: number;
};

/** Shared layout for the Admin and Adviser dashboards. The pages fetch the data and pass in the filters and charts. */
export default function DashboardView({
  summary,
  tabs,
  filters,
  trend,
  status,
  adviser,
}: {
  summary: DashboardSummary;
  /** Managers: the Insights tab strip. */
  tabs?: ReactNode;
  filters: ReactNode;
  trend: ReactNode;
  status: ReactNode;
  /** Admin only - hidden when filtering to a single adviser. */
  adviser?: ReactNode;
}) {
  const securedPct = summary.total > 0 ? Math.round((summary.secured / summary.total) * 100) : 0;
  const figures = [
    { label: "Forecasted sales", value: currency(summary.total) },
    { label: "Policies", value: summary.count.toLocaleString("en-NZ") },
    { label: "Average policy value", value: currency(summary.average) },
    { label: "Secured, renewed", value: currency(summary.secured), note: `${securedPct}% of forecast` },
  ];

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">{summary.title}</h1>
          <p className="page-sub">{summary.subtitle}</p>
        </div>
      </header>

      {tabs}

      <div className="mb-5">{filters}</div>

      <section aria-label="Summary" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {figures.map((f) => (
          <div key={f.label} className="card px-4 py-4">
            <span className="block text-[0.75rem] text-slate-500 dark:text-slate-400">{f.label}</span>
            <span className="figure num mt-1.5 block text-[1.625rem] leading-none">{f.value}</span>
            {f.note && (
              <>
                <span aria-hidden="true" className="mt-3 block h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <span className="rs-grow-x block h-full rounded-full bg-[color:var(--ok)]" style={{ width: `${Math.min(100, securedPct)}%` }} />
                </span>
                <span className="mt-1.5 block text-[0.75rem] text-slate-500 dark:text-slate-400">{f.note}</span>
              </>
            )}
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="card p-5">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="section-title">Forecast by renewal month</h2>
          </div>
          {trend}
        </section>
        <section className="card p-5">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="section-title">By status</h2>
            <span className="text-[0.75rem] text-slate-500">Value, share, policies</span>
          </div>
          {status}
        </section>
      </div>

      {adviser && (
        <section className="card mt-5 p-5">
          <h2 className="section-title mb-4">By adviser</h2>
          {adviser}
        </section>
      )}
    </main>
  );
}
