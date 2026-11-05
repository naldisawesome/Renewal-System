import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { ownWhere } from "@/lib/renewalFilters";
import { OPEN_FOR_DEADLINES, nzToday, daysUntil } from "@/lib/deadlines";
import { calTone, monthWeeks, parseMonth, shiftMonth, type CalTone } from "@/lib/calendar";
import { STATUS_LABELS } from "@/lib/statusFlow";
import { monthKeyToRange } from "@/lib/dates";
import PipelineViewSwitch from "@/components/PipelineViewSwitch";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;
const TONE: Record<CalTone, string> = {
  late: "bg-[#f8e9e6] text-[#a33a2c] dark:bg-[#311c19] dark:text-[#eda499]",
  soon: "bg-[#f7f0de] text-[#80600f] dark:bg-[#2d2615] dark:text-[#e2c47c]",
  later: "bg-[#eaf0f8] text-[#3f5f8f] dark:bg-[#1c2636] dark:text-[#a9bfe3]",
  done: "bg-slate-100 text-slate-400 line-through dark:bg-slate-800 dark:text-slate-500",
};
const DOT: Record<CalTone, string> = { late: "#a33a2c", soon: "#80600f", later: "#3f5f8f", done: "#9aa39e" };
const LEGEND: [CalTone, string][] = [["late", "Late"], ["soon", "Due in the next 7 days"], ["later", "Later"], ["done", "Finished"]];

const CLOSED = ["RENEWED", "CANCELLED", "LAPSED"];

