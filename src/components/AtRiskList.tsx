import Link from "next/link";
import { StatusBadge } from "@/components/Badges";
import { ArrowRightIcon } from "@/components/icons";

export type AtRiskRow = {
  id: string;
  clientName: string;
  policyNumber: string;
  status: string;
  renewalDate: string;
  reason: string;
  /** Overdue or due today: shown in the strongest colour. */
  urgent: boolean;
  owner?: string | null;
};

/**
 * The most urgent open renewals, with the reason each one is at risk. At risk means: overdue, due within 3 days,
 * or due within 14 days and not quoted yet. Presentational only.
 */
export default function AtRiskList({
  rows,
  total,
  seeAllHref,
  showOwner = false,
}: {
  rows: AtRiskRow[];
  total: number;
  seeAllHref: string;
  showOwner?: boolean;
}) {
  return (
    <section aria-labelledby="risk-h">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 id="risk-h" className="section-title">
          At risk <span className="num ml-1 text-slate-500">{total}</span>
        </h2>
        {total > 0 && (
          <Link href={seeAllHref} className="group inline-flex items-center gap-1 text-[0.8125rem] font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300">
            {total > rows.length ? `See all ${total}` : "Open as a list"}
            <ArrowRightIcon size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="border-y border-slate-200 py-6 text-[0.875rem] text-slate-500 dark:border-slate-800">
          Nothing at risk. Every open renewal due in the next two weeks has been quoted.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/renewals/${r.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-2.5 transition-colors hover:bg-white dark:hover:bg-slate-900"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[0.9375rem] text-slate-900 dark:text-slate-100">{r.clientName}</span>
                  <span className="block truncate text-[0.8125rem] text-slate-500">
                    {r.policyNumber}
                    {showOwner ? `, ${r.owner || "not assigned"}` : ""}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className={`text-right text-[0.8125rem] ${r.urgent ? "font-medium text-[#a33a2c] dark:text-[#eda499]" : "text-[#93561b] dark:text-[#e3b17f]"}`}>
                    {r.reason}
                  </span>
                  <span className="flex items-center gap-2 text-[0.75rem] text-slate-500">
                    <span className="num">{new Date(r.renewalDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" })}</span>
                    <StatusBadge status={r.status} />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
