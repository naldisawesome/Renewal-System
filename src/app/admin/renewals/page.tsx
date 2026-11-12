import { cookies, headers } from "next/headers";
import { FILTER_COOKIE, parseRemembered } from "@/lib/filterMemory";
import { markStuck } from "@/lib/stuck";
import { redirect } from "next/navigation";
import { requireAdminOrPSA } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { adminRenewalsWhere } from "@/lib/renewalFilters";
import { getMonthBreakdown } from "@/lib/monthBreakdown";
import { DUE_WINDOWS, dueWhere } from "@/lib/deadlines";
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
  // Opening All renewals from elsewhere (no filters in the address) brings back the filters used last time.
  // (cookies().get() already returns the decoded value, so it must not be decoded again.)
  // Moving around inside the page (clearing filters, picking "All months") never does.
  if (Object.keys(searchParams).length === 0) {
    const saved = cookies().get(FILTER_COOKIE)?.value;
    const from = headers().get("referer") ?? "";
    if (saved && !/\/admin\/renewals(\?|$|\/)/.test(from)) {
      const usp = parseRemembered(saved);
      if (usp.toString()) redirect(`/admin/renewals?${usp.toString()}`);
    }
  }
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

  // The runway counts follow every filter except the deadline one, so each stop shows what choosing it would give.
  const whereNoDue: Prisma.RenewalWhereInput = adminRenewalsWhere({ ...searchParams, due: undefined });
  const [renewals, advisers, underwriters, monthOptions, salesTeamRows, totals, ...dueCounts] = await Promise.all([
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
    ...DUE_WINDOWS.map((w) => prisma.renewal.count({ where: { AND: [whereNoDue, dueWhere(w.key) ?? {}] } })),
  ]);

  // For assigning work: how many open renewals each person has, and everyone who holds any (for "Move someone's renewals").
  const OPEN_WORK = ["ASSIGNED", "IN_PROGRESS", "QUOTED", "CONTACTED"] as any;
  const [staff, openByAdviser, openByUnderwriter] = canManage
    ? await Promise.all([
        prisma.user.findMany({ where: { role: { in: ["ADVISER", "UNDERWRITER"] } }, select: { id: true, name: true, role: true, status: true, deletedAt: true }, orderBy: { name: "asc" } }),
        prisma.renewal.groupBy({ by: ["assignedAdviserId"], where: { assignedAdviserId: { not: null }, status: { in: OPEN_WORK } }, _count: { _all: true } }),
        prisma.renewal.groupBy({ by: ["assignedUnderwriterId"], where: { assignedUnderwriterId: { not: null }, status: { in: OPEN_WORK } }, _count: { _all: true } }),
      ])
    : [[], [], []];
  const openOf = (id: string, role: string) =>
    role === "ADVISER"
      ? openByAdviser.find((g) => g.assignedAdviserId === id)?._count._all ?? 0
      : openByUnderwriter.find((g) => g.assignedUnderwriterId === id)?._count._all ?? 0;
  const people = staff.map((u) => ({ id: u.id, name: u.name, role: u.role as string, active: u.status === "ACTIVE" && !u.deletedAt, open: openOf(u.id, u.role) }));

  const salesTeams = salesTeamRows
    .map((r) => r.sourceSalesTeam)
    .filter((v): v is string => !!v);

  // A page number past the end (an old bookmark, or filters that now match less) goes to the last page instead of showing an empty table.
  const lastPage = Math.max(1, Math.ceil(totals._count._all / PAGE_SIZE));
  if (page > lastPage) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (v != null && k !== "page") qs.set(k, v);
    if (lastPage > 1) qs.set("page", String(lastPage));
    redirect(`/admin/renewals${qs.toString() ? `?${qs}` : ""}`);
  }

  return (
    <main className="page">
      <RenewalsPageClient
        renewals={(await markStuck(renewals)) as any}
        canManage={canManage}
        currentParams={searchParams}
        sortField={activeSortField}
        sortDir={activeSortDir}
        advisers={advisers.map((a) => ({ ...a, open: openOf(a.id, "ADVISER") }))}
        underwriters={underwriters.map((u) => ({ ...u, open: openOf(u.id, "UNDERWRITER") }))}
        people={people}
        monthOptions={monthOptions}
        runway={DUE_WINDOWS.map((w, i) => ({ key: w.key, label: w.key === "overdue" || w.key === "today" ? w.label : `In ${w.range.replace(" away", "")}`, range: w.range, count: dueCounts[i] as number }))}
        salesTeams={salesTeams}
        totalInvoice={totals._sum.invoiceTotal ?? 0}
        totalCount={totals._count._all}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </main>
  );
}
