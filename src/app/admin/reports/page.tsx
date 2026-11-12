import { requireFeature } from "@/lib/featureFlags";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/guards";
import { StatusBadge } from "@/components/Badges";
import OutcomesReport from "./OutcomesReport";
import InsightsTabs from "@/components/InsightsTabs";
import { getStageTimes, getWaitingLongest, MEASURED_STAGES } from "@/lib/stageTimes";

const VIEWS = [
  { key: "stages", label: "Time at each step" },
  { key: "outcomes", label: "Outcomes" },
] as const;

const fmtDays = (d: number) => (d < 1 ? `${Math.round(d * 24)}h` : `${d.toFixed(1)}d`);

export default async function ReportsPage({ searchParams }: { searchParams: { view?: string; period?: string } }) {
  await requireFeature("reports");
  await requireSuperAdmin();
  const view = VIEWS.find((v) => v.key === searchParams.view)?.key ?? "stages";

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Insights</h1>
          <p className="page-sub">Where renewals slow down and how they end.</p>
        </div>
      </header>

      <InsightsTabs active={view} />

      {view === "stages" && <StageTimes />}
      {view === "outcomes" && <OutcomesReport period={searchParams.period ?? "365"} />}
    </main>
  );
}

async function StageTimes() {
  const [times, waiting] = await Promise.all([getStageTimes(90), getWaitingLongest(12)]);
  const max = Math.max(...times.overall.map((s) => s.value?.days ?? 0), 0.01);

  return (
    <div className="space-y-10">
      <section aria-labelledby="avg-h">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="avg-h" className="section-title">Average time at each step</h2>
          <span className="text-[0.8125rem] text-slate-500">Last {times.days} days, from {times.measured} completed steps</span>
        </div>
        {times.measured === 0 ? (
          <p className="border-y border-slate-200 py-6 text-[0.875rem] text-slate-500 dark:border-slate-800">
            Nothing to show yet. Times are measured from status changes made after this update, so they build up as renewals move along.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {times.overall.map((s) => (
              <li key={s.key} className="grid grid-cols-[8rem_1fr_6rem] items-center gap-4 py-3 text-[0.875rem] sm:grid-cols-[10rem_1fr_8rem]">
                <span className="text-slate-800 dark:text-slate-200">
                  {s.label}
                  <span className="block text-[0.75rem] text-slate-500">{s.owner === "underwriter" ? "Underwriter" : "Adviser"}</span>
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                  <span className="block h-full rounded-full bg-brand-600 dark:bg-brand-300" style={{ width: `${((s.value?.days ?? 0) / max) * 100}%` }} />
                </span>
                <span className="num text-right text-slate-900 dark:text-slate-100">
                  {s.value ? fmtDays(s.value.days) : "—"}
                  {s.value && <span className="block text-[0.75rem] text-slate-500">{s.value.n} renewals</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {times.people.length > 0 && (
        <section aria-labelledby="ppl-h">
          <h2 id="ppl-h" className="section-title mb-3">By person</h2>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Person</th>
                  {MEASURED_STAGES.map((s) => (
                    <th key={s.key} className="text-right">{s.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {times.people.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    {p.stages.map((s) => (
                      <td key={s.key} className="num text-right">
                        {s.value ? (
                          <>
                            {fmtDays(s.value.days)} <span className="text-[0.75rem] text-slate-500">({s.value.n})</span>
                          </>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[0.8125rem] text-slate-500">Needs quote counts for the underwriter, Quoted and Contacted for the adviser. The number in brackets is how many renewals.</p>
        </section>
      )}

      <section aria-labelledby="wait-h">
        <h2 id="wait-h" className="section-title mb-3">Waiting longest at their current step</h2>
        {waiting.length === 0 ? (
          <p className="text-[0.875rem] text-slate-500">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {waiting.map((w) => (
              <li key={w.id}>
                <Link href={`/renewals/${w.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-2.5 text-[0.875rem] hover:bg-white dark:hover:bg-slate-900">
                  <span className="min-w-0">
                    <span className="block truncate text-slate-900 dark:text-slate-100">{w.clientName}</span>
                    <span className="block text-[0.8125rem] text-slate-500">
                      {w.owner ?? "Not assigned"}
                      {w.renewalDate ? `, due ${new Date(w.renewalDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" })}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <StatusBadge status={w.status} />
                    <span className="num w-16 text-right text-slate-900 dark:text-slate-100">{w.days} days</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
