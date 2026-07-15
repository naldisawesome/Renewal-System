import { prisma } from "@/lib/prisma";
import { monthKey, monthKeyToLabel } from "@/lib/dates";
import { Prisma } from "@prisma/client";

export type MonthlyForecastPoint = { key: string; label: string; total: number; count: number };
export type StatusForecastPoint = { status: string; label: string; total: number; count: number };
export type AdviserForecastPoint = { adviserId: string | null; adviserName: string; total: number; count: number };

const STATUS_LABELS: Record<string, string> = {
  UNASSIGNED: "Unassigned",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  CONTACTED: "Contacted",
  RENEWED: "Renewed",
  LOST: "Lost",
  LAPSED: "Lapsed",
};

function isRealDate(d: Date | null): d is Date {
  return !!d && d.getTime() !== 0;
}

/** Total forecasted value + policy count for a given filter, e.g. one month or a date range. */
export async function getForecastSummary(where: Prisma.RenewalWhereInput) {
  const rows = await prisma.renewal.findMany({
    where,
    select: { invoiceTotal: true },
  });

  const total = rows.reduce((sum, r) => sum + (r.invoiceTotal ?? 0), 0);
  const count = rows.length;
  const average = count > 0 ? total / count : 0;

  return { total, count, average };
}

/** Forecasted value bucketed by renewal month - the trend/growth chart. */
export async function getMonthlyForecast(where: Prisma.RenewalWhereInput = {}): Promise<MonthlyForecastPoint[]> {
  const rows = await prisma.renewal.findMany({
    where,
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
    where,
    _sum: { invoiceTotal: true },
    _count: { _all: true },
  });

  const order = ["UNASSIGNED", "ASSIGNED", "IN_PROGRESS", "CONTACTED", "RENEWED", "LOST", "LAPSED"];

  return order
    .map((status) => {
      const row = grouped.find((g) => g.status === status);
      return {
        status,
        label: STATUS_LABELS[status],
        total: row?._sum.invoiceTotal ?? 0,
        count: row?._count._all ?? 0,
      };
    })
    .filter((p) => p.count > 0);
}

/** Forecasted value bucketed by adviser - only meaningful for the admin dashboard. */
export async function getForecastByAdviser(where: Prisma.RenewalWhereInput): Promise<AdviserForecastPoint[]> {
  const rows = await prisma.renewal.findMany({
    where,
    select: { invoiceTotal: true, assignedAdviser: { select: { id: true, name: true } } },
  });

  const buckets = new Map<string, { adviserId: string | null; adviserName: string; total: number; count: number }>();
  for (const r of rows) {
    const key = r.assignedAdviser?.id ?? "unassigned";
    const label = r.assignedAdviser?.name ?? "Unassigned";
    const existing = buckets.get(key) || { adviserId: r.assignedAdviser?.id ?? null, adviserName: label, total: 0, count: 0 };
    existing.total += r.invoiceTotal ?? 0;
    existing.count += 1;
    buckets.set(key, existing);
  }

  return Array.from(buckets.values()).sort((a, b) => b.total - a.total);
}
