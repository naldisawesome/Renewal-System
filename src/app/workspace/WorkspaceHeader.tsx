import Link from "next/link";
import { ArrowRightIcon, DownloadIcon } from "@/components/icons";
import DeadlineBand from "@/components/DeadlineBand";
import { DUE_FILTER_OPTIONS, type DueKey } from "@/lib/deadlines";

export type WorkspaceHeaderProps = {
  firstName: string;
  role: "ADVISER" | "UNDERWRITER";
  openCount: number;
  renewedCount: number;
  totalCount: number;
  /** Currently selected status filter ("" = All). */
  activeStatus: string;
  /** Currently selected deadline filter ("" = none). */
  activeDue: string;
  tabs: { value: string; label: string; count: number }[];
  deadlineCounts: Record<DueKey, number>;
  atRisk: number;
  followUpsDue: number;
  activeFollowUp: boolean;
};

/** Greeting, figures and status tabs for My renewals. Presentational only. */
export default function WorkspaceHeader({
  firstName,
  role,
  openCount,
  renewedCount,
  totalCount,
  activeStatus,
  activeDue,
  tabs,
  deadlineCounts,
  atRisk,
  followUpsDue,
  activeFollowUp,
}: WorkspaceHeaderProps) {
  const exportParams = new URLSearchParams({ scope: "mine", ...(activeStatus ? { status: activeStatus } : {}), ...(activeDue ? { due: activeDue } : {}), ...(activeFollowUp ? { followup: "due" } : {}) });
  const dueLabel = DUE_FILTER_OPTIONS.find((o) => o.value === activeDue)?.label;
  const figures = [
    { label: "Open", value: openCount },
    { label: "Renewed", value: renewedCount },
    { label: "Assigned to you", value: totalCount },
  ];

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Welcome back, {firstName}</h1>
          <p className="page-sub">
            {openCount === 0
              ? "You have no open renewals right now."
              : `You have ${openCount} open ${openCount === 1 ? "renewal" : "renewals"} to look after${role === "UNDERWRITER" ? " as underwriter" : ""}.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/renewals/export?${exportParams}`} className="btn-secondary" download>
            <DownloadIcon size={16} />
            Export to Excel
          </a>
          {role === "ADVISER" && (
            <Link href="/workspace/dashboard" className="btn-ghost">
              My dashboard
              <ArrowRightIcon size={16} />
            </Link>
          )}
        </div>
      </header>

      <section aria-label="At a glance" className="mb-8 grid grid-cols-3 border-y border-slate-200 dark:border-slate-800">
        {figures.map((f, i) => (
          <div key={f.label} className={`px-1 py-4 sm:px-5 ${i > 0 ? "border-l border-slate-200 dark:border-slate-800" : ""}`}>
            <span className="block text-[0.8125rem] text-slate-500 dark:text-slate-400">{f.label}</span>
            <span className="figure mt-1 block text-[2.25rem] leading-none">{f.value}</span>
          </div>
        ))}
      </section>

      <section aria-labelledby="ws-deadlines-h" className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 id="ws-deadlines-h" className="section-title">Deadlines</h2>
          <span className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <Link
            href={activeFollowUp ? "/workspace" : "/workspace?followup=due"}
            aria-current={activeFollowUp ? "true" : undefined}
            className={`text-[0.8125rem] font-medium hover:underline ${followUpsDue > 0 ? "text-brand-700 dark:text-brand-300" : "text-slate-500"}`}
          >
            {followUpsDue === 0 ? "No follow-ups due" : `${followUpsDue} follow-up${followUpsDue === 1 ? "" : "s"} due${activeFollowUp ? ", showing" : ""}`}
          </Link>
          <Link
            href={activeDue === "risk" ? "/workspace" : "/workspace?due=risk"}
            aria-current={activeDue === "risk" ? "true" : undefined}
            className={`text-[0.8125rem] font-medium ${atRisk > 0 ? "text-[#a33a2c] dark:text-[#eda499]" : "text-slate-500"} hover:underline`}
          >
            {atRisk === 0 ? "Nothing at risk" : `${atRisk} at risk${activeDue === "risk" ? ", showing" : ", show them"}`}
          </Link>
          </span>
        </div>
        <DeadlineBand compact counts={deadlineCounts} activeKey={activeDue} hrefFor={(k) => (activeDue === k ? "/workspace" : `/workspace?due=${k}`)} />
      </section>

      {activeFollowUp && (
        <p className="mb-3 flex items-center gap-3 text-[0.875rem] text-slate-600 dark:text-slate-300" role="status">
          Showing renewals with a follow-up due today or earlier.
          <Link href="/workspace" className="text-[0.8125rem] font-medium text-brand-700 hover:underline dark:text-brand-300">Clear</Link>
        </p>
      )}

      {dueLabel && (
        <p className="mb-3 flex items-center gap-3 text-[0.875rem] text-slate-600 dark:text-slate-300" role="status">
          Showing open renewals: <strong className="font-medium text-slate-900 dark:text-slate-50">{dueLabel}</strong>
          <Link href={activeStatus ? `/workspace?status=${activeStatus}` : "/workspace"} className="text-[0.8125rem] font-medium text-brand-700 hover:underline dark:text-brand-300">
            Clear
          </Link>
        </p>
      )}

      <nav aria-label="Filter by status" className="mb-4 flex gap-6 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {tabs.map((t) => {
          const active = activeStatus === t.value;
          return (
            <Link
              key={t.value || "all"}
              href={t.value ? `/workspace?status=${t.value}` : "/workspace"}
              aria-current={active ? "page" : undefined}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 pb-2.5 text-[0.875rem] transition-colors ${
                active
                  ? "border-brand-600 font-medium text-slate-900 dark:border-brand-300 dark:text-slate-50"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {t.label}
              <span className={`num text-[0.75rem] ${active ? "text-slate-500" : "text-slate-400"}`}>{t.count}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
