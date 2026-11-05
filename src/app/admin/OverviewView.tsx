import Link from "next/link";
import MonthRuler from "@/components/MonthRuler";
import { ArrowRightIcon } from "@/components/icons";
import DeadlineBand from "@/components/DeadlineBand";
import AtRiskList, { type AtRiskRow } from "@/components/AtRiskList";
import OutcomesPanel from "@/components/OutcomesPanel";
import type { DueKey } from "@/lib/deadlines";
import type { OutcomeSummary } from "@/lib/outcomes";

export type OverviewData = {
  firstName: string;
  total: number;
  unassigned: number;
  inProgress: number;
  renewed: number;
  pendingUsers: number;
  byCompany: { company: string; bookType: string; count: number }[];
  byMonth: { key: string; label: string; count: number; total?: number }[];
  deadlines: { counts: Record<DueKey, number>; atRisk: number; risk: AtRiskRow[] };
  outcomes: OutcomeSummary;
  problems?: number;
};

const PORTFOLIO_COLOR: Record<string, string> = { CACTUS: "var(--cactus)", BLANKET: "var(--blanket)" };

/** Presentational only - the page fetches the data and passes it in. */
export default function OverviewView({ data }: { data: OverviewData }) {
  const { firstName, total, unassigned, inProgress, renewed, pendingUsers, byCompany, byMonth, deadlines, outcomes, problems = 0 } = data;
  const today = new Date().toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long", timeZone: "Pacific/Auckland" });

  const figures = [
    { label: "Renewals on file", value: total, href: "/admin/renewals" },
    { label: "Waiting to be assigned", value: unassigned, href: "/admin/allocate", accent: unassigned > 0 },
    { label: "Being worked on", value: inProgress, href: "/admin/renewals?status=OPEN" },
    { label: "Renewed", value: renewed, href: "/admin/renewals?status=RENEWED" },
  ];

  const sortedPortfolio = [...byCompany].sort((a, b) => a.company.localeCompare(b.company) || a.bookType.localeCompare(b.bookType));
  const maxPortfolio = Math.max(...byCompany.map((r) => r.count), 1);

  const actions = [
    { title: "Allocate renewals", text: unassigned > 0 ? `${unassigned} waiting for an adviser` : "Everything is assigned", href: "/admin/allocate" },
    { title: "Upload a renewal export", text: "Add or refresh renewals from a spreadsheet", href: "/admin/upload" },
    { title: "Browse all renewals", text: "Search, filter and edit any policy", href: "/admin/renewals" },
    { title: "Manage users", text: pendingUsers > 0 ? `${pendingUsers} waiting for approval` : "Approve and look after accounts", href: "/admin/users" },
  ];

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Welcome back, {firstName}</h1>
          <p className="page-sub">Where the Cactus and Blanket renewals stand, {today}.</p>
        </div>
      </header>

      {pendingUsers > 0 && (
        <Link
          href="/admin/users"
          role="status"
          className="group mb-7 flex items-center justify-between gap-4 rounded-xl border border-[#e6d3a8] bg-[#fbf6ea] px-4 py-3 text-[0.875rem] text-[#6b5114] transition-colors hover:border-[#d9bf86] dark:border-[#4a3d1f] dark:bg-[#231d10] dark:text-[#e2c47c]"
        >
          <span>
            <strong className="font-medium">
              {pendingUsers} {pendingUsers > 1 ? "people are" : "person is"} waiting for approval.
            </strong>{" "}
            They can&apos;t sign in until you approve them.
          </span>
          <span className="flex shrink-0 items-center gap-1.5 font-medium">
            Review <ArrowRightIcon size={16} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      {problems > 0 && (
        <Link
          href="/admin/system"
          role="status"
          className="group mb-7 flex items-center justify-between gap-4 rounded-xl border border-[#ecc9c2] bg-[#fbf0ee] px-4 py-3 text-[0.875rem] text-[#8a3326] transition-colors hover:border-[#dfaea4] dark:border-[#4a2a24] dark:bg-[#241614] dark:text-[#eda499]"
        >
          <span>
            <strong className="font-medium">
              {problems} {problems === 1 ? "problem was" : "problems were"} recorded.
            </strong>{" "}
            Someone ran into an error in the app.
          </span>
          <span className="flex shrink-0 items-center gap-1.5 font-medium">
            Look <ArrowRightIcon size={16} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      {/* Key figures: one ruled band */}
      <section aria-label="At a glance" className="mb-10 grid grid-cols-2 border-y border-slate-200 dark:border-slate-800 lg:grid-cols-4">
        {figures.map((f, i) => (
          <Link
            key={f.label}
            href={f.href}
            className={`group px-1 py-5 transition-colors sm:px-5 ${i > 0 ? "lg:border-l" : ""} ${i % 2 === 1 ? "border-l lg:border-l" : ""} ${
              i >= 2 ? "border-t lg:border-t-0" : ""
            } border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900`}
          >
            <span className="block text-[0.8125rem] text-slate-500 dark:text-slate-400">{f.label}</span>
            <span className={`figure mt-1 block text-[2.5rem] leading-none ${f.accent ? "!text-brand-700 dark:!text-brand-300" : ""}`}>{f.value}</span>
          </Link>
        ))}
      </section>

      <section aria-labelledby="deadlines-h" className="mb-10">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 id="deadlines-h" className="section-title">Deadlines</h2>
          <span className="text-[0.8125rem] text-slate-500">Open renewals by how soon they&apos;re due</span>
        </div>
        <DeadlineBand counts={deadlines.counts} hrefFor={(k) => `/admin/renewals?due=${k}`} />
      </section>

      <div className="mb-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AtRiskList rows={deadlines.risk} total={deadlines.atRisk} seeAllHref="/admin/renewals?due=risk" showOwner />
        <OutcomesPanel data={outcomes} listHref={(s) => `/admin/renewals?status=${s}`} />
      </div>

      {/* Signature: renewals due by month */}
      <section aria-labelledby="months-h" className="mb-10">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 id="months-h" className="section-title">Due by month</h2>
          <span className="text-[0.8125rem] text-slate-500">Choose a month to see its renewals</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
          <MonthRuler months={byMonth} hrefFor={(k) => `/admin/renewals?month=${k}`} />
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby="portfolio-h">
          <h2 id="portfolio-h" className="section-title mb-3">By portfolio and type</h2>
          {sortedPortfolio.length === 0 ? (
            <p className="text-[0.875rem] text-slate-500">No renewals uploaded yet.</p>
          ) : (
            <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {sortedPortfolio.map((row) => (
                <li key={`${row.company}-${row.bookType}`}>
                  <Link
                    href={`/admin/renewals?company=${row.company}&bookType=${row.bookType}`}
                    className="grid grid-cols-[10rem_1fr_3rem] items-center gap-4 py-3 text-[0.875rem] transition-colors hover:bg-white dark:hover:bg-slate-900 sm:grid-cols-[12rem_1fr_3rem]"
                  >
                    <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <span aria-hidden="true" className="h-2 w-2 rounded-[2px]" style={{ background: PORTFOLIO_COLOR[row.company] }} />
                      {row.company === "CACTUS" ? "Cactus" : "Blanket"}
                      <span className="text-slate-500">{row.bookType === "CONTRACT_WORKS" ? "Contract Works" : "Renewals"}</span>
                    </span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                      <span
                        className="rs-grow-x block h-full rounded-full"
                        style={{ width: `${(row.count / maxPortfolio) * 100}%`, background: PORTFOLIO_COLOR[row.company] }}
                      />
                    </span>
                    <span className="num text-right text-slate-900 dark:text-slate-100">{row.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="actions-h">
          <h2 id="actions-h" className="section-title mb-3">Next steps</h2>
          <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {actions.map((a) => (
              <li key={a.href}>
                <Link href={a.href} className="group flex items-center justify-between gap-4 py-3 transition-colors hover:bg-white dark:hover:bg-slate-900">
                  <span>
                    <span className="block text-[0.9375rem] text-slate-900 dark:text-slate-100">{a.title}</span>
                    <span className="block text-[0.8125rem] text-slate-500">{a.text}</span>
                  </span>
                  <ArrowRightIcon size={18} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
