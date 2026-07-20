import { requireAdminOrPSA } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { monthKeyToRange } from "@/lib/dates";
import { getMonthBreakdown } from "@/lib/monthBreakdown";
import RenewalsPageClient from "./RenewalsPageClient";

export default async function AdminRenewalsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await requireAdminOrPSA();
  const canManage = session.user.role === "SUPER_ADMIN";

  const { company, bookType, status, adviserId, underwriterId, q, month, sort, sortField, sortDir } =
    searchParams;

  const where: Prisma.RenewalWhereInput = {
    ...(company ? { company: company as any } : {}),
    ...(bookType ? { bookType: bookType as any } : {}),
    ...(status ? { status: status as any } : {}),
    ...(adviserId ? { assignedAdviserId: adviserId } : {}),
    ...(underwriterId ? { assignedUnderwriterId: underwriterId } : {}),
    ...(month
      ? {
          renewalDate: {
            gte: monthKeyToRange(month).start,
            lt: monthKeyToRange(month).end,
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { clientName: { contains: q, mode: "insensitive" } },
            { policyNumber: { contains: q, mode: "insensitive" } },
            { insurer: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

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

  const [renewals, advisers, underwriters, monthOptions] = await Promise.all([
    prisma.renewal.findMany({
      where,
      orderBy,
      take: 300,
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
  ]);

  return (
    <main className="max-w-[1700px] mx-auto px-4 py-8 space-y-6">
      <RenewalsPageClient
        renewals={renewals as any}
        canManage={canManage}
        currentParams={searchParams}
        sortField={activeSortField}
        sortDir={activeSortDir}
        advisers={advisers}
        underwriters={underwriters}
        monthOptions={monthOptions}
      />
    </main>
  );
}
