import { isFeatureOn } from "@/lib/featureFlags";
import { markStuck } from "@/lib/stuck";
import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/statusFlow";
import { mineWhere, ownWhere as ownScope } from "@/lib/renewalFilters";
import { getDeadlines } from "@/lib/deadlineData";
import { nzToday, stuckWhere } from "@/lib/deadlines";
import MyDay from "./MyDay";
import MyRenewalsTable from "./MyRenewalsTable";
import WorkspaceHeader from "./WorkspaceHeader";
import { resolveWidgets } from "@/lib/widgets";

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

  const [renewals, statusCounts, deadlines, followUpsDue, me, stuckCount] = await Promise.all([
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
    prisma.user.findUnique({ where: { id: session.user.id }, select: { workspaceWidgets: true, showExtras: true } }),
    prisma.renewal.count({ where: { AND: [ownWhere, stuckWhere()] } }),
  ]);
  const widgets = resolveWidgets(null, isUnderwriter ? "UNDERWRITER" : "ADVISER");

  const countOf = (s: string) => statusCounts.find((c) => c.status === s)?._count._all ?? 0;
  const totalCount = statusCounts.reduce((sum, c) => sum + c._count._all, 0);
  const openCount = statusCounts.filter((c) => !CLOSED.includes(c.status)).reduce((sum, c) => sum + c._count._all, 0);

  const tabDefs: string[] = isUnderwriter
    ? ["NEEDS_QUOTE", "QUOTED", "CONTACTED"]
    : ["QUOTED", "CONTACTED", "RENEWED", "CANCELLED", "LAPSED"];
  const tabs = [
    { value: "", label: "All", count: totalCount },
    ...tabDefs.map((s) => ({
      value: s,
      label: s === "NEEDS_QUOTE" ? "Needs quote" : STATUS_LABELS[s] ?? s,
      count: s === "NEEDS_QUOTE" ? countOf("ASSIGNED") + countOf("IN_PROGRESS") : countOf(s),
    })),
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
        widgets={widgets}
        activeMonth={/^\d{4}-\d{2}$/.test(searchParams.month ?? "") ? searchParams.month! : ""}
        showExtras={!!me?.showExtras}
      />

      {await isFeatureOn("my_day") && <MyDay toQuote={isUnderwriter ? countOf("ASSIGNED") + countOf("IN_PROGRESS") : 0} overdue={deadlines.counts.overdue} followUps={followUpsDue} stuck={stuckCount} active={status === "NEEDS_QUOTE" ? "quote" : due === "overdue" ? "overdue" : due === "stuck" ? "stuck" : followup === "due" ? "followup" : ""} />}

      <MyRenewalsTable renewals={(await markStuck(rows)) as any} />
    </main>
  );
}