export default async function CalendarPage({ searchParams }: { searchParams: { month?: string } }) {
  const session = await requireSession();
  if (session.user.role !== "ADVISER" && session.user.role !== "UNDERWRITER") redirect("/workspace");

  const today = nzToday();
  const todayKey = today.toISOString().slice(0, 10);
  const thisMonth = todayKey.slice(0, 7);
  const month = parseMonth(searchParams.month, thisMonth);
  const weeks = monthWeeks(month);
  const gridStart = new Date(weeks[0][0].day + "T00:00:00Z");
  const gridEnd = new Date(new Date(weeks[weeks.length - 1][6].day + "T00:00:00Z").getTime() + DAY);
  const range = monthKeyToRange(month);

  const select = { id: true, clientName: true, status: true, renewalDate: true } as const;
  const [inGrid, urgent] = await Promise.all([
    prisma.renewal.findMany({
      where: { ...ownWhere(session.user), renewalDate: { gte: gridStart, lt: gridEnd } },
      orderBy: [{ renewalDate: "asc" }, { clientName: "asc" }],
      select,
      take: 1000,
    }),
    // What needs doing first, whichever month is on screen: late, or due within two weeks.
    prisma.renewal.findMany({
      where: {
        ...ownWhere(session.user),
        status: { in: [...OPEN_FOR_DEADLINES] as any },
        renewalDate: { gt: new Date(0), lt: new Date(today.getTime() + 15 * DAY) },
      },
      orderBy: { renewalDate: "asc" },
      select,
      take: 8,
    }),
  ]);

  type Item = { id: string; clientName: string; status: string; tone: CalTone; days: number };
  const toItem = (r: (typeof inGrid)[number]): Item => {
    const days = daysUntil(r.renewalDate) ?? 0;
    return { id: r.id, clientName: r.clientName, status: r.status, days, tone: calTone(CLOSED.includes(r.status), days) };
  };
  const byDay = new Map<string, Item[]>();
  for (const r of inGrid) {
    if (!r.renewalDate) continue;
    const k = r.renewalDate.toISOString().slice(0, 10);
    byDay.set(k, [...(byDay.get(k) ?? []), toItem(r)]);
  }
  const inMonth: Item[] = inGrid.filter((r: any) => r.renewalDate >= range.start && r.renewalDate < range.end).map(toItem);
  const stats = {
    due: inMonth.filter((i) => i.tone !== "done").length,
    late: inMonth.filter((i) => i.tone === "late").length,
    done: inMonth.filter((i) => i.tone === "done").length,
  };

  const [y, m] = month.split("-").map(Number);
  const monthLabel = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-NZ", { month: "long", year: "numeric", timeZone: "UTC" });
  const when = (days: number) => (days < 0 ? `${-days} ${days === -1 ? "day" : "days"} late` : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`);
  const nav = "btn-secondary min-h-[38px] no-underline";

  const Chip = ({ i }: { i: Item }) => (
    <Link href={`/renewals/${i.id}`} title={`${i.clientName}: ${STATUS_LABELS[i.status]}`} className={`mb-[3px] flex items-center gap-1.5 truncate rounded-md px-1.5 py-[3px] text-[0.71875rem] no-underline ${TONE[i.tone]}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: DOT[i.tone] }} />
      <span className="truncate">{i.clientName}</span>
    </Link>
  );

  return (
    <main className="page" style={{ maxWidth: 1360 }}>
      <header className="page-head">
        <div>
          <h1 className="page-title">My calendar</h1>
          <p className="page-sub">Every renewal on the day it is due, so you can see what is coming up. Open one to work on it.</p>
        </div>
        <PipelineViewSwitch active="calendar" />
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/workspace/calendar?month=${shiftMonth(month, -1)}`} className={nav} aria-label="Previous month">‹</Link>
          <h2 className="mx-2 min-w-[10rem] text-center font-serif text-[1.375rem] text-slate-900 dark:text-slate-50">{monthLabel}</h2>
          <Link href={`/workspace/calendar?month=${shiftMonth(month, 1)}`} className={nav} aria-label="Next month">›</Link>
          {month !== thisMonth && <Link href="/workspace/calendar" className={nav}>Today</Link>}
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-slate-500">
          {LEGEND.map(([t, label]) => (
            <li key={t} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: DOT[t] }} />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        {/* Month grid (tablet and desktop) */}
        <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="px-2.5 py-2 text-[0.75rem] text-slate-500">{d}</div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((c, ci) => {
                const items = byDay.get(c.day) ?? [];
                const isToday = c.day === todayKey;
                return (
                  <div
                    key={c.day}
                    className={`min-h-[6.5rem] min-w-0 border-b border-slate-100 p-1.5 dark:border-slate-800 ${ci < 6 ? "border-r" : ""} ${c.inMonth ? "" : "bg-slate-50/70 dark:bg-slate-950/30"} ${isToday ? "bg-brand-50 dark:bg-brand-900/20" : ""}`}
                  >
                    <span className={`mb-1 ml-0.5 inline-block text-[0.75rem] ${isToday ? "rounded-full bg-brand-600 px-1.5 font-medium text-white dark:bg-brand-300 dark:text-slate-950" : c.inMonth ? "text-slate-500" : "text-slate-300 dark:text-slate-600"}`}>
                      {Number(c.day.slice(8))}
                    </span>
                    {items.slice(0, 3).map((i) => <Chip key={i.id} i={i} />)}
                    {items.length > 3 && (
                      <details>
                        <summary className="cursor-pointer list-none pl-1.5 text-[0.6875rem] text-slate-500 hover:underline">+{items.length - 3} more</summary>
                        <div className="mt-1">{items.slice(3).map((i) => <Chip key={i.id} i={i} />)}</div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Phone: the same month as a list by day */}
        <div className="md:hidden">
          {inMonth.length === 0 ? (
            <p className="py-10 text-center text-[0.875rem] text-slate-500">No renewals fall in {monthLabel}.</p>
          ) : (
            <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {inMonth.map((i) => {
                const r = inGrid.find((x) => x.id === i.id)!;
                return (
                  <li key={i.id}>
                    <Link href={`/renewals/${i.id}`} className="flex items-center justify-between gap-3 py-3 no-underline">
                      <span className="min-w-0">
                        <span className="block truncate text-[0.9375rem] text-slate-900 dark:text-slate-100">{i.clientName}</span>
                        <span className="text-[0.8125rem] text-slate-500">{STATUS_LABELS[i.status]}</span>
                      </span>
                      <span className={`shrink-0 rounded-md px-2 py-1 text-[0.75rem] ${TONE[i.tone]}`}>
                        {r.renewalDate?.toLocaleDateString("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="space-y-4">
          <section className="card p-4" aria-labelledby="first-h">
            <h2 id="first-h" className="section-title mb-1">Needs doing first</h2>
            {urgent.length === 0 ? (
              <p className="py-3 text-[0.875rem] text-slate-500">Nothing is late or due in the next two weeks.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {urgent.map((r) => {
                  const days = daysUntil(r.renewalDate) ?? 0;
                  return (
                    <li key={r.id}>
                      <Link href={`/renewals/${r.id}`} className="flex items-start justify-between gap-3 py-2.5 no-underline">
                        <span className="min-w-0">
                          <span className="block truncate text-[0.875rem] text-slate-900 dark:text-slate-100">{r.clientName}</span>
                          <span className="text-[0.75rem] text-slate-500">{STATUS_LABELS[r.status]}</span>
                        </span>
                        <span className={`shrink-0 text-[0.75rem] font-medium ${days < 0 ? "text-[#a33a2c] dark:text-[#eda499]" : "text-[#93561b] dark:text-[#e3b17f]"}`}>{when(days)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className="card p-4" aria-labelledby="month-h">
            <h2 id="month-h" className="section-title mb-1">{monthLabel}</h2>
            <dl className="text-[0.875rem]">
              {([["Still to do", stats.due, ""], ["Late", stats.late, stats.late ? "text-[#a33a2c] dark:text-[#eda499]" : ""], ["Finished", stats.done, ""]] as const).map(([k, v, c]) => (
                <div key={k} className="flex justify-between border-b border-slate-100 py-2 last:border-0 dark:border-slate-800">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className={`num font-medium ${c}`}>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </main>
  );
}
