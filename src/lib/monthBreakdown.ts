import { prisma } from "@/lib/prisma";
import { monthKey, monthKeyToLabel } from "@/lib/dates";
import { Prisma } from "@prisma/client";

export type MonthBucket = { key: string; label: string; count: number };

/**
 * Groups renewals by their renewal month/year. Done in application code
 * (rather than a raw SQL group-by) so it works the same regardless of the
 * exact Postgres setup, and because renewal counts here are small enough
 * (hundreds to low thousands of rows) that this is cheap.
 */
export async function getMonthBreakdown(where: Prisma.RenewalWhereInput = {}): Promise<MonthBucket[]> {
  const rows = await prisma.renewal.findMany({
    where: { ...where, renewalDate: { not: null } },
    select: { renewalDate: true },
  });

  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.renewalDate) continue;
    // Skip the 1970-01-01 placeholder used internally for renewals that had no renewal date in the source file.
    if (r.renewalDate.getTime() === 0) continue;
    const key = monthKey(r.renewalDate);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, count]) => ({ key, label: monthKeyToLabel(key), count }));
}
