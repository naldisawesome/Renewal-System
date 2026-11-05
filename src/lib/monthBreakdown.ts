import { prisma } from "@/lib/prisma";
import { monthKey, monthKeyToLabel } from "@/lib/dates";
import { Prisma } from "@prisma/client";

export type MonthBucket = { key: string; label: string; count: number; total: number };

/**
 * Groups renewals by their renewal month/year, with the policy count and the invoice total for each month.
 * Done in application code (one narrow query: two columns) so it works the same on any Postgres setup.
 */
export async function getMonthBreakdown(where: Prisma.RenewalWhereInput = {}): Promise<MonthBucket[]> {
  const rows = await prisma.renewal.findMany({
    where: { ...where, renewalDate: { not: null } },
    select: { renewalDate: true, invoiceTotal: true },
  });

  const buckets = new Map<string, { count: number; total: number }>();
  for (const r of rows) {
    if (!r.renewalDate) continue;
    // Skip the 1970-01-01 placeholder used internally for renewals that had no renewal date in the source file.
    if (r.renewalDate.getTime() === 0) continue;
    const key = monthKey(r.renewalDate);
    const b = buckets.get(key) ?? { count: 0, total: 0 };
    b.count += 1;
    b.total += r.invoiceTotal ?? 0;
    buckets.set(key, b);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, b]) => ({ key, label: monthKeyToLabel(key), count: b.count, total: b.total }));
}
