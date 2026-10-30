import Link from "next/link";
import { StatusBadge, CompanyBadge } from "@/components/Badges";
import { daysUntil, dueWindow, dueChip, dueTone } from "@/lib/deadlines";

export type CardRow = {
  id: string;
  clientName: string;
  policyNumber: string;
  insurer: string | null;
  company: string;
  renewalDate: string | Date | null;
  invoiceTotal: number | null;
  status: string;
  people?: string | null;
  followUpAt?: string | Date | null;
};

/** Renewals as stacked cards, used instead of the table on phones. */
export default function RenewalCards({ rows, empty }: { rows: CardRow[]; empty: string }) {
  if (rows.length === 0) return <p className="py-12 text-center text-[0.875rem] text-slate-500 md:hidden">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800 md:hidden">
      {rows.map((r) => {
        const days = daysUntil(r.renewalDate);
        const due = dueWindow(r.renewalDate, r.status) != null && days != null;
        const fu = r.followUpAt && !["RENEWED", "CANCELLED", "LAPSED"].includes(r.status) ? daysUntil(r.followUpAt) : null;
        return (
          <li key={r.id}>
            <Link href={`/renewals/${r.id}`} className="block py-3 active:bg-white dark:active:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-[0.9375rem] font-medium text-slate-900 dark:text-slate-100">{r.clientName}</span>
                  <span className="block truncate text-[0.8125rem] text-slate-500">
                    {r.policyNumber}
                    {r.insurer ? `, ${r.insurer}` : ""}
                  </span>
                </span>
                <StatusBadge status={r.status} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-slate-600 dark:text-slate-300">
                <CompanyBadge company={r.company} />
                <span className="num">
                  {r.renewalDate && days != null ? new Date(r.renewalDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "No date"}
                  {due && <span className={`ml-1.5 ${dueTone(days!)}`}>{dueChip(days!)}</span>}
                </span>
                {r.invoiceTotal != null && <span className="num">{r.invoiceTotal.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 })}</span>}
                {fu != null && <span className={fu <= 0 ? "font-medium text-[#a33a2c] dark:text-[#eda499]" : ""}>Follow up {fu < 0 ? `${-fu}d overdue` : fu === 0 ? "today" : `in ${fu}d`}</span>}
              </div>
              {r.people && <p className="mt-1 truncate text-[0.75rem] text-slate-500">{r.people}</p>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
