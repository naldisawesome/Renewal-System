import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/Badges";
import { findDuplicateGroups, findOddValues, ODD_LABELS, type CheckRow, type OddKind } from "@/lib/dataChecks";

const when = (d: Date | null) => (d && d.getTime() > 0 ? d.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "no date");
const money = (v: number | null) => (v == null ? "—" : v.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }));

function Row({ r }: { r: CheckRow }) {
  return (
    <li>
      <Link href={`/renewals/${r.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1 py-2 text-[0.8125rem] hover:bg-white dark:hover:bg-slate-900 sm:grid-cols-[minmax(0,1.4fr)_9rem_8rem_7rem_auto]">
        <span className="truncate text-slate-900 dark:text-slate-100">{r.clientName}</span>
        <span className="hidden truncate text-slate-500 sm:block">{r.policyNumber}</span>
        <span className="hidden text-slate-500 sm:block">{when(r.renewalDate)}</span>
        <span className="num hidden text-right text-slate-600 dark:text-slate-300 sm:block">{money(r.invoiceTotal)}</span>
        <StatusBadge status={r.status} />
      </Link>
    </li>
  );
}

/** Things worth a second look after an upload: probable duplicates and values that look wrong. */
export default async function DataChecksReport() {
  const rows: CheckRow[] = await prisma.renewal.findMany({
    select: { id: true, clientName: true, policyNumber: true, company: true, bookType: true, status: true, insurer: true, invoiceTotal: true, startDate: true, renewalDate: true },
    take: 50000,
  });
  const dups = findDuplicateGroups(rows);
  const odd = findOddValues(rows);
  const oddKinds = Object.keys(ODD_LABELS) as OddKind[];
  const issues = dups.length + oddKinds.reduce((n, k) => n + odd[k].length, 0);

  return (
    <div className="space-y-10">
      <p className="text-[0.875rem] text-slate-600 dark:text-slate-300" role="status">
        {issues === 0 ? "Nothing looks wrong in the " : `${issues} ${issues === 1 ? "thing" : "things"} to look at across `}
        {rows.length.toLocaleString("en-NZ")} renewals. Missing details are on their own tab.
      </p>

      <section aria-labelledby="dup-h">
        <h2 id="dup-h" className="section-title mb-3">
          Probable duplicates <span className="num font-normal text-slate-500">{dups.length}</span>
        </h2>
        {dups.length === 0 ? (
          <p className="border-y border-slate-200 py-5 text-[0.875rem] text-brand-700 dark:border-slate-800 dark:text-brand-300">No duplicates found.</p>
        ) : (
          <div className="space-y-5">
            {dups.slice(0, 40).map((g, i) => (
              <div key={i}>
                <p className="mb-1 text-[0.75rem] font-medium uppercase tracking-wide text-slate-500">{g.reason}</p>
                <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {g.rows.map((r) => <Row key={r.id} r={r} />)}
                </ul>
              </div>
            ))}
            {dups.length > 40 && <p className="text-[0.8125rem] text-slate-500">Showing the first 40 of {dups.length} groups.</p>}
          </div>
        )}
        <p className="mt-2 text-[0.8125rem] text-slate-500">The same policy number with different invoice totals is not listed here, as those can be separate risks. Open a renewal to compare. A Super Admin can delete the extra copy from its page.</p>
      </section>

      {oddKinds.map((k) => (
        <section key={k} aria-labelledby={`odd-${k}`}>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
            <h2 id={`odd-${k}`} className="section-title">
              {ODD_LABELS[k].label} <span className="num font-normal text-slate-500">{odd[k].length}</span>
            </h2>
            <span className="text-[0.8125rem] text-slate-500">{ODD_LABELS[k].help}</span>
          </div>
          {odd[k].length === 0 ? (
            <p className="border-y border-slate-200 py-5 text-[0.875rem] text-brand-700 dark:border-slate-800 dark:text-brand-300">None found.</p>
          ) : (
            <>
              <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {odd[k].slice(0, 25).map((r) => <Row key={r.id} r={r} />)}
              </ul>
              {odd[k].length > 25 && <p className="mt-2 text-[0.8125rem] text-slate-500">Showing the first 25 of {odd[k].length}.</p>}
            </>
          )}
        </section>
      ))}
    </div>
  );
}
