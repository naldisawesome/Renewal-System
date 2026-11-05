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
  filters,
  trend,
  status,
  adviser,
}: {
  summary: DashboardSummary;
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
    <main className="page" style={{ maxWidth: 1400 }}>
      <header className="page-head">
        <div>
          <h1 className="page-title">{summary.title}</h1>
          <p className="page-sub">{summary.subtitle}</p>
        </div>
      </header>

      <div className="mb-6">{filters}</div>

      <section aria-label="Summary" className="mb-8 grid grid-cols-2 border-y border-slate-200 dark:border-slate-800 lg:grid-cols-4">
        {figures.map((f, i) => (
          <div
            key={f.label}
            className={`border-slate-200 px-1 py-5 dark:border-slate-800 sm:px-5 ${i % 2 === 1 ? "border-l" : ""} ${i === 2 ? "lg:border-l" : ""} ${i >= 2 ? "border-t lg:border-t-0" : ""}`}
          >
            <span className="block text-[0.8125rem] text-slate-500 dark:text-slate-400">{f.label}</span>
            <span className="figure mt-1 block text-[1.875rem] leading-none">{f.value}</span>
            {f.note && <span className="mt-1.5 block text-[0.75rem] text-brand-700 dark:text-brand-300">{f.note}</span>}
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
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
        <section className="card mt-6 p-5">
          <h2 className="section-title mb-4">By adviser</h2>
          {adviser}
        </section>
      )}
    </main>
  );
}
