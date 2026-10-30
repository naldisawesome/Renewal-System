import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/statusFlow";
import { mineWhere, ownWhere as ownScope } from "@/lib/renewalFilters";
import { getDeadlines } from "@/lib/deadlineData";
import { nzToday } from "@/lib/deadlines";
import MyRenewalsTable from "./MyRenewalsTable";
import WorkspaceHeader from "./WorkspaceHeader";

const CLOSED = ["RENEWED", "CANCELLED", "LAPSED"];

export default async function AdviserPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await requireSession();
  const { status, due, followup } = searchParams;
  const isUnderwriter = session.user.role === "UNDERWRITER";

  const ownWhere: Prisma.RenewalWhereInput = ownScope(session.user);

  const [renewals, statusCounts, deadlines, followUpsDue] = await Promise.all([
    prisma.renewal.findMany({
      where: mineWhere(session.user, searchParams),
      orderBy: { renewalDate: "asc" },
      include: { _count: { select: { comments: true } } },
    }),
    // Counts for the filter tabs and summary tiles - always across everything
    // assigned to this person, not just the currently filtered list.
    prisma.renewal.groupBy({ by: ["status"], where: ownWhere, _count: { _all: true } }),
    getDeadlines(ownWhere, 0),
    prisma.renewal.count({ where: { ...ownWhere, followUpAt: { lte: nzToday() }, status: { notIn: CLOSED as any } } }),
  ]);

  const countOf = (s: string) => statusCounts.find((c) => c.status === s)?._count._all ?? 0;
  const totalCount = statusCounts.reduce((sum, c) => sum + c._count._all, 0);
  const openCount = statusCounts.filter((c) => !CLOSED.includes(c.status)).reduce((sum, c) => sum + c._count._all, 0);

  const tabDefs: string[] = isUnderwriter
    ? ["ASSIGNED", "IN_PROGRESS", "QUOTED"]
    : ["QUOTED", "CONTACTED", "RENEWED", "CANCELLED", "LAPSED"];
  const tabs = [
    { value: "", label: "All", count: totalCount },
    ...tabDefs.map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s, count: countOf(s) })),
  ];

  const rows = renewals.map((r) => ({
    id: r.id,
    clientName: r.clientName,
    policyNumber: r.policyNumber,
    insurer: r.insurer,
    company: r.company,
    bookType: r.bookType,
    renewalDate: r.renewalDate,
    invoiceTotal: r.invoiceTotal,
    status: r.status,
    commentCount: r._count.comments,
    followUpAt: r.followUpAt,
    followUpNote: r.followUpNote,
  }));

  return (
    <main className="page" style={{ maxWidth: 1360 }}>
      <WorkspaceHeader
        firstName={session.user.name?.trim().split(/\s+/)[0] || "there"}
        role={isUnderwriter ? "UNDERWRITER" : "ADVISER"}
        openCount={openCount}
        renewedCount={countOf("RENEWED")}
        totalCount={totalCount}
        activeStatus={status || ""}
        activeDue={due || ""}
        tabs={tabs}
        deadlineCounts={deadlines.counts}
        atRisk={deadlines.atRisk}
        followUpsDue={followUpsDue}
        activeFollowUp={followup === "due"}
      />

      <MyRenewalsTable renewals={rows as any} />
    </main>
  );
}
