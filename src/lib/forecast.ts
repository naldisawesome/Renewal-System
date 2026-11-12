import { prisma } from "@/lib/prisma";
import { monthKey, monthKeyToLabel } from "@/lib/dates";
import { Prisma } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/statusFlow";

export type MonthlyForecastPoint = { key: string; label: string; total: number; count: number };
export type StatusForecastPoint = { status: string; label: string; total: number; count: number };
export type AdviserForecastPoint = { adviserId: string | null; adviserName: string; total: number; count: number };

/** A renewal with no date (stored as 1970) can't be forecast into any month, so it is left out of every forecast figure. */
function dated(where: Prisma.RenewalWhereInput): Prisma.RenewalWhereInput {
  return { AND: [where, { renewalDate: { gt: new Date(0) } }] };
}

function isRealDate(d: Date | null): d is Date {
  return !!d && d.getTime() !== 0;
}

/** Total forecasted value + policy count for a given filter, e.g. one month or a date range. */
export async function getForecastSummary(where: Prisma.RenewalWhereInput) {
  // Summed in the database instead of loading every row.
  const agg = await prisma.renewal.aggregate({ where: dated(where), _sum: { invoiceTotal: true }, _count: { _all: true, invoiceTotal: true } });
  const total = agg._sum.invoiceTotal ?? 0;
  const count = agg._count._all;
  // Average over the policies that actually have a value, so missing amounts don't drag it down as if they were $0.
  const priced = agg._count.invoiceTotal;
  const average = priced > 0 ? total / priced : 0;
  return { total, count, average };
}

/** Forecasted value bucketed by renewal month - the trend/growth chart. */
export async function getMonthlyForecast(where: Prisma.RenewalWhereInput = {}): Promise<MonthlyForecastPoint[]> {
  const rows = await prisma.renewal.findMany({
    where: dated(where),
    select: { renewalDate: true, invoiceTotal: true },
  });

  const buckets = new Map<string, { total: number; count: number }>();
  for (const r of rows) {
    if (!isRealDate(r.renewalDate)) continue;
    const key = monthKey(r.renewalDate);
    const existing = buckets.get(key) || { total: 0, count: 0 };
    existing.total += r.invoiceTotal ?? 0;
    existing.count += 1;
    buckets.set(key, existing);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, v]) => ({ key, label: monthKeyToLabel(key), total: v.total, count: v.count }));
}

/** Forecasted value bucketed by status - how much of the forecast is already secured vs pending. */
export async function getForecastByStatus(where: Prisma.RenewalWhereInput): Promise<StatusForecastPoint[]> {
  const grouped = await prisma.renewal.groupBy({
    by: ["status"],
    where: dated(where),
    _sum: { invoiceTotal: true },
    _count: { _all: true },
  });

  const order = [
    "UNASSIGNED",
    "ASSIGNED",
    "IN_PROGRESS",
    "QUOTED",
    "CONTACTED",
    "RENEWED",
    "CANCELLED",
    "LAPSED",
  ];

  // "In Progress" is the same step as "Needs quote" (Assigned), so the two are shown as one.
  const rowFor = (status: string) =>
    grouped.filter((g) => g.status === status || (status === "ASSIGNED" && g.status === "IN_PROGRESS"));

  return order
    .filter((status) => status !== "IN_PROGRESS")
    .map((status) => {
      const rows = rowFor(status);
      return {
        status,
        label: STATUS_LABELS[status],
        total: rows.reduce((n, r) => n + (r._sum.invoiceTotal ?? 0), 0),
        count: rows.reduce((n, r) => n + r._count._all, 0),
      };
    })
    .filter((p) => p.count > 0);
}

/** Forecasted value bucketed by adviser - only meaningful for the admin dashboard. */
export async function getForecastByAdviser(where: Prisma.RenewalWhereInput): Promise<AdviserForecastPoint[]> {
  // Grouped in the database, then one small lookup for the advisers' names.
  const grouped = await prisma.renewal.groupBy({
    by: ["assignedAdviserId"],
    where: dated(where),
    _sum: { invoiceTotal: true },
    _count: { _all: true },
  });
  const ids = grouped.map((g) => g.assignedAdviserId).filter((v): v is string => !!v);
  const people = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
  const nameOf = new Map(people.map((p) => [p.id, p.name]));

  return grouped
    .map((g) => ({
      adviserId: g.assignedAdviserId,
      adviserName: g.assignedAdviserId ? nameOf.get(g.assignedAdviserId) ?? "Former user" : "Not assigned",
      total: g._sum.invoiceTotal ?? 0,
      count: g._count._all,
    }))
    .sort((a, b) => b.total - a.total);
}
