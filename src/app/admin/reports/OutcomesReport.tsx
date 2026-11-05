import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { summariseOutcomes, type Group, type OutcomeRow } from "@/lib/outcomeStats";
import { money, pct } from "@/lib/outcomeRules";

const PERIODS = [
  { key: "90", label: "Last 90 days", days: 90 },
  { key: "365", label: "Last 12 months", days: 365 },
  { key: "all", label: "All time", days: 0 },
] as const;

const rateText = (r: number) => `${Math.round(r * 100)}%`;

function GroupTable({ title, groups, id, limit = 10 }: { title: string; groups: Group[]; id: string; limit?: number }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="section-title mb-3">{title}</h2>
      {groups.length === 0 ? (
        <p className="border-y border-slate-200 py-5 text-[0.875rem] text-slate-500 dark:border-slate-800">Nothing to show for this period.</p>
      ) : (
        <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {groups.slice(0, limit).map((g) => (
            <li key={g.label} className="grid grid-cols-[minmax(0,9rem)_1fr_7.5rem] items-center gap-4 py-2.5 text-[0.875rem] sm:grid-cols-[minmax(0,12rem)_1fr_9rem]">
              <span className="truncate text-slate-800 dark:text-slate-200" title={g.label}>{g.label}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-[#f8e9e6] dark:bg-[#311c19]" aria-hidden="true">
                <span className="rs-grow-x block h-full rounded-full bg-brand-600 dark:bg-brand-300" style={{ width: `${g.rate * 100}%` }} />
              </span>
              <span className="num text-right text-slate-900 dark:text-slate-100">
                {rateText(g.rate)} <span className="text-[0.75rem] text-slate-500">of {g.total}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Renewed versus lost, and why, for renewals that reached an outcome in the chosen period. */
export default async function OutcomesReport({ period }: { period: string }) {
  const p = PERIODS.find((x) => x.key === period) ?? PERIODS[1];
  const since = p.days ? new Date(Date.now() - p.days * 86_400_000) : null;
  const rows = await prisma.renewal.findMany({
    where: {
      status: { in: ["RENEWED", "CANCELLED", "LAPSED"] as any },
      ...(since ? { OR: [{ outcomeAt: { gte: since } }, { outcomeAt: null, statusChangedAt: { gte: since } }] } : {}),
    },
    select: {
      status: true,
      insurer: true,
      outcomeInsurer: true,
      bookType: true,
      outcomeReason: true,
      outcomePremium: true,
      invoiceTotal: true,
      outcomeAt: true,
      statusChangedAt: true,
      assignedAdviser: { select: { name: true } },
    },
    take: 20000,
  });

  const data: OutcomeRow[] = rows.map((r: any) => {
    const at: Date | null = r.outcomeAt ?? r.statusChangedAt ?? null;
    return {
      status: r.status,
      adviser: r.assignedAdviser?.name ?? null,
      // Where it renewed to counts for a renewal; for a loss, who it was with.
      insurer: r.status === "RENEWED" ? r.outcomeInsurer ?? r.insurer : r.insurer,
      bookType: r.bookType,
      reason: r.outcomeReason,
      premium: r.outcomePremium,
      invoiceTotal: r.invoiceTotal,
      month: at ? at.toISOString().slice(0, 7) : "Unknown",
    };
  });
  const s = summariseOutcomes(data);
  const maxReason = Math.max(...s.reasons.map((r) => r.count), 1);

  const figures = [
    { label: "Renewal rate", value: s.total ? rateText(s.rate) : "—", note: `${s.renewed} renewed, ${s.lost} lost` },
    { label: "Renewed premium", value: money(s.renewedValue) },
    { label: "Value lost", value: money(s.lostValue), note: "Last invoice total of what was lost" },
    { label: "Average premium change", value: s.avgChange == null ? "—" : pct(s.avgChange), note: "Renewed premium against the last invoice" },
  ];

  return (
    <div className="space-y-10">
      <nav aria-label="Period" className="flex gap-4 text-[0.8125rem]">
        {PERIODS.map((x) => (
          <Link key={x.key} href={`/admin/reports?view=outcomes&period=${x.key}`} aria-current={x.key === p.key ? "true" : undefined} className={x.key === p.key ? "font-medium text-slate-900 underline underline-offset-4 dark:text-slate-50" : "text-slate-500 hover:underline"}>
            {x.label}
          </Link>
        ))}
      </nav>

      {s.total === 0 ? (
        <p className="border-y border-slate-200 py-8 text-[0.875rem] text-slate-500 dark:border-slate-800">
          No renewals reached an outcome in this period. Outcomes appear here once advisers mark renewals as Renewed, Cancelled or Lapsed.
        </p>
      ) : (
        <>
          <section aria-label="Summary" className="grid grid-cols-2 border-y border-slate-200 dark:border-slate-800 lg:grid-cols-4">
            {figures.map((f, i) => (
              <div key={f.label} className={`border-slate-200 px-1 py-5 dark:border-slate-800 sm:px-5 ${i % 2 === 1 ? "border-l" : ""} ${i === 2 ? "lg:border-l" : ""} ${i >= 2 ? "border-t lg:border-t-0" : ""}`}>
                <span className="block text-[0.8125rem] text-slate-500 dark:text-slate-400">{f.label}</span>
                <span className="figure mt-1 block text-[1.75rem] leading-none">{f.value}</span>
                {f.note && <span className="mt-1.5 block text-[0.75rem] text-slate-500">{f.note}</span>}
              </div>
            ))}
          </section>

          <div className="grid gap-10 lg:grid-cols-2">
            <GroupTable id="adv-h" title="Renewal rate by adviser" groups={s.byAdviser} />
            <GroupTable id="ins-h" title="Renewal rate by insurer" groups={s.byInsurer} />
            <GroupTable id="book-h" title="Renewal rate by type" groups={s.byBook} />
            <GroupTable id="mon-h" title="Renewal rate by month" groups={s.byMonth} limit={24} />
          </div>

          <section aria-labelledby="why-h">
            <h2 id="why-h" className="section-title mb-3">Why renewals were lost</h2>
            {s.reasons.length === 0 ? (
              <p className="border-y border-slate-200 py-5 text-[0.875rem] text-slate-500 dark:border-slate-800">Nothing was lost in this period.</p>
            ) : (
              <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {s.reasons.map((r) => (
                  <li key={r.reason} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-4 py-2.5 text-[0.875rem] sm:grid-cols-[minmax(0,14rem)_1fr_3rem]">
                    <span className="truncate text-slate-800 dark:text-slate-200">{r.reason}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                      <span className="rs-grow-x block h-full rounded-full bg-[#b5483a]" style={{ width: `${(r.count / maxReason) * 100}%` }} />
                    </span>
                    <span className="num text-right text-slate-900 dark:text-slate-100">{r.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="text-[0.8125rem] text-slate-500">Renewal rate is renewed out of everything that reached an outcome (Renewed, Cancelled or Lapsed) in the period.</p>
        </>
      )}
    </div>
  );
}
