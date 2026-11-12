import Link from "next/link";
import { StatusBadge } from "@/components/Badges";

/** The client's other policies, so one call can cover them all. Rows are links only when the viewer may open them. */
export default function ClientPolicies({
  rows,
}: {
  rows: { id: string; policyNumber: string; status: string; renewalDate: string | null; linked: boolean }[];
}) {
  if (rows.length === 0) return null;
  return (
    <section aria-label="Other policies for this client">
      <h2 className="mb-2 text-[0.8125rem] font-medium text-slate-500 dark:text-slate-400">Other policies for this client</h2>
      <ul className="divide-y divide-slate-100 border-y border-slate-200 text-[0.8125rem] dark:divide-slate-800/70 dark:border-slate-800">
        {rows.map((o) => {
          const date = o.renewalDate && new Date(o.renewalDate).getTime() !== 0
            ? new Date(o.renewalDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
            : "No date";
          const inner = (
            <>
              <span className="min-w-0">
                <span className="block truncate text-slate-900 dark:text-slate-100">{o.policyNumber}</span>
                <span className="block text-slate-500 dark:text-slate-400">{date}</span>
              </span>
              <StatusBadge status={o.status as any} />
            </>
          );
          return (
            <li key={o.id}>
              {o.linked ? (
                <Link href={`/renewals/${o.id}`} className="flex items-center justify-between gap-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  {inner}
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-3 py-2">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
