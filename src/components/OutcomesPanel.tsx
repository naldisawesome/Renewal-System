import Link from "next/link";
import { money, pct } from "@/lib/outcomeRules";
import type { OutcomeSummary } from "@/lib/outcomes";

/** Renewed vs lost, premium movement and lost reasons. Presentational only. */
export default function OutcomesPanel({ data, listHref }: { data: OutcomeSummary; listHref: (status: string) => string }) {
  const lost = data.cancelled + data.lapsed;
  const maxReason = Math.max(...data.reasons.map((r) => r.count), 1);

  return (
    <section aria-labelledby="outcomes-h">
      <h2 id="outcomes-h" className="section-title mb-3">Outcomes</h2>
      <dl className="grid grid-cols-3 border-y border-slate-200 dark:border-slate-800">
        <div className="py-3 pr-3">
          <dt className="text-[0.8125rem] text-slate-500">Kept</dt>
          <dd className="figure mt-1 text-[1.625rem] leading-none">{data.retention != null ? `${Math.round(data.retention)}%` : "—"}</dd>
          <dd className="mt-1.5 text-[0.75rem] text-slate-500">
            <Link href={listHref("RENEWED")} className="hover:underline">{data.renewed} renewed</Link>,{" "}
            <Link href={listHref("LOST")} className="hover:underline">{lost} lost</Link>
          </dd>
        </div>
        <div className="col-span-2 border-l border-slate-200 py-3 pl-4 dark:border-slate-800">
          <dt className="text-[0.8125rem] text-slate-500">Renewed premium against last invoice</dt>
          <dd className="figure mt-1 text-[1.625rem] leading-none">
            {data.premiumChange != null ? pct(data.premiumChange) : "—"}
          </dd>
          <dd className="mt-1.5 text-[0.75rem] text-slate-500">
            {data.premiumCount > 0
              ? `${money(data.premiumAfter)} now, from ${money(data.premiumBefore)}, over ${data.premiumCount} ${data.premiumCount === 1 ? "policy" : "policies"}`
              : "Shows once renewals are recorded with their new premium"}
          </dd>
        </div>
      </dl>

      <h3 className="mb-2 mt-5 text-[0.8125rem] font-medium text-slate-700 dark:text-slate-300">Why renewals were lost</h3>
      {data.reasons.length === 0 ? (
        <p className="text-[0.8125rem] text-slate-500">No lost renewals recorded.</p>
      ) : (
        <ul className="space-y-2">
          {data.reasons.slice(0, 6).map((r) => (
            <li key={r.reason} className="grid grid-cols-[minmax(0,11rem)_1fr_2rem] items-center gap-3 text-[0.8125rem]">
              <span className={`truncate ${r.reason === "Not recorded" ? "text-slate-400" : "text-slate-700 dark:text-slate-300"}`}>{r.reason}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                <span className="block h-full rounded-full bg-[#b5483a]/80" style={{ width: `${(r.count / maxReason) * 100}%` }} />
              </span>
              <span className="num text-right text-slate-900 dark:text-slate-100">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
