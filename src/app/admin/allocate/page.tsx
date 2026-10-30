import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import AllocateTable from "./AllocateTable";
import ReassignDialog from "./ReassignDialog";
import { Prisma } from "@prisma/client";

export default async function AllocatePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  await requireSuperAdmin();
  const { company, bookType, view, sortField, sortDir } = searchParams;

  const where: Prisma.RenewalWhereInput = {
    ...(company ? { company: company as any } : {}),
    ...(bookType ? { bookType: bookType as any } : {}),
    ...(view === "all" ? {} : { status: "UNASSIGNED" }),
  };

  const activeSortField = sortField || "renewalDate";
  const activeSortDir: "asc" | "desc" = sortDir === "desc" ? "desc" : "asc";

  // Month/Year has no separate column in the database - it's derived from
  // Renewal Date - so sorting by either one sorts chronologically.
  const orderBy: Prisma.RenewalOrderByWithRelationInput =
    activeSortField === "bookType" ? { bookType: activeSortDir } : { renewalDate: activeSortDir };

  const [renewals, advisers, underwriters, staff, openByAdviser, openByUnderwriter] = await Promise.all([
    prisma.renewal.findMany({
      where,
      orderBy,
      take: 500,
      include: {
        assignedAdviser: { select: { id: true, name: true } },
        assignedUnderwriter: { select: { id: true, name: true } },
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
    prisma.user.findMany({ where: { role: { in: ["ADVISER", "UNDERWRITER"] } }, select: { id: true, name: true, role: true, status: true, deletedAt: true }, orderBy: { name: "asc" } }),
    prisma.renewal.groupBy({ by: ["assignedAdviserId"], where: { assignedAdviserId: { not: null }, status: { in: ["ASSIGNED", "IN_PROGRESS", "QUOTED", "CONTACTED"] } }, _count: { _all: true } }),
    prisma.renewal.groupBy({ by: ["assignedUnderwriterId"], where: { assignedUnderwriterId: { not: null }, status: { in: ["ASSIGNED", "IN_PROGRESS", "QUOTED", "CONTACTED"] } }, _count: { _all: true } }),
  ]);
  const people = staff.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    active: u.status === "ACTIVE" && !u.deletedAt,
    open:
      u.role === "ADVISER"
        ? openByAdviser.find((g) => g.assignedAdviserId === u.id)?._count._all ?? 0
        : openByUnderwriter.find((g) => g.assignedUnderwriterId === u.id)?._count._all ?? 0,
  }));

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Allocate</h1>
          <p className="page-sub">
            Select renewals, then assign them to an adviser, an underwriter, or both. These are separate assignments.
            The file&apos;s sales team is shown for reference only and isn&apos;t used.
          </p>
        </div>
        <ReassignDialog people={people} />
      </header>

      <AllocateTable
        renewals={renewals as any}
        advisers={advisers}
        underwriters={underwriters}
        filters={searchParams}
        sortField={activeSortField}
        sortDir={activeSortDir}
      />
    </main>
  );
}
