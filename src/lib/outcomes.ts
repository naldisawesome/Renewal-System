import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

import { TERMINAL, premiumChange } from "@/lib/outcomeRules";
export * from "@/lib/outcomeRules";

/** Renewed vs lost, premium movement and why renewals were lost, within `scope`. */
export async function getOutcomeSummary(scope: Prisma.RenewalWhereInput = {}) {
  const [byStatus, premium, reasons] = await Promise.all([
    prisma.renewal.groupBy({ by: ["status"], where: { ...scope, status: { in: [...TERMINAL] as any } }, _count: { _all: true } }),
    prisma.renewal.aggregate({
      where: { ...scope, status: "RENEWED", outcomePremium: { not: null }, invoiceTotal: { not: null } },
      _sum: { outcomePremium: true, invoiceTotal: true },
      _count: { _all: true },
    }),
    prisma.renewal.groupBy({
      by: ["outcomeReason"],
      where: { ...scope, status: { in: ["CANCELLED", "LAPSED"] as any } },
      _count: { _all: true },
    }),
  ]);
  const count = (s: string) => byStatus.find((r: any) => r.status === s)?._count._all ?? 0;
  const renewed = count("RENEWED");
  const lost = count("CANCELLED") + count("LAPSED");
  const closed = renewed + lost;
  const before = premium._sum.invoiceTotal ?? 0;
  const after = premium._sum.outcomePremium ?? 0;
  return {
    renewed,
    cancelled: count("CANCELLED"),
    lapsed: count("LAPSED"),
    retention: closed ? (renewed / closed) * 100 : null,
    premiumCount: premium._count._all,
    premiumBefore: before,
    premiumAfter: after,
    premiumChange: premiumChange(before, after),
    reasons: reasons
      .map((r: any) => ({ reason: (r.outcomeReason as string | null) ?? "Not recorded", count: r._count._all as number }))
      .sort((a: any, b: any) => b.count - a.count),
  };
}

export type OutcomeSummary = Awaited<ReturnType<typeof getOutcomeSummary>>;
