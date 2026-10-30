import { requireAdminOrPSA } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { adminRenewalsWhere } from "@/lib/renewalFilters";
import { getMonthBreakdown } from "@/lib/monthBreakdown";
import RenewalsPageClient from "./RenewalsPageClient";

export default async function AdminRenewalsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await requireAdminOrPSA();
  const canManage = session.user.role === "SUPER_ADMIN";

  const { sort, sortField, sortDir } = searchParams;
  const PAGE_SIZE = 100;
  const page = Math.max(1, Math.floor(Number(searchParams.page) || 1));

  const where: Prisma.RenewalWhereInput = adminRenewalsWhere(searchParams);

  // sortField/sortDir drive the clickable column headers (Type, Renewal
  // Date, Month/Year). The old sort=date_asc/date_desc param is still
  // honoured for anyone with that URL saved/bookmarked.
  const activeSortField = sortField || "renewalDate";
  const activeSortDir: "asc" | "desc" =
    sortDir === "desc" || sortDir === "asc" ? sortDir : sort === "date_desc" ? "desc" : "asc";

  // Month/Year has no separate column in the database - it's derived from
  // Renewal Date - so sorting by either one sorts chronologically.
  const orderBy: Prisma.RenewalOrderByWithRelationInput =
    activeSortField === "bookType" ? { bookType: activeSortDir } : { renewalDate: activeSortDir };

  const [renewals, advisers, underwriters, monthOptions, salesTeamRows, totals] = await Promise.all([
    prisma.renewal.findMany({
      where,
      orderBy: [orderBy, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        assignedAdviser: { select: { name: true } },
        assignedUnderwriter: { select: { name: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "ADVISER", status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "UNDERWRITER", status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getMonthBreakdown(),
    prisma.renewal.findMany({
      where: { sourceSalesTeam: { not: null } },
      select: { sourceSalesTeam: true },
      distinct: ["sourceSalesTeam"],
      orderBy: { sourceSalesTeam: "asc" },
    }),
    // Aggregated over every row matching the current filters, not just the
    // 300 shown - so the total stays correct even when a filter matches
    // more than one page's worth of renewals.
    prisma.renewal.aggregate({
      where,
      _sum: { invoiceTotal: true },
      _count: { _all: true },
    }),
  ]);

  const salesTeams = salesTeamRows
    .map((r) => r.sourceSalesTeam)
    .filter((v): v is string => !!v);

  return (
    <main className="page">
      <RenewalsPageClient
        renewals={renewals as any}
        canManage={canManage}
        currentParams={searchParams}
        sortField={activeSortField}
        sortDir={activeSortDir}
        advisers={advisers}
        underwriters={underwriters}
        monthOptions={monthOptions}
        salesTeams={salesTeams}
        totalInvoice={totals._sum.invoiceTotal ?? 0}
        totalCount={totals._count._all}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </main>
  );
}
