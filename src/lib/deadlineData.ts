import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { countWindows, nzToday, riskReason, upcomingWhere, daysUntil } from "@/lib/deadlines";
import type { AtRiskRow } from "@/components/AtRiskList";

/**
 * Deadline counts and the most urgent at-risk renewals within `scope` (everything, or one person's renewals).
 * One query: every open renewal that's overdue or due within 30 days.
 */
export async function getDeadlines(scope: Prisma.RenewalWhereInput = {}, listSize = 8) {
  const today = nzToday();
  const rows = await prisma.renewal.findMany({
    where: { AND: [scope, upcomingWhere(today)] },
    orderBy: { renewalDate: "asc" },
    select: {
      id: true,
      clientName: true,
      policyNumber: true,
      status: true,
      renewalDate: true,
      assignedAdviser: { select: { name: true } },
    },
  });

  const { counts, atRisk } = countWindows(rows, today);
  const risk: AtRiskRow[] = [];
  for (const r of rows) {
    if (risk.length >= listSize) break;
    const reason = riskReason(r.renewalDate, r.status, today);
    if (!reason) continue;
    const days = daysUntil(r.renewalDate, today) ?? 0;
    risk.push({
      id: r.id,
      clientName: r.clientName,
      policyNumber: r.policyNumber,
      status: r.status,
      renewalDate: (r.renewalDate as Date).toISOString(),
      reason,
      urgent: days <= 0,
      owner: r.assignedAdviser?.name ?? null,
    });
  }
  return { counts, atRisk, risk };
}
