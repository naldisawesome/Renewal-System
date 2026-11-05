import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { getMonthBreakdown } from "@/lib/monthBreakdown";
import { getDeadlines } from "@/lib/deadlineData";
import { getOutcomeSummary } from "@/lib/outcomes";
import OverviewView from "./OverviewView";

export default async function AdminOverview() {
  const session = await requireSuperAdmin();

  const [total, unassigned, inProgress, renewed, pendingUsers, byCompany, byMonth, deadlines, outcomes, problems] = await Promise.all([
    prisma.renewal.count(),
    prisma.renewal.count({ where: { status: "UNASSIGNED" } }),
    prisma.renewal.count({ where: { status: { in: ["ASSIGNED", "IN_PROGRESS", "QUOTED", "CONTACTED"] } } }),
    prisma.renewal.count({ where: { status: "RENEWED" } }),
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.renewal.groupBy({ by: ["company", "bookType"], _count: { _all: true } }),
    getMonthBreakdown(),
    getDeadlines(),
    getOutcomeSummary(),
    prisma.problemEvent.count({ where: { resolved: false } }),
  ]);

  return (
    <OverviewView
      data={{
        firstName: session.user.name?.trim().split(/\s+/)[0] || "there",
        total,
        unassigned,
        inProgress,
        renewed,
        pendingUsers,
        byCompany: byCompany.map((r) => ({ company: r.company, bookType: r.bookType, count: r._count._all })),
        byMonth: byMonth.map((m) => ({ key: m.key, label: m.label, count: m.count, total: m.total })),
        deadlines,
        outcomes,
        problems,
      }}
    />
  );
}
